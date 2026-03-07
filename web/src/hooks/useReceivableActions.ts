'use client';

import { useWriteContract, useAccount } from 'wagmi';
import { DEPLOYED_CONTRACTS } from '@/lib/constants';
import { wikshiReceivableAbi } from '@/lib/abis';
import { GAS_CONFIG } from '@/lib/market';

export function useReceivableActions() {
  const { address } = useAccount();
  const { writeContractAsync, isPending } = useWriteContract();

  const mintReceivable = async (params: {
    lender: `0x${string}`;
    borrower: `0x${string}`;
    loanToken: `0x${string}`;
    principal: bigint;
    interestRate: bigint;
    maturityAt: bigint;
    sourceLoanHash: `0x${string}`;
    sourceChainKey: bigint;
  }) => {
    if (!address) throw new Error('Not connected');
    return writeContractAsync({
      address: DEPLOYED_CONTRACTS.WikshiReceivable as `0x${string}`,
      abi: wikshiReceivableAbi,
      functionName: 'mintReceivable',
      args: [
        params.lender,
        params.borrower,
        params.loanToken,
        params.principal,
        params.interestRate,
        params.maturityAt,
        params.sourceLoanHash,
        params.sourceChainKey,
      ],
      ...GAS_CONFIG,
    });
  };

  const recordRepayment = async (tokenId: bigint, amount: bigint) => {
    if (!address) throw new Error('Not connected');
    return writeContractAsync({
      address: DEPLOYED_CONTRACTS.WikshiReceivable as `0x${string}`,
      abi: wikshiReceivableAbi,
      functionName: 'recordRepayment',
      args: [tokenId, amount],
      ...GAS_CONFIG,
    });
  };

  const markDefaulted = async (tokenId: bigint) => {
    if (!address) throw new Error('Not connected');
    return writeContractAsync({
      address: DEPLOYED_CONTRACTS.WikshiReceivable as `0x${string}`,
      abi: wikshiReceivableAbi,
      functionName: 'markDefaulted',
      args: [tokenId],
      ...GAS_CONFIG,
    });
  };

  const approveReceivable = async (to: `0x${string}`, tokenId: bigint) => {
    return writeContractAsync({
      address: DEPLOYED_CONTRACTS.WikshiReceivable as `0x${string}`,
      abi: wikshiReceivableAbi,
      functionName: 'approve',
      args: [to, tokenId],
      ...GAS_CONFIG,
    });
  };

  return { mintReceivable, recordRepayment, markDefaulted, approveReceivable, isPending };
}
