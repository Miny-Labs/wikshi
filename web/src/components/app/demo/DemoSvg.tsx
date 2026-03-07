'use client';

import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { useEffect } from 'react';
import type { SvgAnimationType } from './demoSteps';

const DRAW = { hidden: { pathLength: 0, opacity: 0 }, visible: { pathLength: 1, opacity: 1 } };
const DRAW_TRANSITION = { duration: 1.2, ease: [0.65, 0, 0.35, 1] as const };

// --- Token Flow ---
function TokenFlowSvg({ token, amount, color }: { token?: string; amount?: string; color?: string }) {
  const c = color || '#c8b6f0';
  return (
    <svg viewBox="0 0 360 120" className="w-full" fill="none">
      {/* Source */}
      <motion.rect
        x="10" y="35" width="80" height="50" rx="10"
        stroke={c} strokeWidth="1.5" fill="none"
        initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
      />
      <motion.text x="50" y="55" textAnchor="middle" fill="#abadd0" fontSize="9" fontWeight="600"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
      >WALLET</motion.text>
      <motion.text x="50" y="72" textAnchor="middle" fill="white" fontSize="10" fontWeight="700"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
      >{token || 'TOKEN'}</motion.text>

      {/* Destination */}
      <motion.rect
        x="270" y="35" width="80" height="50" rx="10"
        stroke={c} strokeWidth="1.5" fill="none"
        initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, duration: 0.4 }}
      />
      <motion.text x="310" y="55" textAnchor="middle" fill="#abadd0" fontSize="9" fontWeight="600"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
      >POOL</motion.text>
      <motion.text x="310" y="72" textAnchor="middle" fill="white" fontSize="10" fontWeight="700"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
      >{amount || '0'}</motion.text>

      {/* Flow path */}
      <motion.path
        d="M95,60 C160,60 200,60 265,60"
        stroke={c} strokeWidth="2" strokeDasharray="6 4"
        variants={DRAW} initial="hidden" animate="visible"
        transition={{ ...DRAW_TRANSITION, delay: 0.3 }}
      />

      {/* Moving dots */}
      {[0, 0.3, 0.6].map((delay, i) => (
        <motion.circle key={i} r="4" fill={c}
          initial={{ cx: 95, cy: 60, opacity: 0 }}
          animate={{ cx: [95, 265], opacity: [0, 1, 1, 0] }}
          transition={{ duration: 1.5, delay: 0.6 + delay, repeat: Infinity, repeatDelay: 0.9 }}
        />
      ))}

      {/* Arrow */}
      <motion.path
        d="M258,54 L268,60 L258,66" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}
      />
    </svg>
  );
}

// --- Line Draw Diagram ---
function LineDrawDiagramSvg({ variant }: { variant?: string }) {
  const isSync = variant === 'sync';
  const isRwaOracle = variant === 'rwaOracle';
  const labels = isSync
    ? ['Credit Oracle', 'SBT Contract', 'Your Wallet']
    : isRwaOracle
      ? ['Price Feed', 'wREC Oracle', 'RWA Market']
      : ['Price Feed', 'WikshiOracle', 'Lending Pool'];

  return (
    <svg viewBox="0 0 360 120" className="w-full" fill="none">
      {labels.map((label, i) => {
        const x = 20 + i * 130;
        return (
          <g key={label}>
            <motion.rect
              x={x} y="35" width="100" height="50" rx="8"
              stroke={isRwaOracle ? '#E8A838' : '#c8b6f0'} strokeWidth="1.5" fill={isRwaOracle ? 'rgba(232,168,56,0.05)' : 'rgba(200,182,240,0.05)'}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.2, duration: 0.4 }}
            />
            <motion.text
              x={x + 50} y="64" textAnchor="middle" fill="white" fontSize="10" fontWeight="600"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              transition={{ delay: i * 0.2 + 0.3 }}
            >{label}</motion.text>
          </g>
        );
      })}

      {/* Connecting lines */}
      {[0, 1].map((i) => (
        <motion.line
          key={i}
          x1={120 + i * 130} y1="60" x2={150 + i * 130} y2="60"
          stroke={isRwaOracle ? '#E8A838' : '#c8b6f0'} strokeWidth="2"
          variants={DRAW} initial="hidden" animate="visible"
          transition={{ ...DRAW_TRANSITION, delay: 0.4 + i * 0.3 }}
        />
      ))}

      {/* Animated pulse on lines */}
      {[0, 1].map((i) => (
        <motion.circle key={`p${i}`} r="3" fill={isRwaOracle ? '#E8A838' : '#c8b6f0'}
          initial={{ cx: 120 + i * 130, cy: 60, opacity: 0 }}
          animate={{ cx: [120 + i * 130, 150 + i * 130], opacity: [0, 1, 0] }}
          transition={{ duration: 0.8, delay: 1 + i * 0.4, repeat: Infinity, repeatDelay: 1.5 }}
        />
      ))}
    </svg>
  );
}

