import { useAccount, useReadContract, useSwitchChain } from 'wagmi';
import { erc20Abi } from 'viem';
import { ConnectKitButton } from 'connectkit';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, AlertTriangle } from 'lucide-react';
import carmageLogo from '../assets/carnage-logo.png';
import { getUsdc } from '@/onchain-facts';
import { Amount, usdcDecimalsFor } from '@/onchain-money';
import SwapPanel from './SwapPanel';

const ARC_MAINNET_ID = 5042;
const ARC_TESTNET_ID = 5042002;

export const glass = {
  card: {
    background: 'rgba(12, 3, 3, 0.90)',
    backdropFilter: 'blur(24px) saturate(160%)',
    WebkitBackdropFilter: 'blur(24px) saturate(160%)',
    border: '1px solid rgba(220, 38, 38, 0.28)',
    boxShadow: '0 4px 40px rgba(220, 38, 38, 0.12)',
  } as React.CSSProperties,
  inner: {
    background: 'rgba(30, 5, 5, 0.70)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(220, 38, 38, 0.18)',
  } as React.CSSProperties,
};

export const redGlow = '0 0 24px rgba(220,38,38,0.30)';

function formatAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

type ChainMode = 'mainnet' | 'testnet';

import { useState } from 'react';

export default function PaymentApp() {
  const { address, isConnected, chainId } = useAccount();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const [chainMode, setChainMode] = useState<ChainMode>('mainnet');

  const targetChainId = chainMode === 'mainnet' ? ARC_MAINNET_ID : ARC_TESTNET_ID;
  const usdcFact = getUsdc(targetChainId)!;
  const wrongChain = isConnected && chainId !== targetChainId;

  const { data: rawBalance, isLoading: balLoading } = useReadContract({
    address: usdcFact.address as `0x${string}`,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: targetChainId,
    query: { enabled: !!address, refetchInterval: 8000 },
  });

  const formattedBalance =
    rawBalance !== undefined
      ? Amount.fromRaw(rawBalance, usdcDecimalsFor(targetChainId)).toFixed(2)
      : null;

  return (
    <div className="min-h-dvh flex flex-col items-center px-4 py-8" style={{ background: 'var(--bg-gradient)' }}>

      {/* Header */}
      <div className="w-full max-w-md flex items-center justify-between mb-7">
        <div className="flex items-center gap-2.5">
          <img
            src={carmageLogo}
            alt="Carnage"
            className="size-11 rounded-xl object-cover"
            style={{ border: '1.5px solid rgba(220,38,38,0.5)', boxShadow: redGlow }}
          />
          <div>
            <span className="display font-bold text-2xl tracking-tight" style={{ color: '#fff', letterSpacing: '-0.04em' }}>
              CARNAGE
            </span>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>Swap USDC on Arc</p>
          </div>
        </div>
        <ConnectKitButton.Custom>
          {({ isConnected: ck, show, address: ckAddr }) => (
            <button
              onClick={show}
              className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={ck ? glass.inner : { background: 'var(--accent)', color: '#fff', boxShadow: redGlow }}
            >
              <Wallet className="size-3.5" style={{ color: ck ? 'var(--accent)' : '#fff' }} />
              <span style={{ color: '#fff' }}>{ck && ckAddr ? formatAddr(ckAddr) : 'Connect'}</span>
            </button>
          )}
        </ConnectKitButton.Custom>
      </div>

      {/* Chain toggle */}
      <div className="w-full max-w-md flex mb-5 p-1 rounded-2xl" style={glass.inner}>
        {(['mainnet', 'testnet'] as ChainMode[]).map((m) => (
          <button
            key={m}
            onClick={() => setChainMode(m)}
            className="flex-1 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all"
            style={chainMode === m
              ? { background: 'var(--accent)', color: '#fff', boxShadow: redGlow }
              : { color: 'var(--muted)' }}
          >
            Arc {m === 'mainnet' ? 'Mainnet' : 'Testnet'}
          </button>
        ))}
      </div>

      {/* Balance hero */}
      <div className="w-full max-w-md mb-5 rounded-3xl p-5 relative overflow-hidden" style={{ ...glass.card, boxShadow: redGlow }}>
        <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: 'var(--accent)' }} />
        <div className="flex items-center gap-2 mb-3 mt-1">
          <div className="size-5 rounded-md flex items-center justify-center" style={{ background: 'rgba(220,38,38,0.15)' }}>
            <span className="text-xs font-black" style={{ color: 'var(--accent)' }}>$</span>
          </div>
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
            USDC · Arc {chainMode === 'mainnet' ? 'Mainnet' : 'Testnet'}
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="display text-5xl font-bold tabular-nums" style={{ color: '#fff' }}>
            {!isConnected ? '—' : balLoading ? '…' : (formattedBalance ?? '0.00')}
          </span>
          <span className="text-xl font-medium" style={{ color: 'var(--subtle)' }}>USDC</span>
        </div>
        <p className="mt-2 text-xs" style={{ color: 'var(--muted)' }}>
          {isConnected
            ? wrongChain
              ? `Switch to Arc ${chainMode === 'mainnet' ? 'Mainnet' : 'Testnet'}`
              : address ? formatAddr(address) : ''
            : 'Connect wallet to view balance'}
        </p>
      </div>

      {/* Mainnet warning */}
      {chainMode === 'mainnet' && (
        <div
          className="w-full max-w-md mb-4 rounded-2xl px-4 py-3 flex items-start gap-2"
          style={{ background: 'rgba(220,38,38,0.07)', border: '1px solid rgba(220,38,38,0.22)' }}
        >
          <AlertTriangle className="size-4 mt-0.5 shrink-0" style={{ color: 'var(--accent)' }} />
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            <span className="font-bold" style={{ color: 'var(--accent)' }}>Mainnet — real funds.</span>{' '}
            Transactions are irreversible. Verify all details before swapping.
          </p>
        </div>
      )}

      {/* Wrong-chain banner */}
      <AnimatePresence>
        {wrongChain && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="w-full max-w-md mb-4 rounded-2xl px-4 py-3 flex items-center justify-between"
            style={{ background: 'rgba(220,38,38,0.10)', border: '1px solid rgba(220,38,38,0.35)' }}
          >
            <span className="text-sm font-medium" style={{ color: 'var(--accent)' }}>
              Switch to Arc {chainMode === 'mainnet' ? 'Mainnet' : 'Testnet'}
            </span>
            <button
              onClick={() => switchChain({ chainId: targetChainId })}
              disabled={isSwitching}
              className="text-xs font-bold px-3 py-1.5 rounded-lg disabled:opacity-60"
              style={{ background: 'var(--accent)', color: '#fff' }}
            >
              {isSwitching ? 'Switching…' : 'Switch'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Swap panel */}
      <div className="w-full max-w-md">
        <SwapPanel glass={glass} redGlow={redGlow} chainMode={chainMode} />
      </div>

    </div>
  );
}
