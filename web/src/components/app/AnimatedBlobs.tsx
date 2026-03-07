'use client';

import { motion } from 'framer-motion';

const blobs = [
  { x: '5%', y: '10%', size: 500, color: '#c8b6f0', opacity: 0.12, delay: 0 },
  { x: '60%', y: '50%', size: 450, color: '#c8b6f0', opacity: 0.08, delay: 2 },
  { x: '30%', y: '70%', size: 400, color: '#8a7ece', opacity: 0.1, delay: 4 },
  { x: '75%', y: '10%', size: 350, color: '#E8A838', opacity: 0.06, delay: 6 },
  { x: '40%', y: '20%', size: 300, color: '#3D3565', opacity: 0.15, delay: 1 },
];

export default function AnimatedBlobs() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Base gradient */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(200, 182, 240, 0.06) 0%, transparent 70%)',
        }}
      />

      {blobs.map((blob, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            left: blob.x,
            top: blob.y,
            width: blob.size,
            height: blob.size,
            background: `radial-gradient(circle, ${blob.color} 0%, transparent 65%)`,
            opacity: blob.opacity,
            filter: 'blur(80px)',
            willChange: 'transform',
          }}
          animate={{
            x: [0, 50, -40, 30, 0],
            y: [0, -40, 30, -20, 0],
            scale: [1, 1.15, 0.9, 1.1, 1],
          }}
          transition={{
            duration: 25,
            delay: blob.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}
