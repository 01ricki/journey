"use client";

import { useState, useEffect } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { useWallet } from "@solana/wallet-adapter-react";
import { listSnapshots } from "@/lib/shelby";
import { SnapshotBlob, SUPPORTED_CHAINS } from "@/types";
import { Clock, ExternalLink, TrendingUp, TrendingDown, ChevronRight } from "lucide-react";

export default function HistoryPage() {
  const { address: evmAddress, isConnected: evmConnected } = useAccount();
  const { publicKey: solanaPublicKey, connected: solanaConnected } = useWallet();

  const solanaAddr = solanaPublicKey?.toBase58();
  const walletAddress = solanaConnected ? solanaAddr : evmAddress;

  const [snapshots, setSnapshots] = useState<SnapshotBlob[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSnapshot, setSelectedSnapshot] = useState<SnapshotBlob | null>(null);

  async function fetchHistory() {
    if (!walletAddress) return;

    setLoading(true);
    try {
      const blobs = await listSnapshots(walletAddress as string);
      setSnapshots(blobs);
    } catch (error) {
      console.error("Failed to fetch snapshots:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (walletAddress) {
      fetchHistory();
    }
  }, [walletAddress]);

  return (
    <main className="min-h-screen bg-[#0a0a0f]">
      {/* Header */}
      <header className="border-b border-[#2a2a3e]">
        <div className="container py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🧭</span>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              Journey
            </h1>
          </div>
          <nav className="flex items-center gap-6">
            <a href="/" className="text-sm font-medium text-gray-400 hover:text-indigo-400 transition">
              Portfolio
            </a>
            <a href="/history" className="text-sm font-medium text-white hover:text-indigo-400 transition">
              History
            </a>
          </nav>
        </div>
      </header>

      <div className="container py-12">
        {!walletAddress ? (
          <div className="max-w-md mx-auto text-center py-20">
            <div className="text-6xl mb-6">📜</div>
            <h2 className="text-3xl font-bold mb-4">View Snapshot History</h2>
            <p className="text-gray-400 mb-8">
              Connect your wallet to view your Shelby Protocol snapshot history.
            </p>
            <ConnectButton />
          </div>
        ) : loading ? (
          <div className="text-center py-20">
            <div className="w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto" />
            <div className="mt-4 text-gray-400">Loading snapshots...</div>
          </div>
        ) : snapshots.length === 0 ? (
          <div className="max-w-md mx-auto text-center py-20 bg-[#111118] rounded-xl border border-[#2a2a3e]">
            <div className="text-6xl mb-6">📭</div>
            <h2 className="text-2xl font-bold mb-4">No Snapshots Yet</h2>
            <p className="text-gray-400 mb-6">
              Take your first portfolio snapshot to create an immutable record on Shelby Protocol.
            </p>
            <a
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 font-medium hover:opacity-90 transition"
            >
              Go to Portfolio
              <ChevronRight className="w-4 h-4" />
            </a>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-bold">Snapshot History</h2>
              <button
                onClick={fetchHistory}
                className="text-sm text-gray-400 hover:text-white transition"
              >
                Refresh
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Snapshot List */}
              <div className="space-y-4">
                {snapshots.map((snapshot) => {
                  const chainConfig = SUPPORTED_CHAINS.find((c) => c.chain === snapshot.chain);
                  const date = new Date(snapshot.timestamp);
                  const pnl = snapshot.portfolio ? calculatePortfolioPnL(snapshot) : 0;

                  return (
                    <button
                      key={snapshot.id || snapshot.timestamp}
                      onClick={() => setSelectedSnapshot(snapshot)}
                      className={`w-full text-left p-4 bg-[#111118] rounded-xl border transition ${
                        selectedSnapshot?.id === snapshot.id
                          ? "border-indigo-500"
                          : "border-[#2a2a3e] hover:border-[#3a3a4e]"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-400">
                            {date.toLocaleDateString()} {date.toLocaleTimeString()}
                          </span>
                        </div>
                        {chainConfig && (
                          <span className="text-xs px-2 py-1 rounded bg-[#1f1f2e]">
                            {chainConfig.name}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-lg font-bold">
                            ${snapshot.totalValue.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </div>
                          <div className="text-sm text-gray-400">
                            {snapshot.portfolio?.tokens?.length || 0} tokens
                          </div>
                        </div>
                        <div className={`flex items-center gap-1 ${pnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                          {pnl >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                          <span className="font-medium">
                            {pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Snapshot Detail */}
              {selectedSnapshot && (
                <div className="bg-[#111118] rounded-xl border border-[#2a2a3e] p-6 h-fit">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-bold">Snapshot Detail</h3>
                    {selectedSnapshot.shelbyBlobId && (
                      <a
                        href={`https://shelby.xyz/blob/${selectedSnapshot.shelbyBlobId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                      >
                        View on Shelby
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div>
                      <div className="text-sm text-gray-400">Total Value</div>
                      <div className="text-2xl font-bold">
                        ${selectedSnapshot.totalValue.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </div>
                    </div>

                    <div>
                      <div className="text-sm text-gray-400">Timestamp</div>
                      <div className="font-medium">
                        {new Date(selectedSnapshot.timestamp).toLocaleString()}
                      </div>
                    </div>

                    <div>
                      <div className="text-sm text-gray-400">Chain</div>
                      <div className="font-medium">
                        {SUPPORTED_CHAINS.find((c) => c.chain === selectedSnapshot.chain)?.name}
                      </div>
                    </div>

                    <div>
                      <div className="text-sm text-gray-400 mb-2">Tokens</div>
                      {selectedSnapshot.portfolio?.tokens?.map((token: any) => (
                        <div key={token.address} className="flex items-center justify-between py-1">
                          <span>{token.symbol}</span>
                          <span className="text-gray-400">
                            {token.amountFormatted.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function calculatePortfolioPnL(snapshot: SnapshotBlob): number {
  if (!snapshot.portfolio?.tokens) return 0;
  return snapshot.portfolio.tokens.reduce((sum: number, token: any) => sum + (token.pnlUsd || 0), 0);
}
