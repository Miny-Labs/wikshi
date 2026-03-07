"use client"

import React from 'react';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { WIKSHI_CONTRACTS } from '@/lib/contracts';

const ThreeCoin = dynamic(() => import('../components/ThreeCoin'), { ssr: false });

export default function WyreClone() {
  return (
    <div className="bg-white text-black w-full overflow-x-hidden">

      {/* ════════════════════════════════════════════
          SECTION 1: WHITE PANEL (nav + headline + cta)
          ════════════════════════════════════════════ */}
      <div 
        className="relative z-20 bg-white pb-16"
        style={{
          clipPath: 'polygon(0% 0%, 100% 0%, 100% calc(100% - 260px), calc(50% + 440px) calc(100% - 260px), calc(50% + 150px) 100%, calc(50% - 150px) 100%, calc(50% - 440px) calc(100% - 260px), 0% calc(100% - 260px))',
          marginBottom: '-260px'
        }}
      >

        {/* ── Navbar ── */}
        <nav className="relative flex items-center justify-between px-10 lg:px-14 py-2 max-w-[1400px] mx-auto">
          
          {/* Logo: Solid Geometric W */}
          <div className="w-11 h-11 bg-[#1a1a1a] rounded-lg flex items-center justify-center shrink-0 shadow-sm relative z-10 transition-transform hover:scale-105">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M2 6L6 20H10L11.5 13L13 20H17L21 6H17L15.5 14L14 6H10L8.5 14L7 6H2Z" fill="white" />
            </svg>
          </div>
          
          {/* Nav links - Center perfectly */}
          <div className="hidden lg:flex items-center justify-center gap-9 text-[11px] font-bold tracking-[0.16em] text-[#111] absolute left-0 right-0 top-1/2 -translate-y-1/2 pointer-events-none" >
            <div className="pointer-events-auto flex items-center gap-9">
              <a href="https://github.com/Miny-Labs/wikshi#readme" target="_blank" rel="noopener noreferrer" className="hover:opacity-50 transition-opacity">DOCS</a>
              <a href="https://github.com/Miny-Labs/wikshi/tree/main/contracts" target="_blank" rel="noopener noreferrer" className="hover:opacity-50 transition-opacity">PROTOCOL</a>
              <a href="https://drive.google.com/file/d/1IqtJ-E4RCDSaa711c8sYqI2qJ_5jA3RU/view?usp=sharing" target="_blank" rel="noopener noreferrer" className="hover:opacity-50 transition-opacity">WHITEPAPER</a>
              <a href="/app" className="hover:opacity-50 transition-opacity">LAUNCH APP ↗</a>
            </div>
          </div>
        </nav>

        {/* ── Hero Content ── */}
        <div className="max-w-[1200px] mx-auto px-10 lg:px-14 pt-16 lg:pt-[6.4rem] pb-12">

          <div className="relative max-w-[780px] mx-auto">

            {/* ── Line 1: WIKSHI IS THE ── */}
            <div className="flex items-baseline justify-center whitespace-nowrap leading-[0.85] font-display-sans font-bold tracking-[-0.02em]" style={{ fontSize: 'clamp(36px, 5.5vw, 84px)' }}>
              <span>WIKSHI IS THE</span>
            </div>

            {/* ── Line 2: CREDIT LAYER FOR ── */}
            <div className="flex items-baseline justify-center whitespace-nowrap leading-[0.85] mt-6 font-display-sans font-bold tracking-[-0.02em]" style={{ fontSize: 'clamp(36px, 5.5vw, 84px)' }}>
              <span>CREDIT LAYER FOR</span>
            </div>

            {/* ── Line 3: DECENTRALIZED LENDING ── */}
            <div className="flex items-baseline justify-center whitespace-nowrap leading-[0.85] mt-6 font-display-sans font-bold tracking-[-0.02em]" style={{ fontSize: 'clamp(30px, 4vw, 68px)' }}>
              <span>DECENTRALIZED LENDING</span>
            </div>

            <p className="mt-8 text-center text-[16px] leading-[1.6] text-black/60 font-medium max-w-[600px] mx-auto" >
              The first protocol that turns your repayment history into borrowing power. Less collateral. Better rates. Real credit on-chain.
            </p>

            {/* LAUNCH APP button — positioned between hero text and video */}
            <div className="flex justify-center mt-12 mb-8 relative z-40">
              <a
                href="/app"
                className="relative bg-black text-white text-[12px] font-bold tracking-[0.2em] px-14 py-5 rounded-full shadow-2xl group transition-all duration-500 hover:scale-105 hover:shadow-purple-500/30 active:scale-95 overflow-hidden inline-block"
              >
                <span className="relative z-10">LAUNCH APP</span>

                {/* Internal gradient fill on hover */}
                <span className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-cyan-400/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                {/* Animated glowing border effect on hover */}
                <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 overflow-hidden">
                  <div className="absolute inset-y-0 -inset-x-[100%] w-[300%] bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-[100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out rotate-12" />
                </div>
                <div className="absolute inset-[-1px] rounded-full ring-1 ring-white/10 group-hover:ring-white/30 transition-all duration-500" />
              </a>
            </div>

          </div>

          {/* Clean end to white section */}
        </div>
      </div>

      {/* ════════════════════════════════════════════
          SECTION 2: 3D IMAGE REVEAL
          Straight horizontal break revealing video.
          ════════════════════════════════════════════ */}
      <div className="relative w-full z-10">
        
        <div className="relative w-full aspect-[21/9] max-h-[380px] overflow-hidden bg-black">
          <video
            src="/hero-bg.mp4"
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover object-center"
          />
        </div>

      </div>

      {/* ════════════════════════════════════════════
          SECTION 3: SPONSOR BAR
          ════════════════════════════════════════════ */}
      <footer className="bg-white border-t border-black/5 py-10">
        <div 
          className="flex items-center justify-between max-w-5xl mx-auto px-10 lg:px-16 opacity-25 grayscale"
          
        >
          {/* CREDITCOIN */}
          <span className="font-display-sans text-[18px] italic tracking-tight">CREDITCOIN</span>
          
          {/* MORPHO */}
          <span className="text-[17px] tracking-[0.25em] font-light">MORPHO</span>
          
          {/* USC */}
          <span className="text-[18px] font-black tracking-tighter">USC</span>
          
          {/* ERC-4626 */}
          <span className="text-[16px] font-semibold flex items-center gap-2">
            ERC-4626
          </span>
          
          {/* WORMHOLE */}
          <span className="text-[16px] font-semibold flex items-center gap-2">
            WORMHOLE
          </span>
        </div>
      </footer>

      {/* ════════════════════════════════════════════
          SECTION 4: TOOLS TO BUILD YOUR VISION
          ════════════════════════════════════════════ */}
      <section className="bg-[#ffffff] py-28 lg:py-36">
        <div className="max-w-[1200px] mx-auto px-10 lg:px-14 flex flex-col lg:flex-row items-start lg:items-center gap-16 lg:gap-24">

          {/* Left: description + CTA */}
          <div className="max-w-[400px] shrink-0">
            <p className="text-[10px] font-bold tracking-[0.18em] text-black/70 uppercase mb-4" >
              PROTOCOL PRIMITIVES
            </p>
            <p className="text-[14.5px] leading-[1.7] text-[#111] font-medium" >
              Wikshi combines isolated lending markets, cross-chain credit verification, and real-world asset collateral into one composable protocol. Supply liquidity, build credit, or tokenize receivables — all from a single interface.
            </p>
            <a
              href="https://github.com/Miny-Labs/wikshi#readme"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-7 bg-[#1a1a1a] text-white text-[10px] font-bold tracking-[0.1em] px-7 py-3.5 rounded hover:bg-black transition-colors active:scale-[0.97]"
            >
              VIEW DOCS
            </a>
          </div>

          {/* Right: large typography */}
          <div className="flex-1">
            {/* Line 1: EVERYTHING YOU NEED TO */}
            <div className="flex items-baseline gap-[0.15em] leading-[0.88] mt-[0.05em]" style={{ fontSize: 'clamp(36px, 5vw, 65px)' }}>
              <span className="font-display-sans tracking-[-0.02em]">EVERYTHING YOU NEED TO</span>
            </div>

            {/* Line 2: LEND AND */}
            <div className="flex items-baseline gap-[0.15em] leading-[0.88] mt-[0.05em]" style={{ fontSize: 'clamp(36px, 5vw, 65px)' }}>
              <span className="font-display-serif text-outline tracking-[-0.01em]">
                LEND AND
              </span>
            </div>

            {/* Line 3: BORROW SMARTER */}
            <div className="flex items-baseline gap-[0.15em] leading-[0.88] mt-[0.05em]" style={{ fontSize: 'clamp(36px, 5vw, 65px)' }}>
              <span className="font-display-sans tracking-[-0.02em]">BORROW SMARTER</span>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          SECTION 5: FEATURE CARDS (01–05)
          ════════════════════════════════════════════ */}
      <section className="bg-white">
        <div className="max-w-[1100px] mx-auto px-10 lg:px-14">

          {/* ── Card 01 ── */}
          <div className="py-20 lg:py-28 border-t border-black/8">
            <div className="flex flex-col lg:flex-row gap-12 lg:gap-20">
              {/* Left */}
              <div className="lg:w-[38%] shrink-0">
                <span className="font-display-serif text-[36px] text-black/80 leading-none">01</span>

                <p className="mt-16 text-[10px] font-bold tracking-[0.18em] text-black/70 uppercase" >
                  Credit-Native Lending
                </p>
                <p className="mt-4 text-[13.5px] leading-[1.75] text-black/70 font-normal" >
                  Wikshi reads your on-chain repayment history across chains using Creditcoin&apos;s Universal Settlement Chain. A perfect credit score drops your collateral requirement from 125% down to 111%. Your reputation finally counts for something in DeFi.
                </p>
                <a href="https://github.com/Miny-Labs/wikshi#readme" target="_blank" rel="noopener noreferrer" className="inline-block mt-8 bg-[#1a1a1a] text-white text-[9px] font-bold tracking-[0.12em] px-6 py-3 rounded-full hover:bg-black transition-colors" >
                  EXPLORE DOCUMENTATION
                </a>
              </div>
              {/* Right */}
              <div className="flex-1">
                <h3 className="font-display-serif text-[28px] lg:text-[32px] text-black leading-tight tracking-[-0.01em]" style={{ fontStyle: 'normal' }}>Borrow More With Less Collateral</h3>
                <div className="relative mt-5 rounded-2xl overflow-hidden aspect-[4/3] bg-gradient-to-br from-[#c8b6f0] via-[#d4c4f8] to-[#b8a5e8]">
                  <span className="absolute top-3 left-3 w-[5px] h-[5px] bg-black/40 rounded-full z-20" />
                  <span className="absolute top-3 right-3 w-[5px] h-[5px] bg-black/40 rounded-full z-20" />
                  <div className="absolute inset-0 z-10 w-full h-full">
                    <video src="/videos/1-opt.mp4" autoPlay loop muted playsInline className="w-full h-full object-cover scale-[1.02] rounded-2xl" />
                  </div>
                  <span className="absolute bottom-3 left-3 w-[5px] h-[5px] bg-black/40 rounded-full z-20" />
                  <span className="absolute bottom-3 right-3 w-[5px] h-[5px] bg-black/40 rounded-full z-20" />
                </div>
              </div>
            </div>
          </div>

          {/* ── Card 02 ── */}
          <div className="py-20 lg:py-28 border-t border-black/8">
            <div className="flex flex-col lg:flex-row gap-12 lg:gap-20">
              {/* Left */}
              <div className="lg:w-[38%] shrink-0">
                <span className="font-display-serif text-[36px] text-black/80 leading-none">02</span>

                <p className="mt-16 text-[10px] font-bold tracking-[0.18em] text-black/70 uppercase" >
                  Real-World Asset Pipeline
                </p>
                <p className="mt-4 text-[13.5px] leading-[1.75] text-black/70 font-normal" >
                  Microfinance receivables, invoice payments, and real-world loan portfolios get tokenized as ERC-721 NFTs, wrapped into fungible wREC tokens, and valued using DCF pricing. Real yield from real borrowers — not recursive leverage.
                </p>
                <a href="https://github.com/Miny-Labs/wikshi#readme" target="_blank" rel="noopener noreferrer" className="inline-block mt-8 bg-[#1a1a1a] text-white text-[9px] font-bold tracking-[0.12em] px-6 py-3 rounded-full hover:bg-black transition-colors" >
                  EXPLORE DOCUMENTATION
                </a>
              </div>
              {/* Right */}
              <div className="flex-1">
                <h3 className="font-display-serif text-[28px] lg:text-[32px] text-black leading-tight tracking-[-0.01em]" style={{ fontStyle: 'normal' }}>Turn Real Loans Into DeFi Collateral</h3>
                <div className="relative mt-5 rounded-2xl overflow-hidden aspect-[4/3] bg-gradient-to-br from-[#fef6c7] via-[#fef0a0] to-[#f5e680]">
                  <span className="absolute top-3 left-3 w-[5px] h-[5px] bg-black/40 rounded-full z-20" />
                  <span className="absolute top-3 right-3 w-[5px] h-[5px] bg-black/40 rounded-full z-20" />
                  <div className="absolute inset-0 z-10 w-full h-full">
                    <video src="/videos/2-opt.mp4" autoPlay loop muted playsInline className="w-full h-full object-cover scale-[1.02] rounded-2xl" />
                  </div>
                  <span className="absolute bottom-3 left-3 w-[5px] h-[5px] bg-black/40 rounded-full z-20" />
                  <span className="absolute bottom-3 right-3 w-[5px] h-[5px] bg-black/40 rounded-full z-20" />
                </div>
              </div>
            </div>
          </div>

          {/* ── Card 03 ── */}
          <div className="py-20 lg:py-28 border-t border-black/8">
            <div className="flex flex-col lg:flex-row gap-12 lg:gap-20">
              {/* Left */}
              <div className="lg:w-[38%] shrink-0">
                <span className="font-display-serif text-[36px] text-black/80 leading-none">03</span>

                <p className="mt-16 text-[10px] font-bold tracking-[0.18em] text-black/70 uppercase" >
                  Cross-Chain Credit Verification
                </p>
                <p className="mt-4 text-[13.5px] leading-[1.75] text-black/70 font-normal" >
                  USC cryptographic proofs verify your loan history from any supported blockchain in under 15 seconds. No oracles to trust. No intermediaries. Your credit score is soulbound to your wallet and follows you across the entire Creditcoin ecosystem.
                </p>
                <a href="https://github.com/Miny-Labs/wikshi#readme" target="_blank" rel="noopener noreferrer" className="inline-block mt-8 bg-[#1a1a1a] text-white text-[9px] font-bold tracking-[0.12em] px-6 py-3 rounded-full hover:bg-black transition-colors" >
                  EXPLORE DOCUMENTATION
                </a>
              </div>
              {/* Right */}
              <div className="flex-1">
                <h3 className="font-display-serif text-[28px] lg:text-[32px] text-black leading-tight tracking-[-0.01em]" style={{ fontStyle: 'normal' }}>One Identity, Every Chain</h3>
                <div className="relative mt-5 rounded-2xl overflow-hidden aspect-[4/3] bg-gradient-to-br from-[#f8cbb0] via-[#f0b090] to-[#e89878]">
                  <span className="absolute top-3 left-3 w-[5px] h-[5px] bg-black/40 rounded-full z-20" />
                  <span className="absolute top-3 right-3 w-[5px] h-[5px] bg-black/40 rounded-full z-20" />
                  <div className="absolute inset-0 z-10 w-full h-full">
                    <video src="/videos/3-opt.mp4" autoPlay loop muted playsInline className="w-full h-full object-cover scale-[1.02] rounded-2xl" />
                  </div>
                  <span className="absolute bottom-3 left-3 w-[5px] h-[5px] bg-black/40 rounded-full z-20" />
                  <span className="absolute bottom-3 right-3 w-[5px] h-[5px] bg-black/40 rounded-full z-20" />
                </div>
              </div>
            </div>
          </div>

          {/* ── Card 04 ── */}
          <div className="py-20 lg:py-28 border-t border-black/8">
            <div className="flex flex-col lg:flex-row gap-12 lg:gap-20">
              {/* Left */}
              <div className="lg:w-[38%] shrink-0">
                <span className="font-display-serif text-[36px] text-black/80 leading-none">04</span>

                <p className="mt-16 text-[10px] font-bold tracking-[0.18em] text-black/70 uppercase" >
                  Isolated Market Architecture
                </p>
                <p className="mt-4 text-[13.5px] leading-[1.75] text-black/70 font-normal" >
                  Every lending market on Wikshi is a standalone 5-tuple: loan token, collateral token, oracle, interest rate model, and liquidation threshold. No shared pools. No contagion. One market&apos;s bad debt never touches another. Morpho Blue architecture, battle-tested.
                </p>
                <a href="https://github.com/Miny-Labs/wikshi#readme" target="_blank" rel="noopener noreferrer" className="inline-block mt-8 bg-[#1a1a1a] text-white text-[9px] font-bold tracking-[0.12em] px-6 py-3 rounded-full hover:bg-black transition-colors" >
                  EXPLORE DOCUMENTATION
                </a>
              </div>
              {/* Right */}
              <div className="flex-1">
                <h3 className="font-display-serif text-[28px] lg:text-[32px] text-black leading-tight tracking-[-0.01em]" style={{ fontStyle: 'normal' }}>Risk-Isolated, Capital-Efficient</h3>
                <div className="relative mt-5 rounded-2xl overflow-hidden aspect-[4/3] bg-gradient-to-br from-[#d4f0a0] via-[#c8e880] to-[#b0d860]">
                  <span className="absolute top-3 left-3 w-[5px] h-[5px] bg-black/40 rounded-full z-20" />
                  <span className="absolute top-3 right-3 w-[5px] h-[5px] bg-black/40 rounded-full z-20" />
                  <div className="absolute inset-0 z-10 w-full h-full">
                    <video src="/videos/4-opt.mp4" autoPlay loop muted playsInline className="w-full h-full object-cover scale-[1.02] rounded-2xl" />
                  </div>
                  <span className="absolute bottom-3 left-3 w-[5px] h-[5px] bg-black/40 rounded-full z-20" />
                  <span className="absolute bottom-3 right-3 w-[5px] h-[5px] bg-black/40 rounded-full z-20" />
                </div>
              </div>
            </div>
          </div>

          {/* ── Card 05 ── */}
          <div className="py-20 lg:py-28 border-t border-black/8">
            <div className="flex flex-col lg:flex-row gap-12 lg:gap-20">
              {/* Left */}
              <div className="lg:w-[38%] shrink-0">
                <span className="font-display-serif text-[36px] text-black/80 leading-none">05</span>

                <p className="mt-16 text-[10px] font-bold tracking-[0.18em] text-black/70 uppercase" >
                  Progressive Trust Tiers
                </p>
                <p className="mt-4 text-[13.5px] leading-[1.75] text-black/70 font-normal" >
                  Start as Unverified. Make 5 verified payments — you&apos;re Basic. Hit 20 payments and score 400 — Established. Reach 50 payments and 700 score — Trusted. Each tier unlocks lower collateral ratios and better interest rates. Credit scoring that rewards consistency, not wealth.
                </p>
                <a href="https://github.com/Miny-Labs/wikshi#readme" target="_blank" rel="noopener noreferrer" className="inline-block mt-8 bg-[#1a1a1a] text-white text-[9px] font-bold tracking-[0.12em] px-6 py-3 rounded-full hover:bg-black transition-colors" >
                  EXPLORE DOCUMENTATION
                </a>
              </div>
              {/* Right */}
              <div className="flex-1">
                <h3 className="font-display-serif text-[28px] lg:text-[32px] text-black leading-tight tracking-[-0.01em]" style={{ fontStyle: 'normal' }}>Build Trust, Unlock Benefits</h3>
                <div className="relative mt-5 rounded-2xl overflow-hidden aspect-[4/3] bg-gradient-to-br from-[#b8c8f0] via-[#a8b8e8] to-[#9090d8]">
                  <span className="absolute top-3 left-3 w-[5px] h-[5px] bg-black/40 rounded-full z-20" />
                  <span className="absolute top-3 right-3 w-[5px] h-[5px] bg-black/40 rounded-full z-20" />
                  <div className="absolute inset-0 z-10 w-full h-full">
                    <video src="/videos/5-opt.mp4" autoPlay loop muted playsInline className="w-full h-full object-cover scale-[1.02] rounded-2xl" />
                  </div>
                  <span className="absolute bottom-3 left-3 w-[5px] h-[5px] bg-black/40 rounded-full z-20" />
                  <span className="absolute bottom-3 right-3 w-[5px] h-[5px] bg-black/40 rounded-full z-20" />
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ════════════════════════════════════════════
          SECTION 6: BUILD ON YOUR FAVORITE PROTOCOL
          ════════════════════════════════════════════ */}
      <section className="bg-[#ffffff] py-24 lg:py-32">
        <div className="max-w-[1100px] mx-auto px-10 lg:px-14">

          {/* Header row */}
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-10">
            {/* Left: large heading */}
            <div className="max-w-[600px]">
              <div className="leading-[0.92]" style={{ fontSize: 'clamp(40px, 5.5vw, 72px)' }}>
                <div className="flex items-baseline gap-[0.15em] whitespace-nowrap">
                  <span className="font-display-sans tracking-[-0.02em]">BUILD ON</span>
                </div>
                <div className="flex items-baseline gap-[0.15em] whitespace-nowrap mt-[0.05em]">
                  <span className="font-display-sans tracking-[-0.02em]">CREDITCOIN&apos;S</span>
                  <span className="font-display-serif ml-[0.12em] tracking-[-0.01em]">CREDIT</span>
                </div>
                <div className="flex items-baseline gap-[0.15em] whitespace-nowrap mt-[0.05em]">
                  <span className="font-display-serif text-outline tracking-[-0.01em]">
                    PR
                    <span className="relative inline-block">
                      O
                      <span className="absolute top-[48%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[0.055em] h-[0.055em] bg-black rounded-full" />
                    </span>
                    T
                    <span className="relative inline-block">
                      O
                      <span className="absolute top-[48%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[0.055em] h-[0.055em] bg-black rounded-full" />
                    </span>
                    C
                    <span className="relative inline-block">
                      O
                      <span className="absolute top-[48%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[0.055em] h-[0.055em] bg-black rounded-full" />
                    </span>
                    L
                  </span>
                </div>
              </div>
            </div>

            {/* Right: small description */}
            <p className="text-[13px] leading-[1.7] text-black/60 max-w-[240px] lg:pt-2" >
              See how the Wikshi lending protocol maps to Creditcoin&apos;s isolated components.
            </p>
          </div>

          {/* ── Logo Grid: 3×3 mapped from Contracts ── */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-5 mt-16 pb-12">
            
            {WIKSHI_CONTRACTS.map((contract, i) => (
              <a 
                key={i}
                href={contract.link}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative bg-[#F8F8F8] rounded-[12px] p-8 flex flex-col items-center justify-center aspect-[4/3] border border-black/5 transition-all duration-[200ms] ease-out hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] hover:border-black/10 cursor-pointer overflow-hidden"
              >
                {/* 4 Corner decorative dots */}
                <span className="absolute top-2.5 left-2.5 w-[4px] h-[4px] bg-black/15 rounded-full" />
                <span className="absolute top-2.5 right-2.5 w-[4px] h-[4px] bg-black/15 rounded-full" />
                <span className="absolute bottom-2.5 left-2.5 w-[4px] h-[4px] bg-black/15 rounded-full" />
                <span className="absolute bottom-2.5 right-2.5 w-[4px] h-[4px] bg-black/15 rounded-full" />
                
                {/* Card Main Text */}
                <div className="relative z-10 text-[17px] font-bold tracking-tight text-center transition-transform duration-[200ms] group-hover:-translate-y-4" >
                  {contract.name}
                </div>
                <div className="relative z-10 text-[12px] text-black/50 mt-1 transition-transform duration-[200ms] group-hover:-translate-y-4">
                  {contract.subtitle}
                </div>

                {/* Animated Dark Pill (Appears on Hover) */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-[200ms] ease-out delay-[50ms]">
                  <div className="bg-[#1A1A1A] rounded-full px-5 py-2 flex flex-col items-center justify-center whitespace-nowrap shadow-xl border border-white/10">
                    <span className="text-white text-[12px] font-mono opacity-90">{contract.address}</span>
                    <span className="text-[#E8A838] text-[11px] underline mt-0.5 tracking-wide hover:text-[#ffd685] transition-colors">
                      View on Blockscout →
                    </span>
                  </div>
                </div>
              </a>
            ))}

          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          SECTION 7: CRYPTO-POWERED PAYMENTS INFRASTRUCTURE
          ════════════════════════════════════════════ */}
      <section 
        className="relative overflow-hidden"
        style={{
          background: `
            linear-gradient(
              180deg,
              #ffffff 0%,
              #ffffff 10%,
              #f6f4fa 20%,
              #ebe8f6 30%,
              #dedaf0 45%,
              #abadd0 55%,
              #383b63 65%,
              #0e0e12 80%,
              #0e0e12 100%
            )
          `
        }}
      >
        
        {/* Extreme padding at top to stretch out the gradient diffusion curve */}
        <div className="pt-16 lg:pt-24 pb-28 lg:pb-36">

        {/* Corner dots */}
        <span className="absolute top-10 left-5 w-[5px] h-[5px] bg-[#4a4575]/20 rounded-full" />
        <span className="absolute bottom-5 left-5 w-[5px] h-[5px] bg-white/20 rounded-full" />

        <div className="relative z-10 max-w-[1100px] mx-auto px-10 lg:px-14">
          {/* Heading — centered */}
          <div className="text-center">
            <div className="leading-[0.92]" style={{ fontSize: 'clamp(42px, 6vw, 80px)' }}>
              <div className="font-display-serif tracking-[-0.01em]" style={{ WebkitTextStroke: '1.5px rgba(70,65,110,0.85)', color: 'transparent' }}>
                CRYPT
                <span className="relative inline-block">
                  O
                  <span className="absolute top-[48%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[0.055em] h-[0.055em] bg-[#4a4575] rounded-full" />
                </span>
                -P
                <span className="relative inline-block">
                  O
                  <span className="absolute top-[48%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[0.055em] h-[0.055em] bg-[#4a4575] rounded-full" />
                </span>
                RED
              </div>
              <div className="font-display-sans tracking-[-0.02em] text-[#333055] mt-[0.05em]">
                LENDING
              </div>
              <div className="font-display-serif tracking-[-0.01em] mt-[0.05em]" style={{ WebkitTextStroke: '1.5px rgba(70,65,110,0.85)', color: 'transparent' }}>
                INFRASTRUCTURE
              </div>
            </div>
          </div>

          {/* Feature list with floating coin — same dark bg */}
          <div className="relative mt-20 lg:mt-28">

            {/* Floating custom Three.js 3D coin in center - Fully transparent & interactable on axis */}
            <div className="hidden lg:block absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] z-10">
              <ThreeCoin />
            </div>

            {/* Row 1: 11.86M Transactions */}
            <div className="flex items-start justify-between py-8 border-b border-[#4a4575]/10">
              <div className="w-[35%]">
                <h4 className="font-display-serif text-[22px] lg:text-[26px] text-[#333055] tracking-[-0.01em]" style={{ fontStyle: 'normal' }}>11.86M Transactions</h4>
              </div>
              <div className="w-[45%] text-right">
                <p className="text-[13px] leading-[1.65] text-[#555375] font-medium italic" >
                  Built on Creditcoin&apos;s existing credit network spanning emerging markets across Africa, Southeast Asia, and Latin America
                </p>
              </div>
            </div>

            {/* Row 2: Multi-Collateral */}
            <div className="flex items-start justify-between py-8 border-b border-[#4a4575]/10">
              <div className="w-[35%]">
                <h4 className="font-display-serif text-[22px] lg:text-[26px] text-[#333055] tracking-[-0.01em]" style={{ fontStyle: 'normal' }}>Multi-Collateral</h4>
              </div>
              <div className="w-[45%] text-right">
                <p className="text-[13px] leading-[1.65] text-[#555375] font-medium italic" >
                  Accept CTC, stablecoins, wrapped tokens, and tokenized real-world receivables as collateral in isolated markets
                </p>
              </div>
            </div>

            {/* Row 3: Verifiably Trustless */}
            <div className="flex items-start justify-between py-8 border-b border-[#4a4575]/10">
              <div className="w-[35%]">
                <h4 className="font-display-serif text-[22px] lg:text-[26px] text-[#333055] tracking-[-0.01em]" style={{ fontStyle: 'normal' }}>Verifiably Trustless</h4>
              </div>
              <div className="w-[45%] text-right">
                <p className="text-[13px] leading-[1.65] text-[#555375] font-medium italic" >
                  USC cryptographic proofs replace trusted oracles. Every credit score is backed by on-chain evidence, not off-chain promises
                </p>
              </div>
            </div>

            {/* Row 4: Soulbound Identity */}
            <div className="flex items-start justify-between py-8 border-b border-[#4a4575]/10">
              <div className="w-[35%]">
                <h4 className="font-display-serif text-[22px] lg:text-[26px] text-[#333055] tracking-[-0.01em]" style={{ fontStyle: 'normal' }}>Soulbound Identity</h4>
              </div>
              <div className="w-[45%] text-right">
                <p className="text-[13px] leading-[1.65] text-[#555375] font-medium italic" >
                  ERC-5192 non-transferable credit tokens prevent score trading, identity farming, and credit tourism
                </p>
              </div>
            </div>

            {/* Row 5: Built for Billions */}
            <div className="flex items-start justify-between py-8 border-b border-[#4a4575]/10">
              <div className="w-[35%]">
                <h4 className="font-display-serif text-[22px] lg:text-[26px] text-[#333055] tracking-[-0.01em]" style={{ fontStyle: 'normal' }}>Built for Billions</h4>
              </div>
              <div className="w-[45%] text-right">
                <p className="text-[13px] leading-[1.65] text-[#555375] font-medium italic" >
                  Designed for the 1.4 billion unbanked. Microfinance borrowers build on-chain credit through the same protocol as institutional lenders
                </p>
              </div>
            </div>

          </div>
        </div>

        {/* ── IMAGINE IT, BUILD IT ── */}
        <div className="relative z-10 max-w-[1100px] mx-auto px-10 lg:px-14 mt-28 lg:mt-36">
          {/* Top row: description + heading */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-12">
            {/* Left: subtitle + paragraph */}
            <div className="max-w-[400px]">
              <p className="text-[10px] font-bold tracking-[0.18em] text-[#6a6590] uppercase" >
                EXPERIENCE WIKSHI
              </p>
              <p className="mt-5 text-[13.5px] leading-[1.75] text-[#555375] font-normal" >
                Supply USDT to earn yield. Borrow against CTC with credit-adjusted rates. Tokenize real-world loans. Track your score climbing with every repayment. DeFi lending that actually knows who you are.
              </p>
              <a
                href="/app"
                className="inline-block mt-7 bg-[#333055] text-white text-[10px] font-bold tracking-[0.1em] px-7 py-3.5 rounded hover:bg-[#15142b] transition-colors active:scale-[0.97]"
              >
                LAUNCH APP
              </a>
            </div>
            {/* Right: heading */}
            <div className="text-right">
              <div className="leading-[0.92]" style={{ fontSize: 'clamp(42px, 6vw, 80px)' }}>
                <div className="font-display-sans tracking-[-0.02em] text-[#333055]">
                  YOUR CREDIT.
                </div>
                <div className="font-display-serif tracking-[-0.01em] mt-[0.05em]" style={{ WebkitTextStroke: '1.5px rgba(70,65,110,0.85)', color: 'transparent' }}>
                  YOUR COLLATERAL.
                </div>
                <div className="font-display-sans tracking-[-0.02em] text-[#333055] mt-[0.05em]">
                  YOUR TERMS.
                </div>
              </div>
            </div>
          </div>

          {/* Video showcase */}
          <div className="relative mt-12 rounded-3xl overflow-hidden">
            <video
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-auto rounded-3xl"
              style={{ display: 'block' }}
            >
              <source src="/hero-video.mp4" type="video/mp4" />
            </video>
          </div>
        </div>

        {/* ── UNLOCKING A BETTER FUTURE ── */}
        <div className="relative z-10 max-w-[1100px] mx-auto px-10 lg:px-14 mt-12 pb-10">
          {/* Corner dots for this sub-section */}
          <span className="absolute top-0 right-0 w-[5px] h-[5px] bg-white/20 rounded-full" />

          <div className="text-center">
            {/* Heading */}
            <div className="leading-[0.92]" style={{ fontSize: 'clamp(42px, 6vw, 80px)' }}>
              {/* Line 1: UNLOCKING */}
              <div>
                <span className="font-display-serif tracking-[-0.01em]" style={{ WebkitTextStroke: '1.5px rgba(255,255,255,0.85)', color: 'transparent' }}>
                  UNL
                  <span className="relative inline-block">
                    O
                    <span className="absolute top-[48%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[0.055em] h-[0.055em] bg-white rounded-full" />
                  </span>
                  CKING
                </span>
                <span className="font-display-sans tracking-[-0.02em] text-white ml-[0.2em]">CREDIT</span>
              </div>
              {/* Line 2: FOR THE REAL WORLD */}
              <div className="flex items-baseline justify-center whitespace-nowrap mt-[0.05em] gap-[0.2em]">
                <span className="font-display-sans tracking-[-0.02em] text-white">FOR THE</span>
                <span className="font-display-serif tracking-[-0.01em]" style={{ WebkitTextStroke: '1.5px rgba(255,255,255,0.85)', color: 'transparent' }}>
                  REAL
                </span>
                <span className="font-display-sans tracking-[-0.02em] text-white">WORLD</span>
              </div>
            </div>

            {/* Subtitle */}
            <p className="mt-8 text-[14px] leading-[1.7] text-white/50 max-w-[480px] mx-auto" >
              $5.3 trillion in unsecured credit exists off-chain. DeFi has $30B+ in lending — all overcollateralized. Wikshi bridges the gap by bringing real credit history on-chain for the first time.
            </p>

            {/* Buttons */}
            <div className="flex items-center justify-center gap-4 mt-8">
              <a href="https://drive.google.com/file/d/1IqtJ-E4RCDSaa711c8sYqI2qJ_5jA3RU/view?usp=sharing" target="_blank" rel="noopener noreferrer" className="border border-white/30 text-white text-[9px] font-bold tracking-[0.15em] px-7 py-3.5 rounded-full hover:bg-white/10 transition-colors" >
                READ THE WHITEPAPER
              </a>
              <a href="https://x.com/akshmnd" target="_blank" rel="noopener noreferrer" className="bg-white text-black text-[9px] font-bold tracking-[0.15em] px-7 py-3.5 rounded-full hover:bg-white/90 transition-colors" >
                FOLLOW ON X
              </a>
            </div>
          </div>
        </div>

        </div>
      </section>

      {/* ════════════════════════════════════════════
          SECTION 8: LET'S BUILD TOGETHER + FOOTER
          — Extended long spread diffusion from dark to purple
          ════════════════════════════════════════════ */}
      <div 
        className="relative pt-12 pb-0 overflow-hidden" 
        style={{
          background: `linear-gradient(
            180deg,
            #0e0e12 0%,
            #0e0e12 15%,
            #15142b 30%,
            #221d4d 45%,
            #382b79 60%,
            #5442a9 75%,
            #7660d4 88%,
            #8a7ece 100%
          )`
        }}
      >
        
        {/* Corner dots */}
        <span className="absolute bottom-[40%] left-5 w-[5px] h-[5px] border border-white/20 rounded-full" />
        <span className="absolute bottom-[40%] right-5 w-[5px] h-[5px] border border-white/20 rounded-full" />

        <div className="relative z-10 max-w-[1100px] mx-auto px-10 lg:px-14">
          <div className="flex flex-col lg:flex-row gap-16 lg:gap-20 items-start">
            {/* Left: CTA text */}
            <div className="lg:w-[40%] shrink-0 pb-20">
              <h3 className="font-display-serif text-[32px] lg:text-[40px] text-white tracking-[-0.01em]" style={{ fontStyle: 'italic' }}>
                Let&apos;s Build Credit Together
              </h3>
              <p className="mt-5 text-[13.5px] leading-[1.75] text-white/70 max-w-[380px]" >
                Wikshi is the first lending protocol on Creditcoin. We&apos;re building the credit layer that DeFi has been missing — where your history matters more than your balance. Whether you&apos;re a supplier seeking real yield, a borrower building reputation, or a developer composing on credit data — there&apos;s a place for you.
              </p>
              <a href="https://github.com/Miny-Labs/wikshi" target="_blank" rel="noopener noreferrer" className="inline-block mt-7 border border-white/30 text-white text-[9px] font-bold tracking-[0.15em] px-6 py-3 rounded-full hover:bg-white/10 transition-colors" >
                GET STARTED
              </a>
            </div>

            {/* Right: rounded video card */}
            <div className="flex-1 relative">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl max-w-[480px] ml-auto">
                {/* Corner dots */}
                <span className="absolute top-3 left-3 w-[5px] h-[5px] bg-black/15 rounded-full z-20" />
                <span className="absolute top-3 right-3 w-[5px] h-[5px] bg-black/15 rounded-full z-20" />
                <video
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-auto rounded-3xl"
                  style={{ display: 'block' }}
                >
                  <source src="/build-credit-pingpong.mp4" type="video/mp4" />
                </video>
                <span className="absolute bottom-3 left-3 w-[5px] h-[5px] bg-black/15 rounded-full z-20" />
                <span className="absolute bottom-3 right-3 w-[5px] h-[5px] bg-black/15 rounded-full z-20" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <footer className="pt-20 pb-0 bg-gradient-to-b from-[#8a7ece] to-[#e8e4ff]">
        <div className="max-w-[1100px] mx-auto px-10 lg:px-14">

          {/* Logo row */}
          <div className="flex items-center justify-between mb-14">
            <div className="flex items-center gap-2">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M2 6L6 20H10L11.5 13L13 20H17L21 6H17L15.5 14L14 6H10L8.5 14L7 6H2Z" fill="#111" />
              </svg>
              <span className="text-[20px] font-bold text-black tracking-tight" >wikshi</span>
            </div>
            {/* Geometric icons center */}
            <div className="hidden lg:flex items-center gap-3 text-black/40">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18M5 5l14 14M19 5L5 19"/></svg>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2l3 7h7l-5.5 4.5 2 7L12 16l-6.5 4.5 2-7L2 9h7z"/></svg>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2L2 12l10 10 10-10L12 2z"/></svg>
            </div>
            {/* Globe icon right */}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" className="text-black/40"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2c3 3 4.5 6 4.5 10S15 22 12 22c-3-3-4.5-6-4.5-10S9 2 12 2z"/></svg>
          </div>

          {/* Footer columns */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-10 lg:gap-8 pb-16" >
            {/* PROTOCOL */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="w-[4px] h-[4px] bg-black/40 rounded-sm" />
                <span className="text-[9px] font-bold tracking-[0.15em] text-black/60 uppercase">PROTOCOL</span>
              </div>
              <ul className="space-y-2 text-[13px] text-black/60 cursor-pointer">
                <li><a href="https://github.com/Miny-Labs/wikshi" target="_blank" rel="noopener noreferrer" className="hover:text-black transition-colors">Launch App</a></li>
                <li><a href="https://github.com/Miny-Labs/wikshi/tree/main/contracts/core" target="_blank" rel="noopener noreferrer" className="hover:text-black transition-colors">Markets</a></li>
                <li><a href="https://github.com/Miny-Labs/wikshi/blob/main/contracts/core/WikshiCreditOracle.sol" target="_blank" rel="noopener noreferrer" className="hover:text-black transition-colors">Credit Score</a></li>
                <li><a href="https://github.com/Miny-Labs/wikshi/tree/main/contracts/periphery" target="_blank" rel="noopener noreferrer" className="hover:text-black transition-colors">RWA Pipeline</a></li>
                <li><a href="https://github.com/Miny-Labs/wikshi/blob/main/contracts/core/WikshiVault.sol" target="_blank" rel="noopener noreferrer" className="hover:text-black transition-colors">Vault</a></li>
              </ul>
            </div>
            {/* LEGAL */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="w-[4px] h-[4px] bg-black/40 rounded-sm" />
                <span className="text-[9px] font-bold tracking-[0.15em] text-black/60 uppercase">LEGAL</span>
              </div>
              <ul className="space-y-2 text-[13px] text-black/60 cursor-pointer">
                <li><a href="https://github.com/Miny-Labs/wikshi/blob/main/LICENSE" target="_blank" rel="noopener noreferrer" className="hover:text-black transition-colors">Terms of Use</a></li>
                <li><a href="https://github.com/Miny-Labs/wikshi/blob/main/LICENSE" target="_blank" rel="noopener noreferrer" className="hover:text-black transition-colors">Privacy Policy</a></li>
              </ul>
            </div>
            {/* RESOURCES */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="w-[4px] h-[4px] bg-black/40 rounded-sm" />
                <span className="text-[9px] font-bold tracking-[0.15em] text-black/60 uppercase">RESOURCES</span>
              </div>
              <ul className="space-y-2 text-[13px] text-black/60 cursor-pointer">
                <li><a href="https://drive.google.com/file/d/1IqtJ-E4RCDSaa711c8sYqI2qJ_5jA3RU/view?usp=sharing" target="_blank" rel="noopener noreferrer" className="hover:text-black transition-colors">Whitepaper</a></li>
                <li><a href="https://github.com/Miny-Labs/wikshi#readme" target="_blank" rel="noopener noreferrer" className="hover:text-black transition-colors">Documentation</a></li>
                <li><a href="https://github.com/Miny-Labs/wikshi" target="_blank" rel="noopener noreferrer" className="hover:text-black transition-colors">GitHub</a></li>
                <li><a href="https://drive.google.com/file/d/1BLQNU-XVLX7kMZvyo_RNl05G_nIBi1KQ/view?usp=sharing" target="_blank" rel="noopener noreferrer" className="hover:text-black transition-colors">Pitch Deck</a></li>
                <li><a href="https://github.com/Miny-Labs/wikshi" target="_blank" rel="noopener noreferrer" className="hover:text-black transition-colors">Blog</a></li>
              </ul>
            </div>
            {/* COMMUNITY */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="w-[4px] h-[4px] bg-black/40 rounded-sm" />
                <span className="text-[9px] font-bold tracking-[0.15em] text-black/60 uppercase">COMMUNITY</span>
              </div>
              <ul className="space-y-2 text-[13px] text-black/60 cursor-pointer">
                <li><a href="https://x.com/akshmnd" target="_blank" rel="noopener noreferrer" className="hover:text-black transition-colors">Discord</a></li>
                <li><a href="https://x.com/akshmnd" target="_blank" rel="noopener noreferrer" className="hover:text-black transition-colors">Twitter/X</a></li>
                <li><a href="https://x.com/akshmnd" target="_blank" rel="noopener noreferrer" className="hover:text-black transition-colors">Telegram</a></li>
              </ul>
            </div>
            {/* CONTACT */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="w-[4px] h-[4px] bg-black/40 rounded-sm" />
                <span className="text-[9px] font-bold tracking-[0.15em] text-black/60 uppercase">CONTACT</span>
              </div>
              <ul className="space-y-2 text-[13px] text-black/60 cursor-pointer">
                <li><a href="mailto:akash@miny-labs.com" className="hover:text-black transition-colors">akash@miny-labs.com</a></li>
              </ul>
            </div>
          </div>

          {/* Legal bottom bar */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 py-8 border-t border-black/10" >
            <p className="text-[8px] tracking-[0.12em] text-black/40 font-bold uppercase">
              MINY LABS 2026<br />ALL RIGHTS RESERVED
            </p>
            <p className="text-[8px] tracking-[0.12em] text-black/40 font-bold uppercase text-right">
              BUILT ON CREDITCOIN<br />POWERING THE NEXT BILLION
            </p>
          </div>
        </div>

        {/* ── STATIC FOOTER TEXT ── */}
        <div className="flex justify-center items-baseline mt-16 pb-12 overflow-hidden w-full whitespace-nowrap px-4 sm:px-10">
          <span className="font-display-sans text-[clamp(24px,4.5vw,100px)] text-black/90 tracking-[-0.02em] mx-2 md:mx-4">BUILD</span>
          <span className="font-display-serif text-[clamp(24px,4.5vw,100px)] tracking-[-0.01em] mx-2 md:mx-4" style={{ WebkitTextStroke: 'max(1px, 0.15vw) rgba(0,0,0,0.85)', color: 'transparent' }}>CREDIT WITH</span>
          <span className="font-display-sans text-[clamp(24px,4.5vw,100px)] text-black/90 tracking-[-0.02em] mx-2 md:mx-4">WIKSHI</span>
        </div>
      </footer>

    </div>
  );
}
