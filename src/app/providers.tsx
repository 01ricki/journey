"use client";

import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mainnet, bsc, polygon, arbitrum, base, avalanche } from "viem/chains";
import { WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { clusterApiUrl } from "@solana/web3.js";
import { PhantomWalletAdapter, SolflareWalletAdapter } from "@solana/wallet-adapter-wallets";
import { useMemo } from "react";
import "@rainbow-me/rainbowkit/styles.css";
import "@solana/wallet-adapter-react-ui/styles.css";

const wagmiConfig = {
  chains: [mainnet, bsc, polygon, arbitrum, base, avalanche],
  transports: {
    [mainnet.id]: "https://eth.llamarpc.com",
    [bsc.id]: "https://bsc-dataseed.binance.org",
    [polygon.id]: "https://polygon-rpc.com",
    [arbitrum.id]: "https://arb1.arbitrum.io/rpc",
    [base.id]: "https://mainnet.base.org",
    [avalanche.id]: "https://api.avax.network/ext/bc/C/rpc",
  },
  connectors: [],
} as any;

const queryClient = new QueryClient();

function SolanaWalletProvider({ children }: { children: React.ReactNode }) {
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ],
    []
  );

  return (
    <WalletProvider wallets={wallets} autoConnect>
      <WalletModalProvider>{children}</WalletModalProvider>
    </WalletProvider>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme()}
          chains={[mainnet, bsc, polygon, arbitrum, base, avalanche]}
        >
          <SolanaWalletProvider>{children}</SolanaWalletProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
