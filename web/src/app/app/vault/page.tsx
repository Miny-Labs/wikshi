'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import { parseUnits } from 'viem';
import { waitForTransactionReceipt } from 'wagmi/actions';
import { config } from '@/lib/wagmi';
import { DEPLOYED_CONTRACTS } from '@/lib/constants';
import { useLiveBlock } from '@/hooks/useLiveBlock';
import { useVaultData } from '@/hooks/useVaultData';
import { useVaultActions } from '@/hooks/useVaultActions';
import { useTokenBalances } from '@/hooks/useTokenBalances';
import { useTokenApproval } from '@/hooks/useTokenApproval';
import { useTxNotify } from '@/components/app/TxProvider';
import TokenInput from '@/components/app/TokenInput';
import ActionButton, { type ActionState } from '@/components/app/ActionButton';
import VaultStats from '@/components/app/VaultStats';
import { formatUSD } from '@/lib/utils';
import { formatWei } from '@/lib/market';

export default function VaultPage() {
  useLiveBlock();
  const { trackTx } = useTxNotify();
  const { totalAssets, userShares, userAssets, sharePrice, isLoading } = useVaultData();
  const { deposit, withdraw } = useVaultActions();
  const { usdt } = useTokenBalances();

  const usdtApproval = useTokenApproval(
    DEPLOYED_CONTRACTS.USDT as `0x${string}`,
    DEPLOYED_CONTRACTS.WikshiVault as `0x${string}`,
  );

  const [depositInput, setDepositInput] = useState('');
  const [withdrawInput, setWithdrawInput] = useState('');
  const [depositState, setDepositState] = useState<ActionState>('idle');
  const [withdrawState, setWithdrawState] = useState<ActionState>('idle');
  const [txHash, setTxHash] = useState<string>();

  const handleDeposit = async () => {
    if (!depositInput) return;
    try {
      const amount = parseUnits(depositInput, 6);
      if (usdtApproval.needsApproval(amount)) {
        setDepositState('wallet');
        const approveHash = await usdtApproval.approve(amount);
        trackTx(approveHash, `Approve ${depositInput} USDT`);
      }
      setDepositState('wallet');
      const hash = await deposit(amount);
      setTxHash(hash);
      setDepositState('pending');
      trackTx(hash, `Deposit ${depositInput} USDT to Vault`);
      await waitForTransactionReceipt(config, { hash });
      setDepositState('success');
      setDepositInput('');
    } catch {
      setDepositState('error');
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
      trackTx(hash, `Withdraw ${withdrawInput} USDT from Vault`);
      await waitForTransactionReceipt(config, { hash });
      setWithdrawState('success');
      setWithdrawInput('');
    } catch {
      setWithdrawState('error');
    }
  };

  const tvl = totalAssets ? formatWei(totalAssets, 6) : 0;
  const myAssets = userAssets ? formatWei(userAssets, 6) : 0;

  return (
    <div className="mx-auto max-w-[1100px] space-y-8">
      {/* Page header */}
      <div>
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#6a6590]">Vault</span>
        <h2 className="font-display-sans mt-1 text-[28px] font-bold tracking-[-0.02em] text-white">
          MetaVault (ERC-4626)
        </h2>
        <p className="mt-1 text-[13px] text-[#555375]">
          Deposit USDT into the Wikshi MetaVault for automated yield allocation across lending markets.
        </p>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Value Locked', value: formatUSD(tvl), color: '#c8b6f0' },
          { label: 'Share Price', value: sharePrice.toFixed(4), color: '#E8A838' },
          { label: 'Your Position', value: formatUSD(myAssets), color: '#f0eef5' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="accent-border-top rounded-2xl border border-[#3D3565] bg-[#1e1a35] p-6"
            style={{ '--accent-color': stat.color } as React.CSSProperties}
          >
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#6a6590]">
              {stat.label}
            </span>
            <p className="financial-number mt-3 text-[26px] font-bold leading-none" style={{ color: stat.color }}>
              {stat.value}
            </p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Deposit/Withdraw Card */}
        <motion.div
          data-demo="vault-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="relative rounded-2xl border border-[#3D3565] bg-[#1e1a35] p-8"
        >
          <span className="absolute left-3 top-3 h-[4px] w-[4px] rounded-full bg-[#c8b6f0]/15" />
          <span className="absolute right-3 top-3 h-[4px] w-[4px] rounded-full bg-[#c8b6f0]/15" />
          <span className="absolute bottom-3 left-3 h-[4px] w-[4px] rounded-full bg-[#c8b6f0]/15" />
          <span className="absolute bottom-3 right-3 h-[4px] w-[4px] rounded-full bg-[#c8b6f0]/15" />

          <div className="space-y-5">
            <TokenInput
              label="Deposit USDT"
              tokenAddress={DEPLOYED_CONTRACTS.USDT}
              tokenSymbol="USDT"
              decimals={6}
              balance={usdt}
              value={depositInput}
              onChange={setDepositInput}
            />

            <ActionButton
              label="Deposit"
              state={depositState}
              txHash={txHash}
              onClick={handleDeposit}
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

        {/* Vault Overview */}
        <VaultStats delay={0.18} />
      </div>
    </div>
  );
}
