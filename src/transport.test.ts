import { afterEach, describe, expect, it, vi } from 'vitest';
import type { TransportState } from './api.js';
import {
  type Anchor,
  beatAt,
  beatsIn,
  createTicker,
  LOOKAHEAD,
  lookaheadWindow,
  timeAt,
} from './transport.js';

const state = (over: Partial<TransportState> = {}): TransportState => ({
  playing: true,
  bpm: 120,
  beat: 0,
  numerator: 4,
  denominator: 4,
  loop: null,
  ...over,
});
const anchor = (time: number, over: Partial<TransportState> = {}): Anchor => ({
  state: state(over),
  time,
});

describe('beatAt / timeAt', () => {
  it('follows beat = B + (t - T) * bpm / 60', () => {
    const a = anchor(10, { beat: 4, bpm: 120 });
    expect(beatAt(10, a)).toBe(4);
    expect(beatAt(11, a)).toBe(6);
    expect(timeAt(6, a)).toBe(11);
    expect(timeAt(3, a)).toBe(9.5);
  });

  it('round-trips at several tempos', () => {
    for (const bpm of [40, 60, 97.3, 120, 200, 240]) {
      const a = anchor(3.217, { beat: 7.25, bpm });
      for (const t of [0, 1.5, 3.217, 9.99, 1234.5678]) {
        expect(timeAt(beatAt(t, a), a)).toBeCloseTo(t, 9);
      }
      for (const b of [0, 1, 7.25, 100.5]) {
        expect(beatAt(timeAt(b, a), a)).toBeCloseTo(b, 9);
      }
    }
  });

  it('keeps the beat continuous across a tempo change', () => {
    const a1 = anchor(0, { bpm: 120 });
    const change = 2.3;
    const a2: Anchor = { state: state({ bpm: 180, beat: beatAt(change, a1) }), time: change };
    expect(beatAt(change, a2)).toBeCloseTo(beatAt(change, a1), 12);
    // After the change the beat advances at the new speed.
    expect(beatAt(change + 1, a2) - beatAt(change, a2)).toBeCloseTo(3, 12);
  });
});

describe('lookaheadWindow', () => {
  it('defaults to 100 ms', () => {
    expect(LOOKAHEAD).toBe(0.1);
    expect(lookaheadWindow(5)).toEqual([5, 5.1]);
    expect(lookaheadWindow(5, 0.2)).toEqual([5, 5.2]);
  });
});

describe('beatsIn', () => {
  it('is empty when not playing', () => {
    expect(beatsIn([0, 10], anchor(0, { playing: false }))).toEqual([]);
  });

  it('includes from and excludes to', () => {
    const a = anchor(0, { bpm: 60 });
    expect(beatsIn([1, 3], a)).toEqual([1, 2]);
    expect(beatsIn([1.0001, 3.0001], a)).toEqual([2, 3]);
  });

  it('never books a beat before the anchor time', () => {
    const a = anchor(5, { beat: 2, bpm: 60 });
    expect(beatsIn([0, 6.5], a)).toEqual([2, 3]);
  });

  it('resumes from a fractional beat at the next whole beat', () => {
    const a = anchor(1, { beat: 2.4, bpm: 60 });
    expect(beatsIn([1, 2], a)).toEqual([3]);
  });

  for (const bpm of [60, 120, 200]) {
    it(`books each beat exactly once over 25 ms ticks at ${bpm} BPM`, () => {
      const t0 = 0.05;
      const a = anchor(t0, { bpm });
      const seen = new Map<number, number>();
      let last = -Infinity;
      for (let tick = 0; tick < 2400; tick++) {
        const now = tick * 0.025;
        for (const n of beatsIn(lookaheadWindow(now), a)) {
          if (n <= last) continue; // the plugin remembers the last booked beat
          last = n;
          seen.set(n, timeAt(n, a));
        }
      }
      const beats = [...seen.keys()];
      const expected = Math.floor(((2400 * 0.025 - t0) * bpm) / 60);
      expect(beats.length).toBeGreaterThanOrEqual(expected);
      beats.forEach((n, i) => {
        expect(n).toBe(i);
        expect(seen.get(n)).toBeCloseTo(t0 + (n * 60) / bpm, 9);
      });
    });
  }

  it('does not lose or double a beat that lands exactly on a window edge', () => {
    // At 120 BPM from t=0, beat 1 is at exactly 0.5 s, the edge between [0.4, 0.5) and [0.5, 0.6).
    const a = anchor(0, { bpm: 120 });
    expect(beatsIn([0.4, 0.5], a)).toEqual([]);
    expect(beatsIn([0.5, 0.6], a)).toEqual([1]);
  });
});

describe('createTicker', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('ticks every ms milliseconds until stopped (Node fallback)', () => {
    vi.useFakeTimers();
    const tick = vi.fn();
    const t = createTicker(25, tick);
    vi.advanceTimersByTime(100);
    expect(tick).toHaveBeenCalledTimes(4);
    t.stop();
    vi.advanceTimersByTime(100);
    expect(tick).toHaveBeenCalledTimes(4);
    t.stop(); // stopping twice is harmless
  });

  it('uses a Web Worker when one is available', () => {
    const posted: unknown[] = [];
    let instance:
      | { onmessage: ((e: MessageEvent) => void) | null; terminated: boolean }
      | undefined;
    class FakeWorker {
      onmessage: ((e: MessageEvent) => void) | null = null;
      terminated = false;
      constructor(public url: string) {
        instance = this;
      }
      postMessage(m: unknown) {
        posted.push(m);
      }
      terminate() {
        this.terminated = true;
      }
    }
    vi.stubGlobal('Worker', FakeWorker);
    const revoke = vi.spyOn(URL, 'revokeObjectURL');
    try {
      const tick = vi.fn();
      const t = createTicker(25, tick);
      expect(posted).toEqual([25]);
      instance?.onmessage?.({} as MessageEvent);
      instance?.onmessage?.({} as MessageEvent);
      expect(tick).toHaveBeenCalledTimes(2);
      t.stop();
      instance?.onmessage?.({} as MessageEvent);
      expect(tick).toHaveBeenCalledTimes(2);
      expect(instance?.terminated).toBe(true);
      expect(revoke).toHaveBeenCalledTimes(1);
    } finally {
      vi.unstubAllGlobals();
      revoke.mockRestore();
    }
  });
});
