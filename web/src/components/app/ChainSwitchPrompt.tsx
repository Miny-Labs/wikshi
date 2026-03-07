'use client';

import { useSwitchChain, useChainId } from 'wagmi';
import { creditcoinTestnet } from '@/lib/wagmi';
import { AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ChainSwitchPrompt() {
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  const handleSwitch = () => {
    switchChain({ chainId: creditcoinTestnet.id });
  };

  const handleAddNetwork = async () => {
    try {
      await (window as any).ethereum?.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: '0x18E54',
            chainName: 'Creditcoin USC Testnet v2',
            nativeCurrency: { name: 'CTC', symbol: 'tCTC', decimals: 18 },
            rpcUrls: ['https://rpc.usc-testnet2.creditcoin.network'],
            blockExplorerUrls: [
              'https://explorer.usc-testnet2.creditcoin.network',
            ],
          },
        ],
      });
    } catch {
      // User rejected or wallet doesn't support
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-lg rounded-2xl border border-[#E8A838]/30 bg-[#E8A838]/5 p-6 backdrop-blur-sm"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle size={20} className="mt-0.5 shrink-0 text-[#E8A838]" />
        <div className="flex-1">
          <h3 className="font-display-sans text-[15px] font-bold text-white">
            Wrong Network Detected
          </h3>
          <p className="mt-1 text-[13px] leading-relaxed text-[#abadd0]">
            You&apos;re connected to chain {chainId}. Wikshi runs on Creditcoin
            USC Testnet v2.
          </p>
          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={handleSwitch}
              className="rounded-full bg-[#c8b6f0] px-5 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#0e0e12] transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(200,182,240,0.2)]"
            >
              Switch to Creditcoin
            </button>
            <button
              onClick={handleAddNetwork}
              className="rounded-full border border-[#3D3565] px-5 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#abadd0] transition-all duration-200 hover:border-[#c8b6f0]/30 hover:text-white"
            >
              Add Network
            </button>
          </div>
          <p className="mt-3 font-mono text-[10px] text-[#555375]">
            Chain ID: 102036 &middot; RPC: rpc.usc-testnet2.creditcoin.network
          </p>
        </div>
      </div>
    </motion.div>
  );
}
