import { requireNativeModule } from 'expo';

export interface StoredSession {
  schemaVersion: 1;
  accessToken: string;
  refreshToken: string | null;
  revision: number;
}

interface NookSessionNativeModule {
  getSession(): Promise<StoredSession | null>;
  setSession(accessToken: string, refreshToken: string | null): Promise<StoredSession>;
  clearSession(): Promise<void>;
}

export default requireNativeModule<NookSessionNativeModule>('NookSession');
