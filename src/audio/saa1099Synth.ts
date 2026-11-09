/**
 * Creative Music System (C/MS) / Game Blaster - Dual Philips SAA1099 Sound Generator
 * Authentic emulation of the 2x SAA1099 sound processor found on the C/MS and Sound Blaster 1.0 (CT1320A).
 * 12 independent stereo square-wave voices, zero background noise/rhythm, full MIDI support.
 */

export interface SAAChannelMeter {
  voice: number; // 0..11
  chip: 0 | 1;
  active: boolean;
  level: number; // 0..1
  noteName: string;
}

export interface CMSPatch {
  id: number;
  name: string;
  category: string;
  description: string;
  envelope: 'piano' | 'organ' | 'percussive' | 'pluck' | 'soft' | 'chime';
  octaveOffset: number; // 0, 1, -1 (default or left)
  octaveLeft?: number; // independent octave for Left channel (Chip 0)
  octaveRight?: number; // independent octave for Right channel (Chip 1)
  detuneChorusing: boolean; // uses second SAA1099 channel slightly detuned for thickness
  layerOctaveUp?: boolean; // second voice plays 1 octave up (+12 st) to produce full even+odd harmonics
  isMono?: boolean; // false = Polyphonic (12-voice stereo), true = Monophonic (Solo lead/bass)
  attackTime: number; // in seconds
  decayTime: number; // active decay time while key held to reach sustain level
  sustainLevel: number; // 0.0 to 1.0 (held volume ratio)
  releaseTime: number; // release sustain tail time in seconds (e.g. 0.24s matching brpiano c1)
  stereoSpread: number; // 0 to 1
  filterWarmth?: boolean; // gentle analog filter to tame harsh highs
}

