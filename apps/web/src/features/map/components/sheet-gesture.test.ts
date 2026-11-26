import { describe, expect, it } from 'vitest';
import {
  type GestureSample,
  releaseVelocity,
  sampleGesture,
  shouldAdvanceSheet,
} from './sheet-gesture';

describe('sheet-gesture', () => {
  it('오래 누르고 있다가 마지막에 짧게 튕겨도 넘어간다', () => {
    const history: GestureSample[] = [{ position: 0, time: 0 }];
    sampleGesture(history, 0, 1000);
    sampleGesture(history, -25, 1050);
    expect(shouldAdvanceSheet(-25, releaseVelocity(history, 1050), 40)).toBe(true);
  });

  it('멈췄다 놓으면 속도는 0 이라 넘어가지 않는다', () => {
    const history = [
      { position: 0, time: 0 },
      { position: 25, time: 50 },
    ];
    expect(releaseVelocity(history, 200)).toBe(0);
    expect(shouldAdvanceSheet(25, 0, 40)).toBe(false);
  });

  it('방향을 바꿔 놓거나 너무 짧게 움직이면 넘어가지 않는다', () => {
    expect(shouldAdvanceSheet(25, -1, 40)).toBe(false);
    expect(shouldAdvanceSheet(8, 2, 40)).toBe(false);
  });

  it('문턱을 넘기면 속도와 상관없이 넘어간다', () => {
    expect(shouldAdvanceSheet(-41, 0, 40)).toBe(true);
  });
});
