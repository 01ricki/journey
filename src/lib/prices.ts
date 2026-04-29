/**
 * Price fetching utilities for Journey.
 * Jupiter API for Solana, CoinGecko for EVM.
 */

import axios from "axios";
import { Token, Chain } from "@/types";

const COINGECKO_BASE = "https://api.coingecko.com/api/v3";
const JUPITER_BASE = "https://api.jup.ag/price";

// CoinGecko ID mapping for common tokens
const COINGECKO_IDS: Record<string, string> = {
  // Solana
  "So11111111111111111111111111111111111111112": "solana",
  // Ethereum
  "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2": "weth",
  "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48": "usd-coin",
  "0xdAC17F958D2ee523a2206206994597C13D831ec7": "tether",
  "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599": "wrapped-bitcoin",
  // BNB
  "0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82": "pancakeswap-token",
  "0x55d398326f99059fF775485246999027B3197955": "tether",
  "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d": "usd-coin",
  // Polygon
  "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270": "wmatic",
  "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174": "usd-coin",
  "0xc2132D05D31c914a87C6611C10748AEb04B58e8F": "tether",
  // Arbitrum
  "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1": "weth",
  "0xaf88d065e77c8cC2239327C5EDb3A432268e5831": "usd-coin",
  // Base
  "0x4200000000000000000000000000000000000006": "weth",
  "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913": "usd-coin",
  // Avalanche
  "0xB31f66AA3C1e785363F0635B71B8c01D0205D6a3": "avalanche-2",
  "0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB": "weth",
  "0x9702230A8Ea53601f5cD2dc00f3c15d48ab7F2C9": "tether",
};

/**
 * Fetch price for Solana tokens via Jupiter API.
 */
export async function fetchJupiterPrice(mint: string): Promise<number> {
  try {
    const response = await axios.get(`${JUPITER_BASE}`, {
      params: { ids: mint },
      timeout: 5000,
    });

    const data = response.data.data;
    if (data && data[mint]) {
      return parseFloat(data[mint].price) || 0;
    }
    return 0;
  } catch {
    return 0;
  }
}

/**
 * Fetch multiple Solana token prices via Jupiter.
 */
export async function fetchJupiterPrices(mints: string[]): Promise<Record<string, number>> {
  if (mints.length === 0) return {};

  try {
    const ids = mints.join(",");
    const response = await axios.get(`${JUPITER_BASE}`, {
      params: { ids },
      timeout: 5000,
    });

    const prices: Record<string, number> = {};
    const data = response.data.data || {};

    for (const mint of mints) {
      prices[mint] = data[mint] ? parseFloat(data[mint].price) || 0 : 0;
    }

    return prices;
  } catch {
    return {};
  }
}

/**
 * Fetch price for EVM tokens via CoinGecko.
 */
export async function fetchCoinGeckoPrice(contractAddress: string): Promise<number> {
  const coinId = COINGECKO_IDS[contractAddress.toLowerCase()];
  if (!coinId) return 0;

  try {
    const response = await axios.get(`${COINGECKO_BASE}/simple/price`, {
      params: { ids: coinId, vs_currencies: "usd" },
      timeout: 5000,
    });

    const data = response.data[coinId];
    return data?.usd || 0;
  } catch {
    return 0;
  }
}

/**
 * Fetch historical price from CoinGecko.
 */
export async function fetchCoinGeckoHistoricalPrice(
  contractAddress: string,
  date: string // Format: DD-MM-YYYY
): Promise<number> {
  const coinId = COINGECKO_IDS[contractAddress.toLowerCase()];
  if (!coinId) return 0;

  try {
    const response = await axios.get(`${COINGECKO_BASE}/coins/${coinId}/history`, {
      params: { date, localization: false },
      timeout: 5000,
    });

    return response.data.market_data?.current_price?.usd || 0;
  } catch {
    return 0;
  }
}

/**
 * Enrich tokens with prices.
 */
export async function enrichTokensWithPrices(tokens: Token[]): Promise<Token[]> {
  // Separate Solana and EVM tokens
  const solanaMints = tokens
    .filter((t) => t.chain === "solana" && t.symbol !== "SOL")
    .map((t) => t.address);

  const evmAddresses = tokens
    .filter((t) => t.chain !== "solana")
    .map((t) => t.address);

  // Fetch SOL price
  const solPrice = await fetchJupiterPrice("So11111111111111111111111111111111111111112");

  // Fetch Solana token prices
  const solanaPrices = await fetchJupiterPrices(solanaMints);

  // Fetch EVM token prices
  const evmPrices: Record<string, number> = {};
  for (const addr of evmAddresses) {
    evmPrices[addr] = await fetchCoinGeckoPrice(addr);
  }

  // Apply prices
  return tokens.map((token) => {
    let price = 0;
    let logoUri = token.logoUri;

    if (token.symbol === "SOL") {
      price = solPrice;
      logoUri = "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png";
    } else if (token.chain === "solana") {
      price = solanaPrices[token.address] || 0;
    } else {
      price = evmPrices[token.address.toLowerCase()] || 0;
    }

    return {
      ...token,
      price,
      value: token.amountFormatted * price,
      logoUri,
    };
  });
}
