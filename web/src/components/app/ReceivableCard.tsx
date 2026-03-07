'use client';

import { motion } from 'framer-motion';
import type { LoanData, LoanStatus } from '@/hooks/useReceivableData';
import { formatWei } from '@/lib/market';
import { formatUSD, shortenAddress } from '@/lib/utils';

const STATUS_COLORS: Record<LoanStatus, { bg: string; text: string; label: string }> = {
  Active: { bg: 'bg-[#22C55E]/10', text: 'text-[#22C55E]', label: 'Active' },
  Repaid: { bg: 'bg-[#c8b6f0]/10', text: 'text-[#c8b6f0]', label: 'Repaid' },
  Defaulted: { bg: 'bg-[#EF4444]/10', text: 'text-[#EF4444]', label: 'Defaulted' },
};

interface ReceivableCardProps {
  tokenId: bigint;
  loan: LoanData;
  value?: bigint;
  onWrap?: () => void;
  isWrapped?: boolean;
  delay?: number;
}

export default function ReceivableCard({ tokenId, loan, value, onWrap, isWrapped, delay = 0 }: ReceivableCardProps) {
  const statusStyle = STATUS_COLORS[loan.status];
  const principalUSD = formatWei(loan.principal, 6);
  const repaidUSD = formatWei(loan.repaidAmount, 6);
  const valueUSD = value ? formatWei(value, 6) : principalUSD;
  const maturityDate = new Date(Number(loan.maturityAt) * 1000);
  const isMatured = maturityDate < new Date();
  const interestPercent = Number(loan.interestRate) / 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="relative rounded-2xl border border-[#3D3565] bg-[#1e1a35] p-6 transition-all duration-200 hover:-translate-y-1 hover:border-[#c8b6f0]/20 hover:shadow-[0_8px_24px_rgba(200,182,240,0.06)]"
    >
      <span className="absolute left-2.5 top-2.5 h-[4px] w-[4px] rounded-full bg-[#c8b6f0]/15" />
      <span className="absolute right-2.5 top-2.5 h-[4px] w-[4px] rounded-full bg-[#c8b6f0]/15" />
      <span className="absolute bottom-2.5 left-2.5 h-[4px] w-[4px] rounded-full bg-[#c8b6f0]/15" />
      <span className="absolute bottom-2.5 right-2.5 h-[4px] w-[4px] rounded-full bg-[#c8b6f0]/15" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#c8b6f0]/10 text-[12px] font-bold text-[#c8b6f0]">
            #{Number(tokenId)}
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#6a6590]">
              Receivable NFT
            </span>
            <p className="financial-number text-[18px] font-bold text-white">
              {formatUSD(valueUSD)}
            </p>
          </div>
        </div>
        <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${statusStyle.bg} ${statusStyle.text}`}>
          {statusStyle.label}
        </span>
      </div>

      {/* Details */}
      <div className="mt-5 space-y-2.5">
        {[
          { label: 'Borrower', value: shortenAddress(loan.borrower) },
          { label: 'Principal', value: formatUSD(principalUSD) },
          { label: 'Interest Rate', value: `${interestPercent.toFixed(1)}%` },
          { label: 'Repaid', value: formatUSD(repaidUSD) },
          { label: 'Maturity', value: maturityDate.toLocaleDateString(), color: isMatured ? '#EF4444' : undefined },
        ].map((row) => (
          <div key={row.label} className="flex items-center justify-between border-b border-[#3D3565]/30 pb-2">
            <span className="text-[12px] text-[#abadd0]">{row.label}</span>
            <span
              className="financial-number text-[12px] font-bold"
              style={{ color: row.color || '#f0eef5' }}
            >
              {row.value}
            </span>
          </div>
        ))}
      </div>

      {/* Actions */}
      {loan.status === 'Active' && !isWrapped && onWrap && (
        <button
          onClick={onWrap}
          className="mt-5 w-full rounded-full bg-[#c8b6f0] py-2.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#0e0e12] transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(200,182,240,0.15)]"
        >
          Wrap to wREC
        </button>
      )}
      {isWrapped && (
        <div className="mt-5 flex items-center justify-center gap-2 rounded-full border border-[#22C55E]/20 bg-[#22C55E]/5 py-2.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#22C55E]">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#22C55E]" />
          Wrapped as wREC
        </div>
      )}
    </motion.div>
  );
}
