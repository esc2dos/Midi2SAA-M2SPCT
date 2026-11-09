/**
 * Web MIDI API Manager for Creative Intelligent Organ v2.02
 * Connects physical MIDI keyboards (USB or Game Port MIDI adapter) directly
 * to the Sound Blaster 2.0 (CT1350B) sound engine.
 */

export interface MidiDevice {
  id: string;
  name: string;
  manufacturer?: string;
  state: string;
}

export interface MidiLogEntry {
  timestamp: string;
  bytes: string;
  desc: string;
}

export class MidiManager {
  private midiAccess: MIDIAccess | null = null;
  public isSupported = false;
  public isConnected = false;
  public errorMessage: string | null = null;
  public devices: MidiDevice[] = [];
  public activeDeviceName: string = "None";
  public lastNoteReceived: { note: number; name: string; velocity: number } | null = null;
  public lastPitchBend: number = 0; // -1.0 to +1.0
  public lastModulation: number = 0; // 0.0 to 1.0
  public midiLog: MidiLogEntry[] = [];

  private onNoteOn: ((note: number, velocity: number) => void) | null = null;
  private onNoteOff: ((note: number) => void) | null = null;
  private onPitchBend: ((normalized: number, rawVal: number) => void) | null = null;
  private onModulation: ((depth: number, rawVal: number) => void) | null = null;
  private onProgramChange: ((program: number) => void) | null = null;
  private onStateChangeCallback: (() => void) | null = null;

  // Sustain pedal tracking (CC #64)
  private sustainActive = false;
  private sustainedNotes: Set<number> = new Set();

  constructor() {
    this.isSupported = typeof navigator !== 'undefined' && 'requestMIDIAccess' in navigator;
  }

  public setCallbacks(
    onNoteOn: (note: number, velocity: number) => void,
    onNoteOff: (note: number) => void,
    onPitchBend?: (normalized: number, rawVal: number) => void,
    onModulation?: (depth: number, rawVal: number) => void,
    onProgramChange?: (program: number) => void,
    onStateChange?: () => void
  ) {
    this.onNoteOn = onNoteOn;
    this.onNoteOff = onNoteOff;
    this.onPitchBend = onPitchBend || null;
    this.onModulation = onModulation || null;
    this.onProgramChange = onProgramChange || null;
    this.onStateChangeCallback = onStateChange || null;
  }

  public setProgramChangeCallback(cb: ((program: number) => void) | null) {
    this.onProgramChange = cb;
  }

  public async initMIDI(): Promise<{ success: boolean; error?: string }> {
    if (!this.isSupported) {
      this.errorMessage = "Web MIDI API is not supported in this browser. Please use Chrome, Edge, Brave, or Opera.";
      if (this.onStateChangeCallback) this.onStateChangeCallback();
      return { success: false, error: this.errorMessage };
    }

    try {
      this.errorMessage = null;
      // Request access (try standard first)
      try {
        this.midiAccess = await navigator.requestMIDIAccess({ sysex: false });
      } catch (err: unknown) {
        // Fallback without arguments
        console.warn("Retrying requestMIDIAccess without options", err);
        this.midiAccess = await navigator.requestMIDIAccess();
      }

      this.isConnected = true;
      this.refreshDevices();

      // Listen for plug/unplug of MIDI devices
      this.midiAccess.onstatechange = () => {
        this.refreshDevices();
        if (this.onStateChangeCallback) this.onStateChangeCallback();
      };

      if (this.onStateChangeCallback) this.onStateChangeCallback();
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.isConnected = false;
      this.errorMessage = msg;
      console.error("MIDI Access Error:", err);
      if (this.onStateChangeCallback) this.onStateChangeCallback();
      return { success: false, error: msg };
    }
  }

