'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDemo } from './DemoProvider';
import { DEMO_STEPS } from './demoSteps';

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export default function DemoOverlay() {
  const { isActive, stepIndex } = useDemo();
  const [rect, setRect] = useState<Rect | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!isActive) {
      setRect(null);
      return;
    }

    const step = DEMO_STEPS[stepIndex];
    if (!step || step.dialogPosition === 'center') {
      setRect(null);
      return;
    }

    let attempts = 0;
    const maxAttempts = 20;

    const findElement = () => {
      const el = document.querySelector(step.targetSelector);
      if (el) {
        const r = el.getBoundingClientRect();
        const pad = 12;
        setRect({
          x: r.left - pad,
          y: r.top - pad,
          w: r.width + pad * 2,
          h: r.height + pad * 2,
        });
      } else if (attempts < maxAttempts) {
        attempts++;
        rafRef.current = requestAnimationFrame(findElement);
      } else {
        setRect(null);
      }
    };

    const timer = setTimeout(() => {
      findElement();
    }, 300);

    const update = () => {
      const el = document.querySelector(step.targetSelector);
      if (el) {
        const r = el.getBoundingClientRect();
        const pad = 12;
        setRect({
          x: r.left - pad,
          y: r.top - pad,
          w: r.width + pad * 2,
          h: r.height + pad * 2,
        });
      }
    };

    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);

    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [isActive, stepIndex]);

  if (!isActive) return null;

  const vw = typeof window !== 'undefined' ? window.innerWidth : 1920;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 1080;

  return (
    <AnimatePresence>
      {rect && (
        <>
          {/* SVG overlay with cutout */}
          <motion.div
            key="overlay-spotlight"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="pointer-events-none fixed inset-0 z-[9990]"
          >
            <svg width={vw} height={vh} className="absolute inset-0">
              <defs>
                <mask id="spotlight-mask">
                  <rect width={vw} height={vh} fill="white" />
                  <rect
                    x={rect.x}
                    y={rect.y}
                    width={rect.w}
                    height={rect.h}
                    rx="16"
                    fill="black"
                  />
                </mask>
              </defs>
              <rect
                width={vw}
                height={vh}
                fill="rgba(8, 6, 16, 0.75)"
                mask="url(#spotlight-mask)"
              />
            </svg>
          </motion.div>

          {/* Glow ring */}
          <motion.div
            key="glow"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none fixed z-[9990]"
            style={{
              left: rect.x,
              top: rect.y,
              width: rect.w,
              height: rect.h,
              borderRadius: 16,
              boxShadow: '0 0 40px 8px rgba(200,182,240,0.12), inset 0 0 20px 4px rgba(200,182,240,0.05)',
              border: '1px solid rgba(200,182,240,0.15)',
            }}
          />
        </>
      )}
    </AnimatePresence>
  );
}
