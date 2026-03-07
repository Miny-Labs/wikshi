'use client';

import { useWriteContract, useAccount } from 'wagmi';
import { DEPLOYED_CONTRACTS } from '@/lib/constants';
import { wikshiVaultAbi } from '@/lib/abis';
import { GAS_CONFIG } from '@/lib/market';

export function useVaultActions() {
  const { address } = useAccount();
  const { writeContractAsync, isPending } = useWriteContract();

  const deposit = async (assets: bigint) => {
    if (!address) throw new Error('Not connected');
    return writeContractAsync({
      address: DEPLOYED_CONTRACTS.WikshiVault as `0x${string}`,
      abi: wikshiVaultAbi,
      functionName: 'deposit',
      args: [assets, address],
      ...GAS_CONFIG,
    });
  };

  const withdraw = async (assets: bigint) => {
    if (!address) throw new Error('Not connected');
    return writeContractAsync({
      address: DEPLOYED_CONTRACTS.WikshiVault as `0x${string}`,
      abi: wikshiVaultAbi,
      functionName: 'withdraw',
      args: [assets, address, address],
      ...GAS_CONFIG,
    });
  };

  return { deposit, withdraw, isPending };
}
