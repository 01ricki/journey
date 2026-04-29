/**
 * Solana utilities for Journey portfolio.
 * Handles wallet connection, SPL token fetching, and transaction history.
 */

import { Connection, PublicKey, TokenAmount } from "@solana/web3.js";
import { Token, Portfolio, Chain } from "@/types";

const SOLANA_RPC = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";

const SPL_TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");

interface TokenInfo {
  mint: string;
  amount: string;
  decimals: number;
}

export async function getSolanaConnection(): Promise<Connection> {
  return new Connection(SOLANA_RPC, "confirmed");
}

export async function getSPLTokens(walletAddress: string): Promise<Token[]> {
  const connection = await getSolanaConnection();
  const publicKey = new PublicKey(walletAddress);

  // Get all token accounts
  const tokenAccounts = await connection.getTokenAccountsByOwner(publicKey, {
    programId: SPL_TOKEN_PROGRAM_ID,
  });

  const tokens: Token[] = [];

  for (const account of tokenAccounts.value) {
    const accountData = await connection.getTokenAccountBalance(account.pubkey);

    if (accountData.value.uiAmount && accountData.value.uiAmount > 0) {
      const mint = account.pubkey.toBase58();

      tokens.push({
        symbol: "Unknown", // Will be resolved via Jupiter
        name: "Unknown Token",
        address: mint,
        decimals: accountData.value.decimals,
        chain: "solana",
        amount: BigInt(accountData.value.amount),
        amountFormatted: accountData.value.uiAmount || 0,
        price: 0,
        value: 0,
      });
    }
  }

  return tokens;
}

export async function getNativeBalance(walletAddress: string): Promise<Token> {
  const connection = await getSolanaConnection();
  const publicKey = new PublicKey(walletAddress);

  const balance = await connection.getBalance(publicKey);
  const lamports = balance / 1e9; // Convert to SOL

  return {
    symbol: "SOL",
    name: "Solana",
    address: "So11111111111111111111111111111111111111112",
    decimals: 9,
    chain: "solana",
    amount: BigInt(balance),
    amountFormatted: lamports,
    price: 0, // Will be fetched via Jupiter
    value: 0,
    logoUri: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png",
  };
}

export async function getFirstTransferTimestamp(
  walletAddress: string,
  tokenAddress: string
): Promise<string | null> {
  const connection = await getSolanaConnection();
  const publicKey = new PublicKey(walletAddress);

  try {
    // Get confirmed signatures for the account
    const signatures = await connection.getSignaturesForAddress(
      publicKey,
      { limit: 100 },
      { commitment: "confirmed" }
    );

    if (signatures.length === 0) return null;

    // Return the oldest transaction timestamp
    const oldest = signatures[signatures.length - 1];
    return oldest.blockTime ? new Date(oldest.blockTime * 1000).toISOString() : null;
  } catch {
    return null;
  }
}

export function formatWalletAddress(address: string): string {
  if (address.length <= 8) return address;
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}
