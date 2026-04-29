/**
 * Journey - Cross-chain portfolio analytics type definitions.
 */

export interface Token {
  symbol: string;
  name: string;
  address: string;       // Raw address (Solana mint or EVM contract)
  decimals: number;
  chain: Chain;
  amount: bigint;        // Raw amount (using bigint for precision)
  amountFormatted: number;
  price: number;         // USD price
  value: number;         // USD value
  logoUri?: string;
}

export interface Portfolio {
  address: string;
  chain: Chain;
  totalValue: number;
  tokens: Token[];
  timestamp: string;
  chainLogo?: string;
}

export interface PnLEntry {
  symbol: string;
  amount: number;
  entryPrice: number;    // Price at first transfer
  currentPrice: number;
  pnlPercent: number;
  pnlUsd: number;
  costBasis: number;
}

export interface SnapshotBlob {
  id?: string;
  timestamp: string;
  address: string;
  chain: string;
  totalValue: number;
  portfolio: Portfolio;
  pnl: PnLEntry[];
  agentVersion: string;
  shelbyBlobId?: string;
}

export type Chain = 'solana' | 'ethereum' | 'bnb' | 'polygon' | 'arbitrum' | 'base' | 'avalanche';

export interface ChainConfig {
  id: string;
  name: string;
  chain: Chain;
  icon: string;
  isEVM: boolean;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrl: string;
  blockExplorer: string;
  coinGeckoId: string;
}

export const SUPPORTED_CHAINS: ChainConfig[] = [
  {
    id: 'solana',
    name: 'Solana',
    chain: 'solana',
    icon: '◎',
    isEVM: false,
    nativeCurrency: { name: 'Solana', symbol: 'SOL', decimals: 9 },
    rpcUrl: process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
    blockExplorer: 'https://solscan.io',
    coinGeckoId: 'solana',
  },
  {
    id: 'ethereum',
    name: 'Ethereum',
    chain: 'ethereum',
    icon: '⟠',
    isEVM: true,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrl: process.env.ETHEREUM_RPC_URL || 'https://eth.llamarpc.com',
    blockExplorer: 'https://etherscan.io',
    coinGeckoId: 'ethereum',
  },
  {
    id: 'bnb',
    name: 'BNB Chain',
    chain: 'bnb',
    icon: 'B',
    isEVM: true,
    nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
    rpcUrl: process.env.BNB_RPC_URL || 'https://bsc-dataseed.binance.org',
    blockExplorer: 'https://bscscan.com',
    coinGeckoId: 'binancecoin',
  },
  {
    id: 'polygon',
    name: 'Polygon',
    chain: 'polygon',
    icon: 'M',
    isEVM: true,
    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
    rpcUrl: process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com',
    blockExplorer: 'https://polygonscan.com',
    coinGeckoId: 'matic-network',
  },
  {
    id: 'arbitrum',
    name: 'Arbitrum',
    chain: 'arbitrum',
    icon: 'A',
    isEVM: true,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrl: process.env.ARB_RPC_URL || 'https://arb1.arbitrum.io/rpc',
    blockExplorer: 'https://arbiscan.io',
    coinGeckoId: 'ethereum',
  },
  {
    id: 'base',
    name: 'Base',
    chain: 'base',
    icon: 'B',
    isEVM: true,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrl: process.env.BASE_RPC_URL || 'https://mainnet.base.org',
    blockExplorer: 'https://basescan.org',
    coinGeckoId: 'ethereum',
  },
  {
    id: 'avalanche',
    name: 'Avalanche',
    chain: 'avalanche',
    icon: 'A',
    isEVM: true,
    nativeCurrency: { name: 'AVAX', symbol: 'AVAX', decimals: 18 },
    rpcUrl: process.env.AVAX_RPC_URL || 'https://api.avax.network/ext/bc/C/rpc',
    blockExplorer: 'https://snowtrace.io',
    coinGeckoId: 'avalanche-2',
  },
];

export function isSolanaAddress(address: string): boolean {
  // Solana addresses are base58 encoded, 32-44 characters
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
}

export function detectChain(address: string): Chain {
  if (isSolanaAddress(address)) return 'solana';
  if (address.startsWith('0x') && address.length === 42) return 'ethereum';
  return 'ethereum'; // default
}
