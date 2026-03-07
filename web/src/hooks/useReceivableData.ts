'use client';

import { useReadContract } from 'wagmi';
import { DEPLOYED_CONTRACTS } from '@/lib/constants';
import { wikshiReceivableAbi } from '@/lib/abis';

export type LoanStatus = 'Active' | 'Repaid' | 'Defaulted';

const STATUS_MAP: Record<number, LoanStatus> = {
  0: 'Active',
  1: 'Repaid',
  2: 'Defaulted',
};

export interface LoanData {
  borrower: `0x${string}`;
  loanToken: `0x${string}`;
  principal: bigint;
  interestRate: bigint;
  expectedRepayment: bigint;
  fundedAt: bigint;
  maturityAt: bigint;
  sourceLoanHash: `0x${string}`;
  sourceChainKey: bigint;
  status: LoanStatus;
  repaidAmount: bigint;
}

export function useReceivableLoanData(tokenId: bigint | undefined) {
  const { data, isLoading, error } = useReadContract({
    address: DEPLOYED_CONTRACTS.WikshiReceivable as `0x${string}`,
    abi: wikshiReceivableAbi,
    functionName: 'getLoanData',
    args: tokenId !== undefined ? [tokenId] : undefined,
    query: { enabled: tokenId !== undefined },
  });

  if (!data) {
    return { data: null, isLoading, error };
  }

  const raw = data as {
    borrower: `0x${string}`;
    loanToken: `0x${string}`;
    principal: bigint;
    interestRate: bigint;
    expectedRepayment: bigint;
    fundedAt: bigint;
    maturityAt: bigint;
    sourceLoanHash: `0x${string}`;
    sourceChainKey: bigint;
    status: number;
    repaidAmount: bigint;
  };

  const loanData: LoanData = {
    ...raw,
    status: STATUS_MAP[raw.status] ?? 'Active',
  };

  return { data: loanData, isLoading, error };
}

export function useReceivableValue(tokenId: bigint | undefined) {
  const { data, isLoading, error } = useReadContract({
    address: DEPLOYED_CONTRACTS.WikshiReceivable as `0x${string}`,
    abi: wikshiReceivableAbi,
    functionName: 'getReceivableValue',
    args: tokenId !== undefined ? [tokenId] : undefined,
    query: { enabled: tokenId !== undefined },
  });

  return { value: data as bigint | undefined, isLoading, error };
}

export function useTotalReceivables() {
  const { data, isLoading, error } = useReadContract({
    address: DEPLOYED_CONTRACTS.WikshiReceivable as `0x${string}`,
    abi: wikshiReceivableAbi,
    functionName: 'totalReceivables',
  });

  return { total: data as bigint | undefined, isLoading, error };
}

export function useReceivableOwner(tokenId: bigint | undefined) {
  const { data, isLoading, error } = useReadContract({
    address: DEPLOYED_CONTRACTS.WikshiReceivable as `0x${string}`,
    abi: wikshiReceivableAbi,
    functionName: 'ownerOf',
    args: tokenId !== undefined ? [tokenId] : undefined,
    query: { enabled: tokenId !== undefined },
  });

  return { owner: data as `0x${string}` | undefined, isLoading, error };
}
