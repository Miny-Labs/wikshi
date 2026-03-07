'use client';

import Image from 'next/image';
import { DEPLOYED_CONTRACTS } from '@/lib/constants';

const TOKEN_ICONS: Record<string, { src: string; alt: string }> = {
  [DEPLOYED_CONTRACTS.WCTC.toLowerCase()]: { src: '/tokens/ctc.svg', alt: 'CTC' },
  [DEPLOYED_CONTRACTS.USDT.toLowerCase()]: { src: '/tokens/usdt.svg', alt: 'USDT' },
  [DEPLOYED_CONTRACTS.USDT_RWA.toLowerCase()]: { src: '/tokens/usdt.svg', alt: 'USDT' },
  [DEPLOYED_CONTRACTS.WikshiReceivableWrapper.toLowerCase()]: { src: '/tokens/wrec.svg', alt: 'wREC' },
};

interface TokenIconProps {
  address: string;
  size?: number;
  className?: string;
}

export default function TokenIcon({ address, size = 24, className = '' }: TokenIconProps) {
  const token = TOKEN_ICONS[address.toLowerCase()];

  if (!token) {
    return (
      <div
        className={`flex items-center justify-center rounded-full bg-[#3D3565] text-[8px] font-bold text-[#abadd0] ${className}`}
        style={{ width: size, height: size }}
      >
        ?
      </div>
    );
  }

  return (
    <Image
      src={token.src}
      alt={token.alt}
      width={size}
      height={size}
      className={`rounded-full ${className}`}
    />
  );
}
