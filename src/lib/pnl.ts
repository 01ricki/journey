/**
 * PnL calculation utilities for Journey.
 * Uses first transfer as entry price (cost basis).
 */

import { Token, PnLEntry, Chain } from "@/types";
import { fetchCoinGeckoHistoricalPrice } from "./prices";
import { getFirstTransferTimestamp } from "./solana";

/**
 * Format date for CoinGecko API (DD-MM-YYYY).
 */
function formatDateForCoinGecko(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

/**
 * Get entry price for a token based on first transfer.
 */
export async function getEntryPrice(
  token: Token,
  walletAddress: string
): Promise<{ price: number; timestamp: string | null }> {
  if (token.chain === "solana") {
    const timestamp = await getFirstTransferTimestamp(walletAddress, token.address);

    if (!timestamp) {
      return { price: token.price, timestamp: null };
    }

    const date = formatDateForCoinGecko(new Date(timestamp));

    // For SOL, use CoinGecko historical price
    if (token.symbol === "SOL") {
      const price = await fetchCoinGeckoHistoricalPrice(
        "So11111111111111111111111111111111111111112",
        date
      );
      return { price, timestamp };
    }

    // For other SPL tokens, use current price as approximation
    // (full implementation would need DeFi Llama or similar)
    return { price: token.price, timestamp };
  }

  // EVM tokens - CoinGecko historical
  // For native currency, we need a different approach
  if (token.address === "0x0000000000000000000000000000000000000000") {
    // This is native ETH/BNB/etc - use current price as fallback
    return { price: token.price, timestamp: null };
  }

  // ERC-20 tokens
  // For simplicity, use current price as entry (would need Alchemy/QuickNode for historical)
  return { price: token.price, timestamp: null };
}

/**
 * Calculate PnL for a list of tokens.
 */
export async function calculatePnL(
  tokens: Token[],
  walletAddress: string
): Promise<PnLEntry[]> {
  const pnlEntries: PnLEntry[] = [];

  for (const token of tokens) {
    if (token.value === 0) continue; // Skip zero-value tokens

    const { price: entryPrice, timestamp } = await getEntryPrice(token, walletAddress);

    if (entryPrice === 0) {
      // Can't calculate PnL without entry price
      pnlEntries.push({
        symbol: token.symbol,
        amount: token.amountFormatted,
        entryPrice: 0,
        currentPrice: token.price,
        pnlPercent: 0,
        pnlUsd: 0,
        costBasis: 0,
      });
      continue;
    }

    const costBasis = token.amountFormatted * entryPrice;
    const currentValue = token.amountFormatted * token.price;
    const pnlUsd = currentValue - costBasis;
    const pnlPercent = entryPrice > 0 ? ((token.price - entryPrice) / entryPrice) * 100 : 0;

    pnlEntries.push({
      symbol: token.symbol,
      amount: token.amountFormatted,
      entryPrice,
      currentPrice: token.price,
      pnlPercent,
      pnlUsd,
      costBasis,
    });
  }

  return pnlEntries;
}

/**
 * Calculate total portfolio PnL.
 */
export function calculateTotalPnL(pnlEntries: PnLEntry[]): {
  totalCostBasis: number;
  totalCurrentValue: number;
  totalPnL: number;
  totalPnLPercent: number;
} {
  const totalCostBasis = pnlEntries.reduce((sum, p) => sum + p.costBasis, 0);
  const totalCurrentValue = pnlEntries.reduce(
    (sum, p) => sum + p.amount * p.currentPrice,
    0
  );
  const totalPnL = totalCurrentValue - totalCostBasis;
  const totalPnLPercent = totalCostBasis > 0 ? (totalPnL / totalCostBasis) * 100 : 0;

  return {
    totalCostBasis,
    totalCurrentValue,
    totalPnL,
    totalPnLPercent,
  };
}
