// Click-free fades, ported from Beatality's `Curve` (here `Envelope`) and `Interpolator` (here `Smoother`).
// The C++ originals are in docs/reference/beatality/. Both run per sample on the audio thread:
// no method allocates, and state is a few numbers.

const IDLE = 0;
const ATTACK = 1;
const SUSTAIN = 2;
const RELEASE = 3;

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
export class Envelope {
  private readonly attackFrames: number;
  private readonly releaseFrames: number;
  private gain = 0;
  private step = 0;
  // Frames left in the current attack or release. The last one lands exactly on 1 or 0.
  private remaining = 0;
  private phase = IDLE;

  constructor(attackFrames: number, releaseFrames: number) {
    this.attackFrames = Math.max(0, Math.round(attackFrames));
    this.releaseFrames = Math.max(0, Math.round(releaseFrames));
  }

  /** Begin (or restart) the attack from the current gain. */
  start(): void {
    const remaining = Math.ceil((1 - this.gain) * this.attackFrames - 1e-9);
    if (remaining <= 0) {
      this.gain = 1;
      this.phase = SUSTAIN;
      return;
    }
    this.step = 1 / this.attackFrames;
    this.remaining = remaining;
    this.phase = ATTACK;
  }

  /**
   * Begin the release from the current gain. `frames` overrides the release length for this
   * release only, e.g. a 5 ms fade for a stolen voice. Releasing an idle envelope does nothing.
   */
  release(frames: number = this.releaseFrames): void {
    if (this.phase === IDLE) return;
    const length = Math.max(0, Math.round(frames));
    if (length === 0 || this.gain === 0) {
      this.gain = 0;
      this.phase = IDLE;
      return;
    }
    this.step = -this.gain / length;
    this.remaining = length;
    this.phase = RELEASE;
  }

  /** Advance one frame and return its gain, 0..1. */
  next(): number {
    if (this.phase === ATTACK || this.phase === RELEASE) {
      this.remaining -= 1;
      if (this.remaining > 0) {
        this.gain = Math.min(1, Math.max(0, this.gain + this.step));
      } else if (this.phase === ATTACK) {
        this.gain = 1;
        this.phase = SUSTAIN;
      } else {
        this.gain = 0;
        this.phase = IDLE;
      }
    }
    return this.gain;
  }

  /** The gain of the last frame, without advancing. */
  get value(): number {
    return this.gain;
  }

  /** True while releasing. */
  get releasing(): boolean {
    return this.phase === RELEASE;
  }

  /** True when silent and not rising. */
  get done(): boolean {
    return this.phase === IDLE;
  }
}

/**
 * Moves a value to its target in a straight line over `frames` frames instead of jumping.
 * A new target mid-move starts a new line from where the value is now; setting the same
 * target again does not restart the move (as Beatality's `Interpolator::set`).
 */
export class Smoother {
  private readonly frames: number;
  private current: number;
  private target: number;
  private step = 0;
  // Frames left in the current move. The last one lands exactly on the target.
  private remaining = 0;

  constructor(value: number, frames: number) {
    this.frames = Math.max(0, Math.round(frames));
    this.current = value;
    this.target = value;
  }

  set(target: number): void {
    if (target === this.target) return;
    this.target = target;
    if (this.frames === 0) {
      this.current = target;
      this.remaining = 0;
      return;
    }
    this.step = (target - this.current) / this.frames;
    this.remaining = this.frames;
  }

  /** Advance one frame and return the value for that frame. */
  next(): number {
    if (this.remaining > 0) {
      this.remaining -= 1;
      this.current = this.remaining > 0 ? this.current + this.step : this.target;
    }
    return this.current;
  }

  /** The value of the last frame, without advancing. */
  get value(): number {
    return this.current;
  }
}
