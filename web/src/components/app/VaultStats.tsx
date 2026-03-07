'use client';

import { motion } from 'framer-motion';
import { useVaultData } from '@/hooks/useVaultData';
import { formatWei } from '@/lib/market';
import { formatUSD } from '@/lib/utils';

interface VaultStatsProps {
  delay?: number;
}

export default function VaultStats({ delay = 0 }: VaultStatsProps) {
  const { totalAssets, totalSupply, userShares, userAssets, sharePrice, isLoading } = useVaultData();

  const tvl = totalAssets ? formatWei(totalAssets, 6) : 0;
  const shares = totalSupply ? formatWei(totalSupply, 6) : 0;
  const myShares = userShares ? formatWei(userShares, 6) : 0;
  const myAssets = userAssets ? formatWei(userAssets, 6) : 0;

  if (isLoading) {
    return (
      <div className="relative rounded-2xl border border-[#3D3565] bg-[#1e1a35] p-8 animate-pulse">
        <div className="h-4 w-24 rounded bg-[#3D3565]/50" />
        <div className="mt-4 space-y-3">
          <div className="h-3 w-full rounded bg-[#3D3565]/30" />
          <div className="h-3 w-3/4 rounded bg-[#3D3565]/30" />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="relative rounded-2xl border border-[#3D3565] bg-[#1e1a35] p-8 transition-all duration-200 hover:-translate-y-1 hover:border-[#c8b6f0]/20 hover:shadow-[0_8px_24px_rgba(200,182,240,0.06)]"
    >
      <span className="absolute left-3 top-3 h-[4px] w-[4px] rounded-full bg-[#c8b6f0]/15" />
      <span className="absolute right-3 top-3 h-[4px] w-[4px] rounded-full bg-[#c8b6f0]/15" />
      <span className="absolute bottom-3 left-3 h-[4px] w-[4px] rounded-full bg-[#c8b6f0]/15" />
      <span className="absolute bottom-3 right-3 h-[4px] w-[4px] rounded-full bg-[#c8b6f0]/15" />

      <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#6a6590]">
        MetaVault (ERC-4626)
      </span>

      <div className="mt-5 space-y-3">
        {[
          { label: 'Total Value Locked', value: formatUSD(tvl), color: '#c8b6f0' },
          { label: 'Total Shares', value: shares.toFixed(2), color: '#f0eef5' },
          { label: 'Share Price', value: sharePrice.toFixed(4), color: '#E8A838' },
          { label: 'Your Shares', value: myShares.toFixed(2), color: '#f0eef5' },
          { label: 'Your Assets', value: formatUSD(myAssets), color: '#c8b6f0' },
        ].map((row) => (
          <div key={row.label} className="flex items-center justify-between border-b border-[#3D3565]/30 pb-2">
            <span className="text-[12px] text-[#abadd0]">{row.label}</span>
            <span className="financial-number text-[13px] font-bold" style={{ color: row.color }}>
              {row.value}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
