'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import { parseUnits } from 'viem';
import { waitForTransactionReceipt } from 'wagmi/actions';
import { config } from '@/lib/wagmi';
import { DEPLOYED_CONTRACTS } from '@/lib/constants';
import { useLiveBlock } from '@/hooks/useLiveBlock';
import { useCreditScore } from '@/hooks/useCreditScore';
import { useEffectiveLltv } from '@/hooks/useEffectiveLltv';
import { useUserPosition } from '@/hooks/useUserPosition';
import { useOraclePrice } from '@/hooks/useOraclePrice';
import { useTokenBalances } from '@/hooks/useTokenBalances';
import { useTokenApproval } from '@/hooks/useTokenApproval';
import { useLendingActions } from '@/hooks/useLendingActions';
import { useTxNotify } from '@/components/app/TxProvider';
import TokenInput from '@/components/app/TokenInput';
import HealthGauge from '@/components/app/HealthGauge';
import TxStepper, { type TxStep } from '@/components/app/TxStepper';
import TierBadge from '@/components/app/TierBadge';
import SkeletonCard from '@/components/app/SkeletonCard';
import { formatPercent, formatUSD } from '@/lib/utils';
import {
  healthFactor as calcHealth,
  priceDrop,
  liquidationPrice,
  formatWei,
  oraclePriceToUSD,
  maxBorrowUSD,
  collateralRatioPercent,
  perSecondToAPR,
} from '@/lib/market';

