'use client';

import { useWriteContract, useAccount } from 'wagmi';
import { DEPLOYED_CONTRACTS, WREC_MARKET_PARAMS } from '@/lib/constants';
import { wikshiLendAbi } from '@/lib/abis';
import { GAS_CONFIG } from '@/lib/market';

export function useRwaLendingActions() {
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();

  const supply = async (assets: bigint) => {
    if (!address) throw new Error('Not connected');
    return writeContractAsync({
      address: DEPLOYED_CONTRACTS.WikshiLend as `0x${string}`,
      abi: wikshiLendAbi,
      functionName: 'supply',
      args: [WREC_MARKET_PARAMS, assets, 0n, address, '0x'],
      ...GAS_CONFIG,
    });
  };

  const withdraw = async (assets: bigint) => {
    if (!address) throw new Error('Not connected');
    return writeContractAsync({
      address: DEPLOYED_CONTRACTS.WikshiLend as `0x${string}`,
      abi: wikshiLendAbi,
      functionName: 'withdraw',
      args: [WREC_MARKET_PARAMS, assets, 0n, address, address],
      ...GAS_CONFIG,
    });
  };

  const borrow = async (assets: bigint) => {
    if (!address) throw new Error('Not connected');
    return writeContractAsync({
      address: DEPLOYED_CONTRACTS.WikshiLend as `0x${string}`,
      abi: wikshiLendAbi,
      functionName: 'borrow',
      args: [WREC_MARKET_PARAMS, assets, 0n, address, address],
      ...GAS_CONFIG,
    });
  };

  const repay = async (assets: bigint) => {
    if (!address) throw new Error('Not connected');
    return writeContractAsync({
      address: DEPLOYED_CONTRACTS.WikshiLend as `0x${string}`,
      abi: wikshiLendAbi,
      functionName: 'repay',
      args: [WREC_MARKET_PARAMS, assets, 0n, address, '0x'],
      ...GAS_CONFIG,
    });
  };

  const supplyCollateral = async (assets: bigint) => {
    if (!address) throw new Error('Not connected');
    return writeContractAsync({
      address: DEPLOYED_CONTRACTS.WikshiLend as `0x${string}`,
      abi: wikshiLendAbi,
      functionName: 'supplyCollateral',
      args: [WREC_MARKET_PARAMS, assets, address, '0x'],
      ...GAS_CONFIG,
    });
  };

  const withdrawCollateral = async (assets: bigint) => {
    if (!address) throw new Error('Not connected');
    return writeContractAsync({
      address: DEPLOYED_CONTRACTS.WikshiLend as `0x${string}`,
      abi: wikshiLendAbi,
      functionName: 'withdrawCollateral',
      args: [WREC_MARKET_PARAMS, assets, address, address],
      ...GAS_CONFIG,
    });
  };

  return { supply, withdraw, borrow, repay, supplyCollateral, withdrawCollateral };
}
