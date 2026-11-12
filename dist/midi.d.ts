export type MidiBytes = [number, number, number];
/** CC 120: All Sound Off. */
export declare const CC_ALL_SOUND_OFF = 120;
/** CC 123: All Notes Off. Sent on Stop, Pause and when a notes cable is removed. */
export declare const CC_ALL_NOTES_OFF = 123;
export declare const noteOn: (note: number, vel: number, ch?: number) => MidiBytes;
export declare const noteOff: (note: number, ch?: number) => MidiBytes;
/** CC 123, All Notes Off. */
export declare const allNotesOff: (ch?: number) => MidiBytes;
export interface ParsedMidi {
    type: 'noteOn' | 'noteOff' | 'cc' | 'other';
    note?: number;
    vel?: number;
    cc?: number;
    value?: number;
}
/** Reads a channel message. A note on with velocity 0 is a note off (MIDI and API rule). */
export declare function parse(bytes: MidiBytes): ParsedMidi;
/** True for CC 120 and CC 123: release every note and drop queued events at or after this time. */
export declare function isAllOff(bytes: MidiBytes): boolean;
/** Equal-tempered frequency of a MIDI note, A4 (69) = 440 Hz. */
export declare const noteToHz: (n: number) => number;
/** Ableton naming: C3 = MIDI 60. */
export declare const NOTE: {
    readonly C3: 60;
};