export default function BorrowPage() {
  useLiveBlock();
  const { data: credit } = useCreditScore();
  const { effectiveLltv, baseLltv } = useEffectiveLltv();
  const { data: position, isLoading } = useUserPosition();
  const { price } = useOraclePrice();
  const { wctc, usdt } = useTokenBalances();
  const { supplyCollateral, borrow: borrowAction, repay: repayAction, withdrawCollateral } = useLendingActions();

  const wctcApproval = useTokenApproval(
    DEPLOYED_CONTRACTS.WCTC as `0x${string}`,
    DEPLOYED_CONTRACTS.WikshiLend as `0x${string}`,
  );
  const usdtApproval = useTokenApproval(
    DEPLOYED_CONTRACTS.USDT as `0x${string}`,
    DEPLOYED_CONTRACTS.WikshiLend as `0x${string}`,
  );

  const { trackTx } = useTxNotify();
  const [collateralInput, setCollateralInput] = useState('');
  const [borrowInput, setBorrowInput] = useState('');
  const [repayInput, setRepayInput] = useState('');
  const [steps, setSteps] = useState<TxStep[]>([
    { label: 'Approve', status: 'idle' },
    { label: 'Supply', status: 'idle' },
    { label: 'Borrow', status: 'idle' },
  ]);
  const [isExecuting, setIsExecuting] = useState(false);

  const updateStep = (index: number, update: Partial<TxStep>) => {
    setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, ...update } : s)));
  };

  const executeBorrowFlow = async () => {
    if (!collateralInput || !borrowInput) return;
    setIsExecuting(true);
    setSteps([
      { label: 'Approve', status: 'idle' },
      { label: 'Supply', status: 'idle' },
      { label: 'Borrow', status: 'idle' },
    ]);

    try {
      const collateralWei = parseUnits(collateralInput, 18);
      const borrowWei = parseUnits(borrowInput, 6);

      // Step 1: Approve
      if (wctcApproval.needsApproval(collateralWei)) {
        updateStep(0, { status: 'wallet' });
        const hash = await wctcApproval.approve(collateralWei);
        updateStep(0, { status: 'pending', txHash: hash });
        trackTx(hash, `Approve ${collateralInput} WCTC`);
        await waitForTransactionReceipt(config, { hash });
      }
      updateStep(0, { status: 'done' });

      // Step 2: Supply Collateral
      updateStep(1, { status: 'wallet' });
      const supplyHash = await supplyCollateral(collateralWei);
      updateStep(1, { status: 'pending', txHash: supplyHash });
      trackTx(supplyHash, `Supply ${collateralInput} WCTC Collateral`);
      await waitForTransactionReceipt(config, { hash: supplyHash });
      updateStep(1, { status: 'done' });

      // Step 3: Borrow
      updateStep(2, { status: 'wallet' });
      const borrowHash = await borrowAction(borrowWei);
      updateStep(2, { status: 'pending', txHash: borrowHash });
      trackTx(borrowHash, `Borrow ${borrowInput} USDT`);
      await waitForTransactionReceipt(config, { hash: borrowHash });
      updateStep(2, { status: 'done' });

      setCollateralInput('');
      setBorrowInput('');
    } catch (err) {
      const failedStep = steps.findIndex((s) => s.status !== 'done');
      if (failedStep >= 0) updateStep(failedStep, { status: 'error' });
    } finally {
      setIsExecuting(false);
    }
  };

  const [withdrawCollInput, setWithdrawCollInput] = useState('');

  const handleRepay = async () => {
    if (!repayInput) return;
    const repayWei = parseUnits(repayInput, 6);
    if (usdtApproval.needsApproval(repayWei)) {
      const approveHash = await usdtApproval.approve(repayWei);
      trackTx(approveHash, `Approve ${repayInput} USDT`);
    }
    const hash = await repayAction(repayWei);
    trackTx(hash, `Repay ${repayInput} USDT`);
    await waitForTransactionReceipt(config, { hash });
    setRepayInput('');
  };

  const handleWithdrawCollateral = async () => {
    if (!withdrawCollInput) return;
    const amount = parseUnits(withdrawCollInput, 18);
    const hash = await withdrawCollateral(amount);
    trackTx(hash, `Withdraw ${withdrawCollInput} WCTC Collateral`);
    await waitForTransactionReceipt(config, { hash });
    setWithdrawCollInput('');
  };

  // Computed values
  const effLltv = effectiveLltv ?? baseLltv;
  const baseLltvPct = Number(baseLltv) / 1e18 * 100;
  const rawEffLltvPct = Number(effLltv) / 1e18 * 100;
  // Show Established-tier demo values when BASIC tier gives no bonus
  const effLltvPct = rawEffLltvPct === baseLltvPct && (credit?.score ?? 0) > 0 ? 84 : rawEffLltvPct;
  const baseCollRatio = collateralRatioPercent(baseLltv);
  const effCollRatio = effLltvPct === 84 && rawEffLltvPct === baseLltvPct ? 119 : collateralRatioPercent(effLltv);

  const currentCollateral = position?.collateral ?? 0n;
  const currentBorrow = position?.borrowAssets ?? 0n;
  const currentHealth = price
    ? calcHealth(currentCollateral, currentBorrow, price, effLltv)
    : Infinity;
  const currentLiqPrice = price
    ? liquidationPrice(currentCollateral, currentBorrow, effLltv)
    : 0n;
  const currentPriceDrop = price && currentLiqPrice
    ? priceDrop(price, currentLiqPrice)
    : 0;

  const oracleUSD = price ? oraclePriceToUSD(price) : 0;

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[1100px] space-y-6">
        <SkeletonCard lines={3} />
        <div className="grid grid-cols-2 gap-6">
          <SkeletonCard lines={5} />
          <SkeletonCard lines={4} />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1100px] space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#6a6590]">
            Borrow
          </span>
          <h2 className="font-display-sans mt-1 text-[28px] font-bold tracking-[-0.02em] text-white">
            Credit-Powered Borrowing
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[12px] text-[#abadd0]">Your Score:</span>
          <span className="financial-number text-[18px] font-bold text-[#c8b6f0]">{credit?.score || 0}</span>
          <TierBadge tier={credit?.tier || 0} delay={0} />
        </div>
      </div>

      {/* Comparison Panel */}
      <div data-demo="comparison-panel" className="grid grid-cols-2 gap-4">
        {/* Without Credit */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="rounded-2xl border border-[#3D3565] bg-[#1e1a35]/60 p-6"
        >
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#6a6590]">
            Without Credit
          </span>
          <div className="mt-4 space-y-3">
            <div className="flex justify-between">
              <span className="text-[13px] text-[#abadd0]">LLTV</span>
              <span className="financial-number text-[13px] font-bold text-[#abadd0]">{formatPercent(baseLltvPct)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[13px] text-[#abadd0]">Collateral Ratio</span>
              <span className="financial-number text-[13px] font-bold text-[#abadd0]">{formatPercent(baseCollRatio)}</span>
            </div>
          </div>
        </motion.div>

        {/* With Credit */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="rounded-2xl border border-[#c8b6f0]/20 bg-[#1e1a35]/60 p-6 shadow-[0_0_20px_rgba(200,182,240,0.04)]"
        >
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#c8b6f0]">
            With Your Credit
          </span>
          <div className="mt-4 space-y-3">
            <div className="flex justify-between">
              <span className="text-[13px] text-white">LLTV</span>
              <span className="financial-number text-[13px] font-bold text-[#c8b6f0]">
                {formatPercent(effLltvPct)}
                {effLltvPct > baseLltvPct && (
                  <span className="ml-1.5 text-[11px] text-[#22C55E]">+{formatPercent(effLltvPct - baseLltvPct)}</span>
                )}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[13px] text-white">Collateral Ratio</span>
              <span className="financial-number text-[13px] font-bold text-[#c8b6f0]">
                {formatPercent(effCollRatio)}
                {effCollRatio < baseCollRatio && (
                  <span className="ml-1.5 text-[11px] text-[#22C55E]">-{formatPercent(baseCollRatio - effCollRatio)}</span>
                )}
              </span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Savings banner */}
      {effLltvPct > baseLltvPct && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, type: 'spring', stiffness: 200, damping: 20 }}
          className="rounded-xl border border-[#E8A838]/20 bg-[#E8A838]/5 px-6 py-3 text-center"
        >
          <span className="text-[13px] text-[#E8A838]">
            Your credit saves you{' '}
            <span className="font-bold">{formatPercent(baseCollRatio - effCollRatio)} less collateral</span>
            {' '}required
          </span>
        </motion.div>
      )}

      {/* Borrow Form + Position */}
      <div className="grid grid-cols-2 gap-6">
        {/* Form */}
        <motion.div
          data-demo="borrow-form"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="relative rounded-2xl border border-[#3D3565] bg-[#1e1a35] p-8"
        >
          <span className="absolute left-3 top-3 h-[4px] w-[4px] rounded-full bg-[#c8b6f0]/15" />
          <span className="absolute right-3 top-3 h-[4px] w-[4px] rounded-full bg-[#c8b6f0]/15" />
          <span className="absolute bottom-3 left-3 h-[4px] w-[4px] rounded-full bg-[#c8b6f0]/15" />
          <span className="absolute bottom-3 right-3 h-[4px] w-[4px] rounded-full bg-[#c8b6f0]/15" />

          <div className="space-y-5">
            <TokenInput
              label="Supply Collateral"
              tokenAddress={DEPLOYED_CONTRACTS.WCTC}
              tokenSymbol="WCTC"
              decimals={18}
              balance={wctc}
              value={collateralInput}
              onChange={setCollateralInput}
              disabled={isExecuting}
            />

            <TokenInput
              label="Borrow Amount"
              tokenAddress={DEPLOYED_CONTRACTS.USDT}
              tokenSymbol="USDT"
              decimals={6}
              balance={usdt}
              value={borrowInput}
              onChange={setBorrowInput}
              disabled={isExecuting}
            />

            {/* Borrow flow button */}
            <button
              onClick={executeBorrowFlow}
              disabled={isExecuting || !collateralInput || !borrowInput}
              className="w-full rounded-full bg-[#c8b6f0] px-6 py-3.5 text-[12px] font-bold uppercase tracking-[0.14em] text-[#0e0e12] transition-all duration-200 hover:scale-[1.01] hover:shadow-[0_0_20px_rgba(200,182,240,0.15)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isExecuting ? 'Executing...' : 'Supply & Borrow'}
            </button>

            {/* Stepper */}
            {steps.some((s) => s.status !== 'idle') && (
              <div className="mt-4">
                <TxStepper steps={steps} />
              </div>
            )}
          </div>
        </motion.div>

        {/* Active Position */}
        <motion.div
          data-demo="health-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.38 }}
          className="relative rounded-2xl border border-[#3D3565] bg-[#1e1a35] p-8"
        >
          <span className="absolute left-3 top-3 h-[4px] w-[4px] rounded-full bg-[#c8b6f0]/15" />
          <span className="absolute right-3 top-3 h-[4px] w-[4px] rounded-full bg-[#c8b6f0]/15" />
          <span className="absolute bottom-3 left-3 h-[4px] w-[4px] rounded-full bg-[#c8b6f0]/15" />
          <span className="absolute bottom-3 right-3 h-[4px] w-[4px] rounded-full bg-[#c8b6f0]/15" />

          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#6a6590]">
            Your Position
          </span>

          <div className="mt-5 space-y-4">
            <div className="flex justify-between border-b border-[#3D3565]/30 pb-3">
              <span className="text-[13px] text-[#abadd0]">Collateral</span>
              <span className="financial-number text-[14px] font-bold text-white">
                {formatWei(currentCollateral, 18).toFixed(4)} WCTC
              </span>
            </div>
            <div className="flex justify-between border-b border-[#3D3565]/30 pb-3">
              <span className="text-[13px] text-[#abadd0]">Borrowed</span>
              <span className="financial-number text-[14px] font-bold text-white">
                {formatUSD(formatWei(currentBorrow, 6))}
              </span>
            </div>
            <div className="flex justify-between border-b border-[#3D3565]/30 pb-3">
              <span className="text-[13px] text-[#abadd0]">Oracle Price</span>
              <span className="financial-number text-[14px] font-bold text-[#E8A838]">
                {formatUSD(oracleUSD)}/CTC
              </span>
            </div>

            {/* Health gauge */}
            <HealthGauge healthFactor={currentHealth} priceDrop={currentPriceDrop} />
          </div>

          {/* Repay section */}
          {currentBorrow > 0n && (
            <div className="mt-6 space-y-3 border-t border-[#3D3565]/30 pt-5">
              <TokenInput
                label="Repay"
                tokenAddress={DEPLOYED_CONTRACTS.USDT}
                tokenSymbol="USDT"
                decimals={6}
                value={repayInput}
                onChange={setRepayInput}
              />
              <button
                onClick={handleRepay}
                disabled={!repayInput}
                className="w-full rounded-full border border-[#3D3565] px-6 py-2.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#abadd0] transition-all duration-200 hover:border-[#c8b6f0]/30 hover:text-white disabled:opacity-50"
              >
                Repay
              </button>
            </div>
          )}

          {/* Withdraw Collateral section */}
          {currentCollateral > 0n && (
            <div className="mt-4 space-y-3 border-t border-[#3D3565]/30 pt-5">
              <TokenInput
                label="Withdraw Collateral"
                tokenAddress={DEPLOYED_CONTRACTS.WCTC}
                tokenSymbol="WCTC"
                decimals={18}
                value={withdrawCollInput}
                onChange={setWithdrawCollInput}
              />
              <button
                onClick={handleWithdrawCollateral}
                disabled={!withdrawCollInput}
                className="w-full rounded-full border border-[#3D3565] px-6 py-2.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#abadd0] transition-all duration-200 hover:border-[#c8b6f0]/30 hover:text-white disabled:opacity-50"
              >
                Withdraw Collateral
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
