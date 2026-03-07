'use client';

import { useReadContract, useAccount } from 'wagmi';
import { DEPLOYED_CONTRACTS, ACTIVE_MARKET_PARAMS } from '@/lib/constants';
import { wikshiLendAbi } from '@/lib/abis';

export function useUserPosition() {
  const { address } = useAccount();

  const { data, isLoading, error } = useReadContract({
    address: DEPLOYED_CONTRACTS.WikshiLend as `0x${string}`,
    abi: wikshiLendAbi,
    functionName: 'getUserPosition',
    args: address ? [ACTIVE_MARKET_PARAMS, address] : undefined,
    query: { enabled: !!address },
  });

  if (!data) {
    return { data: null, isLoading, error };
  }

  const [supplyShares, borrowShares, collateral, borrowAssets, effectiveLltvValue, healthy, creditScore] =
    data as [bigint, bigint, bigint, bigint, bigint, boolean, bigint];

  return {
    data: {
      supplyShares,
      borrowShares,
      collateral,
      borrowAssets,
      effectiveLltvValue,
      healthy,
      creditScore,
    },
    isLoading,
    error,
  };
}
