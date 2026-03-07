'use client';

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Check, AlertCircle, ExternalLink } from 'lucide-react';
import { waitForTransactionReceipt } from 'wagmi/actions';
import { config } from '@/lib/wagmi';
import { shortenTxHash, blockscoutTxUrl } from '@/lib/utils';

interface TxEntry {
  id: string;
  hash: string;
  label: string;
  status: 'pending' | 'success' | 'error';
  timestamp: number;
}

interface TxContextValue {
  /** Track a TX: shows toast, waits for receipt, updates status. Returns receipt. */
  trackTx: (hash: string, label: string) => Promise<void>;
  txHistory: TxEntry[];
}

const TxContext = createContext<TxContextValue>({
  trackTx: async () => {},
  txHistory: [],
});

export function useTxNotify() {
  return useContext(TxContext);
}

export function TxProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<TxEntry[]>([]);
  const [history, setHistory] = useState<TxEntry[]>([]);

  const trackTx = useCallback(async (hash: string, label: string) => {
    const id = `${hash}-${Date.now()}`;
    const entry: TxEntry = { id, hash, label, status: 'pending', timestamp: Date.now() };

    setToasts((prev) => [entry, ...prev].slice(0, 5));
    setHistory((prev) => [entry, ...prev].slice(0, 50));

    try {
      await waitForTransactionReceipt(config, { hash: hash as `0x${string}` });
      const update = (list: TxEntry[]) =>
        list.map((t) => (t.id === id ? { ...t, status: 'success' as const } : t));
      setToasts(update);
      setHistory(update);

      // Auto-dismiss after 8s
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 8000);
    } catch {
      const update = (list: TxEntry[]) =>
        list.map((t) => (t.id === id ? { ...t, status: 'error' as const } : t));
      setToasts(update);
      setHistory(update);

      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 10000);
    }
  }, []);

  return (
    <TxContext.Provider value={{ trackTx, txHistory: history }}>
      {children}
      {/* Toast stack */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence mode="popLayout">
          {toasts.map((tx) => (
            <motion.div
              key={tx.id}
              layout
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 80, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="pointer-events-auto w-[360px] rounded-xl border border-[#3D3565] bg-[#1e1a35]/95 p-4 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-sm"
            >
              <div className="flex items-start gap-3">
                {/* Status icon */}
                <div className="mt-0.5">
                  {tx.status === 'pending' && (
                    <div className="relative">
                      <Loader2 size={18} className="animate-spin text-[#c8b6f0]" />
                      <span className="pulse-live absolute inset-[-4px] rounded-full border border-[#c8b6f0]/30" />
                    </div>
                  )}
                  {tx.status === 'success' && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                    >
                      <Check size={18} className="text-[#22C55E]" />
                    </motion.div>
                  )}
                  {tx.status === 'error' && <AlertCircle size={18} className="text-[#EF4444]" />}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-bold text-white truncate">{tx.label}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="font-mono text-[10px] text-[#6a6590]">
                      {shortenTxHash(tx.hash)}
                    </span>
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${
                      tx.status === 'pending' ? 'text-[#c8b6f0]' :
                      tx.status === 'success' ? 'text-[#22C55E]' : 'text-[#EF4444]'
                    }`}>
                      {tx.status === 'pending' ? 'Confirming...' :
                       tx.status === 'success' ? 'Confirmed' : 'Failed'}
                    </span>
                  </div>
                </div>

                {/* Blockscout link */}
                <a
                  href={blockscoutTxUrl(tx.hash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#3D3565] text-[#c8b6f0] transition-all hover:border-[#c8b6f0]/40 hover:bg-[#c8b6f0]/10"
                  title="View on Blockscout"
                >
                  <ExternalLink size={13} />
                </a>
              </div>

              {/* Progress bar for pending */}
              {tx.status === 'pending' && (
                <div className="mt-3 h-[2px] overflow-hidden rounded-full bg-[#3D3565]/40">
                  <motion.div
                    className="h-full rounded-full bg-[#c8b6f0]"
                    initial={{ x: '-100%' }}
                    animate={{ x: '100%' }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                  />
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </TxContext.Provider>
  );
}
