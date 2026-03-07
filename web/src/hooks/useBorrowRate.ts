'use client';

import { useReadContract } from 'wagmi';
import { DEPLOYED_CONTRACTS } from '@/lib/constants';
import { wikshiIrmAbi } from '@/lib/abis';

export function useCreditRateDiscount(creditScore: number | undefined) {
  const { data, isLoading } = useReadContract({
    address: DEPLOYED_CONTRACTS.WikshiIrm as `0x${string}`,
    abi: wikshiIrmAbi,
    functionName: 'creditRateDiscount',
    args: creditScore !== undefined ? [BigInt(creditScore)] : undefined,
    query: { enabled: creditScore !== undefined && creditScore > 0 },
  });

  return {
    discount: data as bigint | undefined,
    isLoading,
  };
}
