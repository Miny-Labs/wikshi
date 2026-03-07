'use client';

import { useConnect } from 'wagmi';
import { motion } from 'framer-motion';
import { Shield, TrendingDown, Fingerprint, Loader2 } from 'lucide-react';
import AnimatedBlobs from './AnimatedBlobs';

const features = [
  { icon: Shield, label: 'Credit Scoring', desc: 'On-chain reputation' },
  { icon: TrendingDown, label: 'Lower Rates', desc: 'Credit-adjusted APR' },
  { icon: Fingerprint, label: 'Soulbound ID', desc: 'Non-transferable SBT' },
];

export default function ConnectWalletPrompt() {
  const { connect, connectors, isPending } = useConnect();

  const handleConnect = () => {
    const connector = connectors[0];
    if (connector) {
      connect({ connector });
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden">
      <AnimatedBlobs />

      {/* Background grid lines for depth */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(200, 182, 240, 0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(200, 182, 240, 0.4) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      {/* Top decorative bar */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 1.2, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="absolute left-[10%] right-[10%] top-[15%] h-[1px] origin-left bg-gradient-to-r from-transparent via-[#c8b6f0]/20 to-transparent"
      />

      {/* Hero typography above the card */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.1 }}
        className="relative z-10 mb-12 text-center"
      >
        <h1 className="font-display-sans text-[clamp(40px,6vw,72px)] font-bold leading-[0.92] tracking-[-0.03em] text-white">
          WIKSHI
        </h1>
        <div className="mt-2 flex items-center justify-center gap-3">
          <span className="h-[1px] w-8 bg-[#c8b6f0]/40" />
          <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#c8b6f0]">
            Protocol
          </span>
          <span className="h-[1px] w-8 bg-[#c8b6f0]/40" />
        </div>
        <p className="mx-auto mt-6 max-w-[440px] text-[15px] leading-[1.7] text-[#abadd0]">
          The first protocol that turns your repayment history into borrowing power.
          Less collateral. Better rates. Real credit on-chain.
        </p>
      </motion.div>

      {/* Glass Card */}
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.92 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 180, damping: 22, delay: 0.3 }}
        className="relative z-10 w-full max-w-[520px]"
      >
        {/* Glow behind card */}
        <div className="absolute -inset-4 rounded-3xl bg-gradient-to-b from-[#c8b6f0]/8 via-transparent to-[#8a7ece]/5 blur-xl" />

        <div className="glass-card relative overflow-hidden p-10">
          {/* Corner dots */}
          <span className="absolute left-3 top-3 h-[5px] w-[5px] rounded-full bg-[#c8b6f0]/25" />
          <span className="absolute right-3 top-3 h-[5px] w-[5px] rounded-full bg-[#c8b6f0]/25" />
          <span className="absolute bottom-3 left-3 h-[5px] w-[5px] rounded-full bg-[#c8b6f0]/25" />
          <span className="absolute bottom-3 right-3 h-[5px] w-[5px] rounded-full bg-[#c8b6f0]/25" />

          {/* Top accent line */}
          <div className="absolute left-10 right-10 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#c8b6f0]/30 to-transparent" />

          {/* Label */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mb-8 text-center"
          >
            <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#6a6590]">
              Connect Your Wallet
            </span>
          </motion.div>

          {/* Connect button */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="mb-8"
          >
            <button
              onClick={handleConnect}
              disabled={isPending}
              className="group relative w-full overflow-hidden rounded-full bg-[#c8b6f0] px-8 py-4 text-[12px] font-bold uppercase tracking-[0.18em] text-[#0e0e12] transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_40px_rgba(200,182,240,0.25)] disabled:opacity-60"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {isPending ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="opacity-70">
                      <path d="M21.17 2.06A13.1 13.1 0 0 0 19 1.87a12.94 12.94 0 0 0-7 2.05 12.94 12.94 0 0 0-7-2 13.1 13.1 0 0 0-2.17.19 1 1 0 0 0-.83 1v12a1 1 0 0 0 1.17 1 10.9 10.9 0 0 1 1.83-.15 11 11 0 0 1 6 1.76 1 1 0 0 0 1.1 0 11 11 0 0 1 6-1.76 10.9 10.9 0 0 1 1.83.15 1 1 0 0 0 .93-.25 1 1 0 0 0 .24-.72v-12a1 1 0 0 0-.83-1.03Z" fill="currentColor"/>
                    </svg>
                    Connect with MetaMask
                  </>
                )}
              </span>
              {/* Shimmer effect on hover */}
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
            </button>
          </motion.div>

          {/* Supported wallets hint */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mb-8 text-center text-[10px] text-[#555375]"
          >
            MetaMask &middot; Any injected EVM wallet
          </motion.p>

          {/* Feature strip */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.5 }}
            className="grid grid-cols-3 gap-3"
          >
            {features.map((f, i) => (
              <motion.div
                key={f.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.0 + i * 0.1 }}
                className="group flex flex-col items-center rounded-xl border border-[#3D3565]/40 bg-[#0e0e12]/50 px-3 py-5 text-center transition-all duration-200 hover:border-[#c8b6f0]/20 hover:bg-[#0e0e12]/80"
              >
                <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-[#c8b6f0]/10">
                  <f.icon size={16} className="text-[#c8b6f0]" strokeWidth={1.8} />
                </div>
                <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-white">
                  {f.label}
                </span>
                <span className="mt-1 text-[8px] leading-[1.4] text-[#555375]">{f.desc}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.div>

      {/* Network status below card */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.3 }}
        className="relative z-10 mt-8 flex items-center gap-2"
      >
        <span className="relative flex h-2 w-2">
          <span className="pulse-live absolute inline-flex h-full w-full rounded-full bg-[#22C55E] opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-[#22C55E]" />
        </span>
        <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#555375]">
          Creditcoin USC Testnet v2
        </span>
      </motion.div>

      {/* Bottom decorative bar */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 1.2, delay: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="absolute bottom-[15%] left-[10%] right-[10%] h-[1px] origin-right bg-gradient-to-r from-transparent via-[#3D3565]/30 to-transparent"
      />
    </div>
  );
}
