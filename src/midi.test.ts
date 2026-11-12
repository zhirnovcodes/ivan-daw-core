import { describe, expect, it } from 'vitest';
import { allNotesOff, isAllOff, NOTE, noteOff, noteOn, noteToHz, parse } from './midi.js';

describe('message builders', () => {
  it('builds note on, note off and CC 123', () => {
    expect(noteOn(60, 100)).toEqual([0x90, 60, 100]);
    expect(noteOff(60)).toEqual([0x80, 60, 0]);
    expect(allNotesOff()).toEqual([0xb0, 123, 0]);
  });

  it('puts the channel in the low nibble', () => {
    expect(noteOn(64, 1, 3)).toEqual([0x93, 64, 1]);
    expect(noteOff(64, 15)).toEqual([0x8f, 64, 0]);
    expect(allNotesOff(9)).toEqual([0xb9, 123, 0]);
  });

  it('clamps data bytes to 0..127', () => {
    expect(noteOn(200, 300)).toEqual([0x90, 127, 127]);
    expect(noteOn(-5, 64.6)).toEqual([0x90, 0, 65]);
  });
});

describe('parse', () => {
  it('reads note on, note off and CC', () => {
    expect(parse([0x90, 60, 100])).toEqual({ type: 'noteOn', note: 60, vel: 100 });
    expect(parse([0x80, 60, 0])).toEqual({ type: 'noteOff', note: 60, vel: 0 });
    expect(parse([0xb2, 123, 0])).toEqual({ type: 'cc', cc: 123, value: 0 });
  });

  it('treats note on with velocity 0 as note off', () => {
    expect(parse([0x95, 61, 0])).toEqual({ type: 'noteOff', note: 61, vel: 0 });
  });

  it('reports anything else as other', () => {
    expect(parse([0xe0, 0, 64])).toEqual({ type: 'other' });
  });

  it('round-trips the builders', () => {
    expect(parse(noteOn(NOTE.C3, 100)).type).toBe('noteOn');
    expect(parse(noteOff(NOTE.C3)).type).toBe('noteOff');
    expect(parse(allNotesOff())).toEqual({ type: 'cc', cc: 123, value: 0 });
  });
});

describe('isAllOff', () => {
  it('is true for CC 120 and CC 123 only', () => {
    expect(isAllOff(allNotesOff())).toBe(true);
    expect(isAllOff([0xb1, 120, 0])).toBe(true);
    expect(isAllOff([0xb0, 7, 100])).toBe(false);
    expect(isAllOff(noteOff(60))).toBe(false);
  });
});

describe('noteToHz', () => {
  it('maps A4 to 440 Hz and C3 (60) to about 261.6 Hz', () => {
    expect(noteToHz(69)).toBe(440);
    expect(noteToHz(NOTE.C3)).toBeCloseTo(261.626, 3);
    expect(noteToHz(81)).toBeCloseTo(880, 9);
  });

  it('names C3 as MIDI 60 (Ableton)', () => {
    expect(NOTE.C3).toBe(60);
  });
});
