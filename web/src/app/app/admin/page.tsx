'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import { parseUnits } from 'viem';
import { useAccount } from 'wagmi';
import { waitForTransactionReceipt } from 'wagmi/actions';
import { config } from '@/lib/wagmi';
import { DEPLOYED_CONTRACTS } from '@/lib/constants';
import { useAdminActions } from '@/hooks/useAdminActions';
import { useTxNotify } from '@/components/app/TxProvider';
import ActionButton, { type ActionState } from '@/components/app/ActionButton';
import TokenIcon from '@/components/app/TokenIcon';
import { shortenTxHash, blockscoutTxUrl } from '@/lib/utils';

function TxLink({ hash }: { hash: string }) {
  return (
    <motion.a
      href={blockscoutTxUrl(hash)}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, clipPath: 'inset(0 100% 0 0)' }}
      animate={{ opacity: 1, clipPath: 'inset(0 0% 0 0)' }}
      transition={{ duration: 0.4 }}
      className="inline-flex items-center gap-1 font-mono text-[11px] text-[#c8b6f0] transition-opacity hover:opacity-80"
    >
      TX: {shortenTxHash(hash)}
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="opacity-60">
        <path d="M3 1h6v6M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </motion.a>
  );
}

export default function AdminPage() {
  const { address } = useAccount();
  const { submitCreditScore, setOraclePrice, setReceivableOraclePrice, mintTestToken } = useAdminActions();
  const { trackTx } = useTxNotify();

  // Credit Score form
  const [creditBorrower, setCreditBorrower] = useState('');
  const [creditScore, setCreditScore] = useState('');
  const [creditState, setCreditState] = useState<ActionState>('idle');
  const [creditTx, setCreditTx] = useState<string>();

  // Oracle Price form
  const [oraclePrice, setOraclePrice_] = useState('');
  const [oracleState, setOracleState] = useState<ActionState>('idle');
  const [oracleTx, setOracleTx] = useState<string>();

  // RWA Oracle Price form
  const [rwaOraclePrice, setRwaOraclePrice_] = useState('');
  const [rwaOracleState, setRwaOracleState] = useState<ActionState>('idle');
  const [rwaOracleTx, setRwaOracleTx] = useState<string>();

  // Mint Tokens form
  const [mintToken, setMintToken] = useState<'WCTC' | 'USDT' | 'USDT_RWA'>('WCTC');
  const [mintAmount, setMintAmount] = useState('');
  const [mintState, setMintState] = useState<ActionState>('idle');
  const [mintTx, setMintTx] = useState<string>();

  const handleCreditSubmit = async () => {
    if (!creditBorrower || !creditScore) return;
    try {
      setCreditState('wallet');
      const hash = await submitCreditScore(
        creditBorrower as `0x${string}`,
        BigInt(creditScore),
      );
      setCreditTx(hash);
      setCreditState('pending');
      trackTx(hash, `Submit Credit Score: ${creditScore}`);
      await waitForTransactionReceipt(config, { hash });
      setCreditState('success');
    } catch {
      setCreditState('error');
    }
  };

  const handleOracleSubmit = async () => {
    if (!oraclePrice) return;
    try {
      setOracleState('wallet');
      // Oracle price scale: 1e(36 + 6 - 18) = 1e24 for WCTC→USDT
      const priceWei = parseUnits(oraclePrice, 24);
      const hash = await setOraclePrice(priceWei);
      setOracleTx(hash);
      setOracleState('pending');
      trackTx(hash, `Set Oracle Price: $${oraclePrice}/CTC`);
      await waitForTransactionReceipt(config, { hash });
      setOracleState('success');
    } catch {
      setOracleState('error');
    }
  };

  const handleRwaOracleSubmit = async () => {
    if (!rwaOraclePrice) return;
    try {
      setRwaOracleState('wallet');
      // wREC oracle price in 1e36 scale (1:1 peg = 1e36)
      const priceWei = parseUnits(rwaOraclePrice, 36);
      const hash = await setReceivableOraclePrice(priceWei);
      setRwaOracleTx(hash);
      setRwaOracleState('pending');
      trackTx(hash, `Set wREC Oracle: ${rwaOraclePrice}`);
      await waitForTransactionReceipt(config, { hash });
      setRwaOracleState('success');
    } catch {
      setRwaOracleState('error');
    }
  };

  const handleMintSubmit = async () => {
    if (!mintAmount || !address) return;
    try {
      setMintState('wallet');
      const decimals = mintToken === 'WCTC' ? 18 : 6;
      const token = mintToken === 'WCTC' ? DEPLOYED_CONTRACTS.WCTC : mintToken === 'USDT' ? DEPLOYED_CONTRACTS.USDT : DEPLOYED_CONTRACTS.USDT_RWA;
      const hash = await mintTestToken(
        token as `0x${string}`,
        address,
        parseUnits(mintAmount, decimals),
      );
      setMintTx(hash);
      setMintState('pending');
      trackTx(hash, `Mint ${mintAmount} ${mintToken}`);
      await waitForTransactionReceipt(config, { hash });
      setMintState('success');
    } catch {
      setMintState('error');
    }
  };

  const inputClass =
    'w-full rounded-xl border border-[#3D3565] bg-[#0e0e12]/60 px-4 py-3 text-[13px] text-white placeholder-[#555375] outline-none transition-colors focus:border-[#c8b6f0]/40 financial-number';

  return (
    <div className="mx-auto max-w-[1100px] space-y-8">
      {/* Page header */}
      <div>
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#6a6590]">Admin</span>
        <h2 className="font-display-sans mt-1 text-[28px] font-bold tracking-[-0.02em] text-white">
          Demo Control Panel
        </h2>
        <p className="mt-1 text-[13px] text-[#555375]">
          Set credit scores, oracle prices, and mint test tokens for demo purposes.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Submit Credit Score */}
        <motion.div
          data-demo="credit-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0 }}
          className="relative rounded-2xl border border-[#3D3565] bg-[#1e1a35] p-8"
        >
          <span className="absolute left-3 top-3 h-[4px] w-[4px] rounded-full bg-[#c8b6f0]/15" />
          <span className="absolute right-3 top-3 h-[4px] w-[4px] rounded-full bg-[#c8b6f0]/15" />
          <span className="absolute bottom-3 left-3 h-[4px] w-[4px] rounded-full bg-[#c8b6f0]/15" />
          <span className="absolute bottom-3 right-3 h-[4px] w-[4px] rounded-full bg-[#c8b6f0]/15" />

          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#6a6590]">
            Credit Oracle
          </span>
          <h3 className="font-display-sans mt-1 text-[16px] font-bold text-white">
            Submit Score
          </h3>

          <div className="mt-5 space-y-4">
            <div>
              <label className="mb-1.5 block text-[11px] text-[#6a6590]">Borrower Address</label>
              <input
                type="text"
                placeholder="0x..."
                value={creditBorrower}
                onChange={(e) => setCreditBorrower(e.target.value)}
                className={inputClass}
              />
              {address && !creditBorrower && (
                <button
                  onClick={() => setCreditBorrower(address)}
                  className="mt-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#c8b6f0] transition-opacity hover:opacity-80"
                >
                  Use my address
                </button>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-[11px] text-[#6a6590]">Credit Score (0-1000)</label>
              <input
                type="number"
                placeholder="750"
                min="0"
                max="1000"
                value={creditScore}
                onChange={(e) => setCreditScore(e.target.value)}
                className={inputClass}
              />
            </div>

            <ActionButton
              label="Submit Score"
              state={creditState}
              txHash={creditTx}
              onClick={handleCreditSubmit}
            />
            {creditTx && creditState === 'success' && (
              <div className="text-center">
                <TxLink hash={creditTx} />
              </div>
            )}
          </div>
        </motion.div>

        {/* Set Oracle Price */}
        <motion.div
          data-demo="oracle-card"
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
            Price Oracle
          </span>
          <h3 className="font-display-sans mt-1 text-[16px] font-bold text-white">
            Set CTC Price
          </h3>

          <div className="mt-5 space-y-4">
            <div>
              <label className="mb-1.5 block text-[11px] text-[#6a6590]">Price in USD</label>
              <input
                type="number"
                placeholder="0.42"
                step="0.01"
                value={oraclePrice}
                onChange={(e) => setOraclePrice_(e.target.value)}
                className={inputClass}
              />
              <span className="mt-1.5 block text-[10px] text-[#555375]">
                Will be encoded as 1e24 scale for WCTC→USDT oracle
              </span>
            </div>

            <ActionButton
              label="Set Price"
              state={oracleState}
              txHash={oracleTx}
              onClick={handleOracleSubmit}
              variant="secondary"
            />
            {oracleTx && oracleState === 'success' && (
              <div className="text-center">
                <TxLink hash={oracleTx} />
              </div>
            )}
          </div>
        </motion.div>

        {/* Mint Test Tokens */}
        <motion.div
          data-demo="mint-card"
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
            Testnet Faucet
          </span>
          <h3 className="font-display-sans mt-1 text-[16px] font-bold text-white">
            Mint Tokens
          </h3>

          <div className="mt-5 space-y-4">
            {/* Token Selector */}
            <div>
              <label className="mb-1.5 block text-[11px] text-[#6a6590]">Token</label>
              <div className="flex gap-2">
                {(['WCTC', 'USDT', 'USDT_RWA'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setMintToken(t)}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-3 text-[12px] font-bold transition-all ${
                      mintToken === t
                        ? 'border-[#c8b6f0]/40 bg-[#c8b6f0]/10 text-white'
                        : 'border-[#3D3565] text-[#6a6590] hover:border-[#3D3565]/80'
                    }`}
                  >
                    <TokenIcon
                      address={t === 'WCTC' ? DEPLOYED_CONTRACTS.WCTC : t === 'USDT' ? DEPLOYED_CONTRACTS.USDT : DEPLOYED_CONTRACTS.USDT_RWA}
                      size={16}
                    />
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-[11px] text-[#6a6590]">Amount</label>
              <input
                type="number"
                placeholder={mintToken === 'WCTC' ? '10.0' : '1000.0'}
                value={mintAmount}
                onChange={(e) => setMintAmount(e.target.value)}
                className={inputClass}
              />
            </div>

            <ActionButton
              label={`Mint ${mintToken}`}
              state={mintState}
              txHash={mintTx}
              onClick={handleMintSubmit}
            />
            {mintTx && mintState === 'success' && (
              <div className="text-center">
                <TxLink hash={mintTx} />
              </div>
            )}
          </div>
        </motion.div>

        {/* Set RWA Oracle Price */}
        <motion.div
          data-demo="rwa-oracle-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.24 }}
          className="relative rounded-2xl border border-[#3D3565] bg-[#1e1a35] p-8"
        >
          <span className="absolute left-3 top-3 h-[4px] w-[4px] rounded-full bg-[#c8b6f0]/15" />
          <span className="absolute right-3 top-3 h-[4px] w-[4px] rounded-full bg-[#c8b6f0]/15" />
          <span className="absolute bottom-3 left-3 h-[4px] w-[4px] rounded-full bg-[#c8b6f0]/15" />
          <span className="absolute bottom-3 right-3 h-[4px] w-[4px] rounded-full bg-[#c8b6f0]/15" />

          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#6a6590]">
            RWA Oracle
          </span>
          <h3 className="font-display-sans mt-1 text-[16px] font-bold text-white">
            Set wREC Price
          </h3>

          <div className="mt-5 space-y-4">
            <div>
              <label className="mb-1.5 block text-[11px] text-[#6a6590]">Price (1.0 = 1:1 peg)</label>
              <input
                type="number"
                placeholder="1.0"
                step="0.01"
                value={rwaOraclePrice}
                onChange={(e) => setRwaOraclePrice_(e.target.value)}
                className={inputClass}
              />
              <span className="mt-1.5 block text-[10px] text-[#555375]">
                Encoded as 1e36 scale for wREC/USDT oracle
              </span>
            </div>

            <ActionButton
              label="Set wREC Price"
              state={rwaOracleState}
              txHash={rwaOracleTx}
              onClick={handleRwaOracleSubmit}
              variant="secondary"
            />
            {rwaOracleTx && rwaOracleState === 'success' && (
              <div className="text-center">
                <TxLink hash={rwaOracleTx} />
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
