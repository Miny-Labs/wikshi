'use client';

import { useWriteContract, useAccount } from 'wagmi';
import { DEPLOYED_CONTRACTS } from '@/lib/constants';
import { wikshiReceivableWrapperAbi, wikshiReceivableAbi } from '@/lib/abis';
import { GAS_CONFIG } from '@/lib/market';

export function useWrapperActions() {
  const { address } = useAccount();
  const { writeContractAsync, isPending } = useWriteContract();

  const approveNft = async (tokenId: bigint) => {
    if (!address) throw new Error('Not connected');
    return writeContractAsync({
      address: DEPLOYED_CONTRACTS.WikshiReceivable as `0x${string}`,
      abi: wikshiReceivableAbi,
      functionName: 'approve',
      args: [DEPLOYED_CONTRACTS.WikshiReceivableWrapper as `0x${string}`, tokenId],
      ...GAS_CONFIG,
    });
  };

  const approveAndWrap = async (tokenId: bigint): Promise<{ approveHash: `0x${string}`; wrapHash: `0x${string}` }> => {
    if (!address) throw new Error('Not connected');
    // Step 1: Approve the wrapper to take the NFT
    const approveHash = await approveNft(tokenId);
    // Step 2: Wrap
    const wrapHash = await writeContractAsync({
      address: DEPLOYED_CONTRACTS.WikshiReceivableWrapper as `0x${string}`,
      abi: wikshiReceivableWrapperAbi,
      functionName: 'wrap',
      args: [tokenId],
      ...GAS_CONFIG,
    });
    return { approveHash, wrapHash };
  };

  const wrap = async (tokenId: bigint) => {
    if (!address) throw new Error('Not connected');
    return writeContractAsync({
      address: DEPLOYED_CONTRACTS.WikshiReceivableWrapper as `0x${string}`,
      abi: wikshiReceivableWrapperAbi,
      functionName: 'wrap',
      args: [tokenId],
      ...GAS_CONFIG,
    });
  };

  const unwrap = async (tokenId: bigint) => {
    if (!address) throw new Error('Not connected');
    return writeContractAsync({
      address: DEPLOYED_CONTRACTS.WikshiReceivableWrapper as `0x${string}`,
      abi: wikshiReceivableWrapperAbi,
      functionName: 'unwrap',
      args: [tokenId],
      ...GAS_CONFIG,
    });
  };

  return { approveNft, approveAndWrap, wrap, unwrap, isPending };
}