  public refreshDevices() {
    if (!this.midiAccess) return;
    this.devices = [];

    // Use forEach to universally support all browser MIDIInputMap implementations
    this.midiAccess.inputs.forEach((input) => {
      // Ensure port is open if supported
      if (typeof input.open === 'function') {
        input.open().catch(() => {});
      }

      this.devices.push({
        id: input.id,
        name: input.name || `MIDI Device ${input.id}`,
        manufacturer: input.manufacturer || "Generic",
        state: input.state || "connected",
      });

      // Bind listener
      input.onmidimessage = (event: MIDIMessageEvent) => {
        this.handleMidiMessage(event);
      };
    });

    if (this.devices.length > 0) {
      this.activeDeviceName = this.devices.map(d => d.name).join(", ");
    } else {
      this.activeDeviceName = "No device detected. Plug in your MIDI keyboard.";
    }

    if (this.onStateChangeCallback) {
      this.onStateChangeCallback();
    }
  }

  private handleMidiMessage(event: MIDIMessageEvent) {
    const data = event.data;
    if (!data || data.length < 2) return;

    const status = data[0] & 0xF0;
    const channel = (data[0] & 0x0F) + 1;
    const note = data[1];
    const velocity = data.length > 2 ? data[2] : 64;

    const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    const noteName = `${noteNames[note % 12]}${Math.floor(note / 12) - 1}`;

    const hexBytes = Array.from(data).map(b => '0x' + b.toString(16).toUpperCase().padStart(2, '0')).join(' ');

    // Note On (0x90) with velocity > 0
    if (status === 0x90 && velocity > 0) {
      this.lastNoteReceived = { note, name: noteName, velocity };
      this.addLog(hexBytes, `NoteOn ${noteName} (${note}) Vel:${velocity} Ch:${channel}`);

      if (this.sustainActive) {
        this.sustainedNotes.add(note);
      }
      if (this.onNoteOn) {
        this.onNoteOn(note, velocity / 127);
      }
      if (this.onStateChangeCallback) this.onStateChangeCallback();
    }
    // Note Off (0x80) or Note On with 0 velocity
    else if (status === 0x80 || (status === 0x90 && velocity === 0)) {
      this.addLog(hexBytes, `NoteOff ${noteName} (${note}) Ch:${channel}`);
      if (this.sustainActive) {
        this.sustainedNotes.add(note);
      } else {
        if (this.onNoteOff) {
          this.onNoteOff(note);
        }
      }
      if (this.onStateChangeCallback) this.onStateChangeCallback();
    }
    // Control Change (0xB0) - e.g. Modulation Wheel CC #1, Sustain Pedal CC 64
    else if (status === 0xB0) {
      const ccNumber = data[1];
      const ccValue = data[2];
      this.addLog(hexBytes, `CC #${ccNumber} Val:${ccValue}`);

      if (ccNumber === 1) { // Modulation Wheel
        const depth = ccValue / 127;
        this.lastModulation = depth;
        if (this.onModulation) {
          this.onModulation(depth, ccValue);
        }
      }
      else if (ccNumber === 64) { // Damper/Sustain pedal
        if (ccValue >= 64) {
          this.sustainActive = true;
        } else {
          this.sustainActive = false;
          // Release all notes held by sustain
          if (this.onNoteOff) {
            this.sustainedNotes.forEach(sustainedNote => {
              this.onNoteOff!(sustainedNote);
            });
          }
          this.sustainedNotes.clear();
        }
      }
      // CC 120 = All Sound Off / CC 123 = All Notes Off
      else if (ccNumber === 120 || ccNumber === 123) {
        this.sustainedNotes.clear();
        if (this.onNoteOff) {
          for (let n = 0; n < 128; n++) {
            this.onNoteOff(n);
          }
        }
      }
      if (this.onStateChangeCallback) this.onStateChangeCallback();
    }
    // Channel Pressure / Aftertouch (0xD0)
    else if (status === 0xD0) {
      const pressure = data[1];
      this.addLog(hexBytes, `ChannelPressure Val:${pressure}`);
      if (this.onStateChangeCallback) this.onStateChangeCallback();
    }
    // Pitch Bend (0xE0) - 14-bit pitch wheel position
    else if (status === 0xE0) {
      const lsb = data[1];
      const msb = data.length > 2 ? data[2] : 64;
      const rawBend = (msb << 7) | lsb; // 0..16383, 8192 = center
      const normalized = (rawBend - 8192) / 8192; // -1.0 to +1.0
      this.lastPitchBend = normalized;
      const pct = (normalized * 100).toFixed(0);
      this.addLog(hexBytes, `PitchBend Val:${rawBend} (${normalized >= 0 ? '+' : ''}${pct}%)`);
      if (this.onPitchBend) {
        this.onPitchBend(normalized, rawBend);
      }
      if (this.onStateChangeCallback) this.onStateChangeCallback();
    }
    // Program Change (0xC0) - change instrument preset
    else if (status === 0xC0) {
      const program = data[1];
      this.addLog(hexBytes, `ProgChange #${program}`);
      if (this.onProgramChange) {
        this.onProgramChange(program);
      }
      if (this.onStateChangeCallback) this.onStateChangeCallback();
    }
  }

