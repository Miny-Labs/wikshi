'use client';

import { motion } from 'framer-motion';
import { Check, Loader2, Circle } from 'lucide-react';
import { shortenTxHash, blockscoutTxUrl } from '@/lib/utils';

export interface TxStep {
  label: string;
  status: 'idle' | 'wallet' | 'pending' | 'done' | 'error';
  txHash?: string;
}

interface TxStepperProps {
  steps: TxStep[];
}

export default function TxStepper({ steps }: TxStepperProps) {
  return (
    <div className="flex items-center gap-1">
      {steps.map((step, i) => (
        <div key={i} className="flex items-center gap-1">
          {/* Step indicator */}
          <div className="flex items-center gap-1.5">
            {step.status === 'done' && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 20 }}
              >
                <Check size={14} className="text-[#c8b6f0]" />
              </motion.div>
            )}
            {step.status === 'pending' && (
              <Loader2 size={14} className="animate-spin text-[#c8b6f0]" />
            )}
            {step.status === 'wallet' && (
              <div className="relative">
                <Circle size={14} className="text-[#E8A838]" />
                <span className="pulse-live absolute inset-0 rounded-full border border-[#E8A838]" />
              </div>
            )}
            {(step.status === 'idle' || step.status === 'error') && (
              <Circle size={14} className={step.status === 'error' ? 'text-[#EF4444]' : 'text-[#555375]'} />
            )}

            <span
              className={`text-[10px] font-bold uppercase tracking-[0.1em] ${
                step.status === 'done'
                  ? 'text-[#c8b6f0]'
                  : step.status === 'pending' || step.status === 'wallet'
                    ? 'text-white'
                    : step.status === 'error'
                      ? 'text-[#EF4444]'
                      : 'text-[#555375]'
              }`}
            >
              {step.label}
            </span>

            {step.txHash && (
              <a
                href={blockscoutTxUrl(step.txHash)}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-[9px] text-[#c8b6f0]/60 transition-opacity hover:opacity-100"
              >
                {shortenTxHash(step.txHash)}
              </a>
            )}
          </div>

          {/* Connector line */}
          {i < steps.length - 1 && (
            <div
              className={`h-px w-4 ${
                step.status === 'done' ? 'bg-[#c8b6f0]/40' : 'bg-[#3D3565]'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}