// --- Score Gauge (Fix #16: reads live score via props, no hardcoded default) ---
function ScoreGaugeSvg({ score, maxScore }: { score?: number; maxScore?: number }) {
  const s = score || 0;
  const max = maxScore || 1000;
  const fraction = max > 0 ? s / max : 0;
  const counter = useMotionValue(0);
  const rounded = useTransform(counter, (v) => Math.round(v));

  useEffect(() => {
    const ctrl = animate(counter, s, { duration: 2, ease: [0.25, 0.46, 0.45, 0.94] });
    return () => ctrl.stop();
  }, [counter, s]);

  return (
    <svg viewBox="0 0 200 130" className="mx-auto w-48">
      {/* Background arc */}
      <path
        d="M30,110 A70,70 0 0,1 170,110"
        fill="none" stroke="#3D3565" strokeWidth="12" strokeLinecap="round"
      />
      {/* Score arc */}
      <motion.path
        d="M30,110 A70,70 0 0,1 170,110"
        fill="none" stroke="#c8b6f0" strokeWidth="12" strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: fraction }}
        transition={{ duration: 2, ease: [0.25, 0.46, 0.45, 0.94] }}
      />
      {/* Center text */}
      <motion.text x="100" y="90" textAnchor="middle" fill="white" fontSize="28" fontWeight="700" fontFamily="monospace">
        <motion.tspan>{rounded}</motion.tspan>
      </motion.text>
      <text x="100" y="108" textAnchor="middle" fill="#6a6590" fontSize="10">/ {max}</text>
    </svg>
  );
}

