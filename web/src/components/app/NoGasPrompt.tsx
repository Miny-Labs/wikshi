'use client';

import { motion } from 'framer-motion';
import { Fuel, ExternalLink, RefreshCw, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { formatWei } from '@/lib/market';
import { shortenAddress } from '@/lib/utils';

interface NoGasPromptProps {
  address: `0x${string}`;
  balance: bigint;
}

export default function NoGasPrompt({ address, balance }: NoGasPromptProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReload = () => {
    window.location.reload();
  };

  const balanceDisplay = formatWei(balance, 18);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 22 }}
      className="relative mx-auto w-full max-w-[520px] overflow-hidden rounded-2xl border border-[#E8A838]/30 bg-[#1e1a35] shadow-2xl shadow-black/40"
    >
      {/* Top accent */}
      <div className="h-[2px] bg-gradient-to-r from-transparent via-[#E8A838] to-transparent" />

      <div className="p-10">
        {/* Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.2 }}
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#E8A838]/10"
        >
          <Fuel size={28} className="text-[#E8A838]" strokeWidth={1.8} />
        </motion.div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-6 text-center"
        >
          <h2 className="font-display-sans text-[22px] font-bold tracking-[-0.02em] text-white">
            No Gas to Transact
          </h2>
          <p className="mx-auto mt-3 max-w-sm text-[13px] leading-[1.7] text-[#abadd0]">
            You need tCTC (testnet CTC) to pay for gas on Creditcoin USC Testnet v2.
            Your current balance is too low to execute transactions.
          </p>
        </motion.div>

        {/* Balance display */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mx-auto mt-6 flex max-w-xs items-center justify-between rounded-xl border border-[#3D3565] bg-[#0e0e12]/60 px-5 py-3"
        >
          <span className="text-[11px] text-[#6a6590]">Balance</span>
          <span className="financial-number text-[14px] font-bold text-[#E8A838]">
            {balanceDisplay.toFixed(6)} tCTC
          </span>
        </motion.div>

        {/* Your address (copy) */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45 }}
          className="mt-3"
        >
          <button
            onClick={handleCopy}
            className="mx-auto flex items-center gap-2 rounded-lg border border-[#3D3565]/50 bg-[#0e0e12]/40 px-4 py-2.5 transition-all hover:border-[#c8b6f0]/30"
          >
            <span className="font-mono text-[11px] text-[#abadd0]">{shortenAddress(address, 8)}</span>
            {copied ? (
              <Check size={12} className="text-[#22C55E]" />
            ) : (
              <Copy size={12} className="text-[#6a6590]" />
            )}
          </button>
        </motion.div>

        {/* Instructions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-8 space-y-3"
        >
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#6a6590]">
            How to get tCTC
          </span>

          <a
            href="https://discord.gg/creditcoin"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-4 rounded-xl border border-[#3D3565] bg-[#0e0e12]/40 p-4 transition-all hover:border-[#c8b6f0]/20 hover:bg-[#0e0e12]/60"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#5865F2]/15 text-[14px]">
              <svg width="18" height="14" viewBox="0 0 71 55" fill="#5865F2">
                <path d="M60.1 4.9A58.5 58.5 0 0045.4.2a.2.2 0 00-.2.1 40.7 40.7 0 00-1.8 3.7c-5.5-.8-11-.8-16.4 0A26.4 26.4 0 0025.2.3a.2.2 0 00-.2-.1A58.4 58.4 0 0010.3 4.9a.2.2 0 00-.1.1C1.5 18.7-.9 32 .3 45.1v.1a58.8 58.8 0 0017.7 9a.2.2 0 00.3-.1 42 42 0 003.6-5.9.2.2 0 00-.1-.3 38.7 38.7 0 01-5.5-2.6.2.2 0 01.5-.4l1.1.9a.2.2 0 00.3 0 42 42 0 0035.6 0 .2.2 0 00.2 0l1.1-.9a.2.2 0 01.5.3c-1.8 1-3.6 1.9-5.5 2.7a.2.2 0 00-.1.3c1.1 2 2.3 4 3.6 5.9a.2.2 0 00.3.1A58.6 58.6 0 0070.7 45.2v-.1c1.4-14.9-2.4-27.8-10-39.3a.2.2 0 00-.1 0zM23.7 37c-3.4 0-6.2-3.1-6.2-7s2.7-7 6.2-7 6.3 3.2 6.2 7-2.8 7-6.2 7zm23 0c-3.4 0-6.2-3.1-6.2-7s2.7-7 6.2-7 6.3 3.2 6.2 7-2.8 7-6.2 7z"/>
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-[12px] font-bold text-white">Creditcoin Discord Faucet</p>
              <p className="text-[10px] text-[#6a6590]">Use /faucet command in #faucet channel</p>
            </div>
            <ExternalLink size={14} className="text-[#6a6590] group-hover:text-[#c8b6f0]" />
          </a>

          <a
            href="https://thirdweb.com/creditcoin-testnet"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-4 rounded-xl border border-[#3D3565] bg-[#0e0e12]/40 p-4 transition-all hover:border-[#c8b6f0]/20 hover:bg-[#0e0e12]/60"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#c8b6f0]/10 text-[14px]">
              <Fuel size={16} className="text-[#c8b6f0]" />
            </div>
            <div className="flex-1">
              <p className="text-[12px] font-bold text-white">Thirdweb Faucet</p>
              <p className="text-[10px] text-[#6a6590]">Drip 0.01 tCTC per day</p>
            </div>
            <ExternalLink size={14} className="text-[#6a6590] group-hover:text-[#c8b6f0]" />
          </a>
        </motion.div>

        {/* Reload button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-8"
        >
          <button
            onClick={handleReload}
            className="group flex w-full items-center justify-center gap-2 rounded-full bg-[#c8b6f0] px-8 py-3.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#0e0e12] transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(200,182,240,0.15)]"
          >
            <RefreshCw size={14} className="transition-transform group-hover:rotate-180" />
            I&apos;ve funded my wallet — Reload
          </button>
        </motion.div>

        {/* Network info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-6 flex items-center justify-center gap-2"
        >
          <span className="relative flex h-2 w-2">
            <span className="pulse-live absolute inline-flex h-full w-full rounded-full bg-[#22C55E] opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#22C55E]" />
          </span>
          <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#555375]">
            Creditcoin USC Testnet v2 &middot; Chain 102036
          </span>
        </motion.div>
      </div>
    </motion.div>
  );
}
