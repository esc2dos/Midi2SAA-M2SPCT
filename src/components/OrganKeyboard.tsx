import React from 'react';

interface KeyDef {
  midiNote: number;
  noteName: string;
  isBlack: boolean;
  pcKey?: string;
}

interface OrganKeyboardProps {
  baseOctave: number; // e.g. 3 (C3..C6)
  activeNotes: Set<number>;
  onNoteDown: (midiNote: number) => void;
  onNoteUp: (midiNote: number) => void;
}

export const OrganKeyboard: React.FC<OrganKeyboardProps> = ({
  baseOctave,
  activeNotes,
  onNoteDown,
  onNoteUp,
}) => {
  // Mapping of PC keyboard keys across 3 octaves
  const pcKeyMap: Record<number, string> = {
    // Octave 0 relative to base
    0: 'Z',
    1: 'S',
    2: 'X',
    3: 'D',
    4: 'C',
    5: 'V',
    6: 'G',
    7: 'B',
    8: 'H',
    9: 'N',
    10: 'J',
    11: 'M',
    // Octave 1
    12: 'Q',
    13: '2',
    14: 'W',
    15: '3',
    16: 'E',
    17: 'R',
    18: '5',
    19: 'T',
    20: '6',
    21: 'Y',
    22: '7',
    23: 'U',
    // Octave 2
    24: 'I',
    25: '9',
    26: 'O',
    27: '0',
    28: 'P',
  };

  const startMidi = baseOctave * 12; // e.g. Octave 3 => 36 (C2) or 48 (C3)
  const totalNotes = 37; // 3 full octaves + high C (e.g. C3 to C6)

  const keys: KeyDef[] = [];
  const semitones = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  for (let i = 0; i < totalNotes; i++) {
    const note = startMidi + i;
    const noteIndex = note % 12;
    const isBlack = [1, 3, 6, 8, 10].includes(noteIndex);
    const octaveNum = Math.floor(note / 12) - 1;
    const name = `${semitones[noteIndex]}${octaveNum}`;
    const pcKey = pcKeyMap[i];

    keys.push({
      midiNote: note,
      noteName: name,
      isBlack,
      pcKey,
    });
  }

  const whiteKeys = keys.filter(k => !k.isBlack);

  return (
    <div className="bg-[#000080] p-4 dos-bevel-in border-2 border-[#555555] font-dos select-none">
      <div className="flex items-center justify-between mb-2 border-b border-[#00aaaa] pb-1">
        <span className="text-yellow-300 font-bold text-sm tracking-wide">
          CREATIVE PIANO KEYBOARD CONSOLE (3 OCTAVES: {whiteKeys[0]?.noteName} - {whiteKeys[whiteKeys.length - 1]?.noteName})
        </span>
        <span className="text-xs text-cyan-200">
          PLAY VIA CONNECTED MIDI CONTROLLER OR MOUSE CLICK
        </span>
      </div>

      {/* Piano Keyboard Container */}
      <div className="relative w-full overflow-x-auto pb-2 pt-1 flex justify-center">
        <div className="relative flex h-48 md:h-52 bg-[#111111] p-1.5 border-4 border-[#333333] shadow-2xl rounded-xs">
          {whiteKeys.map((wKey, index) => {
            const isPressed = activeNotes.has(wKey.midiNote);

            // Find if there is a black key right after this white key
            // Black keys follow C, D, F, G, A
            const noteInOct = wKey.midiNote % 12;
            const hasBlackRight = [0, 2, 5, 7, 9].includes(noteInOct);
            const blackKeyDef = hasBlackRight
              ? keys.find(k => k.midiNote === wKey.midiNote + 1)
              : null;
            const isBlackPressed = blackKeyDef ? activeNotes.has(blackKeyDef.midiNote) : false;

            return (
              <div key={wKey.midiNote} className="relative flex-1 min-w-[32px] md:min-w-[42px] max-w-[52px]">
                {/* White Key */}
                <button
                  type="button"
                  onMouseDown={() => onNoteDown(wKey.midiNote)}
                  onMouseUp={() => onNoteUp(wKey.midiNote)}
                  onMouseLeave={() => {
                    if (isPressed) onNoteUp(wKey.midiNote);
                  }}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    onNoteDown(wKey.midiNote);
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    onNoteUp(wKey.midiNote);
                  }}
                  className={`w-full h-full flex flex-col justify-end items-center pb-2 border border-gray-400 rounded-b-sm transition-transform cursor-pointer ${
                    isPressed
                      ? 'bg-amber-200 shadow-inner translate-y-1'
                      : 'bg-gradient-to-b from-gray-100 via-white to-gray-200 hover:from-white hover:to-gray-100 shadow-md'
                  }`}
                >
                  <span className="text-[10px] text-gray-500 font-bold mb-0.5">
                    {wKey.noteName}
                  </span>
                </button>

                {/* Black Key Overlay */}
                {blackKeyDef && (
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      onNoteDown(blackKeyDef.midiNote);
                    }}
                    onMouseUp={(e) => {
                      e.stopPropagation();
                      onNoteUp(blackKeyDef.midiNote);
                    }}
                    onMouseLeave={(e) => {
                      e.stopPropagation();
                      if (isBlackPressed) onNoteUp(blackKeyDef.midiNote);
                    }}
                    onTouchStart={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      onNoteDown(blackKeyDef.midiNote);
                    }}
                    onTouchEnd={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      onNoteUp(blackKeyDef.midiNote);
                    }}
                    className={`absolute z-10 top-0 left-2/3 -translate-x-1/2 w-7 md:w-8 h-28 md:h-32 flex flex-col justify-end items-center pb-2 rounded-b-sm cursor-pointer shadow-lg transition-transform ${
                      isBlackPressed
                        ? 'bg-amber-500 border-2 border-yellow-300 translate-y-1'
                        : 'bg-gradient-to-b from-gray-800 to-black hover:from-gray-700 hover:to-gray-900 border-x border-b border-gray-900'
                    }`}
                  >
                    <span className="text-[9px] text-gray-400 font-bold mb-0.5">
                      {blackKeyDef.noteName}
                    </span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
