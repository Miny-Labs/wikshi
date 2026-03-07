'use client';

import { motion } from 'framer-motion';
import { tierName, TIER_COLORS } from '@/lib/utils';

interface TierBadgeProps {
  tier: number;
  delay?: number;
}

export default function TierBadge({ tier, delay = 1.0 }: TierBadgeProps) {
  const name = tierName(tier);
  const color = TIER_COLORS[name];

  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, type: 'spring', stiffness: 300, damping: 20 }}
      className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1"
      style={{
        borderColor: `${color}40`,
        backgroundColor: `${color}10`,
      }}
    >
      <span
        className="h-2 w-2 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span
        className="text-[11px] font-bold uppercase tracking-[0.12em]"
        style={{ color }}
      >
        {name}
      </span>
    </motion.span>
  );
}
