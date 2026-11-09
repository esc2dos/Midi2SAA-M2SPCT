/**
 * Authentic Yamaha YM3812 (OPL2) / Sound Blaster FM Synthesis Engine
 * Implements 2-Operator FM synthesis with phase modulation, ADSR envelopes,
 * hardware lowpass reconstruction filter, and rhythm channel emulation.
 */

import { OPL2Patch, OPL2_INSTRUMENTS } from '../data/instruments';
import { RhythmStyle, RHYTHM_STYLES } from '../data/rhythms';

interface ActiveVoice {
  note: number;
  carrierOsc: OscillatorNode;
  modulatorOsc: OscillatorNode;
  modGain: GainNode;
  carGain: GainNode;
  vibratoOsc?: OscillatorNode;
  stopTime: number;
}

export class OPL2SynthEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private filterNode: BiquadFilterNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  private currentPatch: OPL2Patch = OPL2_INSTRUMENTS[0];
  private activeVoices: Map<number, ActiveVoice> = new Map();

  // Rhythm accompaniment state
  private rhythmPlaying = false;
  private currentRhythm: RhythmStyle = RHYTHM_STYLES[0];
  private tempoBpm = 120;
  private rhythmTimerId: number | null = null;
  private currentStep = 0;
  private currentChord: { root: number; type: 'maj' | 'min' | '7' } | null = { root: 48, type: 'maj' }; // Default C
  private onStepCallback: ((step: number) => void) | null = null;

  // Sound card emulation profile
  public cardModel: 'sb10' | 'sb20' | 'sbpro' | 'sb16' = 'sb20';

  constructor() {
    // Lazy audio context initialization on user interaction
  }

  private initAudio() {
    if (this.ctx && this.ctx.state !== 'closed') {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return;
    }

    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AudioCtx();

    // Hardware Master Filter (Sound Blaster 2.0 / Pro classic output stage)
    this.filterNode = this.ctx.createBiquadFilter();
    this.filterNode.type = 'lowpass';
    this.filterNode.frequency.setValueAtTime(this.getCardCutoff(), this.ctx.currentTime);
    this.filterNode.Q.setValueAtTime(1.2, this.ctx.currentTime);

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);

    this.filterNode.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);

    // Generate white noise buffer for vintage FM percussion (Snare, Hi-Hat, Cymbal)
    const bufferSize = this.ctx.sampleRate * 2;
    this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
  }

  private getCardCutoff(): number {
    switch (this.cardModel) {
      case 'sb10': return 3800; // SB 1.0 aggressive analog filter
      case 'sb20': return 5200; // SB 2.0 OPL2 standard
      case 'sbpro': return 7500; // SB Pro 2.0 dual OPL2
      case 'sb16': return 9500; // SB16 OPL3 crisp
      default: return 5200;
    }
  }

  public setCardModel(model: 'sb10' | 'sb20' | 'sbpro' | 'sb16') {
    this.cardModel = model;
    if (this.filterNode && this.ctx) {
      this.filterNode.frequency.setTargetAtTime(this.getCardCutoff(), this.ctx.currentTime, 0.05);
    }
  }

  public setVolume(volume: number) {
    this.initAudio();
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(Math.max(0, Math.min(1, volume)), this.ctx.currentTime, 0.05);
    }
  }

  public setPatch(patch: OPL2Patch) {
    this.currentPatch = patch;
  }

  public getPatch(): OPL2Patch {
    return this.currentPatch;
  }

  private noteToFreq(midiNote: number): number {
    return 440 * Math.pow(2, (midiNote - 69) / 12);
  }

  /**
   * Trigger note-on for a given MIDI note (36 = C2, 60 = C4 Middle C, 84 = C6)
   */
  public noteOn(midiNote: number, velocity = 0.8) {
    this.initAudio();
    if (!this.ctx || !this.filterNode) return;

    // Release existing voice for this note if still sounding
    if (this.activeVoices.has(midiNote)) {
      this.noteOff(midiNote);
    }

    const now = this.ctx.currentTime;
    const baseFreq = this.noteToFreq(midiNote);
    const patch = this.currentPatch;

    // Frequencies for 2-op FM
    const modFreq = baseFreq * patch.modMultiplier;
    const carFreq = baseFreq * patch.carMultiplier;

    // Modulator Oscillator (Operator 1)
    const modulatorOsc = this.ctx.createOscillator();
    modulatorOsc.type = 'sine';
    modulatorOsc.frequency.setValueAtTime(modFreq, now);

    // Modulator Envelope (ADSR)
    const modGain = this.ctx.createGain();
    const peakModDepth = patch.modDepth * (velocity / 0.8);
    modGain.gain.setValueAtTime(0, now);
    // Attack
    modGain.gain.linearRampToValueAtTime(peakModDepth, now + Math.max(0.002, patch.modAttack));
    // Decay & Sustain
    modGain.gain.exponentialRampToValueAtTime(
      Math.max(1, peakModDepth * patch.modSustain),
      now + patch.modAttack + Math.max(0.005, patch.modDecay)
    );

    // Modulator connects to Carrier frequency audioParam (FM Synthesis)
    const carrierOsc = this.ctx.createOscillator();
    carrierOsc.type = 'sine';
    carrierOsc.frequency.setValueAtTime(carFreq, now);

    modulatorOsc.connect(modGain);
    modGain.connect(carrierOsc.frequency);

    // Carrier Envelope (ADSR)
    const carGain = this.ctx.createGain();
    const peakVolume = 0.28 * (velocity / 0.8);
    carGain.gain.setValueAtTime(0, now);
    carGain.gain.linearRampToValueAtTime(peakVolume, now + Math.max(0.002, patch.carAttack));
    carGain.gain.exponentialRampToValueAtTime(
      Math.max(0.001, peakVolume * patch.carSustain),
      now + patch.carAttack + Math.max(0.005, patch.carDecay)
    );

    carrierOsc.connect(carGain);
    carGain.connect(this.filterNode);

    // Vibrato LFO if enabled
    let vibratoOsc: OscillatorNode | undefined;
    if (patch.vibrato) {
      vibratoOsc = this.ctx.createOscillator();
      const vibratoGain = this.ctx.createGain();
      vibratoOsc.frequency.setValueAtTime(patch.vibratoSpeed || 5.0, now);
      vibratoGain.gain.setValueAtTime(3.5, now); // vibrato depth in Hz
      vibratoOsc.connect(vibratoGain);
      vibratoGain.connect(carrierOsc.frequency);
      vibratoOsc.start(now);
    }

    modulatorOsc.start(now);
    carrierOsc.start(now);

    this.activeVoices.set(midiNote, {
      note: midiNote,
      carrierOsc,
      modulatorOsc,
      modGain,
      carGain,
      vibratoOsc,
      stopTime: 0,
    });
  }

  /**
   * Release note-on
   */
  public noteOff(midiNote: number) {
    const voice = this.activeVoices.get(midiNote);
    if (!voice || !this.ctx) return;

    const now = this.ctx.currentTime;
    const patch = this.currentPatch;
    const releaseTime = Math.max(0.05, patch.carRelease);

    // Ramp down carrier & modulator
    voice.carGain.gain.cancelScheduledValues(now);
    voice.carGain.gain.setValueAtTime(voice.carGain.gain.value, now);
    voice.carGain.gain.exponentialRampToValueAtTime(0.0001, now + releaseTime);

    voice.modGain.gain.cancelScheduledValues(now);
    voice.modGain.gain.setValueAtTime(voice.modGain.gain.value, now);
    voice.modGain.gain.exponentialRampToValueAtTime(0.0001, now + releaseTime);

    // Stop nodes after release
    const stopTime = now + releaseTime + 0.05;
    voice.carrierOsc.stop(stopTime);
    voice.modulatorOsc.stop(stopTime);
    if (voice.vibratoOsc) {
      voice.vibratoOsc.stop(stopTime);
    }

    this.activeVoices.delete(midiNote);
  }

  public stopAllNotes() {
    this.activeVoices.forEach((_, note) => {
      this.noteOff(note);
    });
    this.activeVoices.clear();
  }

  // ==========================================
  // OPL2 RHYTHM PERCUSSION SYNTHESIS
  // ==========================================

  public playBassDrum(time?: number) {
    this.initAudio();
    if (!this.ctx || !this.filterNode) return;
    const now = time ?? this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    // FM Kick pitch drop
    osc.frequency.setValueAtTime(115, now);
    osc.frequency.exponentialRampToValueAtTime(42, now + 0.12);

    gain.gain.setValueAtTime(0.7, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gain);
    gain.connect(this.filterNode);

    osc.start(now);
    osc.stop(now + 0.25);
  }

  public playSnareDrum(time?: number) {
    this.initAudio();
    if (!this.ctx || !this.filterNode || !this.noiseBuffer) return;
    const now = time ?? this.ctx.currentTime;

    // Pitched body
    const toneOsc = this.ctx.createOscillator();
    const toneGain = this.ctx.createGain();
    toneOsc.frequency.setValueAtTime(220, now);
    toneOsc.frequency.exponentialRampToValueAtTime(130, now + 0.08);
    toneGain.gain.setValueAtTime(0.4, now);
    toneGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    toneOsc.connect(toneGain);
    toneGain.connect(this.filterNode);
    toneOsc.start(now);
    toneOsc.stop(now + 0.15);

    // Noise snap
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = this.noiseBuffer;
    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.setValueAtTime(1200, now);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.45, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.filterNode);

    noiseSource.start(now);
    noiseSource.stop(now + 0.18);
  }

  public playHiHat(open = false, time?: number) {
    this.initAudio();
    if (!this.ctx || !this.filterNode || !this.noiseBuffer) return;
    const now = time ?? this.ctx.currentTime;
    const decay = open ? 0.35 : 0.06;

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(7500, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(open ? 0.35 : 0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + decay);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.filterNode);

    noise.start(now);
    noise.stop(now + decay + 0.05);
  }

  public playTom(pitch = 160, time?: number) {
    this.initAudio();
    if (!this.ctx || !this.filterNode) return;
    const now = time ?? this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.frequency.setValueAtTime(pitch, now);
    osc.frequency.exponentialRampToValueAtTime(pitch * 0.55, now + 0.18);

    gain.gain.setValueAtTime(0.45, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain);
    gain.connect(this.filterNode);

    osc.start(now);
    osc.stop(now + 0.22);
  }

  public playCymbal(time?: number) {
    this.initAudio();
    if (!this.ctx || !this.filterNode || !this.noiseBuffer) return;
    const now = time ?? this.ctx.currentTime;

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(6500, now);
    filter.Q.setValueAtTime(1.5, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.filterNode);

    noise.start(now);
    noise.stop(now + 0.55);
  }

  // ==========================================
  // AUTO-ACCOMPANIMENT CHORDS & BASS
  // ==========================================

  public setRhythm(rhythm: RhythmStyle) {
    this.currentRhythm = rhythm;
    this.tempoBpm = rhythm.bpm;
    this.currentStep = 0;
  }

  public setTempo(bpm: number) {
    this.tempoBpm = Math.max(40, Math.min(260, bpm));
    if (this.rhythmPlaying) {
      this.restartRhythmTimer();
    }
  }

  public getTempo(): number {
    return this.tempoBpm;
  }

  public setChord(rootMidi: number, type: 'maj' | 'min' | '7') {
    this.currentChord = { root: rootMidi, type };
  }

  public clearChord() {
    this.currentChord = null;
  }

  public setStepCallback(cb: ((step: number) => void) | null) {
    this.onStepCallback = cb;
  }

  public startRhythm() {
    this.initAudio();
    if (this.rhythmPlaying) return;
    this.rhythmPlaying = true;
    this.currentStep = 0;
    this.restartRhythmTimer();
  }

  public stopRhythm() {
    this.rhythmPlaying = false;
    if (this.rhythmTimerId !== null) {
      window.clearInterval(this.rhythmTimerId);
      this.rhythmTimerId = null;
    }
  }

  public isRhythmPlaying(): boolean {
    return this.rhythmPlaying;
  }

  private restartRhythmTimer() {
    if (this.rhythmTimerId !== null) {
      window.clearInterval(this.rhythmTimerId);
      this.rhythmTimerId = null;
    }
    // Step interval: 16th notes -> (60 / BPM) / 4 in seconds
    const intervalMs = ((60 / this.tempoBpm) / 4) * 1000;
    this.rhythmTimerId = window.setInterval(() => {
      this.onRhythmTick();
    }, intervalMs);
  }

  private onRhythmTick() {
    if (!this.rhythmPlaying || !this.ctx) return;
    const step = this.currentStep;
    const style = this.currentRhythm;
    const drums = style.drums[step % style.drums.length];

    // Trigger drums
    if (drums?.bd) this.playBassDrum();
    if (drums?.sd) this.playSnareDrum();
    if (drums?.hh) this.playHiHat(false);
    if (drums?.oh) this.playHiHat(true);
    if (drums?.tom) this.playTom();
    if (drums?.cym) this.playCymbal();

    // Trigger Accompaniment Bass
    if (this.currentChord) {
      const bassOffset = style.bassPattern[step % style.bassPattern.length];
      if (bassOffset !== null && bassOffset !== undefined) {
        this.playAccompanimentBass(this.currentChord.root + bassOffset - 12);
      }

      // Trigger Accompaniment Chord
      const shouldChord = style.chordPattern[step % style.chordPattern.length];
      if (shouldChord) {
        this.playAccompanimentChord(this.currentChord.root, this.currentChord.type);
      }
    }

    if (this.onStepCallback) {
      this.onStepCallback(step);
    }

    this.currentStep = (this.currentStep + 1) % style.steps;
  }

  private playAccompanimentBass(midiNote: number) {
    if (!this.ctx || !this.filterNode) return;
    const now = this.ctx.currentTime;
    const freq = this.noteToFreq(midiNote);

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    osc.connect(gain);
    gain.connect(this.filterNode);

    osc.start(now);
    osc.stop(now + 0.3);
  }

  private playAccompanimentChord(rootMidi: number, type: 'maj' | 'min' | '7') {
    if (!this.ctx || !this.filterNode) return;
    const ctx = this.ctx;
    const filter = this.filterNode;
    const now = ctx.currentTime;

    // Build chord intervals
    let intervals: number[] = [0, 4, 7]; // Major
    if (type === 'min') intervals = [0, 3, 7]; // Minor
    else if (type === '7') intervals = [0, 4, 7, 10]; // Dominant 7

    intervals.forEach(interval => {
      const freq = this.noteToFreq(rootMidi + interval);
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      osc.connect(gain);
      gain.connect(filter);

      osc.start(now);
      osc.stop(now + 0.22);
    });
  }
}

// Singleton audio engine instance
export const opl2Audio = new OPL2SynthEngine();
