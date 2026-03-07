'use client';

import { useReadContract, useAccount } from 'wagmi';
import { DEPLOYED_CONTRACTS, WREC_MARKET_PARAMS } from '@/lib/constants';
import { wikshiLendAbi, wikshiReceivableOracleAbi } from '@/lib/abis';

export function useRwaMarketData() {
  const { data, isLoading, error } = useReadContract({
    address: DEPLOYED_CONTRACTS.WikshiLend as `0x${string}`,
    abi: wikshiLendAbi,
    functionName: 'getMarketData',
    args: [WREC_MARKET_PARAMS],
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

export function useRwaUserPosition() {
  const { address } = useAccount();

  const { data, isLoading, error } = useReadContract({
    address: DEPLOYED_CONTRACTS.WikshiLend as `0x${string}`,
    abi: wikshiLendAbi,
    functionName: 'getUserPosition',
    args: address ? [WREC_MARKET_PARAMS, address] : undefined,
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

export function useRwaOraclePrice() {
  const { data, isLoading, error } = useReadContract({
    address: DEPLOYED_CONTRACTS.WikshiReceivableOracle as `0x${string}`,
    abi: wikshiReceivableOracleAbi,
    functionName: 'price',
  });

  return { price: data as bigint | undefined, isLoading, error };
}
