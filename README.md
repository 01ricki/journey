# Journey 🧭

**Cross-Chain Portfolio Analytics** — Track your portfolio across Solana and EVM chains with immutable snapshots stored on Shelby Protocol.

![Journey](https://img.shields.io/badge/v1.0.0-Indigo?style=for-the-badge)
![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue?style=flat-square&logo=typescript)
![Shelby](https://img.shields.io/badge/Shelby-Protocol-purple?style=flat-square)

---

## Overview

Journey is a privacy-first portfolio tracker that:

- Connects to **Solana** (Phantom, Solflare) and **EVM** wallets (MetaMask, WalletConnect)
- Displays **real-time token balances** and USD values
- Calculates **PnL based on entry price** (first wallet transfer)
- Stores **immutable portfolio snapshots** on Shelby Protocol decentralized storage
- Browses **historical snapshots** to track portfolio over time

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         JOURNEY                              │
│            Cross-Chain Portfolio Analytics                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   [Connect Wallet]                                          │
│         │                                                   │
│         ▼                                                   │
│   ┌─────────────┐                                           │
│   │ Detect Chain │  Solana or EVM?                          │
│   └──────┬──────┘                                           │
│          │                                                  │
│          ▼                                                  │
│   ┌─────────────┐     ┌──────────────┐                     │
│   │ Fetch Tokens│────▶│ Jupiter (SOL) │                     │
│   │ Fetch Balances     │ CoinGecko (EVM)│                    │
│   └──────┬──────┘     └──────────────┘                     │
│          │                                                  │
│          ▼                                                  │
│   ┌─────────────┐                                           │
│   │   Portfolio │  Token list, USD values, allocation       │
│   │    View     │                                           │
│   └──────┬──────┘                                           │
│          │                                                  │
│          ▼                                                  │
│   ┌─────────────┐                                           │
│   │ PnL Entry   │  First transfer = cost basis             │
│   │  = First TX │                                           │
│   └──────┬──────┘                                           │
│          │                                                  │
│          ▼                                                  │
│   ┌─────────────┐                                           │
│   │ [Snapshot]  │──────────▶ Shelby Blob                  │
│   │   Button    │              (Immutable Proof)            │
│   └─────────────┘                                           │
└─────────────────────────────────────────────────────────────┘
```

---

## Supported Chains

### Solana
- Mainnet (SOL, SPL tokens)

### EVM
| Chain | Native | Fee Token |
|-------|--------|-----------|
| Ethereum | ETH | ETH |
| BNB Chain | BNB | BNB |
| Polygon | MATIC | MATIC |
| Arbitrum | ETH | ETH |
| Base | ETH | ETH |
| Avalanche | AVAX | AVAX |

---

## Features

- [x] **Multi-chain wallet connection** — RainbowKit (EVM) + Solana Wallet Adapter
- [x] **Cross-chain portfolio view** — SPL + ERC-20 tokens
- [x] **Real-time prices** — Jupiter (Solana), CoinGecko (EVM)
- [x] **PnL calculation** — Entry price from first wallet transfer
- [x] **Shelby snapshots** — Immutable portfolio proof storage
- [x] **History browser** — View past snapshots from Shelby

---

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 8+ (or npm/yarn)

### Installation

```bash
# Clone the repository
git clone https://github.com/01ricki/journey.git
cd journey

# Install dependencies
pnpm install

# Copy environment file
cp .env.example .env
```

### Configure

Edit `.env` with your values:

```env
# Shelby Protocol (required for snapshots)
NEXT_PUBLIC_SHELBY_API_KEY=your_shelby_key

# Solana RPC (optional, uses public default)
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com

# EVM RPCs (optional, uses public defaults)
ETHEREUM_RPC_URL=https://eth.llamarpc.com
BNB_RPC_URL=https://bsc-dataseed.binance.org
```

### Run

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Project Structure

```
journey/
├── src/
│   ├── app/
│   │   ├── page.tsx           # Portfolio page
│   │   ├── layout.tsx         # Root layout
│   │   ├── globals.css        # Global styles
│   │   ├── providers.tsx      # Wallet providers
│   │   └── history/
│   │       └── page.tsx      # Snapshot history
│   ├── components/           # React components
│   ├── lib/
│   │   ├── solana.ts         # Solana utilities
│   │   ├── evm.ts            # EVM utilities
│   │   ├── prices.ts         # Price fetching
│   │   ├── pnl.ts            # PnL calculations
│   │   └── shelby.ts         # Shelby integration
│   └── types/
│       └── index.ts          # TypeScript types
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript 5.6 |
| EVM Wallets | RainbowKit + wagmi + viem |
| Solana Wallets | @solana/wallet-adapter |
| Styling | Tailwind CSS 4 |
| Prices | Jupiter API, CoinGecko API |
| Storage | Shelby Protocol SDK |
| Deployment | Vercel (recommended) |

---

## How It Works

### Wallet Connection
- **Solana**: Uses `@solana/wallet-adapter` with Phantom/Solflare support
- **EVM**: Uses RainbowKit which supports 100+ wallets via WalletConnect

### Price Fetching
- **Solana tokens**: Jupiter Price API
- **EVM tokens**: CoinGecko API (free tier)

### PnL Calculation
- Entry price = price at **first wallet transfer** (simplified approach)
- For EVM tokens without historical data, current price is used as approximation

### Shelby Snapshots
- Portfolio state serialized to JSON
- Uploaded as blob to Shelby Protocol
- Immutable, timestamped, verifiable

---

## License

MIT License — see [LICENSE](LICENSE)

---

**Built with 🧭 for cross-chain DeFi**
