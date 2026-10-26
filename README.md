# Arc Pay

A USDC payment app on Arc Testnet. Connect your wallet to send USDC to any address or generate a shareable payment request link.

Built with [Arc Studio](https://studio.arc.io)

## Tech Stack

- React + TypeScript + Vite
- wagmi v2 + ConnectKit (wallet connection)
- Arc Testnet (USDC as native gas)
- framer-motion (animations)
- Tailwind CSS + Arc Light design tokens

## Features

- Live USDC balance (ERC-20 view, auto-refreshes every 8 s)
- Send USDC to any address with quick-amount chips and a Max button
- Generate shareable payment request links with optional amount and memo
- Prefill the Send form from URL params (`?to=0x…&amount=1.00&memo=…`)
- Real transaction states — wallet confirmation, block confirmation, explorer link

## Development

### Prerequisites

- [Bun](https://bun.sh) runtime

### Install

```bash
bun install
```

### Environment Variables

None required for local development.

| Variable | Purpose |
|----------|---------|
| `RPC_PROXY_BASE_URL` | Arc Studio RPC proxy (optional outside Arc Studio) |
| `RPC_PROXY_TOKEN` | Arc Studio RPC proxy auth token (optional outside Arc Studio) |
| `RPC_PROXY_CHAINS` | Comma-separated proxy chain keys (optional outside Arc Studio) |

### Run

```bash
bun run dev
```

### Build

```bash
bun run build
```

### Test

```bash
bun run check
```

## Getting Test USDC

Use the **Get test USDC** button in the Arc Studio sidebar to drip testnet USDC to your connected wallet.
