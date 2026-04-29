/**
 * Shelby Protocol integration for Journey.
 * Stores portfolio snapshots as immutable blobs.
 */

import { Shelby } from "@shelby-protocol/sdk";
import { SnapshotBlob } from "@/types";

const SHELBY_API_KEY = process.env.NEXT_PUBLIC_SHELBY_API_KEY || "";

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

/**
 * Upload a portfolio snapshot to Shelby blob storage.
 */
export async function uploadSnapshot(snapshot: SnapshotBlob): Promise<string> {
  const client = getShelbyClient();

  const blobData = JSON.stringify({
    timestamp: snapshot.timestamp,
    address: snapshot.address,
    chain: snapshot.chain,
    totalValue: snapshot.totalValue,
    tokenCount: snapshot.portfolio.tokens.length,
    pnlSummary: {
      totalPnL: snapshot.pnl.reduce((sum, p) => sum + p.pnlUsd, 0),
      bestPerformer: snapshot.pnl.length > 0
        ? snapshot.pnl.reduce((best, p) => p.pnlPercent > best.pnlPercent ? p : best, snapshot.pnl[0])
        : null,
    },
    portfolio: snapshot.portfolio,
    pnl: snapshot.pnl,
  });

  const blob = await client.blobs.upload({
    data: blobData,
    metadata: {
      type: "portfolio_snapshot",
      agent: "journey",
      version: snapshot.agentVersion,
      chain: snapshot.chain,
      address: snapshot.address,
      totalValue: snapshot.totalValue,
    },
    owner: snapshot.address,
  });

  return blob.id;
}

/**
 * List all blobs for a given owner address.
 */
export async function listSnapshots(address: string): Promise<SnapshotBlob[]> {
  const client = getShelbyClient();

  try {
    const blobs = await client.blobs.list({
      owner: address,
      limit: 50,
    });

    return blobs.map((blob: any) => ({
      id: blob.id,
      timestamp: blob.metadata?.timestamp || blob.created_at,
      address,
      chain: blob.metadata?.chain || "unknown",
      totalValue: blob.metadata?.totalValue || 0,
      portfolio: JSON.parse(blob.data),
      pnl: [],
      agentVersion: blob.metadata?.version || "1.0.0",
      shelbyBlobId: blob.id,
    }));
  } catch {
    return [];
  }
}

/**
 * Verify a blob exists on Shelby.
 */
export async function verifyBlob(blobId: string): Promise<boolean> {
  const client = getShelbyClient();

  try {
    const blob = await client.blobs.get(blobId);
    return blob !== null;
  } catch {
    return false;
  }
}
