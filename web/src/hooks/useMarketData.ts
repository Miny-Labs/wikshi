'use client';

import { useReadContract } from 'wagmi';
import { DEPLOYED_CONTRACTS, ACTIVE_MARKET_PARAMS } from '@/lib/constants';
import { wikshiLendAbi } from '@/lib/abis';

export function useMarketData() {
  const { data, isLoading, error } = useReadContract({
    address: DEPLOYED_CONTRACTS.WikshiLend as `0x${string}`,
    abi: wikshiLendAbi,
    functionName: 'getMarketData',
    args: [ACTIVE_MARKET_PARAMS],
  });

  if (!data) {
    return { data: null, isLoading, error };
  }

  const [
    totalSupplyAssets,
    totalSupplyShares,
    totalBorrowAssets,
    totalBorrowShares,
    lastUpdate,
    fee,
    supplyCapValue,
    borrowCapValue,
    utilization,
  ] = data as [bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint];

  return {
    data: {
      totalSupplyAssets,
      totalSupplyShares,
      totalBorrowAssets,
      totalBorrowShares,
      lastUpdate,
      fee,
      supplyCapValue,
      borrowCapValue,
      utilization,
    },
    isLoading,
    error,
  };
}