// --- Comparison Split (Fix #15: reads live values, falls back gracefully) ---
function ComparisonSplitSvg({ baseLltv, effectiveLltv, baseCollateral, effectiveCollateral }: {
  baseLltv?: number; effectiveLltv?: number; baseCollateral?: number; effectiveCollateral?: number;
}) {
  const bCol = baseCollateral || 125;
  const eCol = effectiveCollateral || bCol;
  const saved = bCol - eCol;

  return (
    <svg viewBox="0 0 360 140" className="w-full" fill="none">
      {/* Labels */}
      <motion.text x="100" y="20" textAnchor="middle" fill="#6a6590" fontSize="10" fontWeight="600"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
      >No Credit</motion.text>
      <motion.text x="260" y="20" textAnchor="middle" fill="#c8b6f0" fontSize="10" fontWeight="600"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
      >With Credit</motion.text>

      {/* Base bar */}
      <motion.rect
        x="50" y="30" width="100" height="60" rx="6"
        fill="#3D3565" initial={{ scaleY: 0 }} animate={{ scaleY: 1 }}
        style={{ transformOrigin: '100px 90px' }}
        transition={{ duration: 0.8, delay: 0.4, ease: 'easeOut' }}
      />
      <motion.text x="100" y="65" textAnchor="middle" fill="white" fontSize="18" fontWeight="700"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}
      >{bCol}%</motion.text>

      {/* Effective bar (shorter = better) */}
      <motion.rect
        x="210" y={30 + (bCol - eCol) * 0.75} width="100" height={60 - (bCol - eCol) * 0.75} rx="6"
        fill="rgba(200,182,240,0.25)" stroke="#c8b6f0" strokeWidth="1"
        initial={{ scaleY: 0 }} animate={{ scaleY: 1 }}
        style={{ transformOrigin: `260px 90px` }}
        transition={{ duration: 0.8, delay: 0.6, ease: 'easeOut' }}
      />
      <motion.text x="260" y={Math.max(55, 55 + (bCol - eCol) * 0.3)} textAnchor="middle" fill="#c8b6f0" fontSize="18" fontWeight="700"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}
      >{eCol}%</motion.text>

      {/* Savings badge */}
      {saved > 0 && (
        <motion.g initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.5 }}>
          <rect x="145" y="100" width="70" height="26" rx="13" fill="#E8A838" />
          <text x="180" y="117" textAnchor="middle" fill="#0e0e12" fontSize="11" fontWeight="700">-{saved}%</text>
        </motion.g>
      )}

      {/* Subtitle */}
      <motion.text x="180" y="138" textAnchor="middle" fill="#6a6590" fontSize="9"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.8 }}
      >{saved > 0 ? 'Collateral requirement reduced' : 'Submit a credit score to see savings'}</motion.text>
    </svg>
  );
}

// --- Pool Fill (Fix #17: reads live values via props) ---
function PoolFillSvg({ supplied, borrowed }: { supplied?: number; borrowed?: number }) {
  const s = supplied || 0;
  const b = borrowed || 0;
  const util = s > 0 ? (b / s) * 100 : 0;

  return (
    <svg viewBox="0 0 360 120" className="w-full" fill="none">
      {/* Pool container */}
      <motion.rect
        x="30" y="15" width="300" height="70" rx="12"
        stroke="#3D3565" strokeWidth="1.5" fill="rgba(30,26,53,0.8)"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      />

      {/* Supplied fill */}
      <motion.rect
        x="32" y="17" width="296" height="66" rx="10"
        fill="rgba(200,182,240,0.12)"
        initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
        style={{ transformOrigin: '32px 50px' }}
        transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
      />

      {/* Borrowed portion */}
      {util > 0 && (
        <motion.rect
          x="32" y="17" width={296 * (util / 100)} height="66" rx="10"
          fill="rgba(232,168,56,0.2)"
          initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
          style={{ transformOrigin: '32px 50px' }}
          transition={{ duration: 1, ease: 'easeOut', delay: 0.6 }}
        />
      )}

      {/* Labels */}
      <motion.text x="180" y="45" textAnchor="middle" fill="white" fontSize="14" fontWeight="700"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
      >{s > 0 ? `$${s.toLocaleString()} Supplied` : 'Empty Pool'}</motion.text>
      <motion.text x="180" y="65" textAnchor="middle" fill="#6a6590" fontSize="10"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}
      >{util.toFixed(1)}% Utilization{b > 0 ? ` ($${b.toLocaleString()} borrowed)` : ''}</motion.text>

      {/* Wave animation at top of fill */}
      <motion.path
        d="M32,30 Q90,22 180,30 T328,30"
        stroke="#c8b6f0" strokeWidth="1" fill="none" opacity="0.4"
        initial={{ pathOffset: 0 }}
        animate={{ pathOffset: 1 }}
        transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
      />
    </svg>
  );
}

