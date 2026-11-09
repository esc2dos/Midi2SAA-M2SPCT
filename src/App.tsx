import React, { useState, useEffect, useCallback } from 'react';
import { cmsAudio, CMS_INSTRUMENTS, CMSPatch, m2sPresetToCmsPatch } from './audio/saa1099Synth';
import { midiManager } from './audio/midiManager';
import { CrtOverlay } from './components/CrtOverlay';
import { ChannelActivityMeters } from './components/ChannelActivityMeters';
import { OrganKeyboard } from './components/OrganKeyboard';
import { PitchModWheels } from './components/PitchModWheels';
import { MidiStatusPanel } from './components/MidiStatusPanel';
import { DosSourceViewer } from './components/DosSourceViewer';
import { M2SToolModal } from './components/M2SToolModal';
import { parseM2sPreCfg } from './dos/m2sToolSource';
import { Volume2, Cpu, HelpCircle, HardDrive, Music, Sliders } from 'lucide-react';

export default function App() {
  // Dynamic SAA1099 Presets (loaded from M2SPRE.CFG in localStorage or factory defaults)
  const [patches, setPatches] = useState<CMSPatch[]>(() => {
    const saved = localStorage.getItem('M2SPRE_CFG');
    if (saved) {
      try {
        const m2sList = parseM2sPreCfg(saved);
        return m2sList.map(m => m2sPresetToCmsPatch(m));
      } catch {}
    }
    return [...CMS_INSTRUMENTS];
  });

  // Currently active preset instrument
  const [selectedPatch, setSelectedPatch] = useState<CMSPatch>(patches[0]);

  // Keyboard octave shift (Octave 3: C3 - C6)
  const [baseOctave, setBaseOctave] = useState<number>(3);

  // Active sounding notes set (for keyboard visual feedback)
  const [activeNotes, setActiveNotes] = useState<Set<number>>(new Set());

  // Performance Controls: Pitch Bend & Modulation Wheel
  const [pitchBend, setPitchBend] = useState<number>(0); // -1.0 to +1.0
  const [pitchBendRange, setPitchBendRange] = useState<number>(2); // ±2 semitones default
  const [modulation, setModulation] = useState<number>(0); // 0.0 to 1.0 (CC #1)
  const [vibratoRate, setVibratoRate] = useState<number>(5.5); // 5.5 Hz default

  // Handlers for Pitch Bend and Modulation
  const handlePitchBendChange = useCallback((normalized: number) => {
    setPitchBend(normalized);
    cmsAudio.pitchBendRange = pitchBendRange;
    cmsAudio.setPitchBend(normalized * pitchBendRange);
  }, [pitchBendRange]);

  const handlePitchBendRangeChange = useCallback((newRange: number) => {
    setPitchBendRange(newRange);
    cmsAudio.pitchBendRange = newRange;
    cmsAudio.setPitchBend(pitchBend * newRange);
  }, [pitchBend]);

  const handleModulationChange = useCallback((depth: number) => {
    setModulation(depth);
    cmsAudio.setModulation(depth);
  }, []);

  const handleVibratoRateChange = useCallback((rateHz: number) => {
    setVibratoRate(rateHz);
    cmsAudio.setVibratoRate(rateHz);
  }, []);

  // Meter states for 12 SAA1099 stereo voice channels (6 on Chip 0, 6 on Chip 1)
  const [meters, setMeters] = useState(cmsAudio.channelMeters);

  // CRT Screen effects
  const [crtScanlines, setCrtScanlines] = useState<boolean>(true);
  const [crtCurvature, setCrtCurvature] = useState<boolean>(false);
  const [amberMode, setAmberMode] = useState<boolean>(false);

  // Master Volume & Sustain
  const [volume, setVolume] = useState<number>(0.8);
  const [sustainMultiplier, setSustainMultiplier] = useState<number>(1.0);

  // MIDI status
  const [isMidiSupported] = useState<boolean>(midiManager.isSupported);
  const [isMidiConnected, setIsMidiConnected] = useState<boolean>(false);
  const [activeMidiDevice, setActiveMidiDevice] = useState<string>("No device detected");
  const [lastMidiNote, setLastMidiNote] = useState<{ note: number; name: string; velocity: number } | null>(null);

  // Modals
  const [showDosModal, setShowDosModal] = useState<boolean>(false);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const [showM2SToolModal, setShowM2SToolModal] = useState<boolean>(false);

  // Trigger note on
  const handleNoteOn = useCallback((midiNote: number, velocity = 0.85) => {
    cmsAudio.initAudio();
    cmsAudio.noteOn(midiNote, velocity);
    setActiveNotes(prev => new Set(prev).add(midiNote));
    setMeters([...cmsAudio.channelMeters]);
  }, []);

  // Trigger note off
  const handleNoteOff = useCallback((midiNote: number) => {
    cmsAudio.noteOff(midiNote);
    setActiveNotes(prev => {
      const next = new Set(prev);
      next.delete(midiNote);
      return next;
    });
    setMeters([...cmsAudio.channelMeters]);
  }, []);

  // Update patch
  const handleSelectPatch = (patch: CMSPatch) => {
    cmsAudio.resumeAudio().catch(() => {});
    setSelectedPatch(patch);
    cmsAudio.setPatch(patch);
  };

  // Connect MIDI
  const handleConnectMidi = async () => {
    await cmsAudio.resumeAudio();
    const result = await midiManager.initMIDI();
    setIsMidiConnected(result.success);
    if (result.success) {
      setActiveMidiDevice(midiManager.activeDeviceName);
    }
  };

  // Test Note Diagnostic
  const handleTestNote = async () => {
    await cmsAudio.resumeAudio();
    midiManager.simulateMidiNote(60, 100);
  };

  // Emergency Panic / All Notes Off (TAB key)
  const handlePanic = useCallback(() => {
    cmsAudio.allNotesOff();
    setActiveNotes(new Set());
    setMeters([...cmsAudio.channelMeters]);
  }, []);

  // Physical PC Keyboard Listener
  // Physical PC Keyboard Listener for F1-F12 Preset Selection, Tab Panic, and Arrow Hotkeys
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat || e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      // Tab key acts as emergency Panic button to silence all voices immediately
      if (e.key === 'Tab') {
        e.preventDefault();
        handlePanic();
        return;
      }

      // Function keys F1..F12 for Presets 1..12
      if (e.key.startsWith('F')) {
        const fNum = parseInt(e.key.substring(1), 10);
        if (!isNaN(fNum) && fNum >= 1 && fNum <= 12) {
          e.preventDefault();
          const patch = patches[fNum - 1];
          if (patch) {
            handleSelectPatch(patch);
          }
          return;
        }
      }

      // '+' and '-' keys adjust sustain length in real-time
      if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        setSustainMultiplier(prev => {
          const next = Math.max(0.2, Number((prev - 0.15).toFixed(2)));
          cmsAudio.setSustainMultiplier(next);
          return next;
        });
      } else if (e.key === '=' || e.key === '+') {
        e.preventDefault();
        setSustainMultiplier(prev => {
          const next = Math.min(3.0, Number((prev + 0.15).toFixed(2)));
          cmsAudio.setSustainMultiplier(next);
          return next;
        });
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePitchBendChange(-1.0);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handlePitchBendChange(1.0);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        handleModulationChange(Math.min(1.0, modulation + 0.15));
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        handleModulationChange(Math.max(0.0, modulation - 0.15));
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        handlePitchBendChange(0); // Spring return to center!
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [baseOctave, modulation, patches, handleNoteOn, handleNoteOff, handlePitchBendChange, handleModulationChange, handlePanic]);

  // Connect MIDI Manager Callbacks
  useEffect(() => {
    midiManager.setCallbacks(
      (note, vel) => {
        handleNoteOn(note, vel);
        setLastMidiNote({
          note,
          name: ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'][note % 12] + Math.floor(note / 12 - 1),
          velocity: Math.round(vel * 127),
        });
      },
      (note) => {
        handleNoteOff(note);
      },
      (normalized) => {
        handlePitchBendChange(normalized);
      },
      (depth) => {
        handleModulationChange(depth);
      },
      (prog) => {
        const pIndex = prog % 12;
        if (patches[pIndex]) {
          handleSelectPatch(patches[pIndex]);
        }
      },
      () => {
        setIsMidiConnected(midiManager.isConnected);
        setActiveMidiDevice(midiManager.activeDeviceName);
      }
    );
  }, [handleNoteOn, handleNoteOff, handlePitchBendChange, handleModulationChange, handleSelectPatch, patches]);

  // Update volume
  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    cmsAudio.setVolume(newVol);
  };

  // Periodic meter update for envelope decay animations
  useEffect(() => {
    const timer = setInterval(() => {
      setMeters([...cmsAudio.channelMeters]);
    }, 60);
    return () => clearInterval(timer);
  }, []);

  return (
    <CrtOverlay enabled={crtScanlines} curvature={crtCurvature} amberMode={amberMode}>
      <div className="min-h-screen bg-[#0000aa] text-[#ffffff] font-dos select-none flex flex-col p-2 sm:p-4 md:p-6 text-sm">
        
        {/* Top MS-DOS Application Window Frame */}
        <div className="bg-[#0000aa] border-4 border-[#aaaaaa] dos-bevel-out flex-1 flex flex-col shadow-2xl">
          
          {/* DOS Window Title Bar */}
          <div className="bg-[#00aaaa] text-black px-3 py-1 flex items-center justify-between font-bold text-sm tracking-wide border-b border-[#000000]">
            <div className="flex items-center gap-2">
              <span className="bg-[#000080] text-yellow-300 px-1.5 py-0.2 dos-bevel-in text-xs font-mono">
                C:\SB\MIDI2SAA.EXE
              </span>
              <span className="text-black font-black text-sm tracking-wider">
                Midi2Saa v2.2
              </span>
              <span className="hidden md:inline text-xs font-semibold text-gray-800">
                · Dual Philips SAA1099 C/MS Synth (v1.0 was Creative Organ)
              </span>
            </div>
            
            <div className="flex items-center gap-2 text-xs">
              <span className="hidden sm:inline bg-black text-green-400 px-2 py-0.5 border border-green-700">
                DUAL PHILIPS SAA1099 (C/MS · 0x220-0x223)
              </span>
              <button
                type="button"
                onClick={handlePanic}
                title="Silence all stuck notes immediately (Hot key: [TAB])"
                className="dos-bevel-out bg-[#880000] hover:bg-[#aa0000] text-yellow-300 px-2 py-0.5 font-bold cursor-pointer active:dos-bevel-in border border-red-400"
              >
                [TAB] PANIC
              </button>
              <button
                type="button"
                onClick={() => setShowHelpModal(true)}
                className="dos-bevel-out bg-[#aaaaaa] hover:bg-white text-black px-2 py-0.5 font-bold cursor-pointer"
              >
                [?] HELP
              </button>
            </div>
          </div>

          {/* Subheader Banner: Explaining SAA1099 & Clean Accompaniment */}
          <div className="bg-[#000080] border-b-2 border-[#555555] px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-yellow-300">
              <span className="font-bold text-green-300">● SOUND ENGINE:</span>
              <span>2x Philips SAA1099 (12 Stereo Square-Wave Voices)</span>
              <span className="text-gray-400">|</span>
              <span className="text-cyan-300">Midi2Saa v2.2: Stereo Octaves · M2SPRE.CFG · [TAB]=Panic</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePanic}
                title="Silence all voices immediately (TAB)"
                className="dos-bevel-out bg-[#aa0000] hover:bg-[#cc0000] text-white font-bold px-2 py-0.5 text-xs flex items-center gap-1 cursor-pointer active:dos-bevel-in shadow"
              >
                <span>PANIC [TAB]</span>
              </button>

              <button
                type="button"
                onClick={() => setShowM2SToolModal(true)}
                className="dos-bevel-out bg-[#00aaaa] hover:bg-cyan-300 text-black font-bold px-2.5 py-0.5 text-xs flex items-center gap-1.5 cursor-pointer active:dos-bevel-in shadow"
                title="Launch M2SPCT Preset Creation Tool"
              >
                <Sliders className="w-3.5 h-3.5 text-black" />
                <span>M2SPCT PRESET CREATION TOOL</span>
              </button>

              <button
                type="button"
                onClick={() => setShowDosModal(true)}
                className="dos-bevel-out bg-yellow-400 hover:bg-yellow-300 text-black font-bold px-2.5 py-0.5 text-xs flex items-center gap-1 cursor-pointer active:dos-bevel-in"
              >
                <HardDrive className="w-3.5 h-3.5" />
                <span>386DX-40 DEPLOY / SOURCE</span>
              </button>
            </div>
          </div>

          {/* Main Control Surface */}
          <div className="p-3 sm:p-4 flex-1 flex flex-col gap-3">
            
            {/* Top Toolbar: Volume, Display toggles, Octave shift */}
            <div className="bg-[#000080] border-2 border-[#555555] dos-bevel-in p-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
              
              {/* Master Volume */}
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-yellow-300" />
                <span className="font-bold text-yellow-300">MASTER VOL:</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={volume}
                  onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                  className="w-24 sm:w-32 accent-green-400 cursor-pointer"
                />
                <span className="font-mono text-green-300">{Math.round(volume * 100)}%</span>
              </div>

              {/* Keyboard Octave shift */}
              <div className="flex items-center gap-2">
                <span className="font-bold text-yellow-300">OCTAVE:</span>
                <button
                  type="button"
                  onClick={() => setBaseOctave(prev => Math.max(1, prev - 1))}
                  className="dos-bevel-out bg-[#aaaaaa] hover:bg-white text-black px-2 py-0.5 font-bold cursor-pointer active:dos-bevel-in"
                >
                  [-]
                </button>
                <span className="bg-[#000033] px-2 py-0.5 border border-[#555555] font-mono font-bold text-cyan-300">
                  OCT {baseOctave} (C{baseOctave} - C{baseOctave + 3})
                </span>
                <button
                  type="button"
                  onClick={() => setBaseOctave(prev => Math.min(5, prev + 1))}
                  className="dos-bevel-out bg-[#aaaaaa] hover:bg-white text-black px-2 py-0.5 font-bold cursor-pointer active:dos-bevel-in"
                >
                  [+]
                </button>
              </div>

              {/* Real-time Sustain Tail Control (+ / - keys) */}
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-yellow-300">SUSTAIN TAIL:</span>
                <button
                  type="button"
                  onClick={() => {
                    setSustainMultiplier(prev => {
                      const next = Math.max(0.2, Number((prev - 0.15).toFixed(2)));
                      cmsAudio.setSustainMultiplier(next);
                      return next;
                    });
                  }}
                  className="dos-bevel-out bg-[#aaaaaa] hover:bg-white text-black px-2 py-0.5 font-bold cursor-pointer active:dos-bevel-in"
                  title="Shorten sustain tail (- key)"
                >
                  [-]
                </button>
                <span className="bg-[#000033] px-2 py-0.5 border border-[#555555] font-mono font-bold text-green-300">
                  {Math.round(selectedPatch.releaseTime * sustainMultiplier * 1000)}ms ({sustainMultiplier.toFixed(2)}x)
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSustainMultiplier(prev => {
                      const next = Math.min(3.0, Number((prev + 0.15).toFixed(2)));
                      cmsAudio.setSustainMultiplier(next);
                      return next;
                    });
                  }}
                  className="dos-bevel-out bg-[#aaaaaa] hover:bg-white text-black px-2 py-0.5 font-bold cursor-pointer active:dos-bevel-in"
                  title="Lengthen sustain tail (+ key)"
                >
                  [+]
                </button>
              </div>

              {/* CRT Video Filters */}
              <div className="flex items-center gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={() => setCrtScanlines(prev => !prev)}
                  className={`px-2 py-0.5 font-bold cursor-pointer ${
                    crtScanlines
                      ? 'bg-green-700 text-white dos-bevel-in'
                      : 'bg-[#aaaaaa] text-black dos-bevel-out'
                  }`}
                >
                  SCANLINES: {crtScanlines ? 'ON' : 'OFF'}
                </button>
                <button
                  type="button"
                  onClick={() => setAmberMode(prev => !prev)}
                  className={`px-2 py-0.5 font-bold cursor-pointer ${
                    amberMode
                      ? 'bg-amber-600 text-black dos-bevel-in font-black'
                      : 'bg-[#aaaaaa] text-black dos-bevel-out'
                  }`}
                >
                  MONO: {amberMode ? 'AMBER' : 'COLOR'}
                </button>
              </div>
            </div>

            {/* Hardware Activity Meters (Dual Philips SAA1099 12-Voice Architecture) */}
            <ChannelActivityMeters meters={meters} />

            {/* Instrument Preset Selector (12 Philips SAA1099 Presets) */}
            <div className="bg-[#000080] border-2 border-[#555555] dos-bevel-in p-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#00aaaa] pb-1.5 mb-2 gap-1">
                <span className="text-yellow-300 font-bold text-xs flex items-center gap-1.5">
                  <Music className="w-3.5 h-3.5" />
                  <span>C/MS PHILIPS SAA1099 INSTRUMENT PRESETS (PRESS F1-F12 OR CLICK)</span>
                </span>
                <span className="text-gray-300 text-[11px]">
                  CURRENT: <span className="text-green-300 font-bold">{selectedPatch.name}</span> ({selectedPatch.category})
                </span>
              </div>

              <div className="mb-2.5 px-2.5 py-1.5 bg-[#000033] border border-[#005577] text-[11px] text-cyan-200 flex flex-wrap items-center justify-between gap-1.5">
                <span className="italic">{selectedPatch.description}</span>
                <span className="font-mono text-yellow-300 font-bold bg-[#000022] px-2 py-0.5 border border-[#555555]">
                  ATTACK: {Math.round(selectedPatch.attackTime * 1000)}ms | DECAY: {Math.round(selectedPatch.decayTime * 1000)}ms | SUSTAIN: {Math.round(selectedPatch.sustainLevel * 100)}% | RELEASE TAIL: {Math.round(selectedPatch.releaseTime * sustainMultiplier * 1000)}ms [+/-]
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {patches.map((patch) => {
                  const isSelected = selectedPatch.id === patch.id;
                  return (
                    <button
                      key={`patch-${patch.id}`}
                      type="button"
                      onClick={() => handleSelectPatch(patch)}
                      className={`p-2 text-left text-xs transition-all cursor-pointer border ${
                        isSelected
                          ? 'bg-[#00aaaa] text-black font-bold border-white dos-bevel-in shadow-md'
                          : 'bg-[#000055] text-cyan-200 border-[#005577] hover:bg-[#000077] hover:text-white dos-bevel-out'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-mono text-[11px] truncate">{patch.name}</span>
                        <span className={`text-[10px] px-1 py-0.2 rounded-xs font-mono font-bold ${
                          isSelected ? 'bg-black text-yellow-300' : 'bg-blue-900 text-cyan-300'
                        }`}>
                          [F{patch.id}]
                        </span>
                      </div>
                      <div className="text-[10px] opacity-80 truncate mt-0.5">{patch.category}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Performance Wheels: Pitch Bend & Modulation */}
            <PitchModWheels
              pitchBend={pitchBend}
              pitchBendRange={pitchBendRange}
              modulation={modulation}
              vibratoRate={vibratoRate}
              onPitchBendChange={handlePitchBendChange}
              onPitchBendRangeChange={handlePitchBendRangeChange}
              onModulationChange={handleModulationChange}
              onVibratoRateChange={handleVibratoRateChange}
            />

            {/* Virtual Organ Keyboard */}
            <div className="bg-[#000080] border-2 border-[#555555] dos-bevel-in p-3">
              <div className="flex items-center justify-between border-b border-[#00aaaa] pb-1.5 mb-2">
                <span className="text-yellow-300 font-bold text-xs">
                  INTERACTIVE 37-KEY ORGAN CONSOLE (C{baseOctave} TO C{baseOctave + 3})
                </span>
                <span className="text-gray-300 text-[11px]">
                  INPUT: CONNECTED MIDI CONTROLLER · MOUSE CLICK
                </span>
              </div>
              <OrganKeyboard
                baseOctave={baseOctave}
                activeNotes={activeNotes}
                onNoteDown={(note: number) => handleNoteOn(note, 0.85)}
                onNoteUp={handleNoteOff}
              />
            </div>

            {/* Gameport / Web MIDI Diagnostic & Connectivity Panel */}
            <MidiStatusPanel
              isMidiSupported={isMidiSupported}
              isMidiConnected={isMidiConnected}
              activeDeviceName={activeMidiDevice}
              errorMessage={midiManager.errorMessage}
              lastNote={lastMidiNote}
              pitchBend={pitchBend}
              pitchBendRange={pitchBendRange}
              modulation={modulation}
              midiLog={midiManager.midiLog}
              onConnectClick={handleConnectMidi}
              onTestNoteClick={handleTestNote}
              onTestPitchBend={() => midiManager.simulatePitchBend(0.75)}
              onTestModulation={() => midiManager.simulateModulation(0.65)}
            />

          </div>

          {/* DOS Status Bar Footer */}
          <div className="bg-[#aaaaaa] text-black px-3 py-1 font-bold text-xs flex flex-wrap items-center justify-between border-t-2 border-[#000000]">
            <div className="flex items-center gap-3">
              <span>STATUS: READY</span>
              <span className="text-[#000080]">Midi2Saa v2.2 · M2SPRE.CFG PRESETS · 2x SAA1099</span>
              <span className="text-[#800000]">RHYTHM: MUTED (NO NOISE)</span>
            </div>
            <div>
              <span>BORLAND C++ 3.1 & TURBO C · M2STOOL PRESET DESIGNER</span>
            </div>
          </div>

        </div>

        {/* Modal: M2STOOL SAA1099 Preset Sound Designer */}
        {showM2SToolModal && (
          <M2SToolModal
            onClose={() => {
              setShowM2SToolModal(false);
              cmsAudio.setPatch(selectedPatch);
            }}
            onApplyPresetsToLiveSynth={(updatedPatches) => {
              setPatches(updatedPatches);
              const curId = selectedPatch.id;
              const nextPatch = updatedPatches[curId - 1] || updatedPatches[0];
              setSelectedPatch(nextPatch);
              cmsAudio.setPatch(nextPatch);
            }}
            isMidiConnected={isMidiConnected}
            activeMidiDevice={activeMidiDevice}
            lastMidiNote={lastMidiNote}
            activeNotesCount={activeNotes.size}
          />
        )}

        {/* Modal: 386DX-40 Deployment & Source Code */}
        {showDosModal && (
          <DosSourceViewer onClose={() => setShowDosModal(false)} />
        )}

        {/* Modal: Hardware Architecture & Help */}
        {showHelpModal && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3 md:p-6 font-dos">
            <div className="bg-[#0000aa] border-4 border-[#aaaaaa] dos-bevel-out w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
              <div className="bg-[#00aaaa] text-black px-3 py-1.5 flex items-center justify-between font-bold text-sm">
                <span>MIDI2SAA v2.2 & SOUND BLASTER SAA1099 ARCHITECTURE GUIDE</span>
                <button
                  type="button"
                  onClick={() => setShowHelpModal(false)}
                  className="dos-bevel-out bg-[#aaaaaa] hover:bg-white text-black px-2 py-0.5 text-xs font-bold cursor-pointer"
                >
                  [X]
                </button>
              </div>

              <div className="p-4 overflow-y-auto space-y-3 text-xs text-gray-200">
                <div className="bg-[#000080] p-3 border border-[#00aaaa]">
                  <h3 className="text-yellow-300 font-bold mb-1">1. DUAL PHILIPS SAA1099 CHIPS (C/MS · GAME BLASTER):</h3>
                  <p className="leading-relaxed">
                    The Creative Music System (C/MS) and Sound Blaster cards use two Philips SAA1099 sound generators at I/O ports 0x220–0x223.
                    Register 0x1C bit 0 is the Master Sound Enable (must be set to 0x01 to activate the audio DACs).
                    On Sound Blaster 2.0 (CT1350B), the onboard CT1335 mixer (ports 0x224/0x225) is unmuted to maximum volume.
                  </p>
                </div>

                <div className="bg-[#000080] p-3 border border-[#00aaaa]">
                  <h3 className="text-yellow-300 font-bold mb-1">2. TOTAL RHYTHM & METRONOME REMOVAL:</h3>
                  <p className="leading-relaxed">
                    In the original 1988 ORGAN.EXE, the background rhythm generator triggered the SAA1099 noise registers (0x15/0x16)
                    on timer interrupts, creating constant background ticking and hiss even when idle.
                    In Midi2Saa, all rhythm accompaniment and metronome code has been completely removed. The SAA1099 noise
                    channels are held muted, giving you a completely silent background and dedicated 12 stereo voices for MIDI play.
                  </p>
                </div>

                <div className="bg-[#000080] p-3 border border-[#00aaaa]">
                  <h3 className="text-yellow-300 font-bold mb-1">3. GAMEPORT MIDI ON SOUND BLASTER (386DX-40):</h3>
                  <p className="leading-relaxed">
                    The Sound Blaster 15-pin Gameport contains an onboard UART routed to the DSP.
                    When connected with a standard 15-pin to 5-pin DIN MIDI adapter cable (Pin 15 = MIDI IN, Pin 12 = MIDI OUT, Pin 4/5 = GND),
                    DSP command 0x31 unmasks the Sound Blaster IRQ to receive incoming MIDI messages with microsecond latency.
                  </p>
                </div>

                <div className="bg-[#000080] p-3 border border-[#00aaaa]">
                  <h3 className="text-yellow-300 font-bold mb-1">4. MIDI2SAA v2.1 (v1.0 was Creative Organ) & BORLAND C++ 3.1:</h3>
                  <p className="leading-relaxed">
                    Version 1.0 was the initial Creative Organ clone. Version 2.0 added real-time Pitch Bend Wheel (0xE0) and Modulation Wheel Vibrato (CC #1).
                    Version 2.1 maps all presets to <span className="text-yellow-300 font-bold">Function keys (F1-F12)</span>, dedicates note play exclusively
                    to the <span className="text-yellow-300 font-bold">MIDI Controller</span>, restores the crisp <span className="text-green-300 font-bold">~180-240ms release sustain</span> via 1ms timer pacing, and features a non-scrolling 80x25 color boxed DOS interface.
                  </p>
                  <p className="leading-relaxed mt-1">
                    The C codebase (<span className="text-green-300 font-bold">MIDI2SAA.C</span>) has been engineered for 100% strict compliance
                    with <span className="text-yellow-300 font-bold">Borland C++ 3.1</span> and Turbo C 2.0/3.0. Mid-block variable declarations
                    have been hoisted to function tops (C89 standard), forward function prototypes added, and ISR pointers wrapped with
                    C++ compatible type signatures.
                  </p>
                  <p className="leading-relaxed mt-1 font-mono text-cyan-300">
                    Compile: bcc -mc -O2 -3 -w- midi2saa.c  (or run BUILD.BAT)
                  </p>
                </div>
              </div>

              <div className="bg-[#000080] p-2 border-t border-[#555555] flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowHelpModal(false)}
                  className="dos-bevel-out bg-[#aaaaaa] hover:bg-white text-black font-bold px-4 py-1 text-xs cursor-pointer active:dos-bevel-in"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </CrtOverlay>
  );
}
