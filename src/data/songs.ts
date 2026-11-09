/**
 * Creative Sound Blaster Intelligent Organ - Demo Songs
 * Bundled classics transcribed for OPL2 FM reproduction
 */

export interface SongNote {
  note: number;      // MIDI note number (e.g. 60 = Middle C)
  duration: number;  // Duration in beats (e.g. 0.5 = eighth note, 1 = quarter note)
  chordRoot?: number;// MIDI note of chord root for left hand auto-bass/chord
  chordType?: "maj" | "min" | "7";
}

export interface DemoSong {
  id: string;
  title: string;
  composer: string;
  instrumentId: number;
  rhythmId: number;
  bpm: number;
  notes: SongNote[];
}

export const DEMO_SONGS: DemoSong[] = [
  {
    id: "entertainer",
    title: "The Entertainer",
    composer: "Scott Joplin (1902)",
    instrumentId: 2, // Grand Piano
    rhythmId: 1,     // Rock 1 / Ragtime beat
    bpm: 124,
    notes: [
      // Intro
      { note: 62, duration: 0.25, chordRoot: 48, chordType: "maj" }, // D4
      { note: 63, duration: 0.25 },                                  // D#4
      { note: 64, duration: 0.25 },                                  // E4
      { note: 72, duration: 0.5 },                                   // C5
      { note: 64, duration: 0.25 },                                  // E4
      { note: 72, duration: 0.5 },                                   // C5
      { note: 64, duration: 0.25 },                                  // E4
      { note: 72, duration: 0.75 },                                  // C5
      // Theme A
      { note: 72, duration: 0.25, chordRoot: 48, chordType: "maj" }, // C5
      { note: 74, duration: 0.25 },                                  // D5
      { note: 75, duration: 0.25 },                                  // D#5
      { note: 76, duration: 0.25 },                                  // E5
      { note: 72, duration: 0.25 },                                  // C5
      { note: 74, duration: 0.25 },                                  // D5
      { note: 76, duration: 0.5 },                                   // E5
      { note: 71, duration: 0.25, chordRoot: 43, chordType: "7" },   // B4
      { note: 74, duration: 0.5 },                                   // D5
      { note: 72, duration: 0.75, chordRoot: 48, chordType: "maj" }, // C5
      // Bar 3
      { note: 62, duration: 0.25 },
      { note: 63, duration: 0.25 },
      { note: 64, duration: 0.25 },
      { note: 72, duration: 0.5 },
      { note: 64, duration: 0.25 },
      { note: 72, duration: 0.5 },
      { note: 64, duration: 0.25 },
      { note: 72, duration: 0.75 },
      // Bar 4
      { note: 69, duration: 0.25, chordRoot: 41, chordType: "maj" }, // A4
      { note: 71, duration: 0.25 },                                  // B4
      { note: 72, duration: 0.25 },                                  // C5
      { note: 74, duration: 0.25 },                                  // D5
      { note: 72, duration: 0.25 },                                  // C5
      { note: 69, duration: 0.25 },                                  // A4
      { note: 67, duration: 0.5, chordRoot: 43, chordType: "maj" },  // G4
      { note: 62, duration: 0.25 },                                  // D4
      { note: 64, duration: 0.25 },                                  // E4
      { note: 60, duration: 1.0, chordRoot: 48, chordType: "maj" },  // C4
    ],
  },
  {
    id: "greensleeves",
    title: "Greensleeves",
    composer: "Traditional (16th Century)",
    instrumentId: 1, // Pipe Organ
    rhythmId: 6,     // Waltz 3/4
    bpm: 110,
    notes: [
      { note: 60, duration: 1.0, chordRoot: 45, chordType: "min" },  // C4 (Am)
      { note: 63, duration: 2.0 },                                  // Eb4
      { note: 65, duration: 1.0 },                                  // F4
      { note: 67, duration: 1.5 },                                  // G4
      { note: 68, duration: 0.5 },                                  // Ab4
      { note: 67, duration: 1.0 },                                  // G4
      { note: 65, duration: 2.0, chordRoot: 43, chordType: "maj" },  // F4 (G)
      { note: 60, duration: 1.0 },                                  // C4
      { note: 58, duration: 1.5 },                                  // Bb3
      { note: 60, duration: 0.5 },                                  // C4
      { note: 62, duration: 1.0 },                                  // D4
      { note: 63, duration: 2.0, chordRoot: 45, chordType: "min" },  // Eb4 (Am)
      { note: 60, duration: 1.0 },                                  // C4
      { note: 60, duration: 1.5 },                                  // C4
      { note: 58, duration: 0.5 },                                  // Bb3
      { note: 60, duration: 1.0 },                                  // C4
      { note: 59, duration: 2.0, chordRoot: 40, chordType: "maj" },  // B3 (E)
      { note: 55, duration: 1.0 },                                  // G3
      { note: 59, duration: 3.0 },                                  // B3
    ],
  },
  {
    id: "furelise",
    title: "Für Elise",
    composer: "Ludwig van Beethoven (1810)",
    instrumentId: 7, // Harpsichord / Piano
    rhythmId: 6,     // Waltz 3/4
    bpm: 128,
    notes: [
      { note: 76, duration: 0.5, chordRoot: 45, chordType: "min" }, // E5
      { note: 75, duration: 0.5 },                                  // D#5
      { note: 76, duration: 0.5 },                                  // E5
      { note: 75, duration: 0.5 },                                  // D#5
      { note: 76, duration: 0.5 },                                  // E5
      { note: 71, duration: 0.5 },                                  // B4
      { note: 74, duration: 0.5 },                                  // D5
      { note: 72, duration: 0.5 },                                  // C5
      { note: 69, duration: 1.5, chordRoot: 45, chordType: "min" }, // A4
      { note: 60, duration: 0.5 },                                  // C4
      { note: 64, duration: 0.5 },                                  // E4
      { note: 69, duration: 0.5 },                                  // A4
      { note: 71, duration: 1.5, chordRoot: 40, chordType: "maj" }, // B4 (E)
      { note: 64, duration: 0.5 },                                  // E4
      { note: 68, duration: 0.5 },                                  // G#4
      { note: 71, duration: 0.5 },                                  // B4
      { note: 72, duration: 1.5, chordRoot: 45, chordType: "min" }, // C5 (Am)
      { note: 64, duration: 0.5 },                                  // E4
      { note: 76, duration: 0.5 },                                  // E5
      { note: 75, duration: 0.5 },                                  // D#5
      { note: 76, duration: 0.5 },                                  // E5
      { note: 75, duration: 0.5 },                                  // D#5
      { note: 76, duration: 0.5 },                                  // E5
      { note: 71, duration: 0.5 },                                  // B4
      { note: 74, duration: 0.5 },                                  // D5
      { note: 72, duration: 0.5 },                                  // C5
      { note: 69, duration: 2.0, chordRoot: 45, chordType: "min" }, // A4
    ],
  },
  {
    id: "bachminuet",
    title: "Minuet in G",
    composer: "J.S. Bach / Christian Petzold (1725)",
    instrumentId: 3, // Jazz Organ
    rhythmId: 6,     // Waltz 3/4
    bpm: 120,
    notes: [
      { note: 74, duration: 1.0, chordRoot: 43, chordType: "maj" }, // D5 (G)
      { note: 67, duration: 0.5 },                                  // G4
      { note: 69, duration: 0.5 },                                  // A4
      { note: 71, duration: 0.5 },                                  // B4
      { note: 72, duration: 0.5 },                                  // C5
      { note: 74, duration: 1.0 },                                  // D5
      { note: 67, duration: 1.0 },                                  // G4
      { note: 67, duration: 1.0 },                                  // G4
      { note: 76, duration: 1.0, chordRoot: 48, chordType: "maj" }, // E5 (C)
      { note: 72, duration: 0.5 },                                  // C5
      { note: 74, duration: 0.5 },                                  // D5
      { note: 76, duration: 0.5 },                                  // E5
      { note: 77, duration: 0.5 },                                  // F#5
      { note: 79, duration: 1.0 },                                  // G5
      { note: 67, duration: 1.0 },                                  // G4
      { note: 67, duration: 1.0 },                                  // G4
      { note: 72, duration: 1.0, chordRoot: 48, chordType: "maj" }, // C5
      { note: 74, duration: 0.5 },                                  // D5
      { note: 72, duration: 0.5 },                                  // C5
      { note: 71, duration: 0.5 },                                  // B4
      { note: 69, duration: 0.5 },                                  // A4
      { note: 71, duration: 1.0, chordRoot: 43, chordType: "maj" }, // B4 (G)
      { note: 72, duration: 0.5 },                                  // C5
      { note: 71, duration: 0.5 },                                  // B4
      { note: 69, duration: 0.5 },                                  // A4
      { note: 67, duration: 0.5 },                                  // G4
      { note: 66, duration: 1.0, chordRoot: 43, chordType: "7" },   // F#4 (D7)
      { note: 67, duration: 0.5 },                                  // G4
      { note: 69, duration: 0.5 },                                  // A4
      { note: 67, duration: 2.0, chordRoot: 43, chordType: "maj" }, // G4
    ],
  },
  {
    id: "popcorn",
    title: "Popcorn",
    composer: "Gershon Kingsley (1969)",
    instrumentId: 12, // Synth Lead
    rhythmId: 5,      // Disco 4/4
    bpm: 136,
    notes: [
      { note: 74, duration: 0.5, chordRoot: 45, chordType: "min" }, // D5
      { note: 72, duration: 0.5 },                                  // C5
      { note: 74, duration: 0.5 },                                  // D5
      { note: 69, duration: 0.5 },                                  // A4
      { note: 65, duration: 0.5 },                                  // F4
      { note: 69, duration: 0.5 },                                  // A4
      { note: 62, duration: 1.0 },                                  // D4
      { note: 74, duration: 0.5, chordRoot: 45, chordType: "min" }, // D5
      { note: 72, duration: 0.5 },                                  // C5
      { note: 74, duration: 0.5 },                                  // D5
      { note: 69, duration: 0.5 },                                  // A4
      { note: 65, duration: 0.5 },                                  // F4
      { note: 69, duration: 0.5 },                                  // A4
      { note: 62, duration: 1.0 },                                  // D4
      // Variation
      { note: 74, duration: 0.5, chordRoot: 48, chordType: "maj" }, // D5
      { note: 76, duration: 0.5 },                                  // E5
      { note: 77, duration: 0.5 },                                  // F5
      { note: 76, duration: 0.5 },                                  // E5
      { note: 77, duration: 0.5 },                                  // F5
      { note: 74, duration: 0.5 },                                  // D5
      { note: 76, duration: 0.5 },                                  // E5
      { note: 72, duration: 0.5 },                                  // C5
      { note: 74, duration: 0.5, chordRoot: 45, chordType: "min" }, // D5
      { note: 72, duration: 0.5 },                                  // C5
      { note: 74, duration: 0.5 },                                  // D5
      { note: 69, duration: 0.5 },                                  // A4
      { note: 62, duration: 1.5 },                                  // D4
    ],
  },
  {
    id: "ode_to_joy",
    title: "Ode to Joy",
    composer: "Ludwig van Beethoven (1824)",
    instrumentId: 5, // Brass Ensemble
    rhythmId: 10,    // March 4/4
    bpm: 118,
    notes: [
      { note: 64, duration: 1.0, chordRoot: 48, chordType: "maj" }, // E4 (C)
      { note: 64, duration: 1.0 },                                  // E4
      { note: 65, duration: 1.0 },                                  // F4
      { note: 67, duration: 1.0 },                                  // G4
      { note: 67, duration: 1.0, chordRoot: 43, chordType: "maj" }, // G4 (G)
      { note: 65, duration: 1.0 },                                  // F4
      { note: 64, duration: 1.0 },                                  // E4
      { note: 62, duration: 1.0 },                                  // D4
      { note: 60, duration: 1.0, chordRoot: 48, chordType: "maj" }, // C4 (C)
      { note: 60, duration: 1.0 },                                  // C4
      { note: 62, duration: 1.0 },                                  // D4
      { note: 64, duration: 1.0 },                                  // E4
      { note: 64, duration: 1.5, chordRoot: 43, chordType: "maj" }, // E4 (G)
      { note: 62, duration: 0.5 },                                  // D4
      { note: 62, duration: 2.0 },                                  // D4
    ],
  },
];
