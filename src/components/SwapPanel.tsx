/**
 * SwapPanel — Circle App Kit swap on Arc Mainnet and Arc Testnet.
 * Features: per-token balances, 50%/MAX buttons, auto-quote on change,
 * debounced quote refresh, inline SWAP button.
 * Mainnet swaps move REAL funds. Always show estimate before executing.
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import { useAccount, useSwitchChain, useBalance, usePublicClient } from 'wagmi';
import { AppKit, type SwapEstimate } from '@circle-fin/app-kit';
import { createViemAdapterFromProvider } from '@circle-fin/adapter-viem-v2';
import type { EIP1193Provider } from 'viem';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowDownUp, Loader2, Info, Check, ExternalLink,
  AlertTriangle, RefreshCw, Wallet,
} from 'lucide-react';
import { ConnectKitButton } from 'connectkit';

const ARC_MAINNET_ID = 5042;
const ARC_TESTNET_ID = 5042002;

// USDC ERC-20 addresses on Arc (same asset as native, but needed for ERC-20 balance reads)
const USDC_MAINNET = '0x3600000000000000000000000000000000000000' as `0x${string}`;
const USDC_TESTNET  = '0x3600000000000000000000000000000000000000' as `0x${string}`;
// EURC on Arc — official Circle addresses (6 decimals on both networks)
// Source: https://docs.arc.io/arc/references/contract-addresses
const EURC_MAINNET = '0xbEf5f6d51CB62b58e6A8f77868681825C6fe21c1' as `0x${string}`;
const EURC_TESTNET  = '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a' as `0x${string}`;

const ERC20_BALANCE_ABI = [
  { name: 'balanceOf', type: 'function', stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'decimals', type: 'function', stateMutability: 'view',
    inputs: [], outputs: [{ name: '', type: 'uint8' }] },
] as const;

const ARC_TOKENS = ['USDC', 'EURC'] as const;
type ArcToken = (typeof ARC_TOKENS)[number];

const CHAIN_NAME: Record<'mainnet' | 'testnet', string> = {
  mainnet: 'Arc',
  testnet: 'Arc_Testnet',
};
type ChainMode = 'mainnet' | 'testnet';

interface SwapResult { amountOut?: string; explorerUrl?: string; }
interface GlassStyles { card: React.CSSProperties; inner: React.CSSProperties; }
interface SwapPanelProps { glass: GlassStyles; redGlow: string; chainMode: ChainMode; }

const kit = new AppKit();
const QUOTE_DEBOUNCE_MS = 700;

// ─── helpers ────────────────────────────────────────────────────────────────
function fmt(raw: bigint | undefined, decimals: number): string {
  if (raw === undefined) return '0';
  const d = BigInt(10 ** decimals);
  const whole = raw / d;
  const frac = raw % d;
  const fracStr = frac.toString().padStart(decimals, '0').replace(/0+$/, '');
  return fracStr ? `${whole}.${fracStr}` : `${whole}`;
}

function TokenSelect({
  value, onChange, exclude, disabled, onClearReview,
}: {
  value: ArcToken; onChange: (t: ArcToken) => void;
  exclude: ArcToken; disabled?: boolean; onClearReview: () => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => { onChange(e.target.value as ArcToken); onClearReview(); }}
      disabled={disabled}
      className="rounded-xl px-3 py-2 text-sm font-semibold outline-none cursor-pointer disabled:opacity-50"
      style={{ background: 'rgba(220,38,38,0.15)', color: '#fff', border: '1px solid rgba(220,38,38,0.25)' }}
    >
      {ARC_TOKENS.filter((t) => t !== exclude).map((t) => (
        <option key={t} value={t} style={{ background: '#1a0808', color: '#fff' }}>{t}</option>
      ))}
    </select>
  );
}

// ─── BalanceChip: reads ERC-20 balance for a token ──────────────────────────
function useTokenBalance(token: ArcToken, chainMode: ChainMode) {
  const { address } = useAccount();
  const isMainnet = chainMode === 'mainnet';
  const tokenAddr = token === 'USDC'
    ? (isMainnet ? USDC_MAINNET : USDC_TESTNET)
    : (isMainnet ? EURC_MAINNET : EURC_TESTNET);
  const chainId = isMainnet ? ARC_MAINNET_ID : ARC_TESTNET_ID;

  // Use wagmi native balance hook for USDC (it's the native token on Arc)
  const nativeBal = useBalance({ address, chainId, query: { enabled: !!address && token === 'USDC' } });
  const publicClient = usePublicClient({ chainId });

  const [eurcBal, setEurcBal] = useState<{ raw: bigint; decimals: number } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (token !== 'EURC' || !address || !publicClient) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const [raw, decimals] = await Promise.all([
          publicClient.readContract({ address: tokenAddr, abi: ERC20_BALANCE_ABI, functionName: 'balanceOf', args: [address] }),
          publicClient.readContract({ address: tokenAddr, abi: ERC20_BALANCE_ABI, functionName: 'decimals' }),
        ]);
        if (!cancelled) setEurcBal({ raw, decimals });
      } catch { if (!cancelled) setEurcBal(null); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [token, address, publicClient, tokenAddr]);

  if (token === 'USDC') {
    if (nativeBal.isLoading) return { balance: null, balanceStr: '…', loading: true };
    if (!nativeBal.data) return { balance: null, balanceStr: '0', loading: false };
    return { balance: nativeBal.data, balanceStr: parseFloat(nativeBal.data.formatted).toFixed(2), loading: false };
  }
  // EURC
  if (loading) return { balance: null, balanceStr: '…', loading: true };
  if (!eurcBal) return { balance: null, balanceStr: '0', loading: false };
  return { balance: eurcBal, balanceStr: parseFloat(fmt(eurcBal.raw, eurcBal.decimals)).toFixed(2), loading: false };
}

// ─── main component ──────────────────────────────────────────────────────────
export default function SwapPanel({ glass, redGlow, chainMode }: SwapPanelProps) {
  const { address, isConnected, chainId, connector } = useAccount();
  const { switchChain, isPending: isSwitching } = useSwitchChain();

  const targetChainId = chainMode === 'mainnet' ? ARC_MAINNET_ID : ARC_TESTNET_ID;
  const wrongChain = isConnected && chainId !== targetChainId;

  const [tokenIn, setTokenIn]   = useState<ArcToken>('USDC');
  const [tokenOut, setTokenOut] = useState<ArcToken>('EURC');
  const [amountIn, setAmountIn] = useState('');
  const [estimate, setEstimate] = useState<SwapEstimate | null>(null);
  const [quoteAge, setQuoteAge] = useState<number>(0); // seconds since last quote
  const [swapResult, setSwapResult] = useState<SwapResult | null>(null);
  const [isQuoting, setIsQuoting]   = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);
  const [errMsg, setErrMsg]         = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const quoteTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const confirmedRef = useRef(false); // user explicitly confirmed the estimate

  const tokenInBal  = useTokenBalance(tokenIn,  chainMode);
  const tokenOutBal = useTokenBalance(tokenOut, chainMode);

  // ── quote age timer ──────────────────────────────────────────────────────
  const startQuoteTimer = () => {
    if (quoteTimerRef.current) clearInterval(quoteTimerRef.current);
    setQuoteAge(0);
    quoteTimerRef.current = setInterval(() => setQuoteAge((a) => a + 1), 1000);
  };
  const stopQuoteTimer = () => {
    if (quoteTimerRef.current) { clearInterval(quoteTimerRef.current); quoteTimerRef.current = null; }
  };
  useEffect(() => () => stopQuoteTimer(), []);

  // ── auto-quote ─────────────────────────────────────────────────────────
  const getAdapter = useCallback(async () => {
    if (!connector) throw new Error('Wallet not connected');
    if (wrongChain || chainId !== targetChainId) {
      await new Promise<void>((res, rej) =>
        switchChain({ chainId: targetChainId }, { onSuccess: () => res(), onError: rej }),
      );
    }
    const provider = (await connector.getProvider()) as EIP1193Provider;
    return createViemAdapterFromProvider({ provider });
  }, [connector, wrongChain, chainId, targetChainId, switchChain]);

  const fetchQuote = useCallback(async (amt: string, tIn: ArcToken, tOut: ArcToken) => {
    if (!address || !amt || parseFloat(amt) <= 0) return;
    setErrMsg('');
    setIsQuoting(true);
    confirmedRef.current = false;
    try {
      const adapter = await getAdapter();
      // oxlint-disable-next-line typescript/no-unsafe-assignment
      const est = await kit.estimateSwap({
        // oxlint-disable-next-line typescript/no-unsafe-assignment
        from: { adapter, chain: CHAIN_NAME[chainMode] as Parameters<typeof kit.estimateSwap>[0]['from']['chain'] },
        tokenIn: tIn, tokenOut: tOut, amountIn: amt,
        config: { slippageBps: 100 },
      });
      setEstimate(est);
      startQuoteTimer();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setEstimate(null);
      stopQuoteTimer();
      if (!msg.toLowerCase().includes('user rejected') && !msg.toLowerCase().includes('user denied')) {
        setErrMsg(msg.length > 120 ? msg.slice(0, 120) + '…' : msg);
      }
    } finally {
      setIsQuoting(false);
    }
  }, [address, chainMode, getAdapter]);

  // debounced trigger whenever tokenIn/tokenOut/amountIn change
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!isConnected || !amountIn || parseFloat(amountIn) <= 0) {
      setEstimate(null); stopQuoteTimer(); return;
    }
    debounceRef.current = setTimeout(() => { void fetchQuote(amountIn, tokenIn, tokenOut); }, QUOTE_DEBOUNCE_MS);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amountIn, tokenIn, tokenOut, isConnected]);

  // ── 50% / MAX helpers ───────────────────────────────────────────────────
  const setPercent = (pct: 50 | 100) => {
    const bal = tokenInBal.balance;
    if (!bal) return;
    let raw: number;
    if ('formatted' in bal) {
      // wagmi native balance
      raw = parseFloat(bal.formatted) * (pct / 100);
    } else {
      // ERC-20 { raw: bigint, decimals: number }
      const b = bal;
      raw = parseFloat(fmt(b.raw, b.decimals)) * (pct / 100);
    }
    if (isNaN(raw) || raw <= 0) return;
    // keep to 6 dp max
    const str = raw.toFixed(6).replace(/\.?0+$/, '');
    setAmountIn(str);
    setEstimate(null);
    stopQuoteTimer();
  };

  // ── flip tokens ─────────────────────────────────────────────────────────
  const handleFlip = () => {
    setTokenIn(tokenOut); setTokenOut(tokenIn);
    setAmountIn(''); setEstimate(null); setErrMsg(''); stopQuoteTimer();
  };

  // ── execute swap ─────────────────────────────────────────────────────────
  const handleSwap = async () => {
    if (!estimate || !address) return;
    setErrMsg('');
    setIsSwapping(true);
    try {
      const adapter = await getAdapter();
      const result = await kit.swap({
        // oxlint-disable-next-line typescript/no-unsafe-assignment
        from: { adapter, chain: CHAIN_NAME[chainMode] as Parameters<typeof kit.swap>[0]['from']['chain'] },
        tokenIn, tokenOut, amountIn,
        config: { slippageBps: 100 },
      });
      setSwapResult({ amountOut: result.amountOut, explorerUrl: result.explorerUrl ?? undefined });
      setEstimate(null); stopQuoteTimer();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.toLowerCase().includes('user rejected') || msg.toLowerCase().includes('user denied')) {
        setErrMsg('Swap cancelled.');
      } else {
        setErrMsg(msg.length > 120 ? msg.slice(0, 120) + '…' : msg);
      }
    } finally { setIsSwapping(false); }
  };

  const handleReset = () => {
    setSwapResult(null); setEstimate(null); setAmountIn(''); setErrMsg(''); stopQuoteTimer();
  };

  const amountNum   = parseFloat(amountIn);
  const amountValid = amountIn !== '' && !isNaN(amountNum) && amountNum > 0;
  const isLargeAmt  = chainMode === 'mainnet' && amountNum > 100;
  const quoteStale  = quoteAge >= 30;

  // auto-refresh when quote goes stale
  useEffect(() => {
    if (quoteStale && amountValid && isConnected && !wrongChain && !isQuoting && !isSwapping) {
      void fetchQuote(amountIn, tokenIn, tokenOut);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quoteStale]);

  return (
    <div className="rounded-3xl p-5 space-y-4" style={glass.card}>
      <h2 className="text-xl font-bold" style={{ color: '#fff' }}>Swap Tokens</h2>

      {/* Info banner */}
      <div className="rounded-xl px-3 py-2.5 flex items-start gap-2"
        style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.18)' }}>
        <Info className="size-3.5 mt-0.5 shrink-0" style={{ color: 'var(--accent)' }} />
        <p className="text-xs leading-relaxed" style={{ color: 'var(--muted)' }}>
          {chainMode === 'mainnet'
            ? 'Mainnet — real USDC on Arc. Routed by Circle (may use LiFi). 1% max slippage.'
            : 'Testnet — Arc Testnet tokens. Routed by Circle (may use LiFi). 1% max slippage.'}
        </p>
      </div>

      {/* ── Success ── */}
      <AnimatePresence>
        {swapResult && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="rounded-2xl p-5 space-y-3"
            style={{ ...glass.inner, border: '1px solid rgba(74,222,128,0.25)' }}>
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(74,222,128,0.12)' }}>
                <Check className="size-4" style={{ color: 'var(--success)' }} />
              </div>
              <span className="font-semibold" style={{ color: 'var(--success)' }}>Swap complete</span>
            </div>
            {swapResult.amountOut && (
              <p className="text-sm" style={{ color: '#fff' }}>
                Received <span className="font-bold tabular-nums">{swapResult.amountOut}</span> {tokenOut}
              </p>
            )}
            {swapResult.explorerUrl && (
              <a href={swapResult.explorerUrl} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold"
                style={{ color: 'var(--accent-hover)' }}>
                View on explorer <ExternalLink className="size-3" />
              </a>
            )}
            <button onClick={handleReset} className="w-full rounded-xl py-2.5 text-sm font-semibold"
              style={{ background: 'var(--accent)', color: '#fff', boxShadow: redGlow }}>
              New swap
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {!swapResult && (
        <>
          {/* ── Token In ── */}
          <div className="rounded-2xl p-4 space-y-2" style={glass.inner}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold" style={{ color: 'var(--muted)' }}>You pay</span>
              <TokenSelect value={tokenIn} onChange={setTokenIn} exclude={tokenOut}
                disabled={isSwapping} onClearReview={() => { setEstimate(null); stopQuoteTimer(); }} />
            </div>
            <input
              inputMode="decimal" value={amountIn}
              onChange={(e) => {
                const v = e.target.value.replace(/[^0-9.]/g, '');
                if (v === '' || /^\d*\.?\d*$/.test(v)) setAmountIn(v);
              }}
              placeholder="0.00"
              disabled={isSwapping}
              className="w-full bg-transparent text-4xl font-bold tabular-nums outline-none disabled:opacity-50"
              style={{ color: '#fff', caretColor: 'var(--accent)' }}
            />
            {/* Balance + 50%/MAX buttons */}
            {isConnected && (
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs flex items-center gap-1" style={{ color: 'var(--muted)' }}>
                  <Wallet className="size-3" />
                  {tokenInBal.loading ? '…' : `${tokenInBal.balanceStr} ${tokenIn}`}
                </span>
                <div className="flex gap-1.5">
                  {([50, 100] as const).map((pct) => (
                    <button key={pct} onClick={() => setPercent(pct)}
                      disabled={tokenInBal.loading || isSwapping}
                      className="rounded-lg px-2 py-0.5 text-xs font-bold disabled:opacity-40 transition hover:scale-105 active:scale-95"
                      style={{ background: 'rgba(220,38,38,0.18)', color: 'var(--accent)', border: '1px solid rgba(220,38,38,0.30)' }}>
                      {pct === 50 ? '50%' : 'MAX'}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Flip ── */}
          <div className="flex justify-center">
            <button onClick={handleFlip} disabled={isSwapping}
              className="size-9 rounded-xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 disabled:opacity-40"
              style={{ background: 'var(--accent)', color: '#fff', boxShadow: redGlow }}>
              <ArrowDownUp className="size-4" />
            </button>
          </div>

          {/* ── Token Out ── */}
          <div className="rounded-2xl p-4 space-y-2" style={glass.inner}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold" style={{ color: 'var(--muted)' }}>You receive</span>
              <TokenSelect value={tokenOut} onChange={setTokenOut} exclude={tokenIn}
                disabled={isSwapping} onClearReview={() => { setEstimate(null); stopQuoteTimer(); }} />
            </div>
            <div className="flex items-end gap-2">
              <div className="text-4xl font-bold tabular-nums"
                style={{ color: estimate ? '#fff' : 'var(--subtle)' }}>
                {isQuoting
                  ? <Loader2 className="size-6 animate-spin inline" style={{ color: 'var(--accent)' }} />
                  : estimate ? estimate.estimatedOutput.amount : '—'}
              </div>
              {estimate && !isQuoting && (
                <span className="text-xs pb-1.5 flex items-center gap-1" style={{ color: quoteStale ? '#f87171' : 'var(--muted)' }}>
                  <RefreshCw className="size-2.5" />
                  {quoteStale ? 'Quote stale — refreshing…' : `${quoteAge}s ago`}
                </span>
              )}
            </div>
            {isConnected && (
              <span className="text-xs flex items-center gap-1" style={{ color: 'var(--muted)' }}>
                <Wallet className="size-3" />
                {tokenOutBal.loading ? '…' : `${tokenOutBal.balanceStr} ${tokenOut}`}
              </span>
            )}
            {estimate && (
              <p className="text-xs" style={{ color: 'var(--muted)' }}>
                Fees: {estimate.fees?.map((f) => `${f.amount} ${f.token}`).join(', ') || 'none'}
              </p>
            )}
          </div>

          {/* stale auto-refresh handled by effect */}

          {isLargeAmt && (
            <div className="rounded-xl px-3 py-2 flex items-center gap-2"
              style={{ background: 'rgba(220,38,38,0.10)', border: '1px solid rgba(220,38,38,0.28)' }}>
              <AlertTriangle className="size-3.5 shrink-0" style={{ color: 'var(--accent)' }} />
              <span className="text-xs" style={{ color: 'var(--muted)' }}>
                Large amount on mainnet. Confirm carefully.
              </span>
            </div>
          )}

          {errMsg && <p className="text-xs px-1" style={{ color: 'var(--danger)' }}>{errMsg}</p>}

          {/* ── CTA ── */}
          {!isConnected ? (
            <ConnectKitButton.Custom>
              {({ show }) => (
                <button onClick={show} className="w-full rounded-2xl py-3.5 text-sm font-semibold"
                  style={{ background: 'var(--accent)', color: '#fff', boxShadow: redGlow }}>
                  Connect Wallet
                </button>
              )}
            </ConnectKitButton.Custom>
          ) : wrongChain ? (
            <button onClick={() => switchChain({ chainId: targetChainId })} disabled={isSwitching}
              className="w-full rounded-2xl py-3.5 text-sm font-semibold disabled:opacity-60"
              style={{ background: 'var(--accent)', color: '#fff' }}>
              {isSwitching ? 'Switching…' : `Switch to Arc ${chainMode === 'mainnet' ? 'Mainnet' : 'Testnet'}`}
            </button>
          ) : !amountValid ? (
            <button disabled className="w-full rounded-2xl py-3.5 text-sm font-semibold opacity-40 cursor-not-allowed"
              style={{ background: 'var(--accent)', color: '#fff' }}>
              Enter an amount
            </button>
          ) : isQuoting ? (
            <button disabled className="w-full rounded-2xl py-3.5 text-sm font-semibold opacity-70 flex items-center justify-center gap-2"
              style={{ background: 'var(--accent)', color: '#fff' }}>
              <Loader2 className="size-4 animate-spin" /> Getting quote…
            </button>
          ) : estimate ? (
            <div className="space-y-2">
              {/* Review row */}
              <div className="rounded-xl px-4 py-3 text-sm" style={glass.inner}>
                <p style={{ color: 'var(--muted)' }} className="text-xs mb-1">Review swap</p>
                <p style={{ color: '#fff' }}>
                  {amountIn} {tokenIn} → <span className="font-bold">{estimate.estimatedOutput.amount}</span> {tokenOut}
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--subtle)' }}>
                  Routed through Circle's service (may use LiFi). Subject to their terms.
                </p>
              </div>
              {/* Prominent SWAP button */}
              <motion.button
                onClick={() => void handleSwap()} disabled={isSwapping}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                className="w-full rounded-2xl py-4 text-base font-extrabold flex items-center justify-center gap-2 disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)', color: '#fff', boxShadow: redGlow, letterSpacing: '0.04em' }}>
                {isSwapping
                  ? <><Loader2 className="size-5 animate-spin" /> Confirm in wallet…</>
                  : `SWAP ${amountIn} ${tokenIn} → ${tokenOut}`}
              </motion.button>
              <button onClick={() => { setEstimate(null); stopQuoteTimer(); void fetchQuote(amountIn, tokenIn, tokenOut); }}
                disabled={isQuoting}
                className="w-full rounded-2xl py-2.5 text-sm font-semibold flex items-center justify-center gap-1.5 disabled:opacity-40"
                style={{ color: 'var(--muted)', background: 'transparent', border: '1px solid rgba(220,38,38,0.20)' }}>
                <RefreshCw className="size-3.5" /> Refresh quote
              </button>
            </div>
          ) : (
            /* No quote yet but amount is valid — show subtle waiting state */
            <button disabled className="w-full rounded-2xl py-3.5 text-sm font-semibold opacity-50 flex items-center justify-center gap-2"
              style={{ background: 'var(--accent)', color: '#fff' }}>
              <Loader2 className="size-4 animate-spin" /> Fetching quote…
            </button>
          )}
        </>
      )}
    </div>
  );
}
