export const README_MD_CONTENT = `# Midi2SAA & M2SPCT

### Dual Philips SAA1099 Gameport MIDI Synthesizer & Preset Creation Tool
**Target Platform:** Sound Blaster 2.0 / 1.5 / 1.0 (CT1350B, CT1320A) & Creative Game Blaster (C/MS)  
**Host Architecture:** AMD Am386DX-40 / Intel 386DX / 486 / Pentium (MS-DOS 3.3 to 6.22 / FreeDOS)  
**Compilers:** Borland C++ 3.1 / Turbo C 2.0 & 3.0 (Strict C89, 0 errors, 0 warnings)

---

## Overview

**Midi2SAA** is a real-time interrupt-driven MIDI synthesizer for MS-DOS that breathes new life into the **Dual Philips SAA1099** sound chips on classic Creative Sound Blaster cards and Creative Music System (C/MS · Game Blaster) hardware.

Born from reverse-engineering Creative Labs' original **\`ORGAN.EXE v2.02\` (1988–1990)**, Midi2SAA strips away the metronome and noisy accompaniment rhythms to deliver pure, 12-voice stereo synthesis directly controllable from an external MIDI keyboard or modern digital audio workstations like **Steinberg Cubase 14**.

Accompanying the synthesizer is **M2SPCT** (*Midi2Saa Preset Creation Tool*), a full-screen interactive MS-DOS sound designer that lets you sculpt preset instruments in real-time, test them on your MIDI keyboard, rename them, toggle monophonic/polyphonic voice allocation, and save them to \`M2SPRE.CFG\`.

---

## Key Features

* **12 Stereo SAA1099 Voices**: 6 voices on Chip #0 (Left/Primary) and 6 voices on Chip #1 (Right/Detune/Layer).
* **Mathematically Exact Hardware Tuning**: Formulated around the authentic Philips SAA1099 counter table ($f = \\frac{f_{\\text{clk}} \\cdot 2^{\\text{oct}}}{512 \\cdot (511 - N)}$). Middle C (C-4, MIDI Note 60) outputs true **261.97 Hz**; Concert A (A-4, MIDI Note 69) outputs true **440.40 Hz**.
* **Steinberg Cubase 14 Automation**: Supports MIDI Program Change (\`0xC0\`, Programs 1–12 / 0–11) to switch presets in real time during sequence playback, with live on-screen status feedback (\`CUBASE PROG: F1..F12\`).
* **Polyphonic & Monophonic Modes**:
  * **Polyphonic (12-Voice)**: Full two-handed chords across both chips for pianos, organs, and string ensembles.
  * **Monophonic (Solo Lead / Bass)**: Dedicates Voice 0 (and Voice 6 for chorus/layer), silencing other channels and maintaining a **hardware legato note stack** so rapid trills and releases return to the previous held note cleanly.
* **Live Interactive Preset Renaming**: Select Parameter 1 (Name) in \`M2SPCT\` and press **\`[ENTER]\`** to type custom instrument names directly in DOS text mode.
* **Full Real-Time Performance Controllers**:
  * **Pitch Bend Wheel (\`0xE0\`)**: Smooth $\\pm 2.000$ semitone whole-note bend with fractional divisor interpolation.
  * **Modulation Wheel (\`0xB0 0x01\`)**: Real-time vibrato LFO depth.
  * **Sustain Envelope Adjusters**: Real-time \`+\` and \`-\` keys adjust release tails on the fly.
  * **Emergency Panic Button (\`[TAB]\`)**: Instantly silences all 12 voices and flushes the MIDI FIFO.
* **Dual-Chip Analog Enrichment**:
  * **Stereo Octave Splits**: Left and Right channels can be transposed independently (e.g. Left: 0, Right: +1 for rich pipe organ and harpsichord harmonics).
  * **Detune Chorusing**: Activates twin oscillators with a $+2$ frequency offset, creating analog beating at 1.5–3.0 Hz.
  * **Octave Up Harmonic Layering**: Second voice layers $+12$ semitones higher to supply the even harmonics missing in square waves.
* **Zero Background Noise**: Rhythm patterns, metronomes, and DSP noise completely eliminated; mixer initialized to maximum output.

---

## Hardware Requirements

| Component | Specification |
| :--- | :--- |
| **CPU** | 386DX-40, 486, or Pentium (Runs on 286 or higher) |
| **Operating System** | MS-DOS 3.3, 5.0, 6.22, or FreeDOS (Real Mode) |
| **Sound Card** | Sound Blaster 1.0, 1.5, or 2.0 (CT1350B / CT1320A) with C/MS upgrade chips installed (two Philips SAA1099P chips in sockets U13/U14 and PAL/GAL CT1336/CMS), or original Creative Game Blaster / C/MS standalone card |
| **Card I/O Ports** | Base: \`0x220\` (or \`0x240\`), IRQ: \`5\` or \`7\` |
| **MIDI Input** | 15-pin Gameport MIDI adapter cable (Sound Blaster Gameport $\\rightarrow$ 5-pin DIN MIDI IN) |

---

## Repository Structure

\`\`\`text
Midi2SAA/
├── README.md             # This documentation
├── DOS/
│   ├── MIDI2SAA.C        # Synthesizer performance engine source (C89)
│   ├── M2SPCT.C          # Preset Creation Tool interactive editor source (C89)
│   ├── MIDI2SAA.COM      # Precompiled ready-to-run 16-bit executable
│   ├── M2SPCT.COM        # Precompiled preset designer executable
│   ├── M2SPRE.CFG        # 12-instrument factory preset bank
│   ├── SAA1099.H         # SAA1099 hardware register definitions & macros
│   ├── BUILD.BAT         # Batch build script for Borland C++ 3.1 & Turbo C
│   └── PINOUT.TXT        # Sound Blaster 15-pin Gameport to MIDI wiring diagram
└── WEB/                  # Optional web-based SAA1099 audio emulator & UI
\`\`\`

---

## Compiling for MS-DOS

Both \`MIDI2SAA.C\` and \`M2SPCT.C\` are written in clean **C89 Standard C**, tested with **zero errors and zero warnings** on:
* **Borland C++ 3.1**
* **Turbo C 2.0 / 3.0**

### Using \`BUILD.BAT\`
In DOS or DOSBox, navigate to the folder and run:
\`\`\`bat
BUILD.BAT
\`\`\`

### Manual Command Line Compilation

**Using Borland C++ 3.1 (\`bcc\`):**
\`\`\`bat
bcc -mc -O2 -3 -w- midi2saa.c
bcc -mc -O2 -3 -w- m2spct.c
\`\`\`

**Using Turbo C (\`tcc\`):**
\`\`\`bat
tcc -mc -O2 -3 -w- midi2saa.c
tcc -mc -O2 -3 -w- m2spct.c
\`\`\`
*Compiler Flags:*
* \`-mc\`: Compact memory model (Far data, Near code)
* \`-O2\`: Optimize for speed
* \`-3\`: 386 instruction set optimization
* \`-w-\`: Suppress informational compiler warnings

---

## Quick Start / Running the Programs

### 1. Launching the Synthesizer (\`MIDI2SAA.EXE\` / \`MIDI2SAA.COM\`)
Ensure your \`BLASTER\` environment variable is set (e.g., \`SET BLASTER=A220 I5 D1 T3\`), then run:
\`\`\`bat
MIDI2SAA
\`\`\`
Or force specific hardware ports manually:
\`\`\`bat
MIDI2SAA 220 5
\`\`\`
*(Base port \`0x220\`, IRQ \`5\`)*

#### Controls in \`MIDI2SAA\`:
* **\`F1\` – \`F12\`**: Instantly switch between preset instruments 1 through 12.
* **\`+\` / \`-\`**: Increase or decrease release sustain decay tail length in real time.
* **\`L\`**: Reload \`M2SPRE.CFG\` from disk without quitting.
* **\`S\`**: Save current preset tweaks to \`M2SPRE.CFG\`.
* **\`[TAB]\`**: **Panic** — immediately silences all 12 voices.
* **\`[ESC]\`**: Exit cleanly to DOS (restores interrupt vectors and unmasks PIC).

---

### 2. Designing Sounds with \`M2SPCT\`
To customize, rename, and build your own SAA1099 presets:
\`\`\`bat
M2SPCT
\`\`\`

#### Controls in \`M2SPCT\`:
* **\`↑\` / \`↓\`**: Navigate between the 11 sound parameters.
* **\`←\` / \`→\`**: Adjust the selected parameter's value.
* **\`[ENTER]\`**: 
  * On **Parameter 1 (Name)**: Opens inline text editing. Type up to 17 characters and press \`[ENTER]\` to save.
  * On **Parameter 8 (Voice Mode)**: Toggles between **Polyphonic (12 Voices)** and **Monophonic (Solo Lead/Bass)**.
* **\`F1\` – \`F12\`**: Switch between preset slots 1 through 12.
* **\`S\`**: Save all 12 presets to \`M2SPRE.CFG\`.
* **\`L\`**: Reload presets from \`M2SPRE.CFG\`.
* **\`R\`**: Reset current preset slot to factory defaults.
* **\`[TAB]\`**: Silence stuck notes (Panic).
* **\`[ESC]\`**: Exit to DOS.

---

## Preset File Format (\`M2SPRE.CFG\`)

\`M2SPRE.CFG\` uses a clean 12-column whitespace-delimited format:
\`\`\`text
# =============================================================================
# M2SPRE.CFG - Midi2Saa & M2SPCT Preset Configuration File
# Sound Blaster 2.0 / C/MS Dual Philips SAA1099 Synthesizer
# Format: Slot "Name" VolL VolR OctL OctR Chorus LayerUp IsMono SusLvl Decay RelTail
# =============================================================================
01 "01: BRIGHT PIANO " 15 15  0  0  1  1  0  10   80 16
02 "02: HONKY-TONK    " 14 14  0  0  1  0  0   9   70 18
03 "03: HARPSICHORD   " 15 12  0  1  0  1  0   3   40 12
04 "04: C/MS ORGAN    " 15 15  0  0  1  0  0  15    0 14
05 "05: BRASS FANFARE " 15 15  0  0  1  1  0  13  180 15
06 "06: PIPE FLUTE    " 12 12  1  1  0  0  0  11    0 15
07 "07: CLARINET      " 13 13  0  0  0  0  0  12    0 12
08 "08: REED ACCORDION" 14 14  0  1  1  0  0  14    0 12
09 "09: VIOLIN ENSEMBLE"12 15  0  1  1  0  0  14    0 22
10 "10: 8-BIT SYNTH   " 14 15  0 -1  1  0  0  13  200 15
11 "11: MUSIC BOX     " 13 13  1  2  0  0  0   1  100 25
12 "12: SLAP BASS     " 15 11 -1 -1  0  0  1   2   30 10
\`\`\`

### Parameter Reference:
1. **Slot**: \`01\` to \`12\` (mapped to function keys F1 to F12).
2. **Name**: Up to 17 ASCII characters enclosed in double quotes.
3. **VolL**: Left amplitude (\`0\` to \`15\`, 4-bit SAA1099 logarithmic attenuation).
4. **VolR**: Right amplitude (\`0\` to \`15\`, 4-bit SAA1099 logarithmic attenuation).
5. **OctL**: Left octave transpose (\`-2\` to \`+2\`, Chip 0).
6. **OctR**: Right octave transpose (\`-2\` to \`+2\`, Chip 1). Allows independent stereo octave splits.
7. **Chorus**: Detune chorus on Chip 1 (\`0\` = Off, \`1\` = On).
8. **LayerUp**: Layer $+1$ octave higher on Chip 1 (\`0\` = Off, \`1\` = On).
9. **IsMono**: Voice allocation mode (\`0\` = 12-Voice Polyphonic, \`1\` = Monophonic Solo Lead/Bass).
10. **SusLvl**: Held sustain volume (\`0\` to \`15\`).
11. **Decay**: Active percussive decay speed (\`0\` = Infinite/Organ, \`1\`..\`255\` = Percussive drop rate).
12. **RelTail**: Software envelope release tail ticks (\`1\` to \`60\`, $16 \\approx 240\\text{ms}$).

---

## Cubase 14 Automation Guide

You can fully sequence and automate preset changes from **Steinberg Cubase 14** (or any modern DAW connected via USB-MIDI to the Sound Blaster Gameport):

1. **Routing in Cubase**:
   * Create a MIDI track and set the **MIDI Output** to the hardware MIDI interface connected to your Sound Blaster Gameport adapter.
   * Set the track's **MIDI Channel** to \`1\` (or your preferred channel).
2. **Automating Preset Changes**:
   * **In the Track Inspector**: Select the **Program** field and enter a value from **\`1\` to \`12\`** (which transmits standard MIDI Program Change \`0xC0 [0..11]\`).
   * **In the Key Editor / List Editor**: Open the Controller lane at the bottom, select **Program Change**, and insert events:
     * Value \`0\` (or \`1\`) $\\rightarrow$ Selects **Preset 1 (F1)**
     * Value \`1\` (or \`2\`) $\\rightarrow$ Selects **Preset 2 (F2)**
     * ...
     * Value \`11\` (or \`12\`) $\\rightarrow$ Selects **Preset 12 (F12)**
3. **On-Screen Confirmation**:
   * As Cubase plays your song, \`MIDI2SAA\` will update the bottom status line:
     \`\`\`text
     CUBASE PROG: F1  (or F1..F12)
     \`\`\`
   * If \`M2SPCT\` is open, it switches the active preset slot in real time.

---

## Sound Blaster Gameport MIDI Cable Pinout

Standard 15-pin Male DA-15 connector on the Sound Blaster card to 5-pin DIN female MIDI connectors:

\`\`\`text
Sound Blaster DB-15 (Male)               5-Pin DIN (Female MIDI)
===================================================================
Pin 4  (GND)        -------------------> Pin 2 (Shield / Ground)
Pin 8  (+5V DC)     ---[ 220 Ohm ]-----> Pin 4 (Current Source)
Pin 12 (MIDI TX)    ---[ 220 Ohm ]-----> Pin 5 (Data - MIDI OUT)
Pin 15 (MIDI RX)    -------------------> Pin 5 (Data - MIDI IN optocoupler)
Pin 1  (+5V DC)     ---[ 220 Ohm ]-----> Pin 4 (MIDI IN optocoupler VCC)
Pin 5  (GND)        -------------------> Pin 2 (MIDI IN GND)
\`\`\`
*Note: Use standard 220-ohm current-limiting resistors on pins 4 and 5 of the DIN connectors as required by the MIDI 1.0 hardware specification.*

---

## Technical Architecture & C/MS Registers

The Sound Blaster 2.0 hosts two Philips SAA1099 sound generators:
* **Chip 0 (Voices 0–5)**: Base port \`0x220\` (Data), \`0x221\` (Address/Register).
* **Chip 1 (Voices 6–11)**: Base port \`0x222\` (Data), \`0x223\` (Address/Register).
* **CT1335 Mixer**: Address port \`0x224\`, Data port \`0x225\`. Unmuted to \`0x0E\` on startup.
* **Sound Blaster DSP**: Reset \`0x226\`, Read \`0x22A\`, Write \`0x22C\`, Buffer Status \`0x22E\`.

Midi2SAA sends DSP Command **\`0x31\`** (*MIDI Read with Interrupt*), unmasks the 8259 Programmable Interrupt Controller (PIC) for IRQ 5/7, and feeds incoming MIDI bytes into an asynchronous circular FIFO buffer.

---

## License & Acknowledgments

* Dedicated to the vintage PC audio and retro-gaming community, the VOGONS community, and fans of the Creative Music System (C/MS · Game Blaster).
* Reverse-engineered and inspired by Creative Technology's \`ORGAN.EXE v2.02\` (1988–1990).
* Distributed under the **MIT License**. Free for personal, musical, and educational retro-computing use!
`;