  private addLog(bytes: string, desc: string) {
    const time = new Date().toTimeString().split(' ')[0];
    this.midiLog.unshift({ timestamp: time, bytes, desc });
    if (this.midiLog.length > 6) {
      this.midiLog.pop();
    }
  }

  /**
   * Diagnostic manual test: simulate a MIDI Note On/Off
   */
  public simulateMidiNote(note = 60, velocity = 100) {
    if (this.onNoteOn) {
      const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
      const noteName = `${noteNames[note % 12]}${Math.floor(note / 12) - 1}`;
      this.lastNoteReceived = { note, name: noteName, velocity };
      this.addLog(`0x90 0x${note.toString(16)} 0x${velocity.toString(16)}`, `TEST NoteOn ${noteName} Vel:${velocity}`);
      this.onNoteOn(note, velocity / 127);
      if (this.onStateChangeCallback) this.onStateChangeCallback();

      setTimeout(() => {
        if (this.onNoteOff) {
          this.addLog(`0x80 0x${note.toString(16)} 0x00`, `TEST NoteOff ${noteName}`);
          this.onNoteOff(note);
          if (this.onStateChangeCallback) this.onStateChangeCallback();
        }
      }, 500);
    }
  }

  /**
   * Diagnostic manual test: simulate Pitch Bend (-1.0 to +1.0)
   */
  public simulatePitchBend(normalized: number) {
    this.lastPitchBend = Math.max(-1, Math.min(1, normalized));
    const rawVal = Math.round((this.lastPitchBend + 1) * 8191.5);
    const msb = (rawVal >> 7) & 0x7F;
    const lsb = rawVal & 0x7F;
    const hex = `0xE0 0x${lsb.toString(16).toUpperCase().padStart(2, '0')} 0x${msb.toString(16).toUpperCase().padStart(2, '0')}`;
    this.addLog(hex, `TEST PitchBend (${(this.lastPitchBend * 100).toFixed(0)}%)`);
    if (this.onPitchBend) {
      this.onPitchBend(this.lastPitchBend, rawVal);
    }
    if (this.onStateChangeCallback) this.onStateChangeCallback();
  }

  /**
   * Diagnostic manual test: simulate Modulation Wheel (0.0 to 1.0)
   */
  public simulateModulation(depth: number) {
    this.lastModulation = Math.max(0, Math.min(1, depth));
    const ccVal = Math.round(this.lastModulation * 127);
    const hex = `0xB0 0x01 0x${ccVal.toString(16).toUpperCase().padStart(2, '0')}`;
    this.addLog(hex, `TEST ModWheel (${Math.round(this.lastModulation * 100)}%)`);
    if (this.onModulation) {
      this.onModulation(this.lastModulation, ccVal);
    }
    if (this.onStateChangeCallback) this.onStateChangeCallback();
  }
}

export const midiManager = new MidiManager();
