'use client';

import { useReadContract, useAccount } from 'wagmi';
import { DEPLOYED_CONTRACTS } from '@/lib/constants';
import { wikshiCreditSBTAbi } from '@/lib/abis';

export function useCreditScore() {
  const { address } = useAccount();

  const { data, isLoading, error } = useReadContract({
    address: DEPLOYED_CONTRACTS.WikshiCreditSBT as `0x${string}`,
    abi: wikshiCreditSBTAbi,
    functionName: 'getFullCreditProfile',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  if (!data) {
    return { data: null, isLoading, error };
  }

  const [score, tier, paymentCount, lastSynced, hasSBT] = data as [bigint, number, bigint, bigint, boolean];

  return {
    data: {
      score: Number(score),
      tier,
      paymentCount: Number(paymentCount),
      lastSynced: Number(lastSynced),
      hasSBT,
    },
    isLoading,
    error,
  };
}
