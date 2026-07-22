import { create } from 'zustand';
import type { SharedItem } from '@/bridge';

interface ShareState {
  pending: SharedItem[];
  setPending: (items: SharedItem[]) => void;
}

export const useShareStore = create<ShareState>((set) => ({
  pending: [],
  setPending: (items) => set({ pending: items }),
}));
