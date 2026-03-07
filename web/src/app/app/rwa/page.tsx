'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import { parseUnits } from 'viem';
import { useAccount } from 'wagmi';
import { waitForTransactionReceipt } from 'wagmi/actions';
import { config } from '@/lib/wagmi';
import { DEPLOYED_CONTRACTS } from '@/lib/constants';
import { useLiveBlock } from '@/hooks/useLiveBlock';
import { useReceivableActions } from '@/hooks/useReceivableActions';
import { useReceivableLoanData, useTotalReceivables, useReceivableValue } from '@/hooks/useReceivableData';
import { useWrapperActions } from '@/hooks/useWrapperActions';
import { useWrapperBalance } from '@/hooks/useWrapperBalance';
import { useRwaMarketData, useRwaOraclePrice } from '@/hooks/useRwaMarketData';
import { useTokenBalances } from '@/hooks/useTokenBalances';
import { useTokenApproval } from '@/hooks/useTokenApproval';
import { useRwaLendingActions } from '@/hooks/useRwaLendingActions';
import { useTxNotify } from '@/components/app/TxProvider';
import ReceivableCard from '@/components/app/ReceivableCard';
import TokenInput from '@/components/app/TokenInput';
import ActionButton, { type ActionState } from '@/components/app/ActionButton';
import SkeletonCard from '@/components/app/SkeletonCard';
import TokenIcon from '@/components/app/TokenIcon';
import { formatUSD, formatPercent } from '@/lib/utils';
import { formatWei, utilizationRate } from '@/lib/market';

