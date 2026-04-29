"use client";

import { useState, useEffect, useMemo } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useDisconnect, useBalance } from "wagmi";
import { useWallet } from "@solana/wallet-adapter-react";
import { Token, Portfolio, PnLEntry, Chain, SUPPORTED_CHAINS, detectChain } from "@/types";
import { getSPLTokens, getNativeBalance, formatWalletAddress } from "@/lib/solana";
import { getEVMTokens, getEVMBalance } from "@/lib/evm";
import { enrichTokensWithPrices } from "@/lib/prices";
import { calculatePnL, calculateTotalPnL } from "@/lib/pnl";
import { uploadSnapshot } from "@/lib/shelby";
import { TrendingUp, TrendingDown, Camera, RefreshCw, Wallet, ChevronDown } from "lucide-react";

export default function PortfolioPage() {
  // EVM state
  const { address: evmAddress, isConnected: evmConnected, chain: evmChain } = useAccount();
  const { disconnect } = useDisconnect();

  // Solana state
  const { publicKey: solanaPublicKey, disconnect: disconnectSolana, connected: solanaConnected } = useWallet();

  // Derived addresses
  const evmAddr = evmAddress as string | undefined;
  const solanaAddr = solanaPublicKey?.toBase58();

  // Determine which chain to show
  const activeChain: Chain = useMemo(() => {
    if (solanaConnected && solanaAddr) return "solana";
    if (evmConnected && evmAddr) return detectChain(evmAddr);
    return "solana";
  }, [solanaConnected, solanaAddr, evmConnected, evmAddr]);

  const walletAddress = solanaConnected ? solanaAddr : evmAddr;
  const isConnected = solanaConnected || evmConnected;

  // Portfolio state
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [pnl, setPnl] = useState<PnLEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [snapshotting, setSnapshotting] = useState(false);
  const [snapshotSuccess, setSnapshotSuccess] = useState(false);
  const [lastSnapshot, setLastSnapshot] = useState<string | null>(null);

  // Fetch portfolio
  async function fetchPortfolio() {
    if (!walletAddress || !activeChain) return;

    setLoading(true);
    try {
      let tokens: Token[] = [];

      if (activeChain === "solana") {
        // Get SOL balance
        const sol = await getNativeBalance(walletAddress);
        tokens = [sol];

        // Get SPL tokens
        const splTokens = await getSPLTokens(walletAddress);
        tokens = [...tokens, ...splTokens];
      } else {
        // Get native balance
        const native = await getEVMBalance(walletAddress, activeChain);
        tokens = [native];

        // Get ERC-20 tokens
        const ercTokens = await getEVMTokens(walletAddress, activeChain);
        tokens = [...tokens, ...ercTokens];
      }

      // Enrich with prices
      tokens = await enrichTokensWithPrices(tokens);

      // Filter out zero value tokens
      tokens = tokens.filter((t) => t.value > 0 || t.symbol === "SOL" || t.symbol === "ETH" || t.symbol === "BNB" || t.symbol === "MATIC" || t.symbol === "AVAX");

      const totalValue = tokens.reduce((sum, t) => sum + t.value, 0);

      const chainConfig = SUPPORTED_CHAINS.find((c) => c.chain === activeChain);

      setPortfolio({
        address: walletAddress,
        chain: activeChain,
        totalValue,
        tokens,
        timestamp: new Date().toISOString(),
        chainLogo: chainConfig?.icon,
      });

      // Calculate PnL
      const pnlData = await calculatePnL(tokens, walletAddress);
      setPnl(pnlData);
    } catch (error) {
      console.error("Failed to fetch portfolio:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isConnected) {
      fetchPortfolio();
    }
  }, [isConnected, walletAddress, activeChain]);

  // Snapshot handler
  async function handleSnapshot() {
    if (!portfolio || !walletAddress) return;

    setSnapshotting(true);
    try {
      const snapshot = {
        timestamp: new Date().toISOString(),
        address: walletAddress,
        chain: activeChain,
        totalValue: portfolio.totalValue,
        portfolio,
        pnl,
        agentVersion: "1.0.0",
      };

      const blobId = await uploadSnapshot(snapshot);
      setLastSnapshot(blobId);
      setSnapshotSuccess(true);
      setTimeout(() => setSnapshotSuccess(false), 3000);
    } catch (error) {
      console.error("Snapshot failed:", error);
    } finally {
      setSnapshotting(false);
    }
  }

  const totalPnL = calculateTotalPnL(pnl);

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
            <a href="/" className="text-sm font-medium text-white hover:text-indigo-400 transition">
              Portfolio
            </a>
            <a href="/history" className="text-sm font-medium text-gray-400 hover:text-indigo-400 transition">
              History
            </a>
          </nav>
        </div>
      </header>

      <div className="container py-12">
        {/* Wallet Connection */}
        {!isConnected ? (
          <div className="max-w-md mx-auto text-center py-20">
            <div className="text-6xl mb-6">🧭</div>
            <h2 className="text-3xl font-bold mb-4">Connect Your Wallet</h2>
            <p className="text-gray-400 mb-8">
              Track your portfolio across Solana and EVM chains.
              <br />
              Your data stays private — only you can see it.
            </p>
            <ConnectButton />
          </div>
        ) : (
          <>
            {/* Wallet Info Bar */}
            <div className="flex items-center justify-between mb-8 p-4 bg-[#111118] rounded-xl border border-[#2a2a3e]">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="font-medium">{formatWalletAddress(walletAddress || "")}</div>
                  <div className="text-sm text-gray-400">
                    {SUPPORTED_CHAINS.find((c) => c.chain === activeChain)?.name}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={fetchPortfolio}
                  disabled={loading}
                  className="p-2 rounded-lg bg-[#1f1f2e] hover:bg-[#2a2a3e] transition disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                </button>
                <ConnectButton showBalance={false} />
              </div>
            </div>

            {/* Portfolio Summary */}
            {portfolio && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* Total Value */}
                <div className="bg-[#111118] rounded-xl border border-[#2a2a3e] p-6">
                  <div className="text-sm text-gray-400 mb-2">Total Portfolio Value</div>
                  <div className="text-3xl font-bold">
                    ${portfolio.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>

                {/* PnL */}
                <div className="bg-[#111118] rounded-xl border border-[#2a2a3e] p-6">
                  <div className="text-sm text-gray-400 mb-2">Total PnL</div>
                  <div className={`text-3xl font-bold flex items-center gap-2 ${totalPnL.totalPnL >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {totalPnL.totalPnL >= 0 ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
                    {totalPnL.totalPnL >= 0 ? "+" : ""}
                    ${totalPnL.totalPnL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className={`text-sm mt-1 ${totalPnL.totalPnLPercent >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {totalPnL.totalPnLPercent >= 0 ? "+" : ""}{totalPnL.totalPnLPercent.toFixed(2)}%
                  </div>
                </div>

                {/* Snapshot Button */}
                <div className="bg-[#111118] rounded-xl border border-[#2a2a3e] p-6">
                  <div className="text-sm text-gray-400 mb-2">Shelby Snapshot</div>
                  <button
                    onClick={handleSnapshot}
                    disabled={snapshotting || !portfolio.totalValue}
                    className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 font-medium hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Camera className="w-4 h-4" />
                    {snapshotting ? "Uploading..." : snapshotSuccess ? "Uploaded!" : "Snapshot to Shelby"}
                  </button>
                  {lastSnapshot && (
                    <div className="text-xs text-gray-500 mt-2 truncate">
                      Blob: {lastSnapshot}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Token List */}
            {loading ? (
              <div className="text-center py-20">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-400" />
                <div className="mt-4 text-gray-400">Loading portfolio...</div>
              </div>
            ) : portfolio && portfolio.tokens.length > 0 ? (
              <div className="bg-[#111118] rounded-xl border border-[#2a2a3e] overflow-hidden">
                <div className="p-4 border-b border-[#2a2a3e]">
                  <h3 className="font-medium">Token Holdings</h3>
                </div>
                <div className="divide-y divide-[#2a2a3e]">
                  {portfolio.tokens
                    .sort((a, b) => b.value - a.value)
                    .map((token) => (
                      <div key={token.address} className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#1f1f2e] flex items-center justify-center text-lg">
                            {token.logoUri ? (
                              <img src={token.logoUri} alt={token.symbol} className="w-6 h-6 rounded-full" />
                            ) : (
                              token.symbol[0]
                            )}
                          </div>
                          <div>
                            <div className="font-medium">{token.symbol}</div>
                            <div className="text-sm text-gray-400">
                              {token.amountFormatted.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">
                            ${token.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                          <div className="text-sm text-gray-400">
                            @ ${token.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-20 bg-[#111118] rounded-xl border border-[#2a2a3e]">
                <div className="text-4xl mb-4">📭</div>
                <div className="text-gray-400">No tokens found. Try a different wallet.</div>
              </div>
            )}

            {/* PnL Table */}
            {pnl.length > 0 && (
              <div className="mt-8 bg-[#111118] rounded-xl border border-[#2a2a3e] overflow-hidden">
                <div className="p-4 border-b border-[#2a2a3e]">
                  <h3 className="font-medium">Profit & Loss (Entry = First Transfer)</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-sm text-gray-400 border-b border-[#2a2a3e]">
                        <th className="p-4">Token</th>
                        <th className="p-4">Amount</th>
                        <th className="p-4">Entry</th>
                        <th className="p-4">Current</th>
                        <th className="p-4">PnL</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2a2a3e]">
                      {pnl
                        .filter((p) => p.costBasis > 0)
                        .map((entry) => (
                          <tr key={entry.symbol}>
                            <td className="p-4 font-medium">{entry.symbol}</td>
                            <td className="p-4">{entry.amount.toLocaleString(undefined, { maximumFractionDigits: 4 })}</td>
                            <td className="p-4">${entry.entryPrice.toFixed(4)}</td>
                            <td className="p-4">${entry.currentPrice.toFixed(4)}</td>
                            <td className={`p-4 font-medium ${entry.pnlUsd >= 0 ? "text-green-400" : "text-red-400"}`}>
                              {entry.pnlUsd >= 0 ? "+" : ""}${entry.pnlUsd.toFixed(2)}
                              <span className="ml-1 text-xs">
                                ({entry.pnlPercent >= 0 ? "+" : ""}{entry.pnlPercent.toFixed(1)}%)
                              </span>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
