'use client';

import { useWriteContract } from 'wagmi';
import { DEPLOYED_CONTRACTS } from '@/lib/constants';
import { wikshiCreditOracleAbi, wikshiOracleAbi, wikshiReceivableOracleAbi, erc20Abi } from '@/lib/abis';
import { GAS_CONFIG } from '@/lib/market';

export function useAdminActions() {
  const { writeContractAsync } = useWriteContract();

  const submitCreditScore = async (borrower: `0x${string}`, score: bigint) => {
    return writeContractAsync({
      address: DEPLOYED_CONTRACTS.WikshiCreditOracle as `0x${string}`,
      abi: wikshiCreditOracleAbi,
      functionName: 'submitCreditScore',
      args: [borrower, score],
      ...GAS_CONFIG,
    });
  };

  const setOraclePrice = async (newPrice: bigint) => {
    return writeContractAsync({
      address: DEPLOYED_CONTRACTS.WikshiOracle as `0x${string}`,
      abi: wikshiOracleAbi,
      functionName: 'setPrice',
      args: [newPrice],
      ...GAS_CONFIG,
    });
  };

  const mintTestToken = async (token: `0x${string}`, to: `0x${string}`, amount: bigint) => {
    return writeContractAsync({
      address: token,
      abi: erc20Abi,
      functionName: 'mint',
      args: [to, amount],
      ...GAS_CONFIG,
    });
  };

  const setReceivableOraclePrice = async (newPrice: bigint) => {
    return writeContractAsync({
      address: DEPLOYED_CONTRACTS.WikshiReceivableOracle as `0x${string}`,
      abi: wikshiReceivableOracleAbi,
      functionName: 'setPrice',
      args: [newPrice],
      ...GAS_CONFIG,
    });
  };

  return { submitCreditScore, setOraclePrice, setReceivableOraclePrice, mintTestToken };
}
