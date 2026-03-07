'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import { waitForTransactionReceipt } from 'wagmi/actions';
import { config } from '@/lib/wagmi';
import { useCreditScore } from '@/hooks/useCreditScore';
import { useEffectiveLltv } from '@/hooks/useEffectiveLltv';
import { useCreditRateDiscount } from '@/hooks/useBorrowRate';
import { useMintSBT } from '@/hooks/useMintSBT';
import { useTxNotify } from '@/components/app/TxProvider';
import { useLiveBlock } from '@/hooks/useLiveBlock';
import ScoreGauge from '@/components/app/ScoreGauge';
import TierBadge from '@/components/app/TierBadge';
import ActionButton, { type ActionState } from '@/components/app/ActionButton';
import SkeletonCard from '@/components/app/SkeletonCard';
import { formatPercent } from '@/lib/utils';
import { collateralRatioPercent } from '@/lib/market';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function CreditPassportPage() {
  useLiveBlock();
  const { data: credit, isLoading } = useCreditScore();
  const { effectiveLltv, baseLltv } = useEffectiveLltv();
  const { discount } = useCreditRateDiscount(credit?.score);
  const { mint, sync } = useMintSBT();

  const { trackTx } = useTxNotify();
  const [mintState, setMintState] = useState<ActionState>('idle');
  const [syncState, setSyncState] = useState<ActionState>('idle');
  const [txHash, setTxHash] = useState<string>();

  const handleMint = async () => {
    try {
      setMintState('wallet');
      const hash = await mint();
      setMintState('pending');
      setTxHash(hash);
      trackTx(hash, 'Mint Soulbound Credit ID');
      await waitForTransactionReceipt(config, { hash });
      setMintState('success');
    } catch {
      setMintState('error');
    }
  };

  const handleSync = async () => {
    try {
      setSyncState('wallet');
      const hash = await sync();
      setSyncState('pending');
      setTxHash(hash);
      trackTx(hash, 'Sync Credit Data from Oracle');
      await waitForTransactionReceipt(config, { hash });
      setSyncState('success');
    } catch {
      setSyncState('error');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-6">
          <SkeletonCard lines={4} />
          <SkeletonCard lines={5} />
        </div>
        <SkeletonCard lines={2} />
      </div>
    );
  }

  const score = credit?.score || 0;
  const tier = credit?.tier || 0;
  const paymentCount = credit?.paymentCount || 0;
  const hasSBT = credit?.hasSBT ?? false;
  const lastSynced = credit?.lastSynced || 0;

  const effLltv = effectiveLltv ?? baseLltv;
  const baseLltvPct = Number(baseLltv) / 1e18 * 100;
  const effLltvPct = Number(effLltv) / 1e18 * 100;
  const lltvBoost = effLltvPct - baseLltvPct;
  const baseCollRatio = collateralRatioPercent(baseLltv);
  const effCollRatio = collateralRatioPercent(effLltv);
  const discountPct = discount ? Number(discount) / 1e16 : 0;

  const timeSinceSync = lastSynced
    ? Math.floor((Date.now() / 1000 - lastSynced) / 60)
    : null;

  return (
    <div className="mx-auto max-w-[1100px] space-y-8">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#6a6590]">
            Credit Passport
          </span>
          <h2 className="font-display-sans mt-1 text-[28px] font-bold tracking-[-0.02em] text-white">
            Your On-Chain Identity
          </h2>
        </div>
      </div>

      {/* Score + Profile cards */}
      <div className="grid grid-cols-2 gap-6">
        {/* Score Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="group relative rounded-2xl border border-[#3D3565] bg-[#1e1a35] p-8 transition-all duration-200 hover:-translate-y-1 hover:border-[#c8b6f0]/20 hover:shadow-[0_8px_24px_rgba(200,182,240,0.06)]"
        >
          <span className="absolute left-3 top-3 h-[4px] w-[4px] rounded-full bg-[#c8b6f0]/15" />
          <span className="absolute right-3 top-3 h-[4px] w-[4px] rounded-full bg-[#c8b6f0]/15" />
          <span className="absolute bottom-3 left-3 h-[4px] w-[4px] rounded-full bg-[#c8b6f0]/15" />
          <span className="absolute bottom-3 right-3 h-[4px] w-[4px] rounded-full bg-[#c8b6f0]/15" />

          <div className="flex flex-col items-center py-4">
            <div className="relative">
              {/* Radial glow behind gauge */}
              <div
                className="absolute inset-[-20px] rounded-full opacity-40"
                style={{ background: 'radial-gradient(circle, rgba(200,182,240,0.15) 0%, transparent 70%)' }}
              />
              <ScoreGauge score={score} tier={tier} size={220} />
            </div>
            <p className="mt-4 text-[13px] text-[#abadd0]">Your Credit Score</p>
          </div>
        </motion.div>

        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="group relative rounded-2xl border border-[#3D3565] bg-[#1e1a35] p-8 transition-all duration-200 hover:-translate-y-1 hover:border-[#c8b6f0]/20 hover:shadow-[0_8px_24px_rgba(200,182,240,0.06)]"
        >
          <span className="absolute left-3 top-3 h-[4px] w-[4px] rounded-full bg-[#c8b6f0]/15" />
          <span className="absolute right-3 top-3 h-[4px] w-[4px] rounded-full bg-[#c8b6f0]/15" />
          <span className="absolute bottom-3 left-3 h-[4px] w-[4px] rounded-full bg-[#c8b6f0]/15" />
          <span className="absolute bottom-3 right-3 h-[4px] w-[4px] rounded-full bg-[#c8b6f0]/15" />

          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#6a6590]">
            Trust Tier
          </span>
          <div className="mt-3">
            <TierBadge tier={tier} delay={0.6} />
          </div>

          <div className="mt-6 space-y-3">
            {[
              { label: 'Verified Payments', value: paymentCount },
              { label: 'Raw Score', value: score },
              {
                label: 'Last Synced',
                value: timeSinceSync !== null ? `${timeSinceSync}m ago` : '--',
              },
              {
                label: 'SBT Status',
                value: hasSBT ? 'Minted' : 'Not Minted',
                dot: hasSBT,
              },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between border-b border-[#3D3565]/30 pb-2">
                <span className="text-[12px] text-[#abadd0]">{row.label}</span>
                <span className="financial-number flex items-center gap-1.5 text-[13px] font-bold text-white">
                  {'dot' in row && row.dot && (
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#22C55E]" />
                  )}
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Benefits Strip */}
      <motion.div
        data-demo="benefits-strip"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.16 }}
        className="grid grid-cols-3 gap-4"
      >
        {[
          {
            label: 'Effective LLTV',
            value: formatPercent(effLltvPct),
            sub: lltvBoost > 0 ? `+${formatPercent(lltvBoost)}` : 'Base rate',
            color: '#c8b6f0',
          },
          {
            label: 'Collateral Ratio',
            value: formatPercent(effCollRatio),
            sub: effCollRatio < baseCollRatio ? `was ${formatPercent(baseCollRatio)}` : 'Base',
            color: '#c8b6f0',
          },
          {
            label: 'Rate Discount',
            value: discountPct > 0 ? `-${formatPercent(discountPct)}` : '--',
            sub: 'vs pool rate',
            color: '#E8A838',
          },
        ].map((benefit) => (
          <div
            key={benefit.label}
            className="accent-border-top rounded-xl border border-[#3D3565] bg-[#1e1a35]/60 p-5"
            style={{ '--accent-color': benefit.color } as React.CSSProperties}
          >
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#6a6590]">
              {benefit.label}
            </span>
            <p className="financial-number mt-2 text-[22px] font-bold" style={{ color: benefit.color }}>
              {benefit.value}
            </p>
            <span className="text-[11px] text-[#555375]">{benefit.sub}</span>
          </div>
        ))}
      </motion.div>

      {/* Actions */}
      <motion.div
        data-demo="sbt-action"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.24 }}
        className="flex items-center gap-4"
      >
        {!hasSBT ? (
          <div className="w-64">
            <ActionButton
              label="Mint Soulbound ID"
              state={mintState}
              txHash={txHash}
              onClick={handleMint}
            />
          </div>
        ) : (
          <div className="w-64">
            <ActionButton
              label="Sync from Oracle"
              state={syncState}
              txHash={txHash}
              onClick={handleSync}
              variant="secondary"
            />
          </div>
        )}

        <Link
          href="/app/borrow"
          className="flex items-center gap-2 rounded-full border border-[#3D3565] px-6 py-3 text-[11px] font-bold uppercase tracking-[0.14em] text-[#abadd0] transition-all duration-200 hover:border-[#c8b6f0]/30 hover:text-white"
        >
          Borrow
          <ArrowRight size={14} />
        </Link>
      </motion.div>
    </div>
  );
}
