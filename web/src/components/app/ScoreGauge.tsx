'use client';

import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { useEffect } from 'react';
import { tierName, TIER_COLORS, type TierName } from '@/lib/utils';

interface ScoreGaugeProps {
  score: number;
  maxScore?: number;
  tier: number;
  size?: number;
}

export default function ScoreGauge({ score, maxScore = 1000, tier, size = 200 }: ScoreGaugeProps) {
  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;
  const scorePercent = Math.min(score / maxScore, 1);

  const motionScore = useMotionValue(0);
  const displayScore = useTransform(motionScore, (v) => Math.round(v).toString());

  const motionOffset = useMotionValue(circumference);

  const name = tierName(tier);
  const color = TIER_COLORS[name];

  useEffect(() => {
    const targetOffset = circumference * (1 - scorePercent);
    const scoreCtrl = animate(motionScore, score, { duration: 1.4, ease: [0.25, 0.46, 0.45, 0.94] });
    const offsetCtrl = animate(motionOffset, targetOffset, {
      type: 'spring',
      stiffness: 60,
      damping: 20,
      mass: 1,
    });
    return () => { scoreCtrl.stop(); offsetCtrl.stop(); };
  }, [score, scorePercent, circumference, motionScore, motionOffset]);

  return (
    <div className="relative flex flex-col items-center">
      <svg width={size} height={size} className="-rotate-90">
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#3D3565"
          strokeWidth={8}
          opacity={0.4}
        />
        {/* Score arc */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={circumference}
          style={{ strokeDashoffset: motionOffset }}
        />
        {/* Glow */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={12}
          strokeLinecap="round"
          strokeDasharray={circumference}
          style={{ strokeDashoffset: motionOffset }}
          opacity={0.15}
          filter="blur(4px)"
        />
      </svg>

      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="financial-number text-[36px] font-bold leading-none"
          style={{ color }}
        >
          {displayScore}
        </motion.span>
        <span className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#6a6590]">
          / {maxScore}
        </span>
      </div>
    </div>
  );
}
