import { create } from 'zustand';
import type { ShareReceivedEvent } from '@/shared/native/shareTarget';

interface ShareState {
  lastShare: ShareReceivedEvent | null;
  setLastShare: (event: ShareReceivedEvent) => void;
}

export const useShareStore = create<ShareState>((set) => ({
  lastShare: null,
  setLastShare: (event) => set({ lastShare: event }),
}));
