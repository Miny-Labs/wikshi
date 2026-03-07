'use client';

import { useReadContract, useAccount } from 'wagmi';
import { DEPLOYED_CONTRACTS, ACTIVE_MARKET_PARAMS } from '@/lib/constants';
import { wikshiLendAbi } from '@/lib/abis';

export function useEffectiveLltv() {
  const { address } = useAccount();

  const { data, isLoading, error } = useReadContract({
    address: DEPLOYED_CONTRACTS.WikshiLend as `0x${string}`,
    abi: wikshiLendAbi,
    functionName: 'effectiveLltv',
    args: address ? [ACTIVE_MARKET_PARAMS, address] : undefined,
    query: { enabled: !!address },
  });

  return {
    effectiveLltv: data as bigint | undefined,
    baseLltv: ACTIVE_MARKET_PARAMS.lltv,
    isLoading,
    error,
  };
}
