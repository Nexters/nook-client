import { describe, expect, it } from 'vitest';
import {
  type GestureSample,
  releaseVelocity,
  sampleGesture,
  shouldAdvanceSheet,
} from './sheet-gesture';

describe('sheet momentum', () => {
  it('uses a short final flick even after a long hold', () => {
    const history: GestureSample[] = [{ position: 0, time: 0 }];
    sampleGesture(history, 0, 1000);
    sampleGesture(history, -25, 1050);
    const velocity = releaseVelocity(history, 1050);
    expect(shouldAdvanceSheet(-25, velocity, 40)).toBe(true);
  });
  it('does not fling after pausing or reversing', () => {
    expect(
      releaseVelocity(
        [
          { position: 0, time: 0 },
          { position: 25, time: 50 },
        ],
        200,
      ),
    ).toBe(0);
    expect(shouldAdvanceSheet(25, -1, 40)).toBe(false);
    expect(shouldAdvanceSheet(8, 2, 40)).toBe(false);
  });
});
