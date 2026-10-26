# Carnage

**Live app: [carnagearc.vercel.app](https://carnagearc.vercel.app/)**

A non-custodial token swap app built on [Arc](https://arc.io) — Circle's blockchain where USDC is the native gas token. Connect your wallet, swap USDC and EURC, and pay gas in USDC with no ETH required.

Built with [Arc Studio](https://studio.arc.io)

---

## Features

- Swap USDC ↔ EURC on Arc Mainnet and Arc Testnet
- Live wallet balances for both tokens, read directly from the chain
- 50% and MAX buttons to fill the input from your on-chain balance
- Auto-quote with 700 ms debounce — no manual "Get quote" step
- Quote freshness timer, auto-refreshes at 30 seconds
- Prominent inline SWAP button once a quote is ready
- Chain toggle between Arc Mainnet and Arc Testnet
- Mainnet warning banner and large-amount alert (above 100 USDC)
- Non-custodial — your wallet signs every transaction; the app holds no keys or funds

---

## Token Addresses

| Token | Mainnet | Testnet |
|-------|---------|---------|
| USDC | `0x3600000000000000000000000000000000000000` | `0x3600000000000000000000000000000000000000` |
| EURC | `0xbEf5f6d51CB62b58e6A8f77868681825C6fe21c1` | `0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a` |

All addresses verified on-chain. Both tokens use 6 decimals. USDC is also Arc's native gas token (18 decimals when read as native; 6 decimals via the ERC-20 interface).

---

## Networks

| | Arc Mainnet | Arc Testnet |
|-|-------------|-------------|
| Chain ID | 5042 | 5042002 |
| RPC | `https://rpc.mainnet.arc.io` | `https://rpc.testnet.arc.io` |
| Explorer | [explorer.arc.io](https://explorer.arc.io) | [explorer.testnet.arc.io](https://explorer.testnet.arc.io) |

---

## Tech Stack

| | |
|-|-|
| Framework | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS |
| Wallet | wagmi v2 + ConnectKit |
| Swap | Circle App Kit (`@circle-fin/app-kit` v1.18) |
| Animations | Framer Motion |

---

## Development

**Prerequisites:** [Bun](https://bun.sh) and a browser wallet (MetaMask, Rabby, Coinbase Wallet, etc.)

```bash
bun install
bun run dev        # http://localhost:5173
bunx vite build    # output → dist/
```

**Environment variables**

| Variable | Purpose |
|----------|---------|
| `VITE_WALLETCONNECT_PROJECT_ID` | WalletConnect project ID for ConnectKit — get one free at [cloud.walletconnect.com](https://cloud.walletconnect.com) |
| `RPC_PROXY_BASE_URL` | RPC proxy URL (auto-provisioned inside Arc Studio; optional outside) |
| `RPC_PROXY_TOKEN` | RPC proxy auth token (auto-provisioned inside Arc Studio; optional outside) |
| `RPC_PROXY_CHAINS` | Comma-separated proxy chain keys (auto-provisioned inside Arc Studio; optional outside) |

---

## License

MIT
