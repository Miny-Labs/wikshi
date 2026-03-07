'use client';

import { useReadContract } from 'wagmi';
import { DEPLOYED_CONTRACTS } from '@/lib/constants';
import { wikshiOracleAbi } from '@/lib/abis';

export function useOraclePrice() {
  const { data, isLoading, error } = useReadContract({
    address: DEPLOYED_CONTRACTS.WikshiOracle as `0x${string}`,
    abi: wikshiOracleAbi,
    functionName: 'price',
  });

  return {
    price: data as bigint | undefined,
    isLoading,
    error,
  };
}