// --- Health Gauge (Fix #3: reads live health factor via props) ---
function HealthGaugeSvg({ healthFactor }: { healthFactor?: number }) {
  const hf = healthFactor || 0;
  // Map health factor to x position: 0->31, 1.0->121, 3.0->329
  const clampedHf = Math.min(Math.max(hf, 0), 3);
  const xPos = 31 + (clampedHf / 3) * 298;
  const isHealthy = hf >= 1.0;

  return (
    <svg viewBox="0 0 360 100" className="w-full" fill="none">
      {/* Background bar */}
      <rect x="30" y="40" width="300" height="20" rx="10" fill="#1e1a35" stroke="#3D3565" strokeWidth="1" />

      {/* Danger zone */}
      <motion.rect
        x="31" y="41" width="90" height="18" rx="9"
        fill="rgba(239,68,68,0.15)"
        initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
        style={{ transformOrigin: '31px 50px' }}
        transition={{ duration: 0.6, delay: 0.2 }}
      />

      {/* Safe zone */}
      <motion.rect
        x="121" y="41" width="208" height="18" rx="9"
        fill="rgba(34,197,94,0.12)"
        initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
        style={{ transformOrigin: '121px 50px' }}
        transition={{ duration: 0.8, delay: 0.4 }}
      />

      {/* Marker line at 1.0 */}
      <motion.line
        x1="121" y1="35" x2="121" y2="65"
        stroke="#E8A838" strokeWidth="2" strokeDasharray="3 2"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
      />
      <motion.text x="121" y="30" textAnchor="middle" fill="#E8A838" fontSize="9" fontWeight="600"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }}
      >1.0</motion.text>

      {/* Current position indicator */}
      <motion.circle
        cx={xPos} cy="50" r="8"
        fill={isHealthy ? '#22C55E' : '#EF4444'} stroke="white" strokeWidth="2"
        initial={{ cx: 31, opacity: 0 }}
        animate={{ cx: xPos, opacity: 1 }}
        transition={{ duration: 1.2, delay: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
      />

      {/* Labels */}
      <motion.text x="75" y="80" textAnchor="middle" fill="#EF4444" fontSize="9" fontWeight="600"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}
      >LIQUIDATION</motion.text>
      <motion.text x="240" y="80" textAnchor="middle" fill="#22C55E" fontSize="9" fontWeight="600"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}
      >SAFE ZONE</motion.text>
      <motion.text x={xPos} y="92" textAnchor="middle" fill="white" fontSize="11" fontWeight="700"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4 }}
      >Health: {hf === Infinity ? '---' : hf > 0 ? hf.toFixed(2) : 'N/A'}</motion.text>
    </svg>
  );
}

// --- Mint Badge ---
function MintBadgeSvg() {
  return (
    <svg viewBox="0 0 200 160" className="mx-auto w-44" fill="none">
      {/* Outer ring */}
      <motion.circle
        cx="100" cy="75" r="55"
        stroke="#c8b6f0" strokeWidth="2"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 1.5, ease: [0.65, 0, 0.35, 1] }}
      />
      {/* Inner ring */}
      <motion.circle
        cx="100" cy="75" r="42"
        stroke="#c8b6f0" strokeWidth="1" opacity="0.4"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.2, delay: 0.3, ease: [0.65, 0, 0.35, 1] }}
      />
      {/* Shield shape */}
      <motion.path
        d="M100,45 L125,58 L125,82 Q125,100 100,110 Q75,100 75,82 L75,58 Z"
        stroke="#E8A838" strokeWidth="2" fill="rgba(232,168,56,0.08)"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 1, delay: 0.8, ease: [0.65, 0, 0.35, 1] }}
      />
      {/* Checkmark */}
      <motion.path
        d="M88,78 L96,86 L112,66"
        stroke="#E8A838" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.6, delay: 1.5 }}
      />
      {/* SBT label */}
      <motion.text x="100" y="145" textAnchor="middle" fill="#c8b6f0" fontSize="11" fontWeight="700" letterSpacing="3"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2 }}
      >SOULBOUND</motion.text>

      {/* Sparkle particles */}
      {[
        { cx: 40, cy: 40, delay: 1.8 },
        { cx: 160, cy: 50, delay: 2 },
        { cx: 55, cy: 115, delay: 2.1 },
        { cx: 150, cy: 110, delay: 1.9 },
      ].map((p, i) => (
        <motion.circle key={i} cx={p.cx} cy={p.cy} r="2" fill="#c8b6f0"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: [0, 1, 0], scale: [0, 1.5, 0] }}
          transition={{ delay: p.delay, duration: 0.8 }}
        />
      ))}
    </svg>
  );
}

