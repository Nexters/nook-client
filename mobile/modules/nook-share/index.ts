import { requireNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';

// ShareStore.swift 가 큐잉하는 항목 (일부 필드는 선택)
export interface PendingItem {
  text: string;
  savedAt?: number;
  groups?: string[];
  memo?: string;
  newGroupName?: string;
  newGroupColorIndex?: number;
}

const nativeModule = Platform.OS === 'ios' ? requireNativeModule('NookShare') : null;

// App Group 'pending' 큐를 읽고 비운다. iOS 외에는 항상 빈 배열.
export function takePending(): PendingItem[] {
  if (!nativeModule) return [];
  try {
    return JSON.parse(nativeModule.takePending());
  } catch {
    return [];
  }
}
