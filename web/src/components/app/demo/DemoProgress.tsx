'use client';

import { motion } from 'framer-motion';
import { useDemo } from './DemoProvider';
import { DEMO_STEPS, TOTAL_STEPS } from './demoSteps';

export default function DemoProgress() {
  const { isActive, stepIndex, goToStep } = useDemo();

  if (!isActive) return null;

  const currentStep = DEMO_STEPS[stepIndex];
  const progress = ((stepIndex + 1) / TOTAL_STEPS) * 100;

  return (
    <div className="sticky top-0 z-[9992] border-b border-[#3D3565]/40 bg-[#12101e]/95 px-6 py-3 backdrop-blur-sm">
      <div className="mx-auto flex max-w-[1100px] items-center gap-4">
        {/* Step counter */}
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#6a6590]">
          {stepIndex + 1}/{TOTAL_STEPS}
        </span>

        {/* Progress bar */}
        <div className="flex flex-1 items-center gap-1">
          <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-[#3D3565]/40">
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#c8b6f0] to-[#E8A838]"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            />
          </div>

          {/* Step dots */}
          <div className="flex items-center gap-1 ml-2">
            {DEMO_STEPS.map((step, idx) => {
              const isComplete = idx < stepIndex;
              const isCurrent = idx === stepIndex;
              const isFuture = idx > stepIndex;

              return (
                <button
                  key={step.id}
                  onClick={() => goToStep(idx)}
                  disabled={isFuture}
                  className={`p-0.5 ${isFuture ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <motion.div
                    className={`h-1.5 w-1.5 rounded-full transition-colors ${
                      isCurrent
                        ? 'bg-[#c8b6f0]'
                        : isComplete
                          ? 'bg-[#c8b6f0]/50'
                          : 'bg-[#3D3565]'
                    }`}
                    animate={isCurrent ? { scale: [1, 1.4, 1] } : {}}
                    transition={isCurrent ? { duration: 1.5, repeat: Infinity } : {}}
                  />
                </button>
              );
            })}
          </div>
        </div>

        {/* Current step title */}
        <span className="max-w-[200px] truncate text-[11px] font-medium text-[#abadd0]">
          {currentStep?.title}
        </span>
      </div>
    </div>
  );
}
