/**
 * Portfolio History - Lightweight P&L tracking stored via Shelby.
 */

import { Shelby } from "@shelby-protocol/sdk";

const SHELBY_API_KEY = process.env.NEXT_PUBLIC_SHELBY_API_KEY || "";
const HISTORY_KEY = "portfolio-history.json";

let shelbyClient: Shelby | null = null;

function getShelbyClient(): Shelby {
  if (!shelbyClient) {
    if (!SHELBY_API_KEY) {
      throw new Error("NEXT_PUBLIC_SHELBY_API_KEY is not set");
    }
    shelbyClient = new Shelby({ apiKey: SHELBY_API_KEY });
  }
  return shelbyClient;
}

export interface HistoryEntry {
  date: string;
  value: number;
}

/**
 * Save a portfolio value snapshot with timestamp.
 */
export async function saveSnapshot(portfolioValue: number): Promise<void> {
  const client = getShelbyClient();

  const entry: HistoryEntry = {
    date: new Date().toISOString(),
    value: portfolioValue,
  };

  // Get existing history
  const history = await getHistory();

  // Append new entry
  history.push(entry);

  // Keep last 365 entries max
  const trimmed = history.slice(-365);

  // Upload as blob
  await client.blobs.upload({
    data: JSON.stringify(trimmed),
    metadata: {
      type: "portfolio-history",
      agent: "journey",
      version: "1.0.0",
    },
    owner: "journey-history", // shared key for portfolio history
  });
}

/**
 * Get portfolio value history.
 * Returns array of { date, value } sorted oldest to newest.
 */
export async function getHistory(): Promise<HistoryEntry[]> {
  const client = getShelbyClient();

  try {
    const blobs = await client.blobs.list({
      owner: "journey-history",
      limit: 10,
    });

    // Find the most recent history blob
    const historyBlob = blobs
      .filter((b: any) => b.metadata?.type === "portfolio-history")
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

    if (!historyBlob) {
      return [];
    }

    return JSON.parse(historyBlob.data);
  } catch {
    return [];
  }
}