/**
 * EVM utilities for Journey portfolio.
 * Handles wallet connection, ERC-20 token fetching, and balance checks.
 */

import { createPublicClient, createWalletClient, http, formatEther, formatUnits, parseUnits } from "viem";
import { mainnet, bsc, polygon, arbitrum, base, avalanche } from "viem/chains";
import { Token, Chain, ChainConfig, SUPPORTED_CHAINS } from "@/types";

const CHAIN_VIEM_MAP: Record<string, typeof mainnet> = {
  ethereum: mainnet,
  bnb: bsc,
  polygon: polygon,
  arbitrum: arbitrum,
  base: base,
  avalanche: avalanche,
};

export function getChainConfig(chain: Chain): ChainConfig | undefined {
  return SUPPORTED_CHAINS.find((c) => c.chain === chain);
}

export function createClientForChain(chain: Chain) {
  const config = getChainConfig(chain);
  if (!config) throw new Error(`Unsupported chain: ${chain}`);

  const viemChain = CHAIN_VIEM_MAP[chain];
  if (!viemChain) throw new Error(`No viem chain for: ${chain}`);

  return createPublicClient({
    chain: viemChain,
    transport: http(config.rpcUrl),
  });
}

const ERC20_ABI = [
  {
    name: "balanceOf",
    type: "function",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    name: "decimals",
    type: "function",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
  },
  {
    name: "symbol",
    type: "function",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
  },
  {
    name: "transfer",
    type: "function",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
  },
] as const;

// Common tokens to track per chain (minimal for demo)
const COMMON_TOKENS: Record<string, { address: string; symbol: string; decimals: number }[]> = {
  ethereum: [
    { address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", symbol: "WETH", decimals: 18 },
    { address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", symbol: "USDC", decimals: 6 },
    { address: "0xdAC17F958D2ee523a2206206994597C13D831ec7", symbol: "USDT", decimals: 6 },
    { address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", symbol: "WBTC", decimals: 8 },
  ],
  bnb: [
    { address: "0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82", symbol: "CAKE", decimals: 18 },
    { address: "0x55d398326f99059fF775485246999027B3197955", symbol: "USDT", decimals: 18 },
    { address: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", symbol: "USDC", decimals: 18 },
  ],
  polygon: [
    { address: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270", symbol: "WMATIC", decimals: 18 },
    { address: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174", symbol: "USDC", decimals: 6 },
    { address: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F", symbol: "USDT", decimals: 6 },
  ],
  arbitrum: [
    { address: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", symbol: "WETH", decimals: 18 },
    { address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", symbol: "USDC", decimals: 6 },
  ],
  base: [
    { address: "0x4200000000000000000000000000000000000006", symbol: "WETH", decimals: 18 },
    { address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", symbol: "USDC", decimals: 6 },
  ],
  avalanche: [
    { address: "0xB31f66AA3C1e785363F0635B71B8c01D0205D6a3", symbol: "WAVAX", decimals: 18 },
    { address: "0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB", symbol: "WETH.e", decimals: 18 },
    { address: "0x9702230A8Ea53601f5cD2dc00f3c15d48ab7F2C9", symbol: "USDT", decimals: 6 },
  ],
};

export async function getEVMTokens(
  walletAddress: string,
  chain: Chain
): Promise<Token[]> {
  const client = createClientForChain(chain);
  const tokens: Token[] = [];

  const tokenList = COMMON_TOKENS[chain] || [];

  for (const token of tokenList) {
    try {
      const [balance, decimals, symbol] = await Promise.all([
        client.readContract({
          address: token.address as `0x${string}`,
          abi: ERC20_ABI,
          functionName: "balanceOf",
          args: [walletAddress as `0x${string}`],
        }),
        client.readContract({
          address: token.address as `0x${string}`,
          abi: ERC20_ABI,
          functionName: "decimals",
        }),
        client.readContract({
          address: token.address as `0x${string}`,
          abi: ERC20_ABI,
          functionName: "symbol",
        }),
      ]);

      if (balance && balance > 0n) {
        const amountFormatted = Number(formatUnits(balance as bigint, decimals as number));

        tokens.push({
          symbol: symbol as string,
          name: symbol as string,
          address: token.address,
          decimals: decimals as number,
          chain,
          amount: balance as bigint,
          amountFormatted,
          price: 0, // Will be fetched via CoinGecko
          value: 0,
        });
      }
    } catch {
      // Skip tokens that fail
    }
  }

  return tokens;
}

export async function getEVMBalance(walletAddress: string, chain: Chain): Promise<Token> {
  const config = getChainConfig(chain);
  if (!config) throw new Error(`Unsupported chain: ${chain}`);

  const client = createClientForChain(chain);

  const balance = await client.getBalance({
    address: walletAddress as `0x${string}`,
  });

  return {
    symbol: config.nativeCurrency.symbol,
    name: config.nativeCurrency.name,
    address: "0x0000000000000000000000000000000000000000",
    decimals: config.nativeCurrency.decimals,
    chain,
    amount: balance,
    amountFormatted: Number(formatEther(balance)),
    price: 0,
    value: 0,
    logoUri: undefined,
  };
}
