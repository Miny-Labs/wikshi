'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  CreditCard,
  ArrowDownUp,
  BarChart3,
  Landmark,
  Settings,
  FileText,
  Vault,
} from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/app', icon: LayoutDashboard },
  { label: 'Credit Passport', href: '/app/credit', icon: CreditCard },
  { label: 'Borrow', href: '/app/borrow', icon: ArrowDownUp },
  { label: 'Markets', href: '/app/markets', icon: BarChart3 },
  { label: 'Lend', href: '/app/lend', icon: Landmark },
  { label: 'RWA Pipeline', href: '/app/rwa', icon: FileText },
  { label: 'Vault', href: '/app/vault', icon: Vault },
  { label: 'Admin', href: '/app/admin', icon: Settings },
] as const;

export default function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/app') return pathname === '/app';
    return pathname.startsWith(href);
  };

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-[260px] flex-col border-r border-[#3D3565]/50 bg-[#12101e]">
      {/* Right edge gradient line */}
      <div className="pointer-events-none absolute right-0 top-0 h-full w-[1px] bg-gradient-to-b from-[#c8b6f0]/20 via-[#3D3565]/40 to-transparent" />
      {/* Subtle animated gradient wash */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          background:
            'radial-gradient(ellipse at 30% 20%, #c8b6f0, transparent 60%), radial-gradient(ellipse at 70% 80%, #E8A838, transparent 60%)',
        }}
      />

      {/* ── Logo ── */}
      <div className="relative px-7 pb-6 pt-8">
        <div className="flex items-baseline gap-1.5">
          {/* Decorative dot */}
          <span className="mb-auto mt-1 inline-block h-[5px] w-[5px] rounded-full bg-[#c8b6f0]" />
          <div>
            <h1
              className="font-display-sans text-[22px] font-bold leading-none tracking-[-0.03em] text-white"
            >
              WIKSHI
            </h1>
            <span className="mt-1 block text-[9px] font-bold uppercase tracking-[0.22em] text-[#c8b6f0]/70">
              Protocol
            </span>
          </div>
        </div>

        {/* Divider */}
        <div className="mt-6 h-px w-full bg-gradient-to-r from-[#3D3565] via-[#3D3565]/60 to-transparent" />
      </div>

      {/* ── Navigation ── */}
      <nav className="relative flex-1 px-4">
        <span className="mb-3 block px-3 text-[9px] font-bold uppercase tracking-[0.22em] text-[#6a6590]">
          Navigate
        </span>

        <ul className="space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`
                    group relative flex items-center gap-3 rounded-lg px-3 py-2.5
                    text-[13px] font-medium transition-all duration-200
                    ${
                      active
                        ? 'text-white'
                        : 'text-[#abadd0] hover:bg-[#1e1a35]/60 hover:text-[#d4c4f8]'
                    }
                  `}
                >
                  {/* Active indicator — animated sliding bar */}
                  {active && (
                    <motion.div
                      layoutId="sidebar-active"
                      className="absolute inset-0 rounded-lg"
                      style={{
                        background:
                          'linear-gradient(135deg, rgba(200,182,240,0.12) 0%, rgba(200,182,240,0.04) 100%)',
                        border: '1px solid rgba(200,182,240,0.15)',
                      }}
                      transition={{
                        type: 'spring',
                        stiffness: 380,
                        damping: 32,
                      }}
                    />
                  )}

                  {/* Active edge accent */}
                  {active && (
                    <motion.span
                      layoutId="sidebar-edge"
                      className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-[#c8b6f0]"
                      transition={{
                        type: 'spring',
                        stiffness: 380,
                        damping: 32,
                      }}
                    />
                  )}

                  <Icon
                    size={18}
                    strokeWidth={active ? 2.2 : 1.6}
                    className={`relative z-10 transition-colors duration-200 ${
                      active ? 'text-[#c8b6f0]' : 'text-[#6a6590] group-hover:text-[#abadd0]'
                    }`}
                  />
                  <span className="relative z-10">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* ── Bottom — Network Status ── */}
      <div className="relative border-t border-[#3D3565]/40 px-7 py-5">
        <div className="flex items-center gap-2.5">
          {/* Pulsing live dot */}
          <span className="relative flex h-2 w-2">
            <span className="pulse-live absolute inline-flex h-full w-full rounded-full bg-[#22C55E] opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#22C55E]" />
          </span>
          <div>
            <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-[#6a6590]">
              Creditcoin USC
            </span>
            <span className="block text-[9px] font-medium tracking-wide text-[#555375]">
              Testnet v2
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
