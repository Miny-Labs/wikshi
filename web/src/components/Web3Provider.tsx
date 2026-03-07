'use client';
import dynamic from 'next/dynamic';

const Web3Provider = dynamic(
  () => import('./Web3ProviderContent').then(mod => mod.Web3ProviderContent), 
  { ssr: false }
);

export { Web3Provider };