export default function RwaPage() {
  useLiveBlock();
  const { address } = useAccount();
  const { trackTx } = useTxNotify();
  const { total: totalReceivables } = useTotalReceivables();
  const { data: rwaMarket, isLoading: marketLoading } = useRwaMarketData();
  const { price: rwaOraclePrice } = useRwaOraclePrice();
  const { balance: wrecBalance, wrappedCount } = useWrapperBalance();
  const { usdtRwa } = useTokenBalances();
  const { mintReceivable } = useReceivableActions();
  const { approveAndWrap } = useWrapperActions();
  const { supply: rwaSupply, supplyCollateral: rwaSupplyCollateral, borrow: rwaBorrow } = useRwaLendingActions();

  // Receivable lookup
  const [lookupId, setLookupId] = useState('');
  const parsedId = lookupId ? BigInt(lookupId) : undefined;
  const { data: lookupLoan } = useReceivableLoanData(parsedId);
  const { value: lookupValue } = useReceivableValue(parsedId);

  // Mint receivable form
  const [mintBorrower, setMintBorrower] = useState('');
  const [mintPrincipal, setMintPrincipal] = useState('');
  const [mintInterest, setMintInterest] = useState('500'); // 5%
  const [mintDays, setMintDays] = useState('90');
  const [mintState, setMintState] = useState<ActionState>('idle');
  const [mintTx, setMintTx] = useState<string>();

  // Wrap form
  const [wrapTokenId, setWrapTokenId] = useState('');
  const [wrapState, setWrapState] = useState<ActionState>('idle');

  // RWA Market lending
  const [supplyInput, setSupplyInput] = useState('');
  const [supplyState, setSupplyState] = useState<ActionState>('idle');
  const [supplyTx, setSupplyTx] = useState<string>();

  const usdtRwaApproval = useTokenApproval(
    DEPLOYED_CONTRACTS.USDT_RWA as `0x${string}`,
    DEPLOYED_CONTRACTS.WikshiLend as `0x${string}`,
  );

  const wrecApproval = useTokenApproval(
    DEPLOYED_CONTRACTS.WikshiReceivableWrapper as `0x${string}`,
    DEPLOYED_CONTRACTS.WikshiLend as `0x${string}`,
  );

  const handleMintReceivable = async () => {
    if (!address || !mintBorrower || !mintPrincipal) return;
    try {
      setMintState('wallet');
      const maturity = BigInt(Math.floor(Date.now() / 1000) + Number(mintDays) * 86400);
      const hash = await mintReceivable({
        lender: address,
        borrower: mintBorrower as `0x${string}`,
        loanToken: DEPLOYED_CONTRACTS.USDT_RWA as `0x${string}`,
        principal: parseUnits(mintPrincipal, 6),
        interestRate: BigInt(mintInterest),
        maturityAt: maturity,
        sourceLoanHash: '0x0000000000000000000000000000000000000000000000000000000000000001' as `0x${string}`,
        sourceChainKey: 11155111n, // Sepolia
      });
      setMintTx(hash);
      setMintState('pending');
      trackTx(hash, `Mint Receivable: ${mintPrincipal} USDT`);
      await waitForTransactionReceipt(config, { hash });
      setMintState('success');
    } catch {
      setMintState('error');
    }
  };

  const handleWrap = async () => {
    if (!wrapTokenId) return;
    try {
      setWrapState('wallet');
      const { approveHash, wrapHash } = await approveAndWrap(BigInt(wrapTokenId));
      trackTx(approveHash, `Approve Receivable #${wrapTokenId}`);
      setWrapState('pending');
      trackTx(wrapHash, `Wrap Receivable #${wrapTokenId}`);
      await waitForTransactionReceipt(config, { hash: wrapHash });
      setWrapState('success');
    } catch {
      setWrapState('error');
    }
  };

  const handleRwaSupply = async () => {
    if (!supplyInput) return;
    try {
      const amount = parseUnits(supplyInput, 6);
      if (usdtRwaApproval.needsApproval(amount)) {
        setSupplyState('wallet');
        const approveHash = await usdtRwaApproval.approve(amount);
        trackTx(approveHash, `Approve ${supplyInput} USDT`);
      }
      setSupplyState('wallet');
      const hash = await rwaSupply(amount);
      setSupplyTx(hash);
      setSupplyState('pending');
      trackTx(hash, `Supply ${supplyInput} USDT to RWA Market`);
      await waitForTransactionReceipt(config, { hash });
      setSupplyState('success');
      setSupplyInput('');
    } catch {
      setSupplyState('error');
    }
  };

  const inputClass =
    'w-full rounded-xl border border-[#3D3565] bg-[#0e0e12]/60 px-4 py-3 text-[13px] text-white placeholder-[#555375] outline-none transition-colors focus:border-[#c8b6f0]/40 financial-number';

  const rwaSupplyVal = rwaMarket ? formatWei(rwaMarket.totalSupplyAssets, 6) : 0;
  const rwaBorrowVal = rwaMarket ? formatWei(rwaMarket.totalBorrowAssets, 6) : 0;
  const rwaUtil = rwaMarket && rwaMarket.totalSupplyAssets > 0n
    ? utilizationRate(rwaMarket.totalSupplyAssets, rwaMarket.totalBorrowAssets) * 100
    : 0;

  return (
    <div className="mx-auto max-w-[1100px] space-y-8">
      {/* Page header */}
      <div>
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#6a6590]">
          RWA Pipeline
        </span>
        <h2 className="font-display-sans mt-1 text-[28px] font-bold tracking-[-0.02em] text-white">
          Real-World Asset Receivables
        </h2>
        <p className="mt-1 text-[13px] text-[#555375]">
          Tokenize loan receivables as NFTs, wrap them into fungible wREC tokens, and use as DeFi collateral.
        </p>
      </div>

      {/* RWA Flow Diagram */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-2xl border border-[#c8b6f0]/20 bg-gradient-to-r from-[#1e1a35] to-[#2A2450] p-8"
      >
        <div className="flex items-center justify-between">
          {[
            { step: '1', label: 'Real-World Loan', desc: 'Verified via USC', icon: '📋' },
            { step: '2', label: 'Receivable NFT', desc: 'ERC-721 token', icon: '🎫' },
            { step: '3', label: 'wREC Token', desc: 'Fungible ERC-20', icon: '🔄' },
            { step: '4', label: 'DeFi Collateral', desc: 'Borrow against wREC', icon: '🏦' },
          ].map((s, i) => (
            <div key={s.step} className="flex items-center">
              <div className="flex flex-col items-center text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#c8b6f0]/10 text-xl">
                  {s.icon}
                </div>
                <span className="mt-2 text-[12px] font-bold text-white">{s.label}</span>
                <span className="text-[10px] text-[#6a6590]">{s.desc}</span>
              </div>
              {i < 3 && (
                <div className="mx-4 h-px w-12 bg-gradient-to-r from-[#c8b6f0]/40 to-[#c8b6f0]/10" />
              )}
            </div>
          ))}
        </div>
      </motion.div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Receivables', value: totalReceivables ? Number(totalReceivables).toString() : '0', color: '#c8b6f0' },
          { label: 'Wrapped (wREC)', value: wrappedCount ? Number(wrappedCount).toString() : '0', color: '#E8A838' },
          { label: 'wREC Balance', value: wrecBalance ? formatWei(wrecBalance, 18).toFixed(2) : '0.00', color: '#f0eef5' },
          { label: 'RWA Market TVL', value: formatUSD(rwaSupplyVal), color: '#c8b6f0' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="rounded-xl border border-[#3D3565]/50 bg-[#1e1a35] p-4"
          >
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#6a6590]">
              {stat.label}
            </span>
            <p className="financial-number mt-2 text-[18px] font-bold" style={{ color: stat.color }}>
              {stat.value}
            </p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Mint Receivable Card */}
        <motion.div
          data-demo="mint-receivable-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative rounded-2xl border border-[#3D3565] bg-[#1e1a35] p-8"
        >
          <span className="absolute left-3 top-3 h-[4px] w-[4px] rounded-full bg-[#c8b6f0]/15" />
          <span className="absolute right-3 top-3 h-[4px] w-[4px] rounded-full bg-[#c8b6f0]/15" />
          <span className="absolute bottom-3 left-3 h-[4px] w-[4px] rounded-full bg-[#c8b6f0]/15" />
          <span className="absolute bottom-3 right-3 h-[4px] w-[4px] rounded-full bg-[#c8b6f0]/15" />

          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#6a6590]">
            Step 1 &middot; Tokenize
          </span>
          <h3 className="font-display-sans mt-1 text-[16px] font-bold text-white">
            Mint Receivable NFT
          </h3>

          <div className="mt-5 space-y-4">
            <div>
              <label className="mb-1.5 block text-[11px] text-[#6a6590]">Borrower Address</label>
              <input
                type="text"
                placeholder="0x..."
                value={mintBorrower}
                onChange={(e) => setMintBorrower(e.target.value)}
                className={inputClass}
              />
              {address && !mintBorrower && (
                <button
                  onClick={() => setMintBorrower(address)}
                  className="mt-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#c8b6f0] transition-opacity hover:opacity-80"
                >
                  Use my address
                </button>
              )}
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="mb-1.5 block text-[11px] text-[#6a6590]">Principal (USDT)</label>
                <input
                  type="number"
                  placeholder="1000"
                  value={mintPrincipal}
                  onChange={(e) => setMintPrincipal(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] text-[#6a6590]">Rate (bps)</label>
                <input
                  type="number"
                  placeholder="500"
                  value={mintInterest}
                  onChange={(e) => setMintInterest(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] text-[#6a6590]">Days</label>
                <input
                  type="number"
                  placeholder="90"
                  value={mintDays}
                  onChange={(e) => setMintDays(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            <ActionButton
              label="Mint Receivable"
              state={mintState}
              txHash={mintTx}
              onClick={handleMintReceivable}
            />
          </div>
        </motion.div>

        {/* Wrap + Supply Card */}
        <motion.div
          data-demo="wrap-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16 }}
          className="relative rounded-2xl border border-[#3D3565] bg-[#1e1a35] p-8"
        >
          <span className="absolute left-3 top-3 h-[4px] w-[4px] rounded-full bg-[#c8b6f0]/15" />
          <span className="absolute right-3 top-3 h-[4px] w-[4px] rounded-full bg-[#c8b6f0]/15" />
          <span className="absolute bottom-3 left-3 h-[4px] w-[4px] rounded-full bg-[#c8b6f0]/15" />
          <span className="absolute bottom-3 right-3 h-[4px] w-[4px] rounded-full bg-[#c8b6f0]/15" />

          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#6a6590]">
            Step 2 &middot; Wrap
          </span>
          <h3 className="font-display-sans mt-1 text-[16px] font-bold text-white">
            Wrap NFT → wREC
          </h3>

          <div className="mt-5 space-y-4">
            <div>
              <label className="mb-1.5 block text-[11px] text-[#6a6590]">Receivable Token ID</label>
              <input
                type="number"
                placeholder="1"
                value={wrapTokenId}
                onChange={(e) => setWrapTokenId(e.target.value)}
                className={inputClass}
              />
            </div>

            <ActionButton
              label="Approve & Wrap"
              state={wrapState}
              onClick={handleWrap}
            />

            {/* Supply to RWA Market */}
            <div className="border-t border-[#3D3565]/30 pt-5">
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#6a6590]">
                Step 3 &middot; Supply to RWA Market
              </span>

              <div className="mt-3">
                <TokenInput
                  label="Supply USDT"
                  tokenAddress={DEPLOYED_CONTRACTS.USDT_RWA}
                  tokenSymbol="USDT"
                  decimals={6}
                  balance={usdtRwa}
                  value={supplyInput}
                  onChange={setSupplyInput}
                />
              </div>

              <div className="mt-3">
                <ActionButton
                  label="Supply to RWA Market"
                  state={supplyState}
                  txHash={supplyTx}
                  onClick={handleRwaSupply}
                  variant="secondary"
                />
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Receivable Lookup */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.22 }}
        className="relative rounded-2xl border border-[#3D3565] bg-[#1e1a35] p-8"
      >
        <span className="absolute left-3 top-3 h-[4px] w-[4px] rounded-full bg-[#c8b6f0]/15" />
        <span className="absolute right-3 top-3 h-[4px] w-[4px] rounded-full bg-[#c8b6f0]/15" />

        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#6a6590]">
          Receivable Lookup
        </span>

        <div className="mt-4 flex items-end gap-4">
          <div className="flex-1">
            <label className="mb-1.5 block text-[11px] text-[#6a6590]">Token ID</label>
            <input
              type="number"
              placeholder="Enter receivable ID..."
              value={lookupId}
              onChange={(e) => setLookupId(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        {lookupLoan && parsedId !== undefined && (
          <div className="mt-6">
            <ReceivableCard
              tokenId={parsedId}
              loan={lookupLoan}
              value={lookupValue}
            />
          </div>
        )}
      </motion.div>

      {/* RWA Market Stats */}
      {rwaMarket && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28 }}
          className="relative rounded-2xl border border-[#3D3565] bg-[#1e1a35] p-8"
        >
          <span className="absolute left-3 top-3 h-[4px] w-[4px] rounded-full bg-[#c8b6f0]/15" />
          <span className="absolute right-3 top-3 h-[4px] w-[4px] rounded-full bg-[#c8b6f0]/15" />
          <span className="absolute bottom-3 left-3 h-[4px] w-[4px] rounded-full bg-[#c8b6f0]/15" />
          <span className="absolute bottom-3 right-3 h-[4px] w-[4px] rounded-full bg-[#c8b6f0]/15" />

          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              <TokenIcon address={DEPLOYED_CONTRACTS.WikshiReceivableWrapper} size={28} />
              <TokenIcon address={DEPLOYED_CONTRACTS.USDT_RWA} size={28} />
            </div>
            <div>
              <h3 className="font-display-sans text-[16px] font-bold text-white">wREC / USDT Market</h3>
              <p className="text-[11px] text-[#6a6590]">RWA Receivable-Backed &middot; 70% LLTV</p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-4 gap-4">
            {[
              { label: 'Total Supplied', value: formatUSD(rwaSupplyVal), color: '#f0eef5' },
              { label: 'Total Borrowed', value: formatUSD(rwaBorrowVal), color: '#f0eef5' },
              { label: 'Utilization', value: formatPercent(rwaUtil), color: rwaUtil < 70 ? '#22C55E' : '#E8A838' },
              { label: 'Oracle Price', value: rwaOraclePrice ? `${(Number(rwaOraclePrice) / 1e36).toFixed(4)}` : '--', color: '#E8A838' },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl border border-[#3D3565]/50 bg-[#0e0e12]/40 p-4">
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#6a6590]">
                  {stat.label}
                </span>
                <p className="financial-number mt-2 text-[16px] font-bold" style={{ color: stat.color }}>
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
