'use client';

import { useReadContract, useAccount } from 'wagmi';
import { DEPLOYED_CONTRACTS } from '@/lib/constants';
import { wikshiVaultAbi } from '@/lib/abis';

export function useVaultData() {
  const { address } = useAccount();

  const { data: totalAssets, isLoading: assetsLoading } = useReadContract({
    address: DEPLOYED_CONTRACTS.WikshiVault as `0x${string}`,
    abi: wikshiVaultAbi,
    functionName: 'totalAssets',
  });

  const { data: totalSupply, isLoading: supplyLoading } = useReadContract({
    address: DEPLOYED_CONTRACTS.WikshiVault as `0x${string}`,
    abi: wikshiVaultAbi,
    functionName: 'totalSupply',
  });

  const { data: userShares, isLoading: sharesLoading } = useReadContract({
    address: DEPLOYED_CONTRACTS.WikshiVault as `0x${string}`,
    abi: wikshiVaultAbi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { data: userAssets, isLoading: userAssetsLoading } = useReadContract({
    address: DEPLOYED_CONTRACTS.WikshiVault as `0x${string}`,
    abi: wikshiVaultAbi,
    functionName: 'convertToAssets',
    args: userShares ? [userShares as bigint] : undefined,
    query: { enabled: !!userShares },
  });

  const sharePrice =
    totalSupply && (totalSupply as bigint) > 0n && totalAssets
      ? Number((totalAssets as bigint) * 10000n / (totalSupply as bigint)) / 10000
      : 1;

  return {
    totalAssets: totalAssets as bigint | undefined,
    totalSupply: totalSupply as bigint | undefined,
    userShares: userShares as bigint | undefined,
    userAssets: userAssets as bigint | undefined,
    sharePrice,
    isLoading: assetsLoading || supplyLoading || sharesLoading || userAssetsLoading,
  };
}
