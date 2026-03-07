'use client';

import { useReadContract, useWriteContract, useAccount } from 'wagmi';
import { erc20Abi } from '@/lib/abis';
import { GAS_CONFIG } from '@/lib/market';

export function useTokenApproval(tokenAddress: `0x${string}`, spender: `0x${string}`) {
  const { address } = useAccount();

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'allowance',
    args: address ? [address, spender] : undefined,
    query: { enabled: !!address },
  });

  const { writeContractAsync, isPending } = useWriteContract();

  const approve = async (amount: bigint) => {
    const hash = await writeContractAsync({
      address: tokenAddress,
      abi: erc20Abi,
      functionName: 'approve',
      args: [spender, amount],
      ...GAS_CONFIG,
    });
    await refetchAllowance();
    return hash;
  };

  const needsApproval = (amount: bigint): boolean => {
    if (!allowance) return true;
    return (allowance as bigint) < amount;
  };

  return {
    allowance: allowance as bigint | undefined,
    approve,
    needsApproval,
    isApproving: isPending,
  };
}
