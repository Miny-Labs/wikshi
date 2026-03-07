'use client';

import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { useEffect } from 'react';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: number;
  format?: (v: number) => string;
  icon?: LucideIcon;
  accent?: 'teal' | 'gold' | 'blue' | 'default';
  delay?: number;
}

const accentColors = {
  teal: '#c8b6f0',
  gold: '#E8A838',
  blue: '#8a7ece',
  default: '#f0eef5',
};

export default function StatCard({ label, value, format, icon: Icon, accent = 'default', delay = 0 }: StatCardProps) {
  const motionValue = useMotionValue(0);
  const display = useTransform(motionValue, (v) => (format ? format(v) : v.toFixed(2)));

  useEffect(() => {
    const controls = animate(motionValue, value, {
      duration: 1.2,
      ease: [0.25, 0.46, 0.45, 0.94],
      delay,
    });
    return controls.stop;
  }, [value, motionValue, delay]);

  const color = accentColors[accent];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="accent-border-top group relative rounded-2xl border border-[#3D3565] bg-[#1e1a35] p-6 transition-all duration-200 hover:-translate-y-1 hover:border-[#c8b6f0]/20 hover:shadow-[0_8px_24px_rgba(200,182,240,0.06)]"
      style={{ '--accent-color': color } as React.CSSProperties}
    >
      {/* Corner dots */}
      <span className="absolute left-2.5 top-2.5 h-[4px] w-[4px] rounded-full bg-[#c8b6f0]/15" />
      <span className="absolute right-2.5 top-2.5 h-[4px] w-[4px] rounded-full bg-[#c8b6f0]/15" />
      <span className="absolute bottom-2.5 left-2.5 h-[4px] w-[4px] rounded-full bg-[#c8b6f0]/15" />
      <span className="absolute bottom-2.5 right-2.5 h-[4px] w-[4px] rounded-full bg-[#c8b6f0]/15" />

      <div className="flex items-start justify-between">
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#6a6590]">
          {label}
        </span>
        {Icon && <Icon size={16} strokeWidth={1.6} className="text-[#555375]" />}
      </div>

      <motion.p
        className="financial-number mt-3 text-[26px] font-bold leading-none tracking-[-0.02em]"
        style={{ color }}
      >
        {display}
      </motion.p>
    </motion.div>
  );
}
