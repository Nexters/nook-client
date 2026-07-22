import { create } from 'zustand';

/**
 * 전역 클라이언트 상태 예시 슬라이스. 전역 상태는 적게 유지하고(zustand),
 * 서버 데이터는 TanStack Query 에 둔다. 스캐폴드 검증용 최소 스토어.
 */
interface AppState {
  ready: boolean;
  setReady: (ready: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  ready: false,
  setReady: (ready) => set({ ready }),
}));
