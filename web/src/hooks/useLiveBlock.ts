'use client';

import { useBlockNumber } from 'wagmi';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

export function useLiveBlock() {
  const queryClient = useQueryClient();
  const { data: blockNumber } = useBlockNumber({ watch: true });

  useEffect(() => {
    if (blockNumber) {
      queryClient.invalidateQueries({ queryKey: ['readContract'] });
    }
  }, [blockNumber, queryClient]);

  return blockNumber;
}
