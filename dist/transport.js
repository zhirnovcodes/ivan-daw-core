// Contract C2: timing math shared by the host scheduler and every plugin.
// All times are AudioContext seconds. Beats are quarter notes.
/** Lookahead length used by the scheduler and the note generator, in seconds. */
export const LOOKAHEAD = 0.1;
/** Tick interval of the scheduler and the note generator, in milliseconds. */
export const TICK_MS = 25;
// Times and beats computed through float math can land a hair off a whole beat.
// Anything within EPSILON of a boundary counts as on it.
const EPSILON = 1e-9;
/** The beat at time `t`. Before `a.time` it extrapolates backwards. */
export function beatAt(t, a) {
    return a.state.beat + ((t - a.time) * a.state.bpm) / 60;
}
/** The time of `beat`; the inverse of `beatAt`. */
export function timeAt(beat, a) {
    return a.time + ((beat - a.state.beat) * 60) / a.state.bpm;
}
/** The window `[now, now + ahead)` to book on this tick. */
export function lookaheadWindow(now, ahead = LOOKAHEAD) {
    return [now, now + ahead];
}
/**
 * Whole beats `n` with `timeAt(n)` in `[from, to)`, in ascending order.
 * Empty when the anchor is not playing, and never includes a beat before the anchor's time,
 * so a beat that was already in the past when playback started is never booked.
 */
export function beatsIn(window, a) {
    const [from, to] = window;
    if (!a.state.playing || !(to > from))
        return [];
    const start = Math.max(from, a.time);
    const beats = [];
    let n = Math.ceil(beatAt(start, a) - EPSILON);
    while (timeAt(n, a) < to - EPSILON) {
        beats.push(n);
        n += 1;
    }
    return beats;
}
const WORKER_SOURCE = `let id = null;
onmessage = (e) => {
  if (id !== null) clearInterval(id);
  id = e.data > 0 ? setInterval(() => postMessage(0), e.data) : null;
};`;
/**
 * Calls `tick` every `ms` milliseconds from a Web Worker timer, which background tabs do not slow down.
 * Outside a browser (Vitest in Node) it falls back to `setInterval`, so tests can use fake timers.
 * Use it only to wake the lookahead loop: the musical times come from the AudioContext clock.
 */
export function createTicker(ms, tick) {
    if (typeof Worker !== 'undefined' &&
        typeof Blob !== 'undefined' &&
        typeof URL !== 'undefined' &&
        typeof URL.createObjectURL === 'function') {
        const url = URL.createObjectURL(new Blob([WORKER_SOURCE], { type: 'text/javascript' }));
        const worker = new Worker(url);
        let stopped = false;
        worker.onmessage = () => {
            if (!stopped)
                tick();
        };
        worker.postMessage(ms);
        return {
            stop() {
                if (stopped)
                    return;
                stopped = true;
                worker.postMessage(0);
                worker.terminate();
                URL.revokeObjectURL(url);
            },
        };
    }
    let stopped = false;
    const id = setInterval(() => {
        if (!stopped)
            tick();
    }, ms);
    return {
        stop() {
            stopped = true;
            clearInterval(id);
        },
    };
}
