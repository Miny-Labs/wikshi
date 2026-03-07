'use client';

import { useWriteContract, useAccount } from 'wagmi';
import { DEPLOYED_CONTRACTS, ACTIVE_MARKET_PARAMS } from '@/lib/constants';
import { wikshiLendAbi } from '@/lib/abis';
import { GAS_CONFIG } from '@/lib/market';

export function useLendingActions() {
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();

  const supply = async (assets: bigint) => {
    if (!address) throw new Error('Not connected');
    return writeContractAsync({
      address: DEPLOYED_CONTRACTS.WikshiLend as `0x${string}`,
      abi: wikshiLendAbi,
      functionName: 'supply',
      args: [ACTIVE_MARKET_PARAMS, assets, 0n, address, '0x'],
      ...GAS_CONFIG,
    });
  };

  const withdraw = async (assets: bigint) => {
    if (!address) throw new Error('Not connected');
    return writeContractAsync({
      address: DEPLOYED_CONTRACTS.WikshiLend as `0x${string}`,
      abi: wikshiLendAbi,
      functionName: 'withdraw',
      args: [ACTIVE_MARKET_PARAMS, assets, 0n, address, address],
      ...GAS_CONFIG,
    });
  };

  const borrow = async (assets: bigint) => {
    if (!address) throw new Error('Not connected');
    return writeContractAsync({
      address: DEPLOYED_CONTRACTS.WikshiLend as `0x${string}`,
      abi: wikshiLendAbi,
      functionName: 'borrow',
      args: [ACTIVE_MARKET_PARAMS, assets, 0n, address, address],
      ...GAS_CONFIG,
    });
  };

  const repay = async (assets: bigint) => {
    if (!address) throw new Error('Not connected');
    return writeContractAsync({
      address: DEPLOYED_CONTRACTS.WikshiLend as `0x${string}`,
      abi: wikshiLendAbi,
      functionName: 'repay',
      args: [ACTIVE_MARKET_PARAMS, assets, 0n, address, '0x'],
      ...GAS_CONFIG,
    });
  };

  const supplyCollateral = async (assets: bigint) => {
    if (!address) throw new Error('Not connected');
    return writeContractAsync({
      address: DEPLOYED_CONTRACTS.WikshiLend as `0x${string}`,
      abi: wikshiLendAbi,
      functionName: 'supplyCollateral',
      args: [ACTIVE_MARKET_PARAMS, assets, address, '0x'],
      ...GAS_CONFIG,
    });
  };

  const withdrawCollateral = async (assets: bigint) => {
    if (!address) throw new Error('Not connected');
    return writeContractAsync({
      address: DEPLOYED_CONTRACTS.WikshiLend as `0x${string}`,
      abi: wikshiLendAbi,
      functionName: 'withdrawCollateral',
      args: [ACTIVE_MARKET_PARAMS, assets, address, address],
      ...GAS_CONFIG,
    });
  };

  return { supply, withdraw, borrow, repay, supplyCollateral, withdrawCollateral };
}
