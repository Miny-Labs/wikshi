'use client';

import { motion } from 'framer-motion';
import { Play } from 'lucide-react';
import { useDemo } from './DemoProvider';

export default function DemoLauncher() {
  const { isActive, startDemo } = useDemo();

  if (isActive) return null;

  return (
    <button
      onClick={startDemo}
      className="group fixed bottom-5 left-5 z-[9990] flex items-center gap-2.5 rounded-full border border-[#3D3565] bg-[#1e1a35]/90 px-5 py-3 shadow-lg shadow-black/30 backdrop-blur-sm transition-all duration-200 hover:border-[#c8b6f0]/40 hover:bg-[#1e1a35]"
    >
      {/* Pulsing glow */}
      <motion.div
        className="absolute inset-0 rounded-full opacity-0 transition-opacity group-hover:opacity-100"
        style={{
          background: 'linear-gradient(135deg, rgba(200,182,240,0.1) 0%, rgba(232,168,56,0.06) 100%)',
        }}
      />

      <div className="relative flex h-6 w-6 items-center justify-center rounded-full bg-[#c8b6f0]/15">
        <Play size={10} className="text-[#c8b6f0]" fill="currentColor" />
      </div>

      <span className="relative text-[11px] font-bold tracking-wide text-white">
        Product Tour
      </span>

      {/* Animated border accent */}
      <motion.div
        className="absolute bottom-0 left-6 right-6 h-[1px]"
        style={{
          background: 'linear-gradient(90deg, transparent, #c8b6f0, #E8A838, transparent)',
        }}
        animate={{ opacity: [0.3, 0.7, 0.3] }}
        transition={{ duration: 2.5, repeat: Infinity }}
      />
    </button>
  );
}
