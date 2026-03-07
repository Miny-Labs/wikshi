'use client';

import { useReadContract, useAccount } from 'wagmi';
import { DEPLOYED_CONTRACTS } from '@/lib/constants';
import { wikshiReceivableWrapperAbi } from '@/lib/abis';

export function useWrapperBalance() {
  const { address } = useAccount();

  const { data: balance, isLoading: balanceLoading } = useReadContract({
    address: DEPLOYED_CONTRACTS.WikshiReceivableWrapper as `0x${string}`,
    abi: wikshiReceivableWrapperAbi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { data: wrappedCount, isLoading: countLoading } = useReadContract({
    address: DEPLOYED_CONTRACTS.WikshiReceivableWrapper as `0x${string}`,
    abi: wikshiReceivableWrapperAbi,
    functionName: 'wrappedCount',
  });

  return {
    balance: balance as bigint | undefined,
    wrappedCount: wrappedCount as bigint | undefined,
    isLoading: balanceLoading || countLoading,
  };
}
