'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { DEMO_STEPS, TOTAL_STEPS } from './demoSteps';

interface DemoContextValue {
  isActive: boolean;
  stepIndex: number;
  startDemo: () => void;
  exitDemo: () => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (index: number) => void;
}

const DemoContext = createContext<DemoContextValue | null>(null);

export function DemoProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [isActive, setIsActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [navigating, setNavigating] = useState(false);

  // Handle page navigation when step changes
  useEffect(() => {
    if (!isActive) return;
    const step = DEMO_STEPS[stepIndex];
    if (!step) return;

    if (pathname !== step.page) {
      setNavigating(true);
      router.push(step.page);
    } else {
      setNavigating(false);
    }
  }, [isActive, stepIndex, pathname, router]);

  // When pathname changes and matches step page, clear navigating
  useEffect(() => {
    if (!isActive) return;
    const step = DEMO_STEPS[stepIndex];
    if (step && pathname === step.page && navigating) {
      const timer = setTimeout(() => setNavigating(false), 600);
      return () => clearTimeout(timer);
    }
  }, [pathname, isActive, stepIndex, navigating]);

  const startDemo = useCallback(() => {
    setIsActive(true);
    setStepIndex(0);
  }, []);

  const exitDemo = useCallback(() => {
    setIsActive(false);
    setStepIndex(0);
  }, []);

  const nextStep = useCallback(() => {
    if (stepIndex >= TOTAL_STEPS - 1) {
      exitDemo();
      return;
    }
    setStepIndex((i) => i + 1);
  }, [stepIndex, exitDemo]);

  const prevStep = useCallback(() => {
    setStepIndex((i) => Math.max(0, i - 1));
  }, []);

  const goToStep = useCallback(
    (index: number) => {
      if (index >= 0 && index <= stepIndex) {
        setStepIndex(index);
      }
    },
    [stepIndex],
  );

  return (
    <DemoContext.Provider
      value={{ isActive, stepIndex, startDemo, exitDemo, nextStep, prevStep, goToStep }}
    >
      {children}
    </DemoContext.Provider>
  );
}

export function useDemo(): DemoContextValue {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error('useDemo must be used within DemoProvider');
  return ctx;
}
