/**
 * A gain curve 0 → 1 → 0 for one voice.
 *
 * - `start()` rises to 1 at one attack step (1 / attackFrames) per frame, from the gain it has now.
 *   A restart during a release therefore rises from the gain reached, so nothing jumps.
 * - `release()` falls to 0 in `releaseFrames` frames, starting from the gain reached, not from 1
 *   (like Beatality's `Curve::stop`). A release from mid-attack is shorter in height, not in length.
 * - `next()` advances one frame and returns the gain for that frame.
 * - `done` is true when the gain is 0 and nothing is rising: the voice can be reused.
 */
export declare class Envelope {
    private readonly attackFrames;
    private readonly releaseFrames;
    private gain;
    private step;
    private remaining;
    private phase;
    constructor(attackFrames: number, releaseFrames: number);
    /** Begin (or restart) the attack from the current gain. */
    start(): void;
    /**
     * Begin the release from the current gain. `frames` overrides the release length for this
     * release only, e.g. a 5 ms fade for a stolen voice. Releasing an idle envelope does nothing.
     */
    release(frames?: number): void;
    /** Advance one frame and return its gain, 0..1. */
    next(): number;
    /** The gain of the last frame, without advancing. */
    get value(): number;
    /** True while releasing. */
    get releasing(): boolean;
    /** True when silent and not rising. */
    get done(): boolean;
}
/**
 * Moves a value to its target in a straight line over `frames` frames instead of jumping.
 * A new target mid-move starts a new line from where the value is now; setting the same
 * target again does not restart the move (as Beatality's `Interpolator::set`).
 */
export declare class Smoother {
    private readonly frames;
    private current;
    private target;
    private step;
    private remaining;
    constructor(value: number, frames: number);
    set(target: number): void;
    /** Advance one frame and return the value for that frame. */
    next(): number;
    /** The value of the last frame, without advancing. */
    get value(): number;
}
