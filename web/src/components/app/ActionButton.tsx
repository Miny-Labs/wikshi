'use client';

import { motion } from 'framer-motion';
import { Loader2, Check, AlertCircle, Wallet } from 'lucide-react';
import { shortenTxHash, blockscoutTxUrl } from '@/lib/utils';

export type ActionState = 'idle' | 'wallet' | 'pending' | 'success' | 'error';

interface ActionButtonProps {
  label: string;
  state: ActionState;
  txHash?: string;
  error?: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
}

export default function ActionButton({
  label,
  state,
  txHash,
  error,
  onClick,
  disabled = false,
  variant = 'primary',
}: ActionButtonProps) {
  const isPrimary = variant === 'primary';

  const baseClass = isPrimary
    ? 'bg-[#c8b6f0] text-[#0e0e12] hover:shadow-[0_0_20px_rgba(200,182,240,0.15)]'
    : 'border border-[#3D3565] text-[#abadd0] hover:border-[#c8b6f0]/30 hover:text-white';

  return (
    <div>
      <button
        onClick={onClick}
        disabled={disabled || state === 'pending' || state === 'wallet'}
        className={`
          flex w-full items-center justify-center gap-2 rounded-full px-6 py-3
          text-[11px] font-bold uppercase tracking-[0.14em]
          transition-all duration-200 hover:scale-[1.01]
          disabled:cursor-not-allowed disabled:opacity-50
          ${baseClass}
        `}
      >
        {state === 'idle' && label}
        {state === 'wallet' && (
          <>
            <Wallet size={14} className="animate-pulse" />
            Approve in wallet...
          </>
        )}
        {state === 'pending' && (
          <>
            <Loader2 size={14} className="animate-spin" />
            Confirming...
          </>
        )}
        {state === 'success' && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
            className="flex items-center gap-2"
          >
            <Check size={14} />
            Confirmed
          </motion.span>
        )}
        {state === 'error' && (
          <>
            <AlertCircle size={14} />
            Failed
          </>
        )}
      </button>

      {/* TX Hash link */}
      {txHash && state === 'success' && (
        <motion.div
          initial={{ opacity: 0, clipPath: 'inset(0 100% 0 0)' }}
          animate={{ opacity: 1, clipPath: 'inset(0 0% 0 0)' }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="mt-2 text-center"
        >
          <a
            href={blockscoutTxUrl(txHash)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-mono text-[11px] text-[#c8b6f0] transition-opacity hover:opacity-80"
          >
            TX: {shortenTxHash(txHash)}
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="opacity-60">
              <path d="M3 1h6v6M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        </motion.div>
      )}

      {/* Error message */}
      {error && state === 'error' && (
        <p className="mt-2 text-center text-[11px] text-[#EF4444]">{error}</p>
      )}
    </div>
  );
}