export const CMS_INSTRUMENTS: CMSPatch[] = [
  // Group 1: Pianos & Keyboards (F1 to F4)
  {
    id: 1,
    name: "01: BRIGHT PIANO",
    category: "Pianos",
    description: "Authentic Creative ORGAN.EXE Bright Piano (brpiano): percussive attack, dual-voice octave layering, and 240ms release sustain tail",
    envelope: "piano",
    octaveOffset: 0,
    octaveLeft: 0,
    octaveRight: 0,
    detuneChorusing: true,
    layerOctaveUp: true,
    attackTime: 0.006,
    decayTime: 0.85,
    sustainLevel: 0.65,
    releaseTime: 0.24,
    stereoSpread: 0.65,
  },
  {
    id: 2,
    name: "02: HONKY-TONK PIANO",
    category: "Pianos",
    description: "Detuned dual-voice tavern upright piano with percussive attack, rich beating, and 260ms release sustain",
    envelope: "piano",
    octaveOffset: 0,
    octaveLeft: 0,
    octaveRight: 0,
    detuneChorusing: true,
    layerOctaveUp: false,
    attackTime: 0.006,
    decayTime: 0.90,
    sustainLevel: 0.60,
    releaseTime: 0.26,
    stereoSpread: 0.7,
  },
  {
    id: 3,
    name: "03: HARPSICHORD",
    category: "Keyboards",
    description: "Crisp baroque plucked harpsichord with stereo octave registers (L:0 R:+1) and 160ms release tail",
    envelope: "pluck",
    octaveOffset: 0,
    octaveLeft: 0,
    octaveRight: 1,
    detuneChorusing: false,
    layerOctaveUp: false,
    attackTime: 0.004,
    decayTime: 0.45,
    sustainLevel: 0.15,
    releaseTime: 0.16,
    stereoSpread: 0.35,
  },
  {
    id: 4,
    name: "04: C/MS ORGAN",
    category: "Keyboards",
    description: "The classic 1988 Creative Organ 12-voice stereo square-wave organ with dual-chip chorusing and 200ms acoustic release sustain",
    envelope: "organ",
    octaveOffset: 0,
    octaveLeft: 0,
    octaveRight: 0,
    detuneChorusing: true,
    layerOctaveUp: false,
    attackTime: 0.012,
    decayTime: 0.2,
    sustainLevel: 1.0,
    releaseTime: 0.20,
    stereoSpread: 0.6,
  },
  // Group 2: Horns & Woodwinds (F5 to F8)
  {
    id: 5,
    name: "05: BRASS FANFARE",
    category: "Horns",
    description: "Punchy Game Blaster fanfare with octave layering across both SAA1099 chips and 220ms release sustain",
    envelope: "organ",
    octaveOffset: 0,
    octaveLeft: 0,
    octaveRight: 0,
    detuneChorusing: true,
    layerOctaveUp: true,
    attackTime: 0.018,
    decayTime: 0.25,
    sustainLevel: 0.88,
    releaseTime: 0.22,
    stereoSpread: 0.8,
  },
  {
    id: 6,
    name: "06: PIPE FLUTE",
    category: "Woodwinds",
    description: "Pure square-wave pipe tone with gentle attack, subtle octave overtone, and 220ms release sustain",
    envelope: "soft",
    octaveOffset: 1,
    octaveLeft: 1,
    octaveRight: 1,
    detuneChorusing: false,
    layerOctaveUp: false,
    attackTime: 0.045,
    decayTime: 0.2,
    sustainLevel: 0.90,
    releaseTime: 0.22,
    stereoSpread: 0.25,
  },
  {
    id: 7,
    name: "07: CLARINET",
    category: "Woodwinds",
    description: "Mellow woodwind lead with characteristic odd-harmonic square resonance and 180ms release sustain",
    envelope: "organ",
    octaveOffset: 0,
    octaveLeft: 0,
    octaveRight: 0,
    detuneChorusing: false,
    layerOctaveUp: false,
    attackTime: 0.025,
    decayTime: 0.15,
    sustainLevel: 0.85,
    releaseTime: 0.18,
    stereoSpread: 0.2,
  },
  {
    id: 8,
    name: "08: REED ACCORDION",
    category: "Woodwinds",
    description: "Vibrant dual-reed French musette using stereo octaves (L:0 R:+1) with 180ms release sustain",
    envelope: "organ",
    octaveOffset: 0,
    octaveLeft: 0,
    octaveRight: 1,
    detuneChorusing: true,
    layerOctaveUp: false,
    attackTime: 0.015,
    decayTime: 0.1,
    sustainLevel: 0.95,
    releaseTime: 0.18,
    stereoSpread: 0.45,
  },
  // Group 3: Strings, Synths & Bass (F9 to F12)
  {
    id: 9,
    name: "09: VIOLIN ENSEMBLE",
    category: "Strings",
    description: "Slow bowing string section using stereo octaves (L:0 R:+1) for rich polyphonic pad with 320ms release sustain",
    envelope: "soft",
    octaveOffset: 0,
    octaveLeft: 0,
    octaveRight: 1,
    detuneChorusing: true,
    layerOctaveUp: false,
    attackTime: 0.060,
    decayTime: 0.35,
    sustainLevel: 0.90,
    releaseTime: 0.32,
    stereoSpread: 0.8,
  },
  {
    id: 10,
    name: "10: 8-BIT SYNTH LEAD",
    category: "Synths",
    description: "Iconic 1988-1990 MS-DOS gaming arcade lead with split octaves (L:0 R:-1) and 220ms release sustain",
    envelope: "organ",
    octaveOffset: 0,
    octaveLeft: 0,
    octaveRight: -1,
    detuneChorusing: true,
    layerOctaveUp: false,
    attackTime: 0.008,
    decayTime: 0.2,
    sustainLevel: 0.90,
    releaseTime: 0.22,
    stereoSpread: 0.85,
  },
  {
    id: 11,
    name: "11: MUSIC BOX / CHIMES",
    category: "Synths",
    description: "Crystalline music box chime in stereo upper registers (L:+1 R:+2) with ringing decay and 380ms release tail",
    envelope: "chime",
    octaveOffset: 1,
    octaveLeft: 1,
    octaveRight: 2,
    detuneChorusing: false,
    layerOctaveUp: false,
    attackTime: 0.003,
    decayTime: 1.20,
    sustainLevel: 0.05,
    releaseTime: 0.38,
    stereoSpread: 0.55,
  },
  {
    id: 12,
    name: "12: SLAP BASS",
    category: "Bass",
    description: "Deep punchy low-octave SAA1099 bass with rapid percussive decay and 140ms release tail",
    envelope: "pluck",
    octaveOffset: -1,
    octaveLeft: -1,
    octaveRight: -1,
    detuneChorusing: false,
    layerOctaveUp: false,
    attackTime: 0.005,
    decayTime: 0.35,
    sustainLevel: 0.10,
    releaseTime: 0.14,
    stereoSpread: 0.0,
  },
];

