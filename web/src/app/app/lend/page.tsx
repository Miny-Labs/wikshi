'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import { parseUnits } from 'viem';
import { waitForTransactionReceipt } from 'wagmi/actions';
import { config } from '@/lib/wagmi';
import { DEPLOYED_CONTRACTS } from '@/lib/constants';
import { useLiveBlock } from '@/hooks/useLiveBlock';
import { useMarketData } from '@/hooks/useMarketData';
import { useUserPosition } from '@/hooks/useUserPosition';
import { useTokenBalances } from '@/hooks/useTokenBalances';
import { useTokenApproval } from '@/hooks/useTokenApproval';
import { useLendingActions } from '@/hooks/useLendingActions';
import { useTxNotify } from '@/components/app/TxProvider';
import TokenInput from '@/components/app/TokenInput';
import ActionButton, { type ActionState } from '@/components/app/ActionButton';
import SkeletonCard from '@/components/app/SkeletonCard';
import { formatUSD } from '@/lib/utils';
import { formatWei, utilizationRate } from '@/lib/market';

export default function LendPage() {
  useLiveBlock();
  const { data: market, isLoading } = useMarketData();
  const { data: position } = useUserPosition();
  const { usdt } = useTokenBalances();
  const { supply, withdraw } = useLendingActions();

  const usdtApproval = useTokenApproval(
    DEPLOYED_CONTRACTS.USDT as `0x${string}`,
    DEPLOYED_CONTRACTS.WikshiLend as `0x${string}`,
  );

  const { trackTx } = useTxNotify();
  const [supplyInput, setSupplyInput] = useState('');
  const [withdrawInput, setWithdrawInput] = useState('');
  const [supplyState, setSupplyState] = useState<ActionState>('idle');
  const [withdrawState, setWithdrawState] = useState<ActionState>('idle');
  const [txHash, setTxHash] = useState<string>();

  const handleSupply = async () => {
    if (!supplyInput) return;
    try {
      const amount = parseUnits(supplyInput, 6);
      if (usdtApproval.needsApproval(amount)) {
        setSupplyState('wallet');
        const approveHash = await usdtApproval.approve(amount);
        trackTx(approveHash, `Approve ${supplyInput} USDT`);
      }
      setSupplyState('wallet');
      const hash = await supply(amount);
      setTxHash(hash);
      setSupplyState('pending');
      trackTx(hash, `Supply ${supplyInput} USDT`);
      await waitForTransactionReceipt(config, { hash });
      setSupplyState('success');
      setSupplyInput('');
    } catch {
      setSupplyState('error');
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawInput) return;
    try {
      const amount = parseUnits(withdrawInput, 6);
      setWithdrawState('wallet');
      const hash = await withdraw(amount);
      setTxHash(hash);
      setWithdrawState('pending');
      trackTx(hash, `Withdraw ${withdrawInput} USDT`);
      await waitForTransactionReceipt(config, { hash });
      setWithdrawState('success');
      setWithdrawInput('');
    } catch {
      setWithdrawState('error');
    }
  };

  const totalSupply = market ? formatWei(market.totalSupplyAssets, 6) : 0;
  const totalBorrow = market ? formatWei(market.totalBorrowAssets, 6) : 0;
  const util = market && market.totalSupplyAssets > 0n ? utilizationRate(market.totalSupplyAssets, market.totalBorrowAssets) * 100 : 0;

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[1100px] grid grid-cols-2 gap-6">
        <SkeletonCard lines={5} />
        <SkeletonCard lines={4} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1100px] space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#6a6590]">Lend</span>
          <h2 className="font-display-sans mt-1 text-[28px] font-bold tracking-[-0.02em] text-white">
            Supply Liquidity
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Supply Card */}
        <motion.div
          data-demo="supply-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative rounded-2xl border border-[#3D3565] bg-[#1e1a35] p-8"
        >
          <span className="absolute left-3 top-3 h-[4px] w-[4px] rounded-full bg-[#c8b6f0]/15" />
          <span className="absolute right-3 top-3 h-[4px] w-[4px] rounded-full bg-[#c8b6f0]/15" />
          <span className="absolute bottom-3 left-3 h-[4px] w-[4px] rounded-full bg-[#c8b6f0]/15" />
          <span className="absolute bottom-3 right-3 h-[4px] w-[4px] rounded-full bg-[#c8b6f0]/15" />

          <div className="space-y-5">
            <TokenInput
              label="Supply USDT"
              tokenAddress={DEPLOYED_CONTRACTS.USDT}
              tokenSymbol="USDT"
              decimals={6}
              balance={usdt}
              value={supplyInput}
              onChange={setSupplyInput}
            />

            <ActionButton
              label="Supply"
              state={supplyState}
              txHash={txHash}
              onClick={handleSupply}
            />

            {/* Withdraw section */}
            <div className="border-t border-[#3D3565]/30 pt-5">
              <TokenInput
                label="Withdraw"
                tokenAddress={DEPLOYED_CONTRACTS.USDT}
                tokenSymbol="USDT"
                decimals={6}
                value={withdrawInput}
                onChange={setWithdrawInput}
              />
              <div className="mt-3">
                <ActionButton
                  label="Withdraw"
                  state={withdrawState}
                  txHash={txHash}
                  onClick={handleWithdraw}
                  variant="secondary"
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Pool Info Card */}
        <motion.div
          data-demo="pool-overview"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="relative rounded-2xl border border-[#3D3565] bg-[#1e1a35] p-8"
        >
          <span className="absolute left-3 top-3 h-[4px] w-[4px] rounded-full bg-[#c8b6f0]/15" />
          <span className="absolute right-3 top-3 h-[4px] w-[4px] rounded-full bg-[#c8b6f0]/15" />
          <span className="absolute bottom-3 left-3 h-[4px] w-[4px] rounded-full bg-[#c8b6f0]/15" />
          <span className="absolute bottom-3 right-3 h-[4px] w-[4px] rounded-full bg-[#c8b6f0]/15" />

          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#6a6590]">
            Pool Overview
          </span>

          <div className="mt-5 space-y-4">
            <div className="flex justify-between border-b border-[#3D3565]/30 pb-3">
              <span className="text-[13px] text-[#abadd0]">Total Supplied</span>
              <span className="financial-number text-[14px] font-bold text-white">{formatUSD(totalSupply)}</span>
            </div>
            <div className="flex justify-between border-b border-[#3D3565]/30 pb-3">
              <span className="text-[13px] text-[#abadd0]">Total Borrowed</span>
              <span className="financial-number text-[14px] font-bold text-white">{formatUSD(totalBorrow)}</span>
            </div>
            <div className="flex justify-between border-b border-[#3D3565]/30 pb-3">
              <span className="text-[13px] text-[#abadd0]">Available Liquidity</span>
              <span className="financial-number text-[14px] font-bold text-[#c8b6f0]">{formatUSD(totalSupply - totalBorrow)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[13px] text-[#abadd0]">Utilization</span>
              <span className="financial-number text-[14px] font-bold text-white">{util.toFixed(1)}%</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
