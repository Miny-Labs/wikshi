'use client';

import { useReadContract, useWriteContract, useAccount } from 'wagmi';
import { DEPLOYED_CONTRACTS } from '@/lib/constants';
import { paymentTrackerAbi } from '@/lib/abis';
import { GAS_CONFIG } from '@/lib/market';

export function usePaymentTracker() {
  const { address } = useAccount();
  const { writeContractAsync, isPending } = useWriteContract();

  const { data: totalPayments, isLoading: paymentsLoading } = useReadContract({
    address: DEPLOYED_CONTRACTS.PaymentTracker as `0x${string}`,
    abi: paymentTrackerAbi,
    functionName: 'getTotalPayments',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { data: paymentCount, isLoading: countLoading } = useReadContract({
    address: DEPLOYED_CONTRACTS.PaymentTracker as `0x${string}`,
    abi: paymentTrackerAbi,
    functionName: 'getPaymentCount',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const registerLoan = async (loanId: bigint, borrower: `0x${string}`) => {
    return writeContractAsync({
      address: DEPLOYED_CONTRACTS.PaymentTracker as `0x${string}`,
      abi: paymentTrackerAbi,
      functionName: 'registerLoan',
      args: [loanId, borrower],
      ...GAS_CONFIG,
    });
  };

  const makePayment = async (loanId: bigint, amount: bigint) => {
    return writeContractAsync({
      address: DEPLOYED_CONTRACTS.PaymentTracker as `0x${string}`,
      abi: paymentTrackerAbi,
      functionName: 'makePayment',
      args: [loanId, amount],
      ...GAS_CONFIG,
    });
  };

  return {
    totalPayments: totalPayments as bigint | undefined,
    paymentCount: paymentCount as bigint | undefined,
    isLoading: paymentsLoading || countLoading,
    registerLoan,
    makePayment,
    isPending,
  };
}
