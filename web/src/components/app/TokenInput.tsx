'use client';

import TokenIcon from './TokenIcon';
import { formatWei } from '@/lib/market';

interface TokenInputProps {
  label: string;
  tokenAddress: string;
  tokenSymbol: string;
  decimals: number;
  balance?: bigint;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export default function TokenInput({
  label,
  tokenAddress,
  tokenSymbol,
  decimals,
  balance,
  value,
  onChange,
  disabled = false,
}: TokenInputProps) {
  const handleMax = () => {
    if (balance) {
      onChange(formatWei(balance, decimals).toString());
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#6a6590]">
          {label}
        </span>
        {balance !== undefined && (
          <span className="text-[11px] text-[#555375]">
            Balance: {formatWei(balance, decimals).toFixed(decimals <= 6 ? 2 : 4)}
          </span>
        )}
      </div>
      <div className="mt-2 flex items-center gap-3 rounded-xl border border-[#3D3565] bg-[#0e0e12]/60 px-4 py-3 transition-colors focus-within:border-[#c8b6f0]/30">
        <TokenIcon address={tokenAddress} size={24} />
        <input
          type="text"
          inputMode="decimal"
          placeholder="0.00"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="financial-number flex-1 bg-transparent text-[18px] font-bold text-white outline-none placeholder:text-[#555375] disabled:opacity-40"
        />
        <div className="flex items-center gap-2">
          <button
            onClick={handleMax}
            className="rounded-md bg-[#3D3565]/50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-[#c8b6f0] transition-colors hover:bg-[#3D3565]"
          >
            Max
          </button>
          <span className="text-[12px] font-bold text-[#abadd0]">{tokenSymbol}</span>
        </div>
      </div>
    </div>
  );
}