import type { M2SPreset } from '../dos/m2sToolSource';

export function m2sPresetToCmsPatch(m: M2SPreset): CMSPatch {
  const relSec = Math.max(0.04, Math.min(1.2, m.relRate * 0.015));
  const isOrgan = m.decayRate === 0;
  const octL = m.octaveLeft ?? m.octaveShift ?? 0;
  const octR = m.octaveRight ?? m.octaveShift ?? 0;
  const isMono = !!m.isMono;
  return {
    id: m.slot,
    name: m.name.trim(),
    category: m.slot <= 4 ? "Pianos & Keys" : m.slot <= 8 ? "Woodwinds & Horns" : "Strings & Synths",
    description: `Custom SAA1099 Preset [Slot ${m.slot}] | ${isMono ? 'MONOPHONIC (Solo)' : 'POLYPHONIC (12-Voice)'} | Oct: L:${octL >= 0 ? '+' : ''}${octL} R:${octR >= 0 ? '+' : ''}${octR} | Chorus: ${m.detuneChorus ? 'ON' : 'OFF'} | Layer: ${m.layerOctaveUp ? '+1 Oct' : 'OFF'} | Tail: ${Math.round(relSec * 1000)}ms`,
    envelope: isOrgan ? 'organ' : 'piano',
    octaveOffset: octL,
    octaveLeft: octL,
    octaveRight: octR,
    detuneChorusing: m.detuneChorus,
    layerOctaveUp: m.layerOctaveUp,
    isMono,
    attackTime: 0.008,
    decayTime: isOrgan ? 5.0 : Math.max(0.05, m.decayRate * 0.01),
    sustainLevel: isOrgan ? 1.0 : Math.max(0.05, Math.min(1.0, m.sustainLvl / 15.0)),
    releaseTime: relSec,
    stereoSpread: Math.abs(m.volRight - m.volLeft) / 15.0,
  };
}

export function cmsPatchToM2sPreset(p: CMSPatch): M2SPreset {
  return {
    slot: p.id,
    name: p.name.padEnd(17, ' ').slice(0, 17),
    volLeft: 15,
    volRight: 15,
    octaveLeft: p.octaveLeft ?? p.octaveOffset ?? 0,
    octaveRight: p.octaveRight ?? p.octaveOffset ?? 0,
    octaveShift: p.octaveOffset,
    detuneChorus: !!p.detuneChorusing,
    layerOctaveUp: !!p.layerOctaveUp,
    isMono: !!p.isMono,
    sustainLvl: Math.round(p.sustainLevel * 15),
    decayRate: p.envelope === 'organ' ? 0 : Math.round(p.decayTime * 100),
    relRate: Math.max(1, Math.min(60, Math.round(p.releaseTime / 0.015))),
  };
}

interface SAAActiveVoice {
  midiNote: number;
  chip0Voice: number;
  chip1Voice?: number;
  osc1: OscillatorNode;
  gain1: GainNode;
  panner1: StereoPannerNode;
  osc2?: OscillatorNode;
  gain2?: GainNode;
  panner2?: StereoPannerNode;
}

