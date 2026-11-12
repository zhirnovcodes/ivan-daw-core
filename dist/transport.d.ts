import type { TransportState } from './api.js';
/** "Beat `state.beat` happens at `time`." With the BPM, every other beat's time follows. */
export interface Anchor {
    state: TransportState;
    time: number;
}
/** Lookahead length used by the scheduler and the note generator, in seconds. */
export declare const LOOKAHEAD = 0.1;
/** Tick interval of the scheduler and the note generator, in milliseconds. */
export declare const TICK_MS = 25;
/** The beat at time `t`. Before `a.time` it extrapolates backwards. */
export declare function beatAt(t: number, a: Anchor): number;
/** The time of `beat`; the inverse of `beatAt`. */
export declare function timeAt(beat: number, a: Anchor): number;
/** The window `[now, now + ahead)` to book on this tick. */
export declare function lookaheadWindow(now: number, ahead?: number): [number, number];
/**
 * Whole beats `n` with `timeAt(n)` in `[from, to)`, in ascending order.
 * Empty when the anchor is not playing, and never includes a beat before the anchor's time,
 * so a beat that was already in the past when playback started is never booked.
 */
export declare function beatsIn(window: [number, number], a: Anchor): number[];
/**
 * Calls `tick` every `ms` milliseconds from a Web Worker timer, which background tabs do not slow down.
 * Outside a browser (Vitest in Node) it falls back to `setInterval`, so tests can use fake timers.
 * Use it only to wake the lookahead loop: the musical times come from the AudioContext clock.
 */
export declare function createTicker(ms: number, tick: () => void): {
    stop(): void;
};
