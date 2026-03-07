'use client';

import { useAccount, useBlockNumber, useDisconnect } from 'wagmi';
import { shortenAddress } from '@/lib/utils';
import { LogOut } from 'lucide-react';

export default function AppHeader() {
  const { address } = useAccount();
  const { data: blockNumber } = useBlockNumber({ watch: true });
  const { disconnect } = useDisconnect();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[#3D3565]/40 bg-[#0e0e12]/80 px-8 backdrop-blur-xl">
      {/* Left — Page context */}
      <div className="flex items-center gap-4">
        {blockNumber && (
          <div className="flex items-center gap-2">
            <span className="relative flex h-1.5 w-1.5">
              <span className="pulse-live absolute inline-flex h-full w-full rounded-full bg-[#22C55E] opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#22C55E]" />
            </span>
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#6a6590]">
              Live
            </span>
            <span className="financial-number text-[11px] font-medium text-[#555375]">
              #{blockNumber.toString()}
            </span>
          </div>
        )}
      </div>

      {/* Right — Wallet */}
      <div className="flex items-center gap-3">
        {address && (
          <span className="rounded-full border border-[#3D3565] bg-[#1e1a35] px-3 py-1 font-mono text-[11px] text-[#abadd0]">
            {shortenAddress(address)}
          </span>
        )}
        <button
          onClick={() => disconnect()}
          className="flex items-center gap-1.5 rounded-full border border-[#3D3565] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#6a6590] transition-all duration-200 hover:border-[#c8b6f0]/30 hover:text-[#abadd0]"
        >
          <LogOut size={12} />
          Disconnect
        </button>
      </div>
    </header>
  );
}