// --- Architecture Diagram (Fix #9: shows all 16 contracts grouped) ---
function ArchitectureDiagramSvg() {
  const groups = [
    {
      label: 'Core',
      color: '#c8b6f0',
      contracts: ['WikshiLend', 'WikshiIrm', 'Multicall'],
    },
    {
      label: 'Identity',
      color: '#E8A838',
      contracts: ['CreditOracle', 'CreditSBT'],
    },
    {
      label: 'Price',
      color: '#c8b6f0',
      contracts: ['WikshiOracle', 'RWA Oracle'],
    },
    {
      label: 'RWA',
      color: '#E8A838',
      contracts: ['Receivable', 'Wrapper', 'Liquidator', 'Payments'],
    },
    {
      label: 'Tokens',
      color: '#22C55E',
      contracts: ['WCTC', 'USDT', 'USDT-RWA'],
    },
    {
      label: 'Vault',
      color: '#c8b6f0',
      contracts: ['WikshiVault'],
    },
  ];

  let contractCount = 0;
  groups.forEach((g) => { contractCount += g.contracts.length; });

  return (
    <svg viewBox="0 0 360 170" className="w-full" fill="none">
      {groups.map((group, gi) => {
        const col = gi % 3;
        const row = Math.floor(gi / 3);
        const gx = 5 + col * 120;
        const gy = 5 + row * 85;

        return (
          <motion.g
            key={group.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: gi * 0.12, duration: 0.4 }}
          >
            {/* Group box */}
            <rect
              x={gx} y={gy} width="115" height={20 + group.contracts.length * 14} rx="6"
              fill="rgba(30,26,53,0.9)" stroke={group.color} strokeWidth="1" opacity="0.8"
            />
            {/* Group label */}
            <text x={gx + 57} y={gy + 13} textAnchor="middle" fill={group.color} fontSize="8" fontWeight="700" letterSpacing="1">
              {group.label.toUpperCase()}
            </text>
            {/* Contract names */}
            {group.contracts.map((c, ci) => (
              <text
                key={c}
                x={gx + 57} y={gy + 26 + ci * 14}
                textAnchor="middle" fill="white" fontSize="8" fontWeight="500"
              >
                {c}
              </text>
            ))}
          </motion.g>
        );
      })}

      {/* Count badge */}
      <motion.g
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1, duration: 0.4 }}
      >
        <rect x="145" y="152" width="70" height="16" rx="8" fill="#c8b6f0" />
        <text x="180" y="163" textAnchor="middle" fill="#0e0e12" fontSize="8" fontWeight="700">
          {contractCount} CONTRACTS
        </text>
      </motion.g>
    </svg>
  );
}

