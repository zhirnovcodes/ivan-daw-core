import { describe, expect, it } from 'vitest';
import { Envelope, Smoother } from './envelope.js';

// 48 kHz: 5 ms attack, 30 ms release, 5 ms steal fade.
const ATTACK = 240;
const RELEASE = 1440;
const STEAL = 240;
const ATTACK_STEP = 1 / ATTACK;

function run(env: Envelope, frames: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < frames; i++) out.push(env.next());
  return out;
}

function maxJump(samples: number[], from = 0): number {
  let max = 0;
  let prev = from;
  for (const s of samples) {
    max = Math.max(max, Math.abs(s - prev));
    prev = s;
  }
  return max;
}

describe('Envelope', () => {
  it('starts silent and done', () => {
    const env = new Envelope(ATTACK, RELEASE);
    expect(env.done).toBe(true);
    expect(env.next()).toBe(0);
  });

  it('rises 0 → 1 over the attack, then holds', () => {
    const env = new Envelope(ATTACK, RELEASE);
    env.start();
    const out = run(env, ATTACK + 10);
    expect(out[0]).toBeCloseTo(ATTACK_STEP, 12);
    expect(out[ATTACK - 2]).toBeLessThan(1);
    expect(out[ATTACK - 1]).toBeCloseTo(1, 9);
    expect(out[ATTACK + 9]).toBe(1);
    expect(env.done).toBe(false);
  });

  it('falls 1 → 0 over the release and is then done', () => {
    const env = new Envelope(ATTACK, RELEASE);
    env.start();
    run(env, ATTACK);
    env.release();
    expect(env.releasing).toBe(true);
    const out = run(env, RELEASE);
    expect(out[RELEASE - 2]).toBeGreaterThan(0);
    expect(out[RELEASE - 1]).toBe(0);
    expect(env.done).toBe(true);
  });

  it('releases from mid-attack from the gain reached, over the same length', () => {
    const env = new Envelope(ATTACK, RELEASE);
    env.start();
    const rise = run(env, ATTACK / 2);
    const reached = rise[rise.length - 1] ?? 0;
    expect(reached).toBeCloseTo(0.5, 9);
    env.release();
    const fall = run(env, RELEASE);
    expect(fall[0]).toBeLessThan(reached);
    expect(fall[0]).toBeCloseTo(reached - reached / RELEASE, 9);
    expect(fall[RELEASE - 1]).toBe(0);
    expect(maxJump([...rise, ...fall])).toBeLessThanOrEqual(ATTACK_STEP + 1e-12);
    expect(env.done).toBe(true);
  });

  it('restarts from mid-release by rising from the gain reached', () => {
    const env = new Envelope(ATTACK, RELEASE);
    env.start();
    const a = run(env, ATTACK);
    env.release();
    const r = run(env, RELEASE / 2);
    const reached = r[r.length - 1] ?? 0;
    expect(reached).toBeCloseTo(0.5, 6);
    env.start();
    const b = run(env, ATTACK);
    expect(b[0]).toBeCloseTo(reached + ATTACK_STEP, 9);
    expect(b[b.length - 1]).toBe(1);
    expect(maxJump([...a, ...r, ...b])).toBeLessThanOrEqual(ATTACK_STEP + 1e-12);
  });

  it('steal overlap: the old voice fades in 5 ms while a new voice attacks, no jumps', () => {
    const old = new Envelope(ATTACK, RELEASE);
    old.start();
    const before = run(old, 1000);
    const fresh = new Envelope(ATTACK, RELEASE);
    old.release(STEAL);
    fresh.start();
    const oldOut: number[] = [];
    const newOut: number[] = [];
    for (let i = 0; i < ATTACK * 2; i++) {
      oldOut.push(old.next());
      newOut.push(fresh.next());
    }
    expect(oldOut[STEAL - 1]).toBe(0);
    expect(old.done).toBe(true);
    expect(newOut[ATTACK - 1]).toBeCloseTo(1, 9);
    expect(maxJump([...before, ...oldOut])).toBeLessThanOrEqual(ATTACK_STEP + 1e-12);
    expect(maxJump(newOut)).toBeLessThanOrEqual(ATTACK_STEP + 1e-12);
    // The sum of the two never exceeds 2 and never drops below either one.
    for (let i = 0; i < oldOut.length; i++) {
      const sum = (oldOut[i] ?? 0) + (newOut[i] ?? 0);
      expect(sum).toBeLessThanOrEqual(2);
    }
  });

  it('ignores release when idle and a second release keeps falling from where it is', () => {
    const env = new Envelope(ATTACK, RELEASE);
    env.release();
    expect(env.done).toBe(true);
    env.start();
    run(env, ATTACK);
    env.release();
    const first = run(env, RELEASE / 2);
    env.release();
    const second = run(env, RELEASE);
    expect(maxJump([...first, ...second], 1)).toBeLessThanOrEqual(ATTACK_STEP + 1e-12);
    expect(env.done).toBe(true);
  });

  it('with a zero attack starts at full gain', () => {
    const env = new Envelope(0, 0);
    env.start();
    expect(env.next()).toBe(1);
    env.release();
    expect(env.next()).toBe(0);
    expect(env.done).toBe(true);
  });
});

describe('Smoother', () => {
  it('holds its initial value', () => {
    const s = new Smoother(0.5, 240);
    expect(s.next()).toBe(0.5);
    expect(s.value).toBe(0.5);
  });

  it('moves to a new target in a straight line over the given frames', () => {
    const s = new Smoother(0, 240);
    s.set(1);
    const out: number[] = [];
    for (let i = 0; i < 250; i++) out.push(s.next());
    expect(out[0]).toBeCloseTo(1 / 240, 12);
    expect(out[119]).toBeCloseTo(0.5, 9);
    expect(out[239]).toBe(1);
    expect(out[249]).toBe(1);
  });

  it('retargets mid-move from the current value', () => {
    const s = new Smoother(0, 100);
    s.set(1);
    for (let i = 0; i < 50; i++) s.next();
    expect(s.value).toBeCloseTo(0.5, 9);
    s.set(0);
    const first = s.next();
    expect(first).toBeCloseTo(0.5 - 0.5 / 100, 9);
    for (let i = 0; i < 99; i++) s.next();
    expect(s.value).toBe(0);
  });

  it('does not restart when the same target is set again', () => {
    const s = new Smoother(0, 100);
    s.set(1);
    for (let i = 0; i < 50; i++) s.next();
    s.set(1);
    for (let i = 0; i < 50; i++) s.next();
    expect(s.value).toBe(1);
  });

  it('with zero frames jumps at once', () => {
    const s = new Smoother(0, 0);
    s.set(0.7);
    expect(s.next()).toBe(0.7);
  });
});
