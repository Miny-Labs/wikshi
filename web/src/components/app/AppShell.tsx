'use client';

import { useState, useEffect } from 'react';
import { useAccount, useBalance } from 'wagmi';
import { Web3ProviderContent } from '@/components/Web3ProviderContent';
import { TxProvider } from '@/components/app/TxProvider';
import { DemoProvider } from '@/components/app/demo/DemoProvider';
import DemoOverlay from '@/components/app/demo/DemoOverlay';
import DemoDialog from '@/components/app/demo/DemoDialog';
import DemoProgress from '@/components/app/demo/DemoProgress';
import DemoLauncher from '@/components/app/demo/DemoLauncher';
import Sidebar from '@/components/app/Sidebar';
import AppHeader from '@/components/app/AppHeader';
import ConnectWalletPrompt from '@/components/app/ConnectWalletPrompt';
import ChainSwitchPrompt from '@/components/app/ChainSwitchPrompt';
import NoGasPrompt from '@/components/app/NoGasPrompt';
import { creditcoinTestnet } from '@/lib/wagmi';

const MIN_GAS_WEI = 1_000_000_000_000_000n; // 0.001 tCTC

function AppShellInner({ children }: { children: React.ReactNode }) {
  const { isConnected, address, chainId } = useAccount();
  const isCorrectChain = chainId === creditcoinTestnet.id;
  const { data: nativeBalance, isLoading: balanceLoading } = useBalance({
    address,
    query: { enabled: isConnected && isCorrectChain },
  });

  // Not connected — show premium connect screen
  if (!isConnected) {
    return (
      <div className="theme-app noise-bg min-h-screen">
        <ConnectWalletPrompt />
      </div>
    );
  }

  // Wrong chain — show switch prompt
  if (!isCorrectChain) {
    return (
      <div className="theme-app noise-bg flex min-h-screen items-center justify-center">
        <ChainSwitchPrompt />
      </div>
    );
  }

  // No gas — block app until they fund the wallet
  if (!balanceLoading && nativeBalance && nativeBalance.value < MIN_GAS_WEI) {
    return (
      <div className="theme-app noise-bg flex min-h-screen items-center justify-center">
        <NoGasPrompt address={address!} balance={nativeBalance.value} />
      </div>
    );
  }

  // Connected + correct chain + has gas — full app
  return (
    <DemoProvider>
      <div className="theme-app noise-bg flex min-h-screen">
        <Sidebar />
        <div className="ml-[260px] flex flex-1 flex-col">
          <AppHeader />
          <DemoProgress />
          <main className="app-content-glow relative flex-1 px-8 py-8">
            {children}
          </main>
        </div>
      </div>
      <DemoOverlay />
      <DemoDialog />
      <DemoLauncher />
    </DemoProvider>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent SSR — wagmi needs localStorage
  if (!mounted) {
    return (
      <div className="theme-app flex min-h-screen items-center justify-center">
        <div className="skeleton h-8 w-32" />
      </div>
    );
  }

  return (
    <Web3ProviderContent>
      <TxProvider>
        <AppShellInner>{children}</AppShellInner>
      </TxProvider>
    </Web3ProviderContent>
  );
}
