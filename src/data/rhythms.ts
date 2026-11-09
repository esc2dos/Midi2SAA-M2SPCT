/**
 * Creative Sound Blaster Intelligent Organ - Auto-Accompaniment Rhythms
 * Modeled after home organ / Sound Blaster FM rhythm section
 */

export interface DrumStep {
  bd?: boolean; // Bass Drum
  sd?: boolean; // Snare Drum
  hh?: boolean; // Closed Hi-Hat
  oh?: boolean; // Open Hi-Hat
  tom?: boolean;// Tom-Tom
  cym?: boolean;// Cymbal
}

export interface RhythmStyle {
  id: number;
  name: string;
  category: string;
  bpm: number;
  timeSignature: "4/4" | "3/4";
  steps: number; // 16 for 4/4, 12 for 3/4
  drums: DrumStep[];
  // Bass pattern: note offset from chord root, e.g. 0 (root), 7 (fifth), 12 (octave), null (rest)
  bassPattern: (number | null)[];
  // Chord stab pattern: boolean whether chord accompaniment sounds on this step
  chordPattern: boolean[];
}

export const RHYTHM_STYLES: RhythmStyle[] = [
  {
    id: 1,
    name: "01: ROCK 1",
    category: "Rock",
    bpm: 120,
    timeSignature: "4/4",
    steps: 16,
    drums: [
      { bd: true, hh: true }, // 1
      { hh: true },           // e
      { sd: true, hh: true }, // 2
      { hh: true },           // &
      { bd: true, hh: true }, // 3
      { bd: true, hh: true }, // a
      { sd: true, hh: true }, // 4
      { hh: true },           // &
      { bd: true, hh: true }, // 1
      { hh: true },           // e
      { sd: true, hh: true }, // 2
      { hh: true },           // &
      { bd: true, hh: true }, // 3
      { hh: true },           // a
      { sd: true, hh: true, tom: true }, // 4
      { oh: true },           // &
    ],
    bassPattern: [0, null, null, null, 7, null, 0, null, 0, null, null, null, 7, null, 12, null],
    chordPattern: [false, false, true, false, false, false, true, false, false, false, true, false, false, false, true, false],
  },
  {
    id: 2,
    name: "02: ROCK 2",
    category: "Rock",
    bpm: 128,
    timeSignature: "4/4",
    steps: 16,
    drums: [
      { bd: true, hh: true },
      { hh: true },
      { sd: true, hh: true },
      { bd: true, hh: true },
      { bd: true, hh: true },
      { hh: true },
      { sd: true, hh: true },
      { hh: true },
      { bd: true, hh: true },
      { hh: true },
      { sd: true, hh: true },
      { bd: true, hh: true },
      { bd: true, hh: true },
      { hh: true },
      { sd: true, hh: true },
      { oh: true },
    ],
    bassPattern: [0, null, 0, null, 7, null, 7, null, 0, null, 0, null, 12, null, 7, null],
    chordPattern: [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false],
  },
  {
    id: 3,
    name: "03: 8-BEAT",
    category: "Pop",
    bpm: 112,
    timeSignature: "4/4",
    steps: 16,
    drums: [
      { bd: true, hh: true },
      { hh: true },
      { sd: true, hh: true },
      { hh: true },
      { bd: true, hh: true },
      { hh: true },
      { sd: true, hh: true },
      { hh: true },
      { bd: true, hh: true },
      { hh: true },
      { sd: true, hh: true },
      { hh: true },
      { bd: true, hh: true },
      { hh: true },
      { sd: true, hh: true },
      { oh: true },
    ],
    bassPattern: [0, null, null, null, 0, null, null, null, 7, null, null, null, 7, null, null, null],
    chordPattern: [false, false, true, false, false, false, true, false, false, false, true, false, false, false, true, false],
  },
  {
    id: 4,
    name: "04: 16-BEAT",
    category: "Pop",
    bpm: 96,
    timeSignature: "4/4",
    steps: 16,
    drums: [
      { bd: true, hh: true },
      { hh: true },
      { hh: true },
      { hh: true },
      { sd: true, hh: true },
      { hh: true },
      { bd: true, hh: true },
      { hh: true },
      { bd: true, hh: true },
      { hh: true },
      { hh: true },
      { hh: true },
      { sd: true, hh: true },
      { hh: true },
      { hh: true },
      { oh: true },
    ],
    bassPattern: [0, null, 0, null, null, null, 7, null, 0, null, null, 12, null, null, 7, null],
    chordPattern: [true, false, false, true, false, false, true, false, true, false, false, true, false, false, true, false],
  },
  {
    id: 5,
    name: "05: DISCO",
    category: "Dance",
    bpm: 124,
    timeSignature: "4/4",
    steps: 16,
    drums: [
      { bd: true, hh: true },
      { oh: true },
      { bd: true, sd: true, hh: true },
      { oh: true },
      { bd: true, hh: true },
      { oh: true },
      { bd: true, sd: true, hh: true },
      { oh: true },
      { bd: true, hh: true },
      { oh: true },
      { bd: true, sd: true, hh: true },
      { oh: true },
      { bd: true, hh: true },
      { oh: true },
      { bd: true, sd: true, hh: true },
      { oh: true },
    ],
    bassPattern: [0, 12, 0, 12, 0, 12, 0, 12, 7, 19, 7, 19, 7, 19, 7, 19],
    chordPattern: [false, true, false, true, false, true, false, true, false, true, false, true, false, true, false, true],
  },
  {
    id: 6,
    name: "06: WALTZ",
    category: "Traditional",
    bpm: 135,
    timeSignature: "3/4",
    steps: 12, // 3 beats * 4 steps
    drums: [
      { bd: true, cym: true }, // Beat 1: Oom
      {},
      {},
      {},
      { sd: true, hh: true },  // Beat 2: Pah
      {},
      {},
      {},
      { sd: true, hh: true },  // Beat 3: Pah
      {},
      {},
      {},
    ],
    bassPattern: [0, null, null, null, null, null, null, null, null, null, null, null],
    chordPattern: [false, false, false, false, true, false, false, false, true, false, false, false],
  },
  {
    id: 7,
    name: "07: RHUMBA",
    category: "Latin",
    bpm: 104,
    timeSignature: "4/4",
    steps: 16,
    drums: [
      { bd: true, hh: true },
      {},
      { hh: true },
      { sd: true },
      { hh: true },
      {},
      { bd: true, sd: true },
      { hh: true },
      { bd: true },
      {},
      { sd: true, hh: true },
      {},
      { bd: true },
      { hh: true },
      { sd: true },
      { oh: true },
    ],
    bassPattern: [0, null, null, 7, null, null, 0, null, null, null, 7, null, 0, null, 7, null],
    chordPattern: [true, false, false, true, false, false, true, false, false, false, true, false, true, false, false, false],
  },
  {
    id: 8,
    name: "08: TANGO",
    category: "Latin",
    bpm: 116,
    timeSignature: "4/4",
    steps: 16,
    drums: [
      { bd: true, cym: true },
      {},
      {},
      {},
      { sd: true, hh: true },
      {},
      {},
      {},
      { bd: true, sd: true },
      {},
      { sd: true },
      {},
      { sd: true, cym: true },
      {},
      {},
      {},
    ],
    bassPattern: [0, null, null, null, 0, null, null, null, 7, null, 7, null, 0, null, null, null],
    chordPattern: [true, false, false, false, true, false, false, false, false, false, true, false, true, false, false, false],
  },
  {
    id: 9,
    name: "09: BOSSA NOVA",
    category: "Latin",
    bpm: 120,
    timeSignature: "4/4",
    steps: 16,
    drums: [
      { bd: true, hh: true },
      { hh: true },
      { sd: true, hh: true },
      { hh: true },
      { bd: true, hh: true },
      { sd: true, hh: true },
      { hh: true },
      { hh: true },
      { bd: true, hh: true },
      { sd: true, hh: true },
      { hh: true },
      { sd: true, hh: true },
      { bd: true, hh: true },
      { hh: true },
      { sd: true, hh: true },
      { oh: true },
    ],
    bassPattern: [0, null, null, null, 7, null, null, null, 0, null, null, null, 7, null, null, null],
    chordPattern: [true, false, false, true, false, true, false, false, false, true, false, true, false, false, true, false],
  },
  {
    id: 10,
    name: "10: MARCH",
    category: "Traditional",
    bpm: 116,
    timeSignature: "4/4",
    steps: 16,
    drums: [
      { bd: true, cym: true },
      { sd: true },
      { sd: true },
      { sd: true },
      { sd: true, hh: true },
      { sd: true },
      { sd: true },
      { sd: true },
      { bd: true, cym: true },
      { sd: true },
      { sd: true },
      { sd: true },
      { sd: true, hh: true },
      { sd: true },
      { tom: true },
      { sd: true },
    ],
    bassPattern: [0, null, null, null, 7, null, null, null, 0, null, null, null, 7, null, null, null],
    chordPattern: [false, false, true, false, false, false, true, false, false, false, true, false, false, false, true, false],
  },
  {
    id: 11,
    name: "11: SLOW BALLAD",
    category: "Pop",
    bpm: 78,
    timeSignature: "4/4",
    steps: 16,
    drums: [
      { bd: true, hh: true },
      {},
      { hh: true },
      {},
      { sd: true, hh: true },
      {},
      { hh: true },
      {},
      { bd: true, hh: true },
      { bd: true },
      { hh: true },
      {},
      { sd: true, hh: true },
      {},
      { hh: true },
      { oh: true },
    ],
    bassPattern: [0, null, null, null, null, null, null, null, 7, null, null, null, null, null, null, null],
    chordPattern: [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false],
  },
  {
    id: 12,
    name: "12: SWING JAZZ",
    category: "Jazz",
    bpm: 132,
    timeSignature: "4/4",
    steps: 16,
    drums: [
      { bd: true, cym: true },
      {},
      { hh: true },
      { hh: true },
      { sd: true, hh: true },
      {},
      { hh: true },
      { hh: true },
      { bd: true, cym: true },
      {},
      { hh: true },
      { hh: true },
      { sd: true, hh: true },
      {},
      { tom: true },
      { oh: true },
    ],
    bassPattern: [0, null, 4, null, 7, null, 9, null, 0, null, 4, null, 7, null, 11, null],
    chordPattern: [false, false, true, false, false, false, true, false, false, false, true, false, false, false, true, false],
  },
];