export class SAA1099SynthEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private analogFilter: BiquadFilterNode | null = null;

  public currentPatch: CMSPatch = CMS_INSTRUMENTS[0];
  private activeVoices: Map<number, SAAActiveVoice> = new Map();
  private monoNoteStack: number[] = [];

  // Channel activity meters (12 voices: 0-5 on Chip 0, 6-11 on Chip 1)
  public channelMeters: SAAChannelMeter[] = Array.from({ length: 12 }, (_, i) => ({
    voice: i,
    chip: (i < 6 ? 0 : 1),
    active: false,
    level: 0,
    noteName: "--",
  }));
  private voiceRoundRobin = 0;

  // Global tuning / pitch bend & modulation
  public pitchBendSemitones = 0;
  public pitchBendRange = 2; // ±2 semitones default
  public modulationDepth = 0; // 0.0 to 1.0 (CC #1 Modulation Wheel)
  public vibratoRate = 5.5; // 5.5 Hz vibrato LFO rate
  public masterVolume = 0.8;
  public sustainMultiplier = 1.0;

  public setSustainMultiplier(mult: number) {
    this.sustainMultiplier = Math.max(0.2, Math.min(3.0, mult));
  }

  private vibratoLfo: OscillatorNode | null = null;
  private vibratoDepthGain: GainNode | null = null;

  // Master Clock on Game Blaster: 7.15909 MHz
  private readonly SAA_CLOCK = 7159090;

  public initAudio() {
    if (this.ctx && this.ctx.state !== 'closed') {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return;
    }

    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AudioCtx();

    // Creative Sound Blaster CMS analog output stage
    this.analogFilter = this.ctx.createBiquadFilter();
    this.analogFilter.type = 'lowpass';
    this.analogFilter.frequency.setValueAtTime(8000, this.ctx.currentTime);
    this.analogFilter.Q.setValueAtTime(0.7, this.ctx.currentTime);

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);

    this.analogFilter.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);

    // Global Vibrato LFO for Modulation Wheel (CC #1)
    this.vibratoLfo = this.ctx.createOscillator();
    this.vibratoLfo.type = 'sine';
    this.vibratoLfo.frequency.setValueAtTime(this.vibratoRate, this.ctx.currentTime);

    this.vibratoDepthGain = this.ctx.createGain();
    this.vibratoDepthGain.gain.setValueAtTime(this.modulationDepth * 24.0, this.ctx.currentTime);

    this.vibratoLfo.connect(this.vibratoDepthGain);
    this.vibratoLfo.start();
  }

  public async resumeAudio(): Promise<boolean> {
    this.initAudio();
    if (this.ctx && this.ctx.state === 'suspended') {
      try {
        await this.ctx.resume();
        return true;
      } catch {
        return false;
      }
    }
    return true;
  }

  public setVolume(volume: number) {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    this.initAudio();
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.masterVolume, this.ctx.currentTime, 0.05);
    }
  }

  public setPatch(patch: CMSPatch) {
    this.currentPatch = patch;
  }

  public setPitchBend(semitones: number) {
    this.pitchBendSemitones = semitones;
    this.initAudio();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.activeVoices.forEach(voice => {
      const octL = this.currentPatch.octaveLeft ?? this.currentPatch.octaveOffset ?? 0;
      const octR = this.currentPatch.octaveRight ?? this.currentPatch.octaveOffset ?? 0;
      const baseNote1 = voice.midiNote + (octL * 12) + this.pitchBendSemitones;
      const { freqHz: freq1 } = this.midiToSAAParams(baseNote1);
      voice.osc1.frequency.setTargetAtTime(freq1, now, 0.02);
      if (voice.osc2) {
        const baseNote2 = voice.midiNote + (octR * 12) + this.pitchBendSemitones;
        const { freqHz: freq2 } = this.midiToSAAParams(baseNote2);
        const voice2Freq = this.currentPatch.layerOctaveUp
          ? ((freq2 * 2) + 0.8)
          : (this.currentPatch.detuneChorusing ? (freq2 + 1.8) : freq2);
        voice.osc2.frequency.setTargetAtTime(voice2Freq, now, 0.02);
      }
    });
  }

  public setModulation(depth: number) {
    this.modulationDepth = Math.max(0, Math.min(1, depth));
    this.initAudio();
    if (!this.ctx || !this.vibratoDepthGain) return;
    const now = this.ctx.currentTime;
    // Vibrato deviation up to 24 Hz for authentic vintage analog feel
    this.vibratoDepthGain.gain.setTargetAtTime(this.modulationDepth * 24.0, now, 0.03);
  }

  public setVibratoRate(rateHz: number) {
    this.vibratoRate = Math.max(1, Math.min(15, rateHz));
    if (this.vibratoLfo && this.ctx) {
      this.vibratoLfo.frequency.setTargetAtTime(this.vibratoRate, this.ctx.currentTime, 0.05);
    }
  }

  /**
   * Convert MIDI Note to SAA1099 Octave (0..7) and Frequency Register (0..255)
   * Exact Philips SAA1099 Equal Temperament tuning matching ORGANHEX.TXT / Creative ORGAN.EXE.
   * Divisor(k) = 508 / 2^(k/12), N(k) = 511 - Divisor(k)
   */
  public midiToSAAParams(midiNote: number): { freqHz: number; octave: number; regVal: number } {
    const freqHz = 440 * Math.pow(2, (midiNote - 69) / 12);
    // Authentic Philips SAA1099 12-semitone divider table aligned to A (MIDI note 21 = A0):
    // A, A#, B, C, C#, D, D#, E, F, F#, G, G#
    const saaNoteTableFromA = [
      0x03, // A  (div 508, 440.40 Hz standard, +1.6c)
      0x20, // A# (div 479, 467.06 Hz, +3.3c)
      0x3A, // B  (div 453, 493.87 Hz, -0.1c)
      0x54, // C  (div 427, 261.97 Hz / 523.94 Hz, +2.3c)
      0x6C, // C# (div 403, 277.57 Hz / 555.14 Hz, +2.4c)
      0x82, // D  (div 381, 293.60 Hz / 587.20 Hz, -0.4c)
      0x98, // D# (div 359, 311.59 Hz / 623.18 Hz, +2.6c)
      0xAC, // E  (div 339, 329.97 Hz / 659.95 Hz, +1.8c)
      0xBF, // F  (div 320, 349.56 Hz / 699.13 Hz, +1.7c)
      0xD1, // F# (div 302, 370.40 Hz / 740.80 Hz, +1.9c)
      0xE2, // G  (div 285, 392.49 Hz / 784.99 Hz, +2.2c)
      0xF2, // G# (div 269, 415.84 Hz / 831.68 Hz, +2.2c)
    ];

    const relA = midiNote - 21;
    const octave = Math.max(0, Math.min(7, Math.floor(relA / 12)));
    const semi = ((relA % 12) + 12) % 12;
    const regVal = saaNoteTableFromA[semi];

    return { freqHz, octave, regVal };
  }

  private getNoteName(midiNote: number): string {
    const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    return `${noteNames[midiNote % 12]}${Math.floor(midiNote / 12) - 1}`;
  }

  /**
   * Note On - pure square wave synthesis via SAA1099 registers
   */
  public noteOn(midiNote: number, velocity = 0.85) {
    this.initAudio();
    if (!this.ctx || !this.analogFilter) return;

    if (this.activeVoices.has(midiNote)) {
      this.noteOff(midiNote);
    }

    const now = this.ctx.currentTime;
    const patch = this.currentPatch;

    if (patch.isMono) {
      if (!this.monoNoteStack.includes(midiNote)) {
        this.monoNoteStack.push(midiNote);
      }
      // In monophonic mode: cut off other voices immediately for crisp monosynth response
      this.activeVoices.forEach((v, noteKey) => {
        if (noteKey !== midiNote) {
          try {
            v.gain1.gain.cancelScheduledValues(now);
            v.gain1.gain.setValueAtTime(0, now);
            v.osc1.stop(now);
            if (v.gain2 && v.osc2) {
              v.gain2.gain.cancelScheduledValues(now);
              v.gain2.gain.setValueAtTime(0, now);
              v.osc2.stop(now);
            }
          } catch {}
          this.activeVoices.delete(noteKey);
        }
      });
      for (let i = 1; i < 6; i++) {
        this.channelMeters[i].active = false;
        this.channelMeters[i].level = 0;
        this.channelMeters[i].noteName = "--";
        this.channelMeters[i + 6].active = false;
        this.channelMeters[i + 6].level = 0;
        this.channelMeters[i + 6].noteName = "--";
      }
    }

    const octL = patch.octaveLeft ?? patch.octaveOffset ?? 0;
    const octR = patch.octaveRight ?? patch.octaveOffset ?? 0;
    const effectiveNote = midiNote + (octL * 12) + this.pitchBendSemitones;
    const { freqHz } = this.midiToSAAParams(effectiveNote);

    // Primary SAA1099 voice (Chip 0: voice 0 for Mono, 0..5 for Poly)
    const chip0Voice = patch.isMono ? 0 : (this.voiceRoundRobin % 6);
    let chip1Voice: number | undefined;

    const osc1 = this.ctx.createOscillator();
    osc1.type = 'square';
    osc1.frequency.setValueAtTime(freqHz, now);

    // Route Vibrato LFO from Modulation Wheel (CC #1)
    if (this.vibratoDepthGain) {
      try {
        this.vibratoDepthGain.connect(osc1.frequency);
      } catch {}
    }

    const gain1 = this.ctx.createGain();
    const panner1 = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;

    const effectiveVelocity = Math.max(0.70, Math.min(1.0, velocity));
    const peakVol = 0.24 * (effectiveVelocity / 0.85);
    const attackEnd = now + patch.attackTime;
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(peakVol, attackEnd);
    if (patch.sustainLevel < 1.0) {
      gain1.gain.exponentialRampToValueAtTime(
        Math.max(0.0001, peakVol * patch.sustainLevel),
        attackEnd + patch.decayTime
      );
    } else {
      gain1.gain.setValueAtTime(peakVol, attackEnd);
    }

    // Stereo panning
    const panPos = -0.55 * patch.stereoSpread;
    if (panner1) {
      panner1.pan.setValueAtTime(panPos, now);
      osc1.connect(gain1);
      gain1.connect(panner1);
      panner1.connect(this.analogFilter);
    } else {
      osc1.connect(gain1);
      gain1.connect(this.analogFilter);
    }
    osc1.start(now);

    // Update meter for Chip 0
    this.channelMeters[chip0Voice] = {
      voice: chip0Voice,
      chip: 0,
      active: true,
      level: 1.0,
      noteName: this.getNoteName(midiNote + (octL * 12)),
    };

    // Secondary SAA1099 voice (Chip 1: voices 6..11) for chorusing and octave harmonics
    let osc2: OscillatorNode | undefined;
    let gain2: GainNode | undefined;
    let panner2: StereoPannerNode | undefined;

    if (patch.detuneChorusing || patch.layerOctaveUp || octL !== octR) {
      chip1Voice = patch.isMono ? 6 : (6 + (this.voiceRoundRobin % 6));
      osc2 = this.ctx.createOscillator();
      osc2.type = 'square';
      const effectiveNote2 = midiNote + (octR * 12) + this.pitchBendSemitones;
      const { freqHz: baseFreq2 } = this.midiToSAAParams(effectiveNote2);
      const voice2Freq = patch.layerOctaveUp
        ? ((baseFreq2 * 2) + 0.8)
        : (patch.detuneChorusing ? (baseFreq2 + 1.8) : baseFreq2);
      osc2.frequency.setValueAtTime(voice2Freq, now);

      // Route Vibrato LFO from Modulation Wheel (CC #1) to secondary oscillator
      if (this.vibratoDepthGain) {
        try {
          this.vibratoDepthGain.connect(osc2.frequency);
        } catch {}
      }

      gain2 = this.ctx.createGain();
      const peakVol2 = peakVol * (patch.layerOctaveUp ? 0.72 : 0.88);
      gain2.gain.setValueAtTime(0, now);
      gain2.gain.linearRampToValueAtTime(peakVol2, attackEnd);
      if (patch.sustainLevel < 1.0) {
        gain2.gain.exponentialRampToValueAtTime(
          Math.max(0.0001, peakVol2 * patch.sustainLevel),
          attackEnd + patch.decayTime
        );
      } else {
        gain2.gain.setValueAtTime(peakVol2, attackEnd);
      }

      if (this.ctx.createStereoPanner) {
        panner2 = this.ctx.createStereoPanner();
        panner2.pan.setValueAtTime(-panPos, now);
        osc2.connect(gain2);
        gain2.connect(panner2);
        panner2.connect(this.analogFilter);
      } else {
        osc2.connect(gain2);
        gain2.connect(this.analogFilter);
      }
      osc2.start(now);

      // Update meter for Chip 1
      this.channelMeters[chip1Voice] = {
        voice: chip1Voice,
        chip: 1,
        active: true,
        level: 0.9,
        noteName: patch.layerOctaveUp ? this.getNoteName(midiNote + (octR * 12) + 12) : this.getNoteName(midiNote + (octR * 12)),
      };
    }

    this.voiceRoundRobin++;

    this.activeVoices.set(midiNote, {
      midiNote,
      chip0Voice,
      chip1Voice,
      osc1,
      gain1,
      panner1: panner1 ?? ({} as StereoPannerNode),
      osc2,
      gain2,
      panner2,
    });
  }

  /**
   * Note Off - Release envelope decay & sustain matching ORGAN.EXE
   */
  public noteOff(midiNote: number) {
    const patch = this.currentPatch;
    if (patch.isMono) {
      this.monoNoteStack = this.monoNoteStack.filter(n => n !== midiNote);
      if (this.monoNoteStack.length > 0) {
        const prevNote = this.monoNoteStack[this.monoNoteStack.length - 1];
        this.noteOn(prevNote, 0.85);
        return;
      }
    }

    const voice = this.activeVoices.get(midiNote);
    if (!voice || !this.ctx) return;

    const now = this.ctx.currentTime;
    const releaseTime = Math.max(0.04, Math.min(1.5, patch.releaseTime * this.sustainMultiplier));

    const cur1 = Math.max(0.0001, voice.gain1.gain.value);
    voice.gain1.gain.cancelScheduledValues(now);
    voice.gain1.gain.setValueAtTime(cur1, now);
    voice.gain1.gain.exponentialRampToValueAtTime(0.0001, now + releaseTime);

    if (voice.gain2) {
      const cur2 = Math.max(0.0001, voice.gain2.gain.value);
      voice.gain2.gain.cancelScheduledValues(now);
      voice.gain2.gain.setValueAtTime(cur2, now);
      voice.gain2.gain.exponentialRampToValueAtTime(0.0001, now + releaseTime);
    }

    const stopTime = now + releaseTime + 0.05;
    voice.osc1.stop(stopTime);
    if (voice.osc2) voice.osc2.stop(stopTime);

    // Fade meters and clean up after release decay completes
    setTimeout(() => {
      if (this.channelMeters[voice.chip0Voice]) {
        this.channelMeters[voice.chip0Voice].active = false;
        this.channelMeters[voice.chip0Voice].level = 0;
        this.channelMeters[voice.chip0Voice].noteName = "--";
      }
      if (voice.chip1Voice !== undefined && this.channelMeters[voice.chip1Voice]) {
        this.channelMeters[voice.chip1Voice].active = false;
        this.channelMeters[voice.chip1Voice].level = 0;
        this.channelMeters[voice.chip1Voice].noteName = "--";
      }
      this.activeVoices.delete(midiNote);
    }, releaseTime * 1000);
  }

  /**
   * Immediate Panic / All Notes Off: Instantly stops and silences all voices
   */
  public allNotesOff() {
    if (this.ctx) {
      const now = this.ctx.currentTime;
      this.activeVoices.forEach((voice) => {
        try {
          voice.gain1.gain.cancelScheduledValues(now);
          voice.gain1.gain.setValueAtTime(0, now);
          voice.osc1.stop(now);
          if (voice.gain2 && voice.osc2) {
            voice.gain2.gain.cancelScheduledValues(now);
            voice.gain2.gain.setValueAtTime(0, now);
            voice.osc2.stop(now);
          }
        } catch {}
      });
    }
    this.activeVoices.clear();
    this.monoNoteStack = [];
    for (let i = 0; i < 12; i++) {
      this.channelMeters[i].active = false;
      this.channelMeters[i].level = 0;
      this.channelMeters[i].noteName = "--";
    }
  }

  public panic() {
    this.allNotesOff();
  }

  public stopAllNotes() {
    this.monoNoteStack = [];
    this.activeVoices.forEach((_, note) => {
      this.noteOff(note);
    });
    this.activeVoices.clear();
    for (let i = 0; i < 12; i++) {
      this.channelMeters[i].active = false;
      this.channelMeters[i].level = 0;
      this.channelMeters[i].noteName = "--";
    }
  }

  public getActiveVoiceCount(): number {
    return this.activeVoices.size;
  }
}

export const cmsAudio = new SAA1099SynthEngine();
