'use client';

import { motion } from 'framer-motion';

interface HealthGaugeProps {
  healthFactor: number;
  priceDrop?: number;
}

function healthColor(hf: number): string {
  if (hf >= 1.5) return '#22C55E';
  if (hf >= 1.2) return '#E8A838';
  return '#EF4444';
}

function healthPercent(hf: number): number {
  // Map health factor to 0-100% (1.0 = 0%, 2.0+ = 100%)
  return Math.min(Math.max((hf - 1) * 100, 0), 100);
}

export default function HealthGauge({ healthFactor, priceDrop }: HealthGaugeProps) {
  const color = healthColor(healthFactor);
  const percent = healthPercent(healthFactor);
  const isHealthy = healthFactor >= 1.0;

  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#6a6590]">
          Health
        </span>
        <span
          className="financial-number text-[13px] font-bold"
          style={{ color }}
        >
          {healthFactor === Infinity ? '--' : healthFactor.toFixed(2)}
        </span>
      </div>

      {/* Bar */}
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#3D3565]/40">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
        />
      </div>

      {/* Price drop indicator */}
      {priceDrop !== undefined && isHealthy && healthFactor !== Infinity && (
        <p className="mt-1.5 text-[11px] text-[#abadd0]">
          Price drop until liquidation:{' '}
          <span className="font-bold" style={{ color }}>
            -{priceDrop.toFixed(1)}%
          </span>
        </p>
      )}
    </div>
  );
}
