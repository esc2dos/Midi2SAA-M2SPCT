/**
 * Sound Blaster 2.0 (CT1350B) Yamaha YM3812 (OPL2) FM Synthesizer Engine
 * Recreated from Creative Labs ORGAN.EXE with zero rhythm/metronome background noise.
 * 9 FM channels, authentic 2-operator FM phase modulation, ADSR envelopes,
 * Sound Blaster 2.0 analog reconstruction filter, and Web MIDI support.
 */

import { OPL2Patch, OPL2_INSTRUMENTS } from '../data/instruments';

export interface OPL2ChannelMeter {
  channel: number; // 0..8
  active: boolean;
  level: number;   // 0..1
  midiNote: number;
  noteName: string;
  octave: number;
  fNum: number;
}

interface ActiveFMVoice {
  midiNote: number;
  channel: number;
  carrierOsc: OscillatorNode;
  modulatorOsc: OscillatorNode;
  modGain: GainNode;
  carGain: GainNode;
  vibratoOsc?: OscillatorNode;
}

export class SB20OPL2Engine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sb20Filter: BiquadFilterNode | null = null;

  public currentPatch: OPL2Patch = OPL2_INSTRUMENTS[0];
  private activeVoices: Map<number, ActiveFMVoice> = new Map();

  // 9 FM channels tracking
  public channelMeters: OPL2ChannelMeter[] = Array.from({ length: 9 }, (_, i) => ({
    channel: i,
    active: false,
    level: 0,
    midiNote: 0,
    noteName: '--',
    octave: 0,
    fNum: 0,
  }));
  private channelRoundRobin = 0;

  // Master Volume & Pitch Bend
  public masterVolume = 0.8;
  public pitchBendSemitones = 0;

  // F-Number lookup for OPL2 (12 semitones)
  private readonly fNumTable = [343, 363, 385, 408, 432, 458, 485, 514, 544, 577, 611, 647];

  constructor() {}

  public initAudio() {
    if (this.ctx && this.ctx.state !== 'closed') {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return;
    }

    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AudioCtx();

    // Sound Blaster 2.0 (CT1350B) characteristic lowpass filter (~5.2 kHz)
    this.sb20Filter = this.ctx.createBiquadFilter();
    this.sb20Filter.type = 'lowpass';
    this.sb20Filter.frequency.setValueAtTime(5200, this.ctx.currentTime);
    this.sb20Filter.Q.setValueAtTime(1.1, this.ctx.currentTime);

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);

    this.sb20Filter.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);
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

  public setPatch(patch: OPL2Patch) {
    this.currentPatch = patch;
  }

  public setPitchBend(semitones: number) {
    this.pitchBendSemitones = semitones;
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.activeVoices.forEach(voice => {
      const baseFreq = 440 * Math.pow(2, (voice.midiNote + this.pitchBendSemitones - 69) / 12);
      voice.carrierOsc.frequency.setTargetAtTime(baseFreq * this.currentPatch.carMultiplier, now, 0.02);
      voice.modulatorOsc.frequency.setTargetAtTime(baseFreq * this.currentPatch.modMultiplier, now, 0.02);
    });
  }

  private getNoteInfo(midiNote: number) {
    const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    const semitone = midiNote % 12;
    const octave = Math.max(0, Math.min(7, Math.floor(midiNote / 12) - 1));
    const noteName = `${noteNames[semitone]}${octave}`;
    const fNum = this.fNumTable[semitone];
    return { noteName, octave, fNum };
  }

  /**
   * Note On for Sound Blaster 2.0 Yamaha OPL2 FM Channel
   */
  public noteOn(midiNote: number, velocity = 0.85) {
    this.initAudio();
    if (!this.ctx || !this.sb20Filter) return;

    if (this.activeVoices.has(midiNote)) {
      this.noteOff(midiNote);
    }

    const now = this.ctx.currentTime;
    const patch = this.currentPatch;
    const baseFreq = 440 * Math.pow(2, (midiNote + this.pitchBendSemitones - 69) / 12);

    const modFreq = baseFreq * patch.modMultiplier;
    const carFreq = baseFreq * patch.carMultiplier;

    // Allocate 1 of the 9 OPL2 channels
    const ch = this.channelRoundRobin % 9;
    this.channelRoundRobin++;

    // Modulator Oscillator (Operator 1)
    const modulatorOsc = this.ctx.createOscillator();
    modulatorOsc.type = 'sine';
    modulatorOsc.frequency.setValueAtTime(modFreq, now);

    // Modulator Gain (Envelope + FM index)
    const modGain = this.ctx.createGain();
    const peakModDepth = patch.modDepth * (velocity / 0.85);
    modGain.gain.setValueAtTime(0, now);
    modGain.gain.linearRampToValueAtTime(peakModDepth, now + Math.max(0.002, patch.modAttack));
    modGain.gain.exponentialRampToValueAtTime(
      Math.max(1, peakModDepth * patch.modSustain),
      now + patch.modAttack + Math.max(0.005, patch.modDecay)
    );

    // Carrier Oscillator (Operator 2)
    const carrierOsc = this.ctx.createOscillator();
    carrierOsc.type = 'sine';
    carrierOsc.frequency.setValueAtTime(carFreq, now);

    // Modulator modulates Carrier frequency
    modulatorOsc.connect(modGain);
    modGain.connect(carrierOsc.frequency);

    // Carrier Gain (ADSR Volume)
    const carGain = this.ctx.createGain();
    const peakVolume = 0.28 * (velocity / 0.85);
    carGain.gain.setValueAtTime(0, now);
    carGain.gain.linearRampToValueAtTime(peakVolume, now + Math.max(0.002, patch.carAttack));
    carGain.gain.exponentialRampToValueAtTime(
      Math.max(0.001, peakVolume * patch.carSustain),
      now + patch.carAttack + Math.max(0.005, patch.carDecay)
    );

    carrierOsc.connect(carGain);
    carGain.connect(this.sb20Filter);

    // Optional subtle Vibrato
    let vibratoOsc: OscillatorNode | undefined;
    if (patch.vibrato) {
      vibratoOsc = this.ctx.createOscillator();
      const vibratoGain = this.ctx.createGain();
      vibratoOsc.frequency.setValueAtTime(patch.vibratoSpeed || 5.2, now);
      vibratoGain.gain.setValueAtTime(3.2, now);
      vibratoOsc.connect(vibratoGain);
      vibratoGain.connect(carrierOsc.frequency);
      vibratoOsc.start(now);
    }

    modulatorOsc.start(now);
    carrierOsc.start(now);

    // Update Channel Meter for hardware display
    const info = this.getNoteInfo(midiNote);
    this.channelMeters[ch] = {
      channel: ch,
      active: true,
      level: 1.0,
      midiNote,
      noteName: info.noteName,
      octave: info.octave,
      fNum: info.fNum,
    };

    this.activeVoices.set(midiNote, {
      midiNote,
      channel: ch,
      carrierOsc,
      modulatorOsc,
      modGain,
      carGain,
      vibratoOsc,
    });
  }

  /**
   * Note Off
   */
  public noteOff(midiNote: number) {
    const voice = this.activeVoices.get(midiNote);
    if (!voice || !this.ctx) return;

    const now = this.ctx.currentTime;
    const patch = this.currentPatch;
    const releaseTime = Math.max(0.05, patch.carRelease);

    voice.carGain.gain.cancelScheduledValues(now);
    voice.carGain.gain.setValueAtTime(voice.carGain.gain.value, now);
    voice.carGain.gain.exponentialRampToValueAtTime(0.0001, now + releaseTime);

    voice.modGain.gain.cancelScheduledValues(now);
    voice.modGain.gain.setValueAtTime(voice.modGain.gain.value, now);
    voice.modGain.gain.exponentialRampToValueAtTime(0.0001, now + releaseTime);

    const stopTime = now + releaseTime + 0.05;
    voice.carrierOsc.stop(stopTime);
    voice.modulatorOsc.stop(stopTime);
    if (voice.vibratoOsc) voice.vibratoOsc.stop(stopTime);

    if (this.channelMeters[voice.channel]) {
      this.channelMeters[voice.channel].active = false;
      this.channelMeters[voice.channel].level = 0;
    }

    this.activeVoices.delete(midiNote);
  }

  public stopAllNotes() {
    this.activeVoices.forEach((_, note) => {
      this.noteOff(note);
    });
    this.activeVoices.clear();
    for (let i = 0; i < 9; i++) {
      this.channelMeters[i].active = false;
      this.channelMeters[i].level = 0;
      this.channelMeters[i].noteName = '--';
    }
  }

  public getActiveVoiceCount(): number {
    return this.activeVoices.size;
  }
}

export const sb20Audio = new SB20OPL2Engine();
