'use client';

import { useReadContract, useAccount, useBalance } from 'wagmi';
import { DEPLOYED_CONTRACTS } from '@/lib/constants';
import { erc20Abi } from '@/lib/abis';

export function useTokenBalances() {
  const { address } = useAccount();

  const { data: wctcBalance } = useReadContract({
    address: DEPLOYED_CONTRACTS.WCTC as `0x${string}`,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { data: usdtBalance } = useReadContract({
    address: DEPLOYED_CONTRACTS.USDT as `0x${string}`,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { data: usdtRwaBalance } = useReadContract({
    address: DEPLOYED_CONTRACTS.USDT_RWA as `0x${string}`,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { data: wrecBalance } = useReadContract({
    address: DEPLOYED_CONTRACTS.WikshiReceivableWrapper as `0x${string}`,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { data: nativeBalance } = useBalance({
    address,
  });

  return {
    wctc: wctcBalance as bigint | undefined,
    usdt: usdtBalance as bigint | undefined,
    usdtRwa: usdtRwaBalance as bigint | undefined,
    wrec: wrecBalance as bigint | undefined,
    native: nativeBalance?.value,
  };
}
