'use client';

interface SkeletonCardProps {
  lines?: number;
}

export default function SkeletonCard({ lines = 3 }: SkeletonCardProps) {
  return (
    <div className="rounded-2xl border border-[#3D3565] bg-[#1e1a35] p-6">
      <div className="skeleton mb-4 h-3 w-24" />
      <div className="skeleton mb-3 h-8 w-32" />
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="skeleton mb-2 h-3" style={{ width: `${80 - i * 15}%` }} />
      ))}
    </div>
  );
}
