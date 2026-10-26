# Carnage — USDC Swap on Arc

**Live app: [carnagearc.vercel.app](https://carnagearc.vercel.app/)**

Carnage is a non-custodial token swap app built on [Arc](https://arc.io) — Circle's blockchain where USDC is the native gas token. Connect your wallet, swap USDC and EURC instantly, and pay gas fees in USDC with no ETH required.

Built with [Arc Studio](https://studio.arc.io)

---

## Features

- **USDC / EURC swaps** — swap between USDC and EURC on Arc Mainnet and Arc Testnet using Circle's swap routing (powered by LiFi).
- **Live wallet balances** — reads your USDC and EURC balances directly from the connected wallet on-chain. USDC uses Arc's native balance hook; EURC reads the ERC-20 contract at the official Circle address.
- **50% and MAX buttons** — instantly fill the input with half or all of your available token balance, calculated from your live on-chain balance.
- **Auto-quote** — as soon as you enter an amount and select tokens, the app fetches a live exchange rate automatically (700ms debounce). No "Get quote" button needed.
- **Quote freshness timer** — shows how many seconds ago the quote was fetched. Automatically refreshes at 30 seconds.
- **Inline SWAP button** — once a quote is ready, a prominent SWAP button appears immediately. No extra navigation or confirmation screens.
- **Chain toggle** — switch between Arc Mainnet and Arc Testnet at the top of the screen. All balances, quotes, and swaps update to match.
- **Mainnet safety** — persistent warning banner on mainnet, large-amount alert (> $100), and a review row showing exact input/output before signing.
- **Non-custodial** — your wallet signs every transaction in the browser. The app never holds keys or funds.

---

## Token Addresses

| Token | Network | Address |
|-------|---------|---------|
| USDC  | Arc Mainnet & Testnet | `0x3600000000000000000000000000000000000000` |
| EURC  | Arc Mainnet | `0xbEf5f6d51CB62b58e6A8f77868681825C6fe21c1` |
| EURC  | Arc Testnet | `0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a` |

USDC is Arc's native gas token — fees are paid in USDC, no ETH needed.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS v4 |
| Wallet | wagmi v2 + ConnectKit |
| Swap routing | Circle App Kit (`@circle-fin/app-kit`) |
| Animations | Framer Motion |
| Chain | Arc Mainnet (chain ID 5042) + Arc Testnet (chain ID 5042002) |

---

## Development

### Prerequisites

- [Bun](https://bun.sh) >= 1.0
- A browser wallet (MetaMask, Rabby, Coinbase Wallet, etc.)
- Arc Testnet added to your wallet — RPC: `https://rpc.testnet.arc.io`, Chain ID: `5042002`

### Install

```bash
bun install
```

### Environment Variables

| Variable | Purpose | Required outside Arc Studio |
|----------|---------|----------------------------|
| `VITE_WALLETCONNECT_PROJECT_ID` | WalletConnect project ID for ConnectKit | Yes — get one free at [cloud.walletconnect.com](https://cloud.walletconnect.com) |
| `RPC_PROXY_BASE_URL` | Arc Studio RPC proxy URL | Optional (auto-provisioned inside Arc Studio) |
| `RPC_PROXY_TOKEN` | Arc Studio RPC proxy token | Optional (auto-provisioned inside Arc Studio) |
| `RPC_PROXY_CHAINS` | Comma-separated proxy chain keys | Optional (auto-provisioned inside Arc Studio) |

### Run locally

```bash
bun run dev
```

Open [http://localhost:5173](http://localhost:5173).

### Build

```bash
bunx vite build
```

Output goes to `dist/`.

---

## Get Testnet Tokens

- **Testnet USDC** — use the "Get test USDC" button inside Arc Studio, or visit [faucet.circle.com](https://faucet.circle.com) and select Arc Testnet.
- **Testnet EURC** — visit [faucet.circle.com](https://faucet.circle.com), select Arc Testnet, and choose EURC.

---

## Links

- Live app: [carnagearc.vercel.app](https://carnagearc.vercel.app/)
- Arc docs: [docs.arc.io](https://docs.arc.io)
- Circle developers: [developers.circle.com](https://developers.circle.com)
- EURC contract addresses: [developers.circle.com/stablecoins/eurc-contract-addresses](https://developers.circle.com/stablecoins/eurc-contract-addresses)
- Arc Explorer (mainnet): [explorer.arc.io](https://explorer.arc.io)
- Arc Explorer (testnet): [explorer.testnet.arc.io](https://explorer.testnet.arc.io)

---

## License

MIT
