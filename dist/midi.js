// MIDI helpers for 3-byte channel messages. Channels are 0..15.
const NOTE_ON = 0x90;
const NOTE_OFF = 0x80;
const CONTROL_CHANGE = 0xb0;
/** CC 120: All Sound Off. */
export const CC_ALL_SOUND_OFF = 120;
/** CC 123: All Notes Off. Sent on Stop, Pause and when a notes cable is removed. */
export const CC_ALL_NOTES_OFF = 123;
const status = (type, ch) => type | (ch & 0x0f);
const data = (v) => Math.max(0, Math.min(127, Math.round(v)));
export const noteOn = (note, vel, ch = 0) => [
    status(NOTE_ON, ch),
    data(note),
    data(vel),
];
export const noteOff = (note, ch = 0) => [status(NOTE_OFF, ch), data(note), 0];
/** CC 123, All Notes Off. */
export const allNotesOff = (ch = 0) => [status(CONTROL_CHANGE, ch), CC_ALL_NOTES_OFF, 0];
/** Reads a channel message. A note on with velocity 0 is a note off (MIDI and API rule). */
export function parse(bytes) {
    const [s, d1, d2] = bytes;
    const type = s & 0xf0;
    if (type === NOTE_ON && d2 > 0)
        return { type: 'noteOn', note: d1, vel: d2 };
    if (type === NOTE_ON || type === NOTE_OFF)
        return { type: 'noteOff', note: d1, vel: 0 };
    if (type === CONTROL_CHANGE)
        return { type: 'cc', cc: d1, value: d2 };
    return { type: 'other' };
}
/** True for CC 120 and CC 123: release every note and drop queued events at or after this time. */
export function isAllOff(bytes) {
    const m = parse(bytes);
    return m.type === 'cc' && (m.cc === CC_ALL_NOTES_OFF || m.cc === CC_ALL_SOUND_OFF);
}
/** Equal-tempered frequency of a MIDI note, A4 (69) = 440 Hz. */
export const noteToHz = (n) => 440 * 2 ** ((n - 69) / 12);
/** Ableton naming: C3 = MIDI 60. */
export const NOTE = { C3: 60 };
