import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatUSD(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatCTC(value: number, decimals: number = 4): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: decimals,
  }).format(value) + ' CTC';
}

export function formatPercent(value: number, decimals: number = 2): string {
  return value.toFixed(decimals) + '%';
}

export function formatScore(score: number): string {
  return Math.round(score).toLocaleString('en-US');
}

export function shortenAddress(address: string, chars: number = 4): string {
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

export function shortenTxHash(hash: string): string {
  return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
}

export function blockscoutTxUrl(hash: string): string {
  return `https://explorer.usc-testnet2.creditcoin.network/tx/${hash}`;
}

export function blockscoutAddressUrl(address: string): string {
  return `https://explorer.usc-testnet2.creditcoin.network/address/${address}`;
}

export const TIER_NAMES = ['Unverified', 'Basic', 'Established', 'Trusted'] as const;
export type TierName = typeof TIER_NAMES[number];

export function tierName(tier: number): TierName {
  return TIER_NAMES[tier] ?? 'Unverified';
}

export const TIER_COLORS: Record<TierName, string> = {
  Unverified: '#94A3B8',
  Basic: '#8a7ece',
  Established: '#c8b6f0',
  Trusted: '#E8A838',
};
