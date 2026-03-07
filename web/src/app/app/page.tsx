'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, TrendingUp, TrendingDown, Shield, ExternalLink } from 'lucide-react';
import { useTxNotify } from '@/components/app/TxProvider';
import { blockscoutAddressUrl, blockscoutTxUrl, shortenAddress, shortenTxHash } from '@/lib/utils';
import { useLiveBlock } from '@/hooks/useLiveBlock';
import { useMarketData } from '@/hooks/useMarketData';
import { useUserPosition } from '@/hooks/useUserPosition';
import { useTokenBalances } from '@/hooks/useTokenBalances';
import { useCreditScore } from '@/hooks/useCreditScore';
import { useOraclePrice } from '@/hooks/useOraclePrice';
import StatCard from '@/components/app/StatCard';
import ScoreGauge from '@/components/app/ScoreGauge';
import TokenIcon from '@/components/app/TokenIcon';
import SkeletonCard from '@/components/app/SkeletonCard';
import { DEPLOYED_CONTRACTS } from '@/lib/constants';
import { formatUSD, formatCTC, tierName, TIER_COLORS } from '@/lib/utils';
import { formatWei, oraclePriceToUSD, healthFactor, utilizationRate } from '@/lib/market';

export default function DashboardPage() {
  useLiveBlock();
  const { data: market, isLoading: marketLoading } = useMarketData();
  const { data: position, isLoading: positionLoading } = useUserPosition();
  const { wctc, usdt, usdtRwa, wrec, native } = useTokenBalances();
  const { data: credit } = useCreditScore();
  const { price } = useOraclePrice();
  const { txHistory } = useTxNotify();

  const isLoading = marketLoading || positionLoading;

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[1100px] space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <SkeletonCard lines={2} />
          <SkeletonCard lines={2} />
          <SkeletonCard lines={2} />
        </div>
        <div className="grid grid-cols-2 gap-6">
          <SkeletonCard lines={5} />
          <SkeletonCard lines={4} />
        </div>
      </div>
    );
  }

  const oracleUSD = price ? oraclePriceToUSD(price) : 0;

  const suppliedUSD = position && position.supplyShares > 0n ? formatWei(position.supplyShares, 6) : 0;
  const borrowedUSD = position && position.borrowAssets > 0n ? formatWei(position.borrowAssets, 6) : 0;
  const collateralWCTC = position && position.collateral > 0n ? formatWei(position.collateral, 18) : 0;
  const collateralUSD = collateralWCTC * oracleUSD;
  const netWorth = suppliedUSD + collateralUSD - borrowedUSD;

  const hf = position && position.borrowAssets > 0n && price && position.effectiveLltvValue > 0n
    ? healthFactor(position.collateral, position.borrowAssets, price, position.effectiveLltvValue)
    : null;

  const totalSupplyVal = market && market.totalSupplyAssets > 0n ? formatWei(market.totalSupplyAssets, 6) : 0;
  const totalBorrowVal = market && market.totalBorrowAssets > 0n ? formatWei(market.totalBorrowAssets, 6) : 0;
  const util = totalSupplyVal > 0 ? (totalBorrowVal / totalSupplyVal) * 100 : 0;

  const score = credit?.score || 0;
  const tier = credit?.tier || 0;
  const tName = tierName(tier);
  const tColor = TIER_COLORS[tName];
  const hasSBT = credit?.hasSBT ?? false;

  const wctcVal = wctc && wctc > 0n ? formatWei(wctc, 18) : 0;
  const usdtVal = usdt && usdt > 0n ? formatWei(usdt, 6) : 0;
  const usdtRwaVal = usdtRwa && usdtRwa > 0n ? formatWei(usdtRwa, 6) : 0;
  const wrecVal = wrec && wrec > 0n ? formatWei(wrec, 18) : 0;
  const nativeVal = native && native > 0n ? formatWei(native, 18) : 0;

  // Check if this is a fresh setup (nothing configured yet)
  const needsSetup = !price && score === 0 && wctcVal === 0 && usdtVal === 0;

  const CONTRACTS = [
    { name: 'WikshiLend', address: DEPLOYED_CONTRACTS.WikshiLend, desc: 'Core lending pool' },
    { name: 'CreditOracle', address: DEPLOYED_CONTRACTS.WikshiCreditOracle, desc: 'Credit score oracle' },
    { name: 'CreditSBT', address: DEPLOYED_CONTRACTS.WikshiCreditSBT, desc: 'Soulbound identity' },
    { name: 'PriceOracle', address: DEPLOYED_CONTRACTS.WikshiOracle, desc: 'CTC/USD price feed' },
    { name: 'IRM', address: DEPLOYED_CONTRACTS.WikshiIrm, desc: 'Interest rate model' },
    { name: 'Vault', address: DEPLOYED_CONTRACTS.WikshiVault, desc: 'ERC-4626 vault' },
    { name: 'WCTC', address: DEPLOYED_CONTRACTS.WCTC, desc: 'Wrapped CTC token' },
    { name: 'USDT', address: DEPLOYED_CONTRACTS.USDT, desc: 'Test stablecoin' },
    { name: 'Receivable', address: DEPLOYED_CONTRACTS.WikshiReceivable, desc: 'RWA ERC-721' },
    { name: 'Wrapper', address: DEPLOYED_CONTRACTS.WikshiReceivableWrapper, desc: 'wREC ERC-20' },
    { name: 'RWA Oracle', address: DEPLOYED_CONTRACTS.WikshiReceivableOracle, desc: 'wREC price feed' },
    { name: 'Liquidator', address: DEPLOYED_CONTRACTS.WikshiLiquidationRouter, desc: 'Atomic liquidation' },
    { name: 'Payments', address: DEPLOYED_CONTRACTS.PaymentTracker, desc: 'Payment tracking' },
    { name: 'USDT (RWA)', address: DEPLOYED_CONTRACTS.USDT_RWA, desc: 'RWA stablecoin' },
  ];

  return (
    <div className="mx-auto max-w-[1100px] space-y-8">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#6a6590]">Dashboard</span>
          <h2 className="font-display-sans mt-1 text-[28px] font-bold tracking-[-0.02em] text-white">
            Portfolio Overview
          </h2>
        </div>
      </div>

      {/* Guided Setup */}
      {needsSetup && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-[#E8A838]/20 bg-[#E8A838]/5 p-6"
        >
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#E8A838]">
            Getting Started
          </span>
          <h3 className="font-display-sans mt-1 text-[16px] font-bold text-white">
            Set up your demo in 4 steps
          </h3>
          <div className="mt-4 grid grid-cols-4 gap-3">
            {[
              { step: 1, label: 'Set Oracle Price', href: '/app/admin', desc: '$0.42/CTC' },
              { step: 2, label: 'Submit Credit Score', href: '/app/admin', desc: 'Score: 720' },
              { step: 3, label: 'Mint Test Tokens', href: '/app/admin', desc: 'WCTC + USDT' },
              { step: 4, label: 'Mint Credit SBT', href: '/app/credit', desc: 'Soulbound ID' },
            ].map((s) => (
              <Link
                key={s.step}
                href={s.href}
                className="group flex items-start gap-3 rounded-xl border border-[#3D3565] bg-[#1e1a35]/60 p-4 transition-all hover:border-[#E8A838]/30"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#E8A838]/15 text-[11px] font-bold text-[#E8A838]">
                  {s.step}
                </span>
                <div>
                  <p className="text-[12px] font-bold text-white">{s.label}</p>
                  <p className="text-[10px] text-[#6a6590]">{s.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </motion.div>
      )}

      {/* Top stat cards */}
      <div data-demo="stat-cards" className="grid grid-cols-3 gap-4">
        <StatCard
          label="Net Worth"
          value={netWorth}
          format={(v) => formatUSD(v)}
          icon={TrendingUp}
          accent="teal"
          delay={0}
        />
        <StatCard
          label="Total Supplied"
          value={suppliedUSD}
          format={(v) => formatUSD(v)}
          icon={TrendingUp}
          accent="blue"
          delay={0.06}
        />
        <StatCard
          label="Total Borrowed"
          value={borrowedUSD}
          format={(v) => formatUSD(v)}
          icon={TrendingDown}
          accent="gold"
          delay={0.12}
        />
      </div>

      {/* Credit + Position */}
      <div className="grid grid-cols-2 gap-6">
        {/* Mini Credit Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
          className="group relative rounded-2xl border border-[#3D3565] bg-[#1e1a35] p-8 transition-all duration-200 hover:-translate-y-1 hover:border-[#c8b6f0]/20 hover:shadow-[0_8px_24px_rgba(200,182,240,0.06)]"
        >
          <span className="absolute left-3 top-3 h-[4px] w-[4px] rounded-full bg-[#c8b6f0]/15" />
          <span className="absolute right-3 top-3 h-[4px] w-[4px] rounded-full bg-[#c8b6f0]/15" />
          <span className="absolute bottom-3 left-3 h-[4px] w-[4px] rounded-full bg-[#c8b6f0]/15" />
          <span className="absolute bottom-3 right-3 h-[4px] w-[4px] rounded-full bg-[#c8b6f0]/15" />

          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#6a6590]">
            Credit Score
          </span>

          <div className="mt-4 flex items-center gap-6">
            <div className="relative">
              <div className="absolute inset-0 rounded-full" style={{ boxShadow: `0 0 60px ${tColor}20` }} />
              <ScoreGauge score={score} tier={tier} size={140} />
            </div>
            <div className="space-y-3">
              <div>
                <span className="text-[11px] text-[#6a6590]">Trust Tier</span>
                <p className="font-display-sans text-[16px] font-bold" style={{ color: tColor }}>
                  {tName}
                </p>
              </div>
              <div>
                <span className="text-[11px] text-[#6a6590]">SBT Status</span>
                <p className="flex items-center gap-1.5 text-[13px] font-bold text-white">
                  {hasSBT && (
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#22C55E]" />
                  )}
                  {hasSBT ? 'Minted' : 'Not Minted'}
                </p>
              </div>
              <Link
                href="/app/credit"
                className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-[#c8b6f0] transition-opacity hover:opacity-80"
              >
                View Passport <ArrowRight size={12} />
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Active Position Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.24 }}
          className="group relative rounded-2xl border border-[#3D3565] bg-[#1e1a35] p-8 transition-all duration-200 hover:-translate-y-1 hover:border-[#c8b6f0]/20 hover:shadow-[0_8px_24px_rgba(200,182,240,0.06)]"
        >
          <span className="absolute left-3 top-3 h-[4px] w-[4px] rounded-full bg-[#c8b6f0]/15" />
          <span className="absolute right-3 top-3 h-[4px] w-[4px] rounded-full bg-[#c8b6f0]/15" />
          <span className="absolute bottom-3 left-3 h-[4px] w-[4px] rounded-full bg-[#c8b6f0]/15" />
          <span className="absolute bottom-3 right-3 h-[4px] w-[4px] rounded-full bg-[#c8b6f0]/15" />

          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#6a6590]">
            Active Position
          </span>

          {(collateralWCTC > 0 || borrowedUSD > 0) ? (
            <div className="mt-5 space-y-3">
              {[
                {
                  label: 'Collateral',
                  value: `${collateralWCTC.toFixed(4)} WCTC`,
                  sub: formatUSD(collateralUSD),
                  icon: DEPLOYED_CONTRACTS.WCTC,
                },
                {
                  label: 'Borrowed',
                  value: formatUSD(borrowedUSD),
                  icon: DEPLOYED_CONTRACTS.USDT,
                },
                {
                  label: 'Health Factor',
                  value: hf !== null ? hf.toFixed(2) : '--',
                  color: hf !== null ? (hf > 1.5 ? '#22C55E' : hf > 1.2 ? '#E8A838' : '#EF4444') : '#abadd0',
                },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between border-b border-[#3D3565]/30 pb-2">
                  <span className="flex items-center gap-2 text-[12px] text-[#abadd0]">
                    {'icon' in row && row.icon && <TokenIcon address={row.icon} size={16} />}
                    {row.label}
                  </span>
                  <div className="text-right">
                    <span
                      className="financial-number text-[13px] font-bold"
                      style={{ color: 'color' in row && row.color ? row.color : '#f0eef5' }}
                    >
                      {row.value}
                    </span>
                    {'sub' in row && row.sub && (
                      <span className="ml-2 text-[11px] text-[#555375]">{row.sub}</span>
                    )}
                  </div>
                </div>
              ))}

              <div className="flex gap-3 pt-2">
                <Link
                  href="/app/borrow"
                  className="flex-1 rounded-full border border-[#3D3565] py-2 text-center text-[10px] font-bold uppercase tracking-[0.14em] text-[#abadd0] transition-all hover:border-[#c8b6f0]/30 hover:text-white"
                >
                  Manage
                </Link>
                <Link
                  href="/app/lend"
                  className="flex-1 rounded-full bg-[#c8b6f0] py-2 text-center text-[10px] font-bold uppercase tracking-[0.14em] text-[#0e0e12] transition-all hover:shadow-[0_0_20px_rgba(200,182,240,0.15)]"
                >
                  Supply More
                </Link>
              </div>
            </div>
          ) : (
            <div className="mt-8 flex flex-col items-center py-4 text-center">
              <Shield size={32} strokeWidth={1.2} className="text-[#3D3565]" />
              <p className="mt-3 text-[13px] text-[#6a6590]">No active position</p>
              <Link
                href="/app/borrow"
                className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#c8b6f0] px-6 py-2.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#0e0e12] transition-all hover:shadow-[0_0_20px_rgba(200,182,240,0.15)]"
              >
                Start Borrowing <ArrowRight size={12} />
              </Link>
            </div>
          )}
        </motion.div>
      </div>

      {/* Token Balances + Market Quick Stats */}
      <div className="grid grid-cols-2 gap-6">
        {/* Token Balances */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.30 }}
          className="relative rounded-2xl border border-[#3D3565] bg-[#1e1a35] p-8"
        >
          <span className="absolute left-3 top-3 h-[4px] w-[4px] rounded-full bg-[#c8b6f0]/15" />
          <span className="absolute right-3 top-3 h-[4px] w-[4px] rounded-full bg-[#c8b6f0]/15" />
          <span className="absolute bottom-3 left-3 h-[4px] w-[4px] rounded-full bg-[#c8b6f0]/15" />
          <span className="absolute bottom-3 right-3 h-[4px] w-[4px] rounded-full bg-[#c8b6f0]/15" />

          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#6a6590]">
            Wallet Balances
          </span>

          <div className="mt-5 space-y-3">
            {[
              {
                token: 'WCTC',
                address: DEPLOYED_CONTRACTS.WCTC,
                balance: wctcVal.toFixed(4),
                usd: formatUSD(wctcVal * oracleUSD),
              },
              {
                token: 'USDT',
                address: DEPLOYED_CONTRACTS.USDT,
                balance: usdtVal.toFixed(2),
                usd: formatUSD(usdtVal),
              },
              {
                token: 'USDT (RWA)',
                address: DEPLOYED_CONTRACTS.USDT_RWA,
                balance: usdtRwaVal.toFixed(2),
                usd: formatUSD(usdtRwaVal),
              },
              {
                token: 'wREC',
                address: DEPLOYED_CONTRACTS.WikshiReceivableWrapper,
                balance: wrecVal.toFixed(2),
                usd: '',
              },
              {
                token: 'tCTC',
                address: '',
                balance: nativeVal.toFixed(4),
                usd: formatUSD(nativeVal * oracleUSD),
              },
            ].map((row) => (
              <div key={row.token} className="flex items-center justify-between border-b border-[#3D3565]/30 pb-3">
                <div className="flex items-center gap-3">
                  {row.address ? (
                    <TokenIcon address={row.address} size={24} />
                  ) : (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#3D3565]/60 text-[8px] font-bold text-[#abadd0]">
                      tC
                    </div>
                  )}
                  <span className="text-[13px] font-bold text-white">{row.token}</span>
                </div>
                <div className="text-right">
                  <span className="financial-number text-[13px] font-bold text-white">{row.balance}</span>
                  <span className="ml-2 text-[11px] text-[#555375]">{row.usd}</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Market Quick Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.36 }}
          className="relative rounded-2xl border border-[#3D3565] bg-[#1e1a35] p-8"
        >
          <span className="absolute left-3 top-3 h-[4px] w-[4px] rounded-full bg-[#c8b6f0]/15" />
          <span className="absolute right-3 top-3 h-[4px] w-[4px] rounded-full bg-[#c8b6f0]/15" />
          <span className="absolute bottom-3 left-3 h-[4px] w-[4px] rounded-full bg-[#c8b6f0]/15" />
          <span className="absolute bottom-3 right-3 h-[4px] w-[4px] rounded-full bg-[#c8b6f0]/15" />

          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#6a6590]">
              Market
            </span>
            <Link
              href="/app/markets"
              className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#c8b6f0] transition-opacity hover:opacity-80"
            >
              View All
            </Link>
          </div>

          <div className="mt-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex -space-x-1.5">
                <TokenIcon address={DEPLOYED_CONTRACTS.WCTC} size={20} />
                <TokenIcon address={DEPLOYED_CONTRACTS.USDT} size={20} />
              </div>
              <span className="font-display-sans text-[14px] font-bold text-white">WCTC / USDT</span>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between border-b border-[#3D3565]/30 pb-2">
                <span className="text-[12px] text-[#abadd0]">Total Supplied</span>
                <span className="financial-number text-[13px] font-bold text-white">
                  {formatUSD(totalSupplyVal)}
                </span>
              </div>
              <div className="flex justify-between border-b border-[#3D3565]/30 pb-2">
                <span className="text-[12px] text-[#abadd0]">Oracle Price</span>
                <span className="financial-number text-[13px] font-bold text-[#E8A838]">
                  {formatUSD(oracleUSD)}/CTC
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[12px] text-[#abadd0]">Utilization</span>
                <span className="financial-number text-[13px] font-bold text-white">{util.toFixed(1)}%</span>
              </div>
            </div>

            {/* Mini utilization bar */}
            <div className="h-2 overflow-hidden rounded-full bg-[#3D3565]/30">
              <motion.div
                className="h-full rounded-full"
                style={{
                  backgroundColor: util < 70 ? '#22C55E' : util < 90 ? '#E8A838' : '#EF4444',
                }}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(util, 100)}%` }}
                transition={{ duration: 1, delay: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
              />
            </div>
          </div>
        </motion.div>
      </div>

      {/* TX History */}
      {txHistory.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.42 }}
          className="relative rounded-2xl border border-[#3D3565] bg-[#1e1a35] p-8"
        >
          <span className="absolute left-3 top-3 h-[4px] w-[4px] rounded-full bg-[#c8b6f0]/15" />
          <span className="absolute right-3 top-3 h-[4px] w-[4px] rounded-full bg-[#c8b6f0]/15" />

          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#6a6590]">
            Recent Transactions
          </span>

          <div className="mt-4 space-y-2">
            {txHistory.slice(0, 8).map((tx) => (
              <div key={tx.id} className="flex items-center justify-between border-b border-[#3D3565]/30 pb-2">
                <div className="flex items-center gap-3">
                  <span className={`inline-block h-2 w-2 rounded-full ${
                    tx.status === 'success' ? 'bg-[#22C55E]' :
                    tx.status === 'pending' ? 'bg-[#c8b6f0] animate-pulse' : 'bg-[#EF4444]'
                  }`} />
                  <span className="text-[12px] text-white">{tx.label}</span>
                </div>
                <a
                  href={blockscoutTxUrl(tx.hash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 font-mono text-[10px] text-[#c8b6f0] transition-opacity hover:opacity-80"
                >
                  {shortenTxHash(tx.hash)}
                  <ExternalLink size={10} />
                </a>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Deployed Contracts */}
      <motion.div
        data-demo="contracts-section"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.48 }}
        className="relative rounded-2xl border border-[#3D3565] bg-[#1e1a35] p-8"
      >
        <span className="absolute left-3 top-3 h-[4px] w-[4px] rounded-full bg-[#c8b6f0]/15" />
        <span className="absolute right-3 top-3 h-[4px] w-[4px] rounded-full bg-[#c8b6f0]/15" />
        <span className="absolute bottom-3 left-3 h-[4px] w-[4px] rounded-full bg-[#c8b6f0]/15" />
        <span className="absolute bottom-3 right-3 h-[4px] w-[4px] rounded-full bg-[#c8b6f0]/15" />

        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#6a6590]">
          Deployed Contracts
        </span>
        <p className="mt-1 text-[11px] text-[#555375]">
          All contracts verified on Creditcoin USC Testnet v2 (Chain ID 102036)
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2">
          {CONTRACTS.map((c) => (
            <a
              key={c.name}
              href={blockscoutAddressUrl(c.address)}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center justify-between rounded-lg border border-[#3D3565]/40 bg-[#0e0e12]/40 px-4 py-2.5 transition-all hover:border-[#c8b6f0]/20"
            >
              <div>
                <span className="text-[12px] font-bold text-white">{c.name}</span>
                <span className="ml-2 text-[10px] text-[#555375]">{c.desc}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[10px] text-[#6a6590] group-hover:text-[#c8b6f0]">
                  {shortenAddress(c.address)}
                </span>
                <ExternalLink size={10} className="text-[#6a6590] group-hover:text-[#c8b6f0]" />
              </div>
            </a>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
