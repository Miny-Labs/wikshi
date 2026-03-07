'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCreditScore } from '@/hooks/useCreditScore';
import { useEffectiveLltv } from '@/hooks/useEffectiveLltv';
import { useUserPosition } from '@/hooks/useUserPosition';
import { useOraclePrice } from '@/hooks/useOraclePrice';
import { useMarketData } from '@/hooks/useMarketData';
import { healthFactor as calcHealth, collateralRatioPercent, formatWei } from '@/lib/market';
import { useDemo } from './DemoProvider';
import { DEMO_STEPS, getStepNumber, TOTAL_STEPS } from './demoSteps';
import DemoSvg from './DemoSvg';
import { blockscoutAddressUrl } from '@/lib/utils';

export default function DemoDialog() {
  const { isActive, stepIndex, nextStep, prevStep, exitDemo } = useDemo();
  const dialogRef = useRef<HTMLDivElement>(null);
  const [dialogPos, setDialogPos] = useState<{ left: number; top: number } | null>(null);

  // Live data hooks for dynamic SVG props
  const { data: credit } = useCreditScore();
  const { effectiveLltv, baseLltv } = useEffectiveLltv();
  const { data: position } = useUserPosition();
  const { price: oraclePrice } = useOraclePrice();
  const { data: marketData } = useMarketData();

  // Reset position when step changes
  useEffect(() => {
    setDialogPos(null);
  }, [stepIndex]);

  const step = DEMO_STEPS[stepIndex];

  // Position dialog next to target
  useEffect(() => {
    if (!step || !isActive) return;
    const DIALOG_W = 420;
    const GAP = 16;
    const MARGIN = 16;

    const compute = () => {
      const el = document.querySelector(step.targetSelector);
      if (!el) { setDialogPos(null); return; }

      el.scrollIntoView({ behavior: 'smooth', block: 'center' });

      setTimeout(() => {
        const r = el.getBoundingClientRect();
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        let left: number;
        let top: number;
        const pos = step.dialogPosition;

        if (pos === 'center') {
          left = Math.max(MARGIN, (vw - DIALOG_W) / 2);
          top = Math.max(MARGIN, Math.min(r.top, vh - 400 - MARGIN));
          setDialogPos({ left, top });
          return;
        }

        top = r.top;

        if (pos === 'bottom') {
          left = r.left;
          top = r.bottom + GAP;
        } else if (pos === 'right') {
          if (vw - r.right - GAP >= DIALOG_W) {
            left = r.right + GAP;
          } else {
            left = r.left - DIALOG_W - GAP;
          }
        } else {
          if (r.left - GAP >= DIALOG_W) {
            left = r.left - DIALOG_W - GAP;
          } else {
            left = r.right + GAP;
          }
        }

        left = Math.max(MARGIN, Math.min(left, vw - DIALOG_W - MARGIN));
        const MIN_DIALOG_H = 400;
        const maxTop = vh - MIN_DIALOG_H - MARGIN;
        top = Math.max(MARGIN, Math.min(top, maxTop));

        setDialogPos({ left, top });
      }, 350);
    };

    const timer = setTimeout(compute, 100);
    return () => clearTimeout(timer);
  }, [step, isActive]);

  // Compute live SVG props
  const liveSvgProps = useMemo((): Record<string, unknown> => {
    if (!step) return {};
    const base: Record<string, unknown> = { ...step.svgProps };

    if (step.svgAnimation === 'scoreGauge' && credit?.score) {
      base.score = Number(credit.score);
      base.maxScore = 1000;
    }

    if (step.svgAnimation === 'comparisonSplit') {
      const bLltv = baseLltv ? Number(baseLltv) / 1e18 * 100 : 80;
      const eLltv = effectiveLltv ? Number(effectiveLltv) / 1e18 * 100 : bLltv;
      const baseCol = Math.round(collateralRatioPercent(baseLltv || 800000000000000000n));
      const effCol = Math.round(collateralRatioPercent(effectiveLltv || baseLltv || 800000000000000000n));
      if (baseCol === effCol) {
        base.baseLltv = bLltv;
        base.effectiveLltv = 84;
        base.baseCollateral = baseCol;
        base.effectiveCollateral = 119;
      } else {
        base.baseLltv = bLltv;
        base.effectiveLltv = eLltv;
        base.baseCollateral = baseCol;
        base.effectiveCollateral = effCol;
      }
    }

    if (step.svgAnimation === 'healthGauge') {
      const collateral = position?.collateral ?? 0n;
      const borrowAmt = position?.borrowAssets ?? 0n;
      const effLltv = effectiveLltv ?? baseLltv;
      if (oraclePrice && effLltv) {
        base.healthFactor = calcHealth(collateral, borrowAmt, oraclePrice, effLltv);
      }
    }

    if (step.svgAnimation === 'poolFill' && marketData) {
      base.supplied = formatWei(marketData.totalSupplyAssets, 6);
      base.borrowed = formatWei(marketData.totalBorrowAssets, 6);
    }

    return base;
  }, [step, credit, baseLltv, effectiveLltv, position, oraclePrice, marketData]);

  // Keyboard navigation
  useEffect(() => {
    if (!isActive) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        exitDemo();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        nextStep();
      } else if (e.key === 'ArrowLeft' && stepIndex > 0) {
        e.preventDefault();
        prevStep();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isActive, stepIndex, exitDemo, nextStep, prevStep]);

  if (!isActive || !step) return null;

  const stepNum = getStepNumber(stepIndex);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        ref={dialogRef}
        key={step.id}
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.25 }}
        style={{
          position: 'fixed',
          zIndex: 9991,
          width: 420,
          ...(dialogPos
            ? { left: dialogPos.left, top: dialogPos.top, maxHeight: `calc(100vh - ${dialogPos.top}px - 16px)` }
            : { left: '50%', top: '50%', transform: 'translate(-50%, -50%)', maxHeight: '90vh' }),
        }}
        className="pointer-events-auto flex flex-col overflow-hidden rounded-2xl border border-[#3D3565] bg-[#1e1a35] shadow-2xl shadow-black/40"
      >

        {/* Sticky header */}
        <div className="flex items-center justify-between px-6 pt-3 pb-2">
          <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#6a6590]">
            Step {stepNum} of {TOTAL_STEPS}
          </span>
          <button
            onClick={exitDemo}
            className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#555375] transition-colors hover:text-[#abadd0]"
          >
            Exit <span className="text-[8px] text-[#3D3565]">(Esc)</span>
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 pb-2">
          {/* SVG Animation */}
          {step.svgAnimation !== 'none' && (
            <div className="mt-4 rounded-xl border border-[#3D3565]/40 bg-[#0e0e12]/40 p-4">
              <DemoSvg type={step.svgAnimation} props={liveSvgProps} />
            </div>
          )}

          {/* Title */}
          <h3 className="font-display-sans mt-5 text-[20px] font-bold tracking-[-0.02em] text-white">
            {step.title}
          </h3>

          {/* Description */}
          <p className="mt-2 text-[13px] leading-relaxed text-[#abadd0]">
            {step.description}
          </p>

          {/* What This Proves */}
          <div className="mt-4 border-l-2 border-[#E8A838]/60 bg-[#E8A838]/5 px-4 py-3">
            <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#E8A838]">
              How It Works
            </span>
            <p className="mt-1 text-[11px] leading-relaxed text-[#abadd0]">
              {step.whatThisProves}
            </p>
          </div>

          {/* Narrative note */}
          {step.narrativeNote && (
            <p className="mt-3 text-[11px] italic leading-relaxed text-[#555375]">
              &ldquo;{step.narrativeNote}&rdquo;
            </p>
          )}

          {/* Contract links (Blockscout) */}
          {step.contractLinks && step.contractLinks.length > 0 && (
            <div className="mt-4 rounded-lg border border-[#3D3565]/40 bg-[#0e0e12]/30 p-3">
              <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#6a6590]">
                Verified on Blockscout ({step.contractLinks.length})
              </span>
              <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5">
                {step.contractLinks.map((link) => (
                  <a
                    key={link.address}
                    href={blockscoutAddressUrl(link.address)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-[10px] transition-opacity hover:opacity-80"
                  >
                    <span className="font-bold text-[#abadd0]">{link.name}</span>
                    <span className="font-mono text-[9px] text-[#c8b6f0]">
                      {link.address.slice(0, 6)}...{link.address.slice(-3)} &#8599;
                    </span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sticky action bar */}
        <div className="flex items-center gap-3 border-t border-[#3D3565]/40 px-6 py-3">
          {stepIndex > 0 && (
            <button
              onClick={prevStep}
              className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#6a6590] transition-colors hover:text-[#abadd0]"
            >
              &larr; Back
            </button>
          )}

          <div className="flex-1" />

          <span className="hidden text-[8px] text-[#3D3565] sm:block">
            Arrow keys to navigate
          </span>

          <button
            onClick={nextStep}
            className="rounded-full bg-[#c8b6f0] px-6 py-2.5 text-[11px] font-bold uppercase tracking-[0.12em] text-[#0e0e12] transition-all hover:bg-[#d4c4f8]"
          >
            {stepIndex >= TOTAL_STEPS - 1 ? 'Finish Tour' : 'Continue'} &rarr;
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
