'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useLiveBlock } from '@/hooks/useLiveBlock';
import { useMarketData } from '@/hooks/useMarketData';
import { useRwaMarketData, useRwaOraclePrice } from '@/hooks/useRwaMarketData';
import { useOraclePrice } from '@/hooks/useOraclePrice';
import { useCreditRateDiscount } from '@/hooks/useBorrowRate';
import { useCreditScore } from '@/hooks/useCreditScore';
import TokenIcon from '@/components/app/TokenIcon';
import SkeletonCard from '@/components/app/SkeletonCard';
import { DEPLOYED_CONTRACTS } from '@/lib/constants';
import { formatUSD, formatPercent } from '@/lib/utils';
import { formatWei, oraclePriceToUSD, utilizationRate } from '@/lib/market';

export default function MarketsPage() {
  useLiveBlock();
  const { data: market, isLoading } = useMarketData();
  const { data: rwaMarket, isLoading: rwaLoading } = useRwaMarketData();
  const { price } = useOraclePrice();
  const { price: rwaPrice } = useRwaOraclePrice();
  const { data: credit } = useCreditScore();
  const { discount } = useCreditRateDiscount(credit?.score);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[1100px]">
        <SkeletonCard lines={6} />
      </div>
    );
  }

  const totalSupply = market ? formatWei(market.totalSupplyAssets, 6) : 0;
  const totalBorrow = market ? formatWei(market.totalBorrowAssets, 6) : 0;
  const util = market && market.totalSupplyAssets > 0n ? utilizationRate(market.totalSupplyAssets, market.totalBorrowAssets) * 100 : 0;
  const oracleUSD = price ? oraclePriceToUSD(price) : 0;
  const feePercent = market ? Number(market.fee) / 1e16 : 0;

  const utilColor = util < 70 ? '#22C55E' : util < 90 ? '#E8A838' : '#EF4444';

  return (
    <div className="mx-auto max-w-[1100px] space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#6a6590]">Markets</span>
          <h2 className="font-display-sans mt-1 text-[28px] font-bold tracking-[-0.02em] text-white">
            Lending Markets
          </h2>
        </div>
      </div>

      {/* Market Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-2xl border border-[#3D3565] bg-[#1e1a35] p-8 transition-all duration-200 hover:-translate-y-1 hover:border-[#c8b6f0]/20 hover:shadow-[0_8px_24px_rgba(200,182,240,0.06)]"
      >
        <span className="absolute left-3 top-3 h-[4px] w-[4px] rounded-full bg-[#c8b6f0]/15" />
        <span className="absolute right-3 top-3 h-[4px] w-[4px] rounded-full bg-[#c8b6f0]/15" />
        <span className="absolute bottom-3 left-3 h-[4px] w-[4px] rounded-full bg-[#c8b6f0]/15" />
        <span className="absolute bottom-3 right-3 h-[4px] w-[4px] rounded-full bg-[#c8b6f0]/15" />

        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="flex -space-x-2">
            <TokenIcon address={DEPLOYED_CONTRACTS.WCTC} size={32} />
            <TokenIcon address={DEPLOYED_CONTRACTS.USDT} size={32} />
          </div>
          <div>
            <h3 className="font-display-sans text-[18px] font-bold text-white">WCTC / USD-TCoin</h3>
            <p className="text-[11px] text-[#6a6590]">Isolated Market &middot; Creditcoin USC Testnet</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="mt-8 grid grid-cols-4 gap-4">
          {[
            { label: 'Total Supplied', value: formatUSD(totalSupply), color: '#f0eef5' },
            { label: 'Total Borrowed', value: formatUSD(totalBorrow), color: '#f0eef5' },
            { label: 'Protocol Fee', value: formatPercent(feePercent), color: '#abadd0' },
            { label: 'Oracle Price', value: `${formatUSD(oracleUSD)}/CTC`, color: '#E8A838' },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-[#3D3565]/50 bg-[#0e0e12]/40 p-4">
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#6a6590]">
                {stat.label}
              </span>
              <p className="financial-number mt-2 text-[18px] font-bold" style={{ color: stat.color }}>
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        {/* Utilization bar */}
        <div className="mt-8">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#6a6590]">
              Utilization
            </span>
            <span className="financial-number text-[14px] font-bold" style={{ color: utilColor }}>
              {formatPercent(util)}
            </span>
          </div>
          <div className="mt-2 h-3 overflow-hidden rounded-full bg-[#3D3565]/30">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: utilColor }}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(util, 100)}%` }}
              transition={{ duration: 1, ease: [0.25, 0.46, 0.45, 0.94] }}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="mt-8 flex items-center gap-4">
          <Link
            href="/app/lend"
            className="rounded-full bg-[#c8b6f0] px-8 py-3 text-[11px] font-bold uppercase tracking-[0.14em] text-[#0e0e12] transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(200,182,240,0.15)]"
          >
            Supply Liquidity
          </Link>
          <Link
            href="/app/borrow"
            className="rounded-full border border-[#3D3565] px-8 py-3 text-[11px] font-bold uppercase tracking-[0.14em] text-[#abadd0] transition-all duration-200 hover:border-[#c8b6f0]/30 hover:text-white"
          >
            Borrow
          </Link>
        </div>
      </motion.div>

      {/* RWA Market Card */}
      {(() => {
        const rwaSupply = rwaMarket ? formatWei(rwaMarket.totalSupplyAssets, 6) : 0;
        const rwaBorrow = rwaMarket ? formatWei(rwaMarket.totalBorrowAssets, 6) : 0;
        const rwaUtil = rwaMarket && rwaMarket.totalSupplyAssets > 0n ? utilizationRate(rwaMarket.totalSupplyAssets, rwaMarket.totalBorrowAssets) * 100 : 0;
        const rwaUtilColor = rwaUtil < 70 ? '#22C55E' : rwaUtil < 90 ? '#E8A838' : '#EF4444';
        const rwaPriceDisplay = rwaPrice ? (Number(rwaPrice) / 1e36).toFixed(4) : '--';

        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="relative rounded-2xl border border-[#3D3565] bg-[#1e1a35] p-8 transition-all duration-200 hover:-translate-y-1 hover:border-[#c8b6f0]/20 hover:shadow-[0_8px_24px_rgba(200,182,240,0.06)]"
          >
            <span className="absolute left-3 top-3 h-[4px] w-[4px] rounded-full bg-[#c8b6f0]/15" />
            <span className="absolute right-3 top-3 h-[4px] w-[4px] rounded-full bg-[#c8b6f0]/15" />
            <span className="absolute bottom-3 left-3 h-[4px] w-[4px] rounded-full bg-[#c8b6f0]/15" />
            <span className="absolute bottom-3 right-3 h-[4px] w-[4px] rounded-full bg-[#c8b6f0]/15" />

            {/* Header */}
            <div className="flex items-center gap-4">
              <div className="flex -space-x-2">
                <TokenIcon address={DEPLOYED_CONTRACTS.WikshiReceivableWrapper} size={32} />
                <TokenIcon address={DEPLOYED_CONTRACTS.USDT_RWA} size={32} />
              </div>
              <div>
                <h3 className="font-display-sans text-[18px] font-bold text-white">wREC / USDT</h3>
                <p className="text-[11px] text-[#6a6590]">RWA Receivable-Backed &middot; 70% LLTV</p>
              </div>
              <span className="ml-auto rounded-full bg-[#E8A838]/10 px-3 py-1 text-[9px] font-bold uppercase tracking-[0.14em] text-[#E8A838]">
                RWA
              </span>
            </div>

            {/* Stats Grid */}
            <div className="mt-8 grid grid-cols-4 gap-4">
              {[
                { label: 'Total Supplied', value: formatUSD(rwaSupply), color: '#f0eef5' },
                { label: 'Total Borrowed', value: formatUSD(rwaBorrow), color: '#f0eef5' },
                { label: 'LLTV', value: '70%', color: '#abadd0' },
                { label: 'Oracle Price', value: rwaPriceDisplay, color: '#E8A838' },
              ].map((stat) => (
                <div key={stat.label} className="rounded-xl border border-[#3D3565]/50 bg-[#0e0e12]/40 p-4">
                  <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#6a6590]">
                    {stat.label}
                  </span>
                  <p className="financial-number mt-2 text-[18px] font-bold" style={{ color: stat.color }}>
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>

            {/* Utilization bar */}
            <div className="mt-8">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#6a6590]">
                  Utilization
                </span>
                <span className="financial-number text-[14px] font-bold" style={{ color: rwaUtilColor }}>
                  {formatPercent(rwaUtil)}
                </span>
              </div>
              <div className="mt-2 h-3 overflow-hidden rounded-full bg-[#3D3565]/30">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: rwaUtilColor }}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(rwaUtil, 100)}%` }}
                  transition={{ duration: 1, ease: [0.25, 0.46, 0.45, 0.94] }}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="mt-8 flex items-center gap-4">
              <Link
                href="/app/rwa"
                className="rounded-full bg-[#c8b6f0] px-8 py-3 text-[11px] font-bold uppercase tracking-[0.14em] text-[#0e0e12] transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(200,182,240,0.15)]"
              >
                RWA Pipeline
              </Link>
              <Link
                href="/app/rwa"
                className="rounded-full border border-[#3D3565] px-8 py-3 text-[11px] font-bold uppercase tracking-[0.14em] text-[#abadd0] transition-all duration-200 hover:border-[#c8b6f0]/30 hover:text-white"
              >
                Supply Liquidity
              </Link>
            </div>
          </motion.div>
        );
      })()}
    </div>
  );
}
