'use client';

import { useWriteContract, useAccount } from 'wagmi';
import { DEPLOYED_CONTRACTS } from '@/lib/constants';
import { wikshiCreditSBTAbi } from '@/lib/abis';
import { GAS_CONFIG } from '@/lib/market';

export function useMintSBT() {
  const { address } = useAccount();
  const { writeContractAsync, isPending } = useWriteContract();

  const mint = async () => {
    if (!address) throw new Error('Not connected');
    return writeContractAsync({
      address: DEPLOYED_CONTRACTS.WikshiCreditSBT as `0x${string}`,
      abi: wikshiCreditSBTAbi,
      functionName: 'mint',
      args: [address],
      ...GAS_CONFIG,
    });
  };

  const sync = async () => {
    if (!address) throw new Error('Not connected');
    return writeContractAsync({
      address: DEPLOYED_CONTRACTS.WikshiCreditSBT as `0x${string}`,
      abi: wikshiCreditSBTAbi,
      functionName: 'syncCreditData',
      args: [address],
      ...GAS_CONFIG,
    });
  };

  return { mint, sync, isPending };
}