// --- RWA Flow (Fix #11: added 'borrow' stage) ---
function RwaFlowSvg({ step }: { step?: string }) {
  const stages = [
    { label: 'Real Loan', icon: 'L', active: step === 'mint' || step === 'wrap' || step === 'borrow' || step === 'market' },
    { label: 'NFT', icon: 'N', active: step === 'mint' || step === 'wrap' || step === 'borrow' || step === 'market' },
    { label: 'wREC', icon: 'W', active: step === 'wrap' || step === 'borrow' || step === 'market' },
    { label: 'Borrow', icon: 'B', active: step === 'borrow' || step === 'market' },
  ];

  const highlightIdx = step === 'mint' ? 1 : step === 'wrap' ? 2 : step === 'borrow' ? 3 : step === 'market' ? 3 : -1;

  return (
    <svg viewBox="0 0 360 110" className="w-full" fill="none">
      {stages.map((s, i) => {
        const x = 15 + i * 90;
        const isHighlight = i === highlightIdx;
        const fill = isHighlight ? 'rgba(200,182,240,0.15)' : s.active ? 'rgba(61,53,101,0.3)' : 'rgba(14,14,18,0.4)';
        const stroke = isHighlight ? '#c8b6f0' : s.active ? '#3D3565' : '#3D3565';

        return (
          <g key={s.label}>
            <motion.rect
              x={x} y="20" width="75" height="60" rx="10"
              fill={fill} stroke={stroke} strokeWidth={isHighlight ? 2 : 1}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.15, duration: 0.4 }}
            />
            <motion.text x={x + 37} y="48" textAnchor="middle" fill={isHighlight ? '#c8b6f0' : '#abadd0'} fontSize="16" fontWeight="700"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.15 + 0.2 }}
            >{s.icon}</motion.text>
            <motion.text x={x + 37} y="70" textAnchor="middle" fill={isHighlight ? '#c8b6f0' : '#abadd0'} fontSize="9" fontWeight={isHighlight ? '700' : '500'}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.15 + 0.3 }}
            >{s.label}</motion.text>
          </g>
        );
      })}

      {/* Connecting arrows */}
      {[0, 1, 2].map((i) => {
        const x = 90 + i * 90;
        const active = stages[i].active && stages[i + 1].active;
        return (
          <motion.path
            key={`a${i}`}
            d={`M${x},50 L${x + 15},50`}
            stroke={active ? '#c8b6f0' : '#3D3565'}
            strokeWidth="2"
            strokeLinecap="round"
            markerEnd={active ? undefined : undefined}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 + i * 0.15 }}
          />
        );
      })}

      {/* Animated pulse on highlighted connection */}
      {highlightIdx > 0 && (
        <motion.circle r="3" fill="#c8b6f0"
          initial={{ cx: 90 + (highlightIdx - 1) * 90, cy: 50, opacity: 0 }}
          animate={{
            cx: [90 + (highlightIdx - 1) * 90, 105 + (highlightIdx - 1) * 90],
            opacity: [0, 1, 0],
          }}
          transition={{ duration: 0.8, repeat: Infinity, repeatDelay: 1 }}
        />
      )}

      {/* Bottom label */}
      <motion.text x="180" y="100" textAnchor="middle" fill="#6a6590" fontSize="8" fontWeight="600"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
      >RWA Pipeline — {step === 'mint' ? 'Tokenize' : step === 'wrap' ? 'Fungibilize' : step === 'borrow' ? 'Collateralize & Borrow' : step === 'market' ? 'Live Market' : 'Overview'}</motion.text>
    </svg>
  );
}

// --- Main Router ---
export default function DemoSvg({
  type,
  props,
}: {
  type: SvgAnimationType;
  props?: Record<string, unknown>;
}) {
  switch (type) {
    case 'tokenFlow':
      return <TokenFlowSvg token={props?.token as string} amount={props?.amount as string} color={props?.color as string} />;
    case 'lineDrawDiagram':
      return <LineDrawDiagramSvg variant={props?.variant as string} />;
    case 'scoreGauge':
      return <ScoreGaugeSvg score={props?.score as number} maxScore={props?.maxScore as number} />;
    case 'comparisonSplit':
      return <ComparisonSplitSvg
        baseLltv={props?.baseLltv as number}
        effectiveLltv={props?.effectiveLltv as number}
        baseCollateral={props?.baseCollateral as number}
        effectiveCollateral={props?.effectiveCollateral as number}
      />;
    case 'poolFill':
      return <PoolFillSvg supplied={props?.supplied as number} borrowed={props?.borrowed as number} />;
    case 'healthGauge':
      return <HealthGaugeSvg healthFactor={props?.healthFactor as number} />;
    case 'mintBadge':
      return <MintBadgeSvg />;
    case 'architectureDiagram':
      return <ArchitectureDiagramSvg />;
    case 'rwaFlow':
      return <RwaFlowSvg step={props?.step as string} />;
    case 'none':
    default:
      return null;
  }
}
