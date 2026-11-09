import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  M2SPreset,
  DEFAULT_M2S_PRESETS,
  DEFAULT_M2SPRE_CFG,
  M2SPCT_C_SOURCE,
  formatM2sPreCfg,
  parseM2sPreCfg,
} from '../dos/m2sToolSource';
import { cmsAudio, m2sPresetToCmsPatch, CMSPatch } from '../audio/saa1099Synth';
import { generateCmsDosBinary } from '../dos/dosBinaryGenerator';
import { Volume2, Download, Upload, RotateCcw, Check, Sparkles, Sliders, Play, Square, FileText, Edit3 } from 'lucide-react';
import { midiManager } from '../audio/midiManager';

interface M2SToolModalProps {
  onClose: () => void;
  onApplyPresetsToLiveSynth: (updatedPatches: CMSPatch[]) => void;
  isMidiConnected?: boolean;
  activeMidiDevice?: string;
  lastMidiNote?: { note: number; name: string; velocity: number } | null;
  activeNotesCount?: number;
}

export const M2SToolModal: React.FC<M2SToolModalProps> = ({
  onClose,
  onApplyPresetsToLiveSynth,
  isMidiConnected = false,
  activeMidiDevice = "Sound Blaster Gameport / MIDI",
  lastMidiNote = null,
  activeNotesCount = 0,
}) => {
  const [presets, setPresets] = useState<M2SPreset[]>(() => {
    const saved = localStorage.getItem('M2SPRE_CFG');
    if (saved) {
      try {
        return parseM2sPreCfg(saved);
      } catch {}
    }
    return DEFAULT_M2S_PRESETS.map(p => ({ ...p }));
  });

  const [activeSlot, setActiveSlot] = useState<number>(0); // 0..11
  const [activeParamIndex, setActiveParamIndex] = useState<number>(1); // 0..10
  const [isNotePlaying, setIsNotePlaying] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>("Use [UP/DN] to navigate, [LF/RT] to adjust, [ENTER] to rename. Cubase Prog Change ready!");
  const [copiedNotice, setCopiedNotice] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const currentPreset = presets[activeSlot] || DEFAULT_M2S_PRESETS[0];

  // Instantly apply active preset to audio engine when tweaked
  const syncWithAudio = useCallback((preset: M2SPreset) => {
    const patch = m2sPresetToCmsPatch(preset);
    cmsAudio.setPatch(patch);
  }, []);

  // Sync initial preset on modal open so MIDI keyboard plays with this sound immediately
  useEffect(() => {
    syncWithAudio(currentPreset);
  }, [syncWithAudio, currentPreset]);

  // Support Cubase 14 Program Change (0xC0) while modal is open
  useEffect(() => {
    const handleProg = (prog: number) => {
      const slotIndex = prog % 12;
      setActiveSlot(slotIndex);
      syncWithAudio(presets[slotIndex]);
      setStatusMessage(`Cubase Program Change: Switched to Slot [F${slotIndex + 1}] (${presets[slotIndex].name})`);
    };

    midiManager.setProgramChangeCallback(handleProg);
    return () => {
      // Replaced by App.tsx when modal closes or unmounts
    };
  }, [presets, syncWithAudio]);

  // Panic / All Notes Off handler
  const handlePanic = useCallback(() => {
    cmsAudio.allNotesOff();
    setIsNotePlaying(false);
    setStatusMessage("[PANIC: TAB] All SAA1099 voices silenced immediately!");
  }, []);

  // Modify active parameter
  const adjustParameter = useCallback((delta: number) => {
    setPresets(prev => {
      const next = [...prev];
      const p = { ...next[activeSlot] };

      switch (activeParamIndex) {
        case 0: // Rename preset
          nameInputRef.current?.focus();
          break;
        case 1: // Left Volume
          p.volLeft = Math.max(0, Math.min(15, p.volLeft + delta));
          break;
        case 2: // Right Volume
          p.volRight = Math.max(0, Math.min(15, p.volRight + delta));
          break;
        case 3: // Left Octave (Chip 0)
          p.octaveLeft = Math.max(-2, Math.min(2, (p.octaveLeft ?? p.octaveShift ?? 0) + delta));
          p.octaveShift = p.octaveLeft;
          break;
        case 4: // Right Octave (Chip 1)
          p.octaveRight = Math.max(-2, Math.min(2, (p.octaveRight ?? p.octaveShift ?? 0) + delta));
          break;
        case 5: // Detune Chorus
          p.detuneChorus = delta > 0 ? true : delta < 0 ? false : !p.detuneChorus;
          break;
        case 6: // Layer Octave Up
          p.layerOctaveUp = delta > 0 ? true : delta < 0 ? false : !p.layerOctaveUp;
          break;
        case 7: // Voice Mode (Polyphonic vs Monophonic)
          p.isMono = !p.isMono;
          break;
        case 8: // Sustain Level
          p.sustainLvl = Math.max(0, Math.min(15, p.sustainLvl + delta));
          break;
        case 9: // Active Decay Rate
          p.decayRate = Math.max(0, Math.min(255, p.decayRate + (delta * 10)));
          break;
        case 10: // Release Tail Rate
          p.relRate = Math.max(1, Math.min(60, p.relRate + (delta * 2)));
          break;
      }

      next[activeSlot] = p;
      syncWithAudio(p);
      return next;
    });

    setStatusMessage(`Adjusted parameter ${activeParamIndex}. Audition live!`);
  }, [activeSlot, activeParamIndex, syncWithAudio]);

  // Trigger audition note
  const triggerAuditionNote = useCallback(() => {
    cmsAudio.resumeAudio().catch(() => {});
    syncWithAudio(currentPreset);

    if (isNotePlaying) {
      cmsAudio.noteOff(60);
      setIsNotePlaying(false);
      setStatusMessage("Audition stopped.");
    } else {
      cmsAudio.noteOn(60, 0.95);
      setIsNotePlaying(true);
      setStatusMessage("Auditioning Middle C (C-4, 261.97 Hz) through Philips SAA1099...");

      setTimeout(() => {
        cmsAudio.noteOff(60);
        setIsNotePlaying(false);
      }, 700);
    }
  }, [currentPreset, isNotePlaying, syncWithAudio]);

  // Arrow key navigation (UP/DN selects param 0..10, LF/RT adjusts value, TAB panics, ENTER renames)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveParamIndex(prev => (prev > 0 ? prev - 1 : 10));
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveParamIndex(prev => (prev < 10 ? prev + 1 : 0));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        adjustParameter(-1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        adjustParameter(1);
      } else if (e.key === 'Enter') {
        if (activeParamIndex === 0) {
          e.preventDefault();
          nameInputRef.current?.focus();
        } else if (activeParamIndex === 7) {
          e.preventDefault();
          adjustParameter(1);
        }
      } else if (e.key === 'Tab') {
        e.preventDefault();
        handlePanic();
      } else if (e.key.startsWith('F')) {
        const num = parseInt(e.key.substring(1), 10);
        if (num >= 1 && num <= 12) {
          e.preventDefault();
          setActiveSlot(num - 1);
          syncWithAudio(presets[num - 1]);
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [adjustParameter, triggerAuditionNote, presets, syncWithAudio, onClose, handlePanic, activeParamIndex]);

  // Download M2SPRE.CFG
  const handleDownloadCfg = () => {
    const cfgText = formatM2sPreCfg(presets);
    localStorage.setItem('M2SPRE_CFG', cfgText);
    const blob = new Blob([cfgText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'M2SPRE.CFG';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setStatusMessage("Saved and downloaded M2SPRE.CFG for DOS!");
  };

  // Download M2SPCT.C
  const handleDownloadCSource = () => {
    const blob = new Blob([M2SPCT_C_SOURCE], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'M2SPCT.C';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setStatusMessage("Downloaded M2SPCT.C (Borland C++ 3.1 & Turbo C Source)!");
  };

  // Download 16-bit M2SPCT.COM binary
  const handleDownloadCom = () => {
    const comBinary = generateCmsDosBinary();
    const blob = new Blob([comBinary.buffer as ArrayBuffer], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'M2SPCT.COM';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setStatusMessage("Downloaded 16-bit M2SPCT.COM executable!");
  };

  // Upload/Import M2SPRE.CFG
  const handleImportCfg = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        try {
          const parsed = parseM2sPreCfg(text);
          setPresets(parsed);
          localStorage.setItem('M2SPRE_CFG', text);
          syncWithAudio(parsed[activeSlot]);
          setStatusMessage("Successfully imported M2SPRE.CFG into all 12 slots!");
        } catch {
          setStatusMessage("Error reading M2SPRE.CFG format.");
        }
      }
    };
    reader.readAsText(file);
  };

  // Reset current slot to factory default
  const handleResetSlot = () => {
    setPresets(prev => {
      const next = [...prev];
      next[activeSlot] = { ...DEFAULT_M2S_PRESETS[activeSlot] };
      syncWithAudio(next[activeSlot]);
      return next;
    });
    setStatusMessage(`Slot [F${activeSlot + 1}] reset to factory default.`);
  };

  // Apply to Live Synthesizer
  const handleApplyToLiveSynth = () => {
    const patches = presets.map(p => m2sPresetToCmsPatch(p));
    onApplyPresetsToLiveSynth(patches);
    localStorage.setItem('M2SPRE_CFG', formatM2sPreCfg(presets));
    setCopiedNotice("Applied to live Midi2Saa synth!");
    setTimeout(() => setCopiedNotice(null), 2500);
    setStatusMessage("All 12 presets applied to live Midi2Saa performance engine!");
  };

  // Helper gauge renderer
  const renderGauge = (val: number, max: number, length = 12) => {
    const filled = Math.min(length, Math.max(0, Math.round((val / max) * length)));
    const empty = length - filled;
    return (
      <span className="font-mono text-xs">
        <span className="text-yellow-300">{"█".repeat(filled)}</span>
        <span className="text-gray-600">{"░".repeat(empty)}</span>
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-2 sm:p-4 font-dos">
      <div className="bg-[#0000aa] border-4 border-[#aaaaaa] dos-bevel-out w-full max-w-5xl max-h-[95vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Title Bar */}
        <div className="bg-[#00aaaa] text-black px-3 py-1.5 flex items-center justify-between font-bold text-sm select-none gap-2">
          <div className="flex items-center gap-2 truncate">
            <Sliders className="w-4 h-4 text-black shrink-0" />
            <span className="truncate">M2SPCT v1.0 — SAA1099 PRESET CREATION TOOL FOR MIDI2SAA</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="bg-[#000080] text-[#00ff00] px-2 py-0.5 text-xs font-mono font-bold border border-[#00ffff]">[READY]</span>
            <button
              type="button"
              onClick={onClose}
              className="dos-bevel-out bg-[#aaaaaa] hover:bg-white text-black px-2.5 py-0.5 text-xs font-bold cursor-pointer active:dos-bevel-in"
            >
              [X] EXIT
            </button>
          </div>
        </div>

        {/* Top Control Bar: Slot Selection (F1..F12) */}
        <div className="bg-[#000080] border-b-2 border-[#555555] p-2 flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs text-yellow-300 font-bold">
            <span>SELECT PRESET SLOT TO EDIT (F1..F12 / CUBASE 14 PROG CHANGE 0..11):</span>
            <span className="text-green-300 font-mono">CURRENT: SLOT [F{activeSlot + 1}] {currentPreset.name}</span>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-12 gap-1 text-xs">
            {presets.map((p, idx) => {
              const isSelected = activeSlot === idx;
              return (
                <button
                  key={`slot-${idx}`}
                  type="button"
                  onClick={() => {
                    setActiveSlot(idx);
                    syncWithAudio(p);
                    setStatusMessage(`Switched to Preset Slot [F${idx + 1}].`);
                  }}
                  className={`p-1 text-center font-bold font-mono transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-yellow-400 text-black border-2 border-white shadow-md'
                      : 'bg-[#000044] text-cyan-200 border border-[#005577] hover:bg-[#000066]'
                  }`}
                >
                  <div className="text-[10px] text-gray-800 font-bold">F{idx + 1}</div>
                  <div className="text-[11px] truncate">{p.name.replace(/^\d+:\s*/, '').slice(0, 7)}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Workspace: Left Parameters (UP/DN/LF/RT) | Right Sonic Help & Output */}
        <div className="p-3 flex-1 flex flex-col md:flex-row gap-3 overflow-y-auto">
          
          {/* Left Panel: 11 SAA1099 Sound Parameters */}
          <div className="flex-1 bg-[#000033] border-2 border-[#00aaaa] dos-bevel-in p-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-[#005577] pb-1.5 mb-2 text-xs">
                <span className="text-green-300 font-bold flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5" />
                  <span>PHILIPS SAA1099 SOUND PARAMETERS</span>
                </span>
                <span className="text-yellow-300 text-[11px]">
                  [↑/↓]=Select | [←/→]=Adjust | [ENTER]=Rename
                </span>
              </div>

              {/* Parameter Table */}
              <div className="space-y-1.5 text-xs">
                
                {/* 0. Preset Name with Direct Editing & Focus */}
                <div
                  onClick={() => {
                    setActiveParamIndex(0);
                    nameInputRef.current?.focus();
                  }}
                  className={`p-1.5 flex items-center justify-between cursor-pointer border ${
                    activeParamIndex === 0
                      ? 'bg-[#000080] border-yellow-300 text-yellow-300 font-bold'
                      : 'border-transparent text-gray-300 hover:bg-[#000055]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-cyan-300">{activeParamIndex === 0 ? '►' : ' '} 1. NAME:</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      ref={nameInputRef}
                      type="text"
                      maxLength={17}
                      value={currentPreset.name}
                      onFocus={() => setActiveParamIndex(0)}
                      onChange={(e) => {
                        const val = e.target.value;
                        setPresets(prev => {
                          const next = [...prev];
                          next[activeSlot] = { ...next[activeSlot], name: val };
                          return next;
                        });
                      }}
                      className="bg-black text-yellow-300 font-mono text-xs px-2 py-0.5 border border-[#555555] w-44 focus:border-yellow-300 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveParamIndex(0);
                        nameInputRef.current?.focus();
                      }}
                      className="dos-bevel-out bg-[#aaaaaa] text-black px-1.5 py-0.2 text-[10px] font-bold flex items-center gap-0.5"
                    >
                      <Edit3 className="w-2.5 h-2.5" />
                      <span>EDIT</span>
                    </button>
                  </div>
                </div>

                {/* 1. Left Volume */}
                <div
                  onClick={() => setActiveParamIndex(1)}
                  className={`p-1.5 flex items-center justify-between cursor-pointer border ${
                    activeParamIndex === 1
                      ? 'bg-[#000080] border-yellow-300 text-yellow-300 font-bold'
                      : 'border-transparent text-gray-300 hover:bg-[#000055]'
                  }`}
                >
                  <span className="font-mono">{activeParamIndex === 1 ? '►' : ' '} 2. LEFT VOLUME:</span>
                  <div className="flex items-center gap-2">
                    {renderGauge(currentPreset.volLeft, 15)}
                    <span className="font-mono text-green-300 w-10 text-right">{currentPreset.volLeft}/15</span>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); adjustParameter(-1); }}
                      className="dos-bevel-out bg-[#aaaaaa] text-black px-1.5 py-0.2 text-[10px] font-bold"
                    >[-]</button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); adjustParameter(1); }}
                      className="dos-bevel-out bg-[#aaaaaa] text-black px-1.5 py-0.2 text-[10px] font-bold"
                    >[+]</button>
                  </div>
                </div>

                {/* 2. Right Volume */}
                <div
                  onClick={() => setActiveParamIndex(2)}
                  className={`p-1.5 flex items-center justify-between cursor-pointer border ${
                    activeParamIndex === 2
                      ? 'bg-[#000080] border-yellow-300 text-yellow-300 font-bold'
                      : 'border-transparent text-gray-300 hover:bg-[#000055]'
                  }`}
                >
                  <span className="font-mono">{activeParamIndex === 2 ? '►' : ' '} 3. RIGHT VOLUME:</span>
                  <div className="flex items-center gap-2">
                    {renderGauge(currentPreset.volRight, 15)}
                    <span className="font-mono text-green-300 w-10 text-right">{currentPreset.volRight}/15</span>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); adjustParameter(-1); }}
                      className="dos-bevel-out bg-[#aaaaaa] text-black px-1.5 py-0.2 text-[10px] font-bold"
                    >[-]</button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); adjustParameter(1); }}
                      className="dos-bevel-out bg-[#aaaaaa] text-black px-1.5 py-0.2 text-[10px] font-bold"
                    >[+]</button>
                  </div>
                </div>

                {/* 3. Left Octave */}
                <div
                  onClick={() => setActiveParamIndex(3)}
                  className={`p-1.5 flex items-center justify-between cursor-pointer border ${
                    activeParamIndex === 3
                      ? 'bg-[#000080] border-yellow-300 text-yellow-300 font-bold'
                      : 'border-transparent text-gray-300 hover:bg-[#000055]'
                  }`}
                >
                  <span className="font-mono">{activeParamIndex === 3 ? '►' : ' '} 4. LEFT OCTAVE (CHIP 0):</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-cyan-300 px-2 bg-black border border-[#444]">
                      {(currentPreset.octaveLeft ?? currentPreset.octaveShift ?? 0) > 0 ? `+${currentPreset.octaveLeft ?? currentPreset.octaveShift}` : (currentPreset.octaveLeft ?? currentPreset.octaveShift ?? 0)} Oct
                    </span>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); adjustParameter(-1); }}
                      className="dos-bevel-out bg-[#aaaaaa] text-black px-1.5 py-0.2 text-[10px] font-bold"
                    >[-]</button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); adjustParameter(1); }}
                      className="dos-bevel-out bg-[#aaaaaa] text-black px-1.5 py-0.2 text-[10px] font-bold"
                    >[+]</button>
                  </div>
                </div>

                {/* 4. Right Octave */}
                <div
                  onClick={() => setActiveParamIndex(4)}
                  className={`p-1.5 flex items-center justify-between cursor-pointer border ${
                    activeParamIndex === 4
                      ? 'bg-[#000080] border-yellow-300 text-yellow-300 font-bold'
                      : 'border-transparent text-gray-300 hover:bg-[#000055]'
                  }`}
                >
                  <span className="font-mono">{activeParamIndex === 4 ? '►' : ' '} 5. RIGHT OCTAVE (CHIP 1):</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-cyan-300 px-2 bg-black border border-[#444]">
                      {(currentPreset.octaveRight ?? currentPreset.octaveShift ?? 0) > 0 ? `+${currentPreset.octaveRight ?? currentPreset.octaveShift}` : (currentPreset.octaveRight ?? currentPreset.octaveShift ?? 0)} Oct
                    </span>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); adjustParameter(-1); }}
                      className="dos-bevel-out bg-[#aaaaaa] text-black px-1.5 py-0.2 text-[10px] font-bold"
                    >[-]</button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); adjustParameter(1); }}
                      className="dos-bevel-out bg-[#aaaaaa] text-black px-1.5 py-0.2 text-[10px] font-bold"
                    >[+]</button>
                  </div>
                </div>

                {/* 5. Detune Chorus */}
                <div
                  onClick={() => setActiveParamIndex(5)}
                  className={`p-1.5 flex items-center justify-between cursor-pointer border ${
                    activeParamIndex === 5
                      ? 'bg-[#000080] border-yellow-300 text-yellow-300 font-bold'
                      : 'border-transparent text-gray-300 hover:bg-[#000055]'
                  }`}
                >
                  <span className="font-mono">{activeParamIndex === 5 ? '►' : ' '} 6. DETUNE CHORUS:</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); adjustParameter(0); }}
                      className={`px-3 py-0.5 text-xs font-bold ${
                        currentPreset.detuneChorus
                          ? 'bg-green-600 text-white dos-bevel-in'
                          : 'bg-red-900 text-gray-300 dos-bevel-out'
                      }`}
                    >
                      {currentPreset.detuneChorus ? 'ON (Twin Chip 1)' : 'OFF (Single Voice)'}
                    </button>
                  </div>
                </div>

                {/* 6. Layer Octave Up */}
                <div
                  onClick={() => setActiveParamIndex(6)}
                  className={`p-1.5 flex items-center justify-between cursor-pointer border ${
                    activeParamIndex === 6
                      ? 'bg-[#000080] border-yellow-300 text-yellow-300 font-bold'
                      : 'border-transparent text-gray-300 hover:bg-[#000055]'
                  }`}
                >
                  <span className="font-mono">{activeParamIndex === 6 ? '►' : ' '} 7. LAYER +1 OCTAVE:</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); adjustParameter(0); }}
                      className={`px-3 py-0.5 text-xs font-bold ${
                        currentPreset.layerOctaveUp
                          ? 'bg-green-600 text-white dos-bevel-in'
                          : 'bg-red-900 text-gray-300 dos-bevel-out'
                      }`}
                    >
                      {currentPreset.layerOctaveUp ? 'ON (+12 st Piano Body)' : 'OFF'}
                    </button>
                  </div>
                </div>

                {/* 7. Voice Mode: Polyphonic vs Monophonic */}
                <div
                  onClick={() => setActiveParamIndex(7)}
                  className={`p-1.5 flex items-center justify-between cursor-pointer border ${
                    activeParamIndex === 7
                      ? 'bg-[#000080] border-yellow-300 text-yellow-300 font-bold'
                      : 'border-transparent text-gray-300 hover:bg-[#000055]'
                  }`}
                >
                  <span className="font-mono">{activeParamIndex === 7 ? '►' : ' '} 8. VOICE MODE:</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); adjustParameter(0); }}
                      className={`px-3 py-0.5 text-xs font-bold ${
                        currentPreset.isMono
                          ? 'bg-purple-700 text-yellow-200 dos-bevel-in border border-yellow-300'
                          : 'bg-blue-700 text-white dos-bevel-in'
                      }`}
                    >
                      {currentPreset.isMono ? 'MONOPHONIC (Solo Lead / Bass)' : 'POLYPHONIC (12-Voice Chords)'}
                    </button>
                  </div>
                </div>

                {/* 8. Sustain Level */}
                <div
                  onClick={() => setActiveParamIndex(8)}
                  className={`p-1.5 flex items-center justify-between cursor-pointer border ${
                    activeParamIndex === 8
                      ? 'bg-[#000080] border-yellow-300 text-yellow-300 font-bold'
                      : 'border-transparent text-gray-300 hover:bg-[#000055]'
                  }`}
                >
                  <span className="font-mono">{activeParamIndex === 8 ? '►' : ' '} 9. SUSTAIN LEVEL:</span>
                  <div className="flex items-center gap-2">
                    {renderGauge(currentPreset.sustainLvl, 15)}
                    <span className="font-mono text-green-300 w-10 text-right">{currentPreset.sustainLvl}/15</span>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); adjustParameter(-1); }}
                      className="dos-bevel-out bg-[#aaaaaa] text-black px-1.5 py-0.2 text-[10px] font-bold"
                    >[-]</button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); adjustParameter(1); }}
                      className="dos-bevel-out bg-[#aaaaaa] text-black px-1.5 py-0.2 text-[10px] font-bold"
                    >[+]</button>
                  </div>
                </div>

                {/* 9. Active Decay Rate */}
                <div
                  onClick={() => setActiveParamIndex(9)}
                  className={`p-1.5 flex items-center justify-between cursor-pointer border ${
                    activeParamIndex === 9
                      ? 'bg-[#000080] border-yellow-300 text-yellow-300 font-bold'
                      : 'border-transparent text-gray-300 hover:bg-[#000055]'
                  }`}
                >
                  <span className="font-mono">{activeParamIndex === 9 ? '►' : ' '} 10. ACTIVE DECAY:</span>
                  <div className="flex items-center gap-2">
                    {currentPreset.decayRate === 0 ? (
                      <span className="font-mono text-yellow-300 px-2 bg-black border border-[#444]">
                        [Infinite / Organ Hold]
                      </span>
                    ) : (
                      <>
                        {renderGauge(currentPreset.decayRate, 255)}
                        <span className="font-mono text-green-300 w-14 text-right">{currentPreset.decayRate} ticks</span>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); adjustParameter(-1); }}
                      className="dos-bevel-out bg-[#aaaaaa] text-black px-1.5 py-0.2 text-[10px] font-bold"
                    >[-]</button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); adjustParameter(1); }}
                      className="dos-bevel-out bg-[#aaaaaa] text-black px-1.5 py-0.2 text-[10px] font-bold"
                    >[+]</button>
                  </div>
                </div>

                {/* 10. Release Tail Rate */}
                <div
                  onClick={() => setActiveParamIndex(10)}
                  className={`p-1.5 flex items-center justify-between cursor-pointer border ${
                    activeParamIndex === 10
                      ? 'bg-[#000080] border-yellow-300 text-yellow-300 font-bold'
                      : 'border-transparent text-gray-300 hover:bg-[#000055]'
                  }`}
                >
                  <span className="font-mono">{activeParamIndex === 10 ? '►' : ' '} 11. RELEASE TAIL:</span>
                  <div className="flex items-center gap-2">
                    {renderGauge(currentPreset.relRate, 60)}
                    <span className="font-mono text-green-300 w-16 text-right">
                      {currentPreset.relRate} ({currentPreset.relRate * 15}ms)
                    </span>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); adjustParameter(-1); }}
                      className="dos-bevel-out bg-[#aaaaaa] text-black px-1.5 py-0.2 text-[10px] font-bold"
                    >[-]</button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); adjustParameter(1); }}
                      className="dos-bevel-out bg-[#aaaaaa] text-black px-1.5 py-0.2 text-[10px] font-bold"
                    >[+]</button>
                  </div>
                </div>

              </div>
            </div>

            {/* Live MIDI Keyboard Audition, Panic & Slot Reset */}
            <div className="mt-4 pt-3 border-t border-[#005577] flex flex-col sm:flex-row items-center justify-between gap-2">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="bg-[#000055] border border-[#00aaaa] px-3 py-1.5 flex items-center gap-2 text-xs flex-1 sm:flex-initial">
                  <span className={`w-2.5 h-2.5 rounded-full ${isMidiConnected ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'}`} />
                  <span className="font-bold text-yellow-300">MIDI KEYBOARD:</span>
                  <span className="text-cyan-200 font-mono text-[11px] truncate max-w-[170px]">
                    {lastMidiNote ? `${lastMidiNote.name} (Vel:${lastMidiNote.velocity})` : (isMidiConnected ? 'Listening · Play keys' : 'Ready')}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={triggerAuditionNote}
                  title="Audition note Middle C (C-4) through Philips SAA1099"
                  className="dos-bevel-out bg-[#004422] hover:bg-[#006633] text-green-300 px-2.5 py-1.5 text-xs font-bold cursor-pointer active:dos-bevel-in flex items-center gap-1 shrink-0"
                >
                  <Play className="w-3 h-3 text-green-300" />
                  <span>TEST C-4</span>
                </button>
                <button
                  type="button"
                  onClick={handlePanic}
                  title="Silence all stuck notes immediately (Hot key: [TAB])"
                  className="dos-bevel-out bg-[#770000] hover:bg-[#aa0000] text-yellow-300 px-2.5 py-1.5 text-xs font-bold cursor-pointer active:dos-bevel-in flex items-center gap-1 shrink-0"
                >
                  <Square className="w-3 h-3 text-yellow-300 fill-yellow-300" />
                  <span>PANIC [TAB]</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleResetSlot}
                className="dos-bevel-out bg-[#000055] hover:bg-[#000088] text-yellow-300 border border-[#005577] px-2.5 py-1.5 text-xs font-bold cursor-pointer flex items-center gap-1 active:dos-bevel-in w-full sm:w-auto justify-center"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>RESET SLOT [F{activeSlot + 1}]</span>
              </button>
            </div>
          </div>

          {/* Right Panel: Parameter Sonic Theory & Architecture */}
          <div className="w-full md:w-80 bg-[#000033] border-2 border-[#aaaa00] dos-bevel-in p-3 flex flex-col justify-between text-xs">
            <div>
              <div className="border-b border-[#555500] pb-1 mb-2 text-yellow-300 font-bold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>SONIC ARCHITECTURE / HELP</span>
              </div>

              {activeParamIndex === 0 && (
                <div className="space-y-2 text-gray-200 leading-relaxed">
                  <div className="text-yellow-300 font-bold">1. Preset Display Name:</div>
                  <p>
                    Up to 17 ASCII characters. Stored directly inside <span className="text-cyan-300">M2SPRE.CFG</span>.
                    Appears directly on the MS-DOS screen in <span className="text-green-300">MIDI2SAA.EXE</span> when selected via F1–F12 or Cubase Program Change.
                  </p>
                  <p className="text-gray-400">
                    Click the text box or press <span className="text-yellow-300">[ENTER]</span> in DOS to edit the name inline!
                  </p>
                </div>
              )}

              {activeParamIndex === 1 && (
                <div className="space-y-2 text-gray-200 leading-relaxed">
                  <div className="text-yellow-300 font-bold">2. SAA1099 Left Channel Volume:</div>
                  <p>
                    Programs the lower 4 bits (0x0 to 0xF) of SAA1099 Volume Registers <span className="text-cyan-300">0x00..0x05</span>.
                  </p>
                  <p className="text-gray-400">
                    Range 0 to 15 gives authentic 3dB-per-step analog logarithmic attenuation per channel.
                  </p>
                </div>
              )}

              {activeParamIndex === 2 && (
                <div className="space-y-2 text-gray-200 leading-relaxed">
                  <div className="text-yellow-300 font-bold">3. SAA1099 Right Channel Volume:</div>
                  <p>
                    Programs the upper 4 bits of SAA1099 Volume Registers <span className="text-cyan-300">0x00..0x05</span>.
                  </p>
                  <p className="text-gray-400">
                    Different left and right values allow asymmetric stereo placement across the Sound Blaster output jacks.
                  </p>
                </div>
              )}

              {activeParamIndex === 3 && (
                <div className="space-y-2 text-gray-200 leading-relaxed">
                  <div className="text-yellow-300 font-bold">4. Octave (Left - Chip 0):</div>
                  <p>
                    Controls the octave transpose for <span className="text-cyan-300">Left Channel / Chip 0</span> (-2 to +2).
                  </p>
                  <p className="text-gray-400">
                    Programs SAA1099 Octave Registers <span className="text-cyan-300">0x10..0x12</span> on Chip 0. Allows independent octave routing from the Right channel.
                  </p>
                </div>
              )}

              {activeParamIndex === 4 && (
                <div className="space-y-2 text-gray-200 leading-relaxed">
                  <div className="text-yellow-300 font-bold">5. Octave (Right - Chip 1):</div>
                  <p>
                    Controls the octave transpose for <span className="text-cyan-300">Right Channel / Chip 1</span> (-2 to +2).
                  </p>
                  <p className="text-gray-400">
                    Programs SAA1099 Octave Registers on Chip 1. Emulates classic Creative <span className="text-yellow-300">ORGAN.EXE</span> presets (e.g. Left: 0, Right: +1 for pipe organ, harpsichord, violin ensemble, or split synth leads)!
                  </p>
                </div>
              )}

              {activeParamIndex === 5 && (
                <div className="space-y-2 text-gray-200 leading-relaxed">
                  <div className="text-yellow-300 font-bold">6. Twin-Chip Detune Chorus:</div>
                  <p>
                    Activates the paired voice on <span className="text-cyan-300">Chip 1 (Ports 0x222 / 0x223)</span> with a subtle +2 register frequency offset.
                  </p>
                  <p className="text-gray-400">
                    The two square waves beat together at 1.5 to 3.0 Hz, producing the iconic warm C/MS analog ensemble fatness!
                  </p>
                </div>
              )}

              {activeParamIndex === 6 && (
                <div className="space-y-2 text-gray-200 leading-relaxed">
                  <div className="text-yellow-300 font-bold">7. Layer Octave Up (+12 st):</div>
                  <p>
                    Forces the second SAA1099 oscillator to play one full octave higher (+12 semitones).
                  </p>
                  <p className="text-gray-400">
                    Since a pure square wave contains only odd harmonics (1st, 3rd, 5th), layering an octave higher inserts the missing 2nd, 6th, and 10th harmonics, generating a rich acoustic piano body!
                  </p>
                </div>
              )}

              {activeParamIndex === 7 && (
                <div className="space-y-2 text-gray-200 leading-relaxed">
                  <div className="text-yellow-300 font-bold">8. Voice Allocation Mode:</div>
                  <p>
                    <span className="text-cyan-300 font-bold">Polyphonic:</span> Full 12-voice polyphony for two-handed piano chords, lush organ pads, and strings.
                  </p>
                  <p>
                    <span className="text-purple-300 font-bold">Monophonic:</span> Dedicates Voice 0 (and Voice 6 for chorus/layer) for solo synthesizer leads, slap bass, and woodwinds with an authentic legato note-return stack!
                  </p>
                </div>
              )}

              {activeParamIndex === 8 && (
                <div className="space-y-2 text-gray-200 leading-relaxed">
                  <div className="text-yellow-300 font-bold">9. Sustain Level (0 to 15):</div>
                  <p>
                    The volume level held while a note is depressed after the initial percussive decay finishes.
                  </p>
                  <p className="text-gray-400">
                    15 = Full organ hold. 0 = Pure percussive staccato like a clavinet or xylophone.
                  </p>
                </div>
              )}

              {activeParamIndex === 9 && (
                <div className="space-y-2 text-gray-200 leading-relaxed">
                  <div className="text-yellow-300 font-bold">10. Active Decay Rate:</div>
                  <p>
                    Controls how rapidly the initial strike drops from peak volume down to the sustain level while held.
                  </p>
                  <p className="text-gray-400">
                    A setting of 0 disables percussive decay (giving sustained organ/strings). Settings 30-100 deliver realistic piano strike decay.
                  </p>
                </div>
              )}

              {activeParamIndex === 10 && (
                <div className="space-y-2 text-gray-200 leading-relaxed">
                  <div className="text-yellow-300 font-bold">11. Release Sustain Tail Rate:</div>
                  <p>
                    The speed of the release envelope after releasing the key.
                  </p>
                  <p className="text-gray-400">
                    Base is 16 (~240ms decay tail). Controllable in performance with the <span className="text-yellow-300">[+]</span> and <span className="text-yellow-300">[-]</span> keys!
                  </p>
                </div>
              )}
            </div>

            {/* Live MIDI Controller Monitor */}
            <div className="mt-4 p-2 bg-[#000055] border border-[#00aaaa] space-y-1 text-xs">
              <div className="flex items-center justify-between text-yellow-300 font-bold border-b border-[#005577] pb-1">
                <span className="flex items-center gap-1.5">
                  <span className={`inline-block w-2 h-2 rounded-full ${isMidiConnected ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'}`} />
                  <span>MIDI CONTROLLER MONITOR</span>
                </span>
                <span className="font-mono text-[10px] text-green-300">
                  {isMidiConnected ? '[PORT ACTIVE]' : '[READY]'}
                </span>
              </div>
              <div className="flex justify-between items-center text-[11px] pt-0.5">
                <span className="text-gray-300">Device:</span>
                <span className="font-mono text-cyan-300 truncate max-w-[160px]" title={activeMidiDevice}>
                  {activeMidiDevice}
                </span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-gray-300">Last Note:</span>
                <span className="font-mono text-yellow-300 font-bold">
                  {lastMidiNote ? `${lastMidiNote.name} (Vel:${lastMidiNote.velocity}, #${lastMidiNote.note})` : 'None / Idle'}
                </span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-gray-300">Active Sound:</span>
                <span className="font-mono text-green-300">
                  {activeNotesCount > 0 ? `${activeNotesCount} Key(s) · ${activeNotesCount * 2} SAA Osc` : 'Idle (0/12 Voices)'}
                </span>
              </div>
            </div>

            {/* Quick Export / Live Apply Buttons */}
            <div className="mt-3 pt-3 border-t border-[#555500] space-y-2">
              <button
                type="button"
                onClick={handleApplyToLiveSynth}
                className="w-full dos-bevel-out bg-yellow-400 hover:bg-yellow-300 text-black font-bold py-1.5 text-xs flex items-center justify-center gap-1.5 cursor-pointer active:dos-bevel-in shadow"
              >
                <Check className="w-4 h-4" />
                <span>APPLY TO LIVE MIDI2SAA SYNTH</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadCfg}
                className="w-full dos-bevel-out bg-[#00aaaa] hover:bg-cyan-300 text-black font-bold py-1.5 text-xs flex items-center justify-center gap-1.5 cursor-pointer active:dos-bevel-in shadow"
              >
                <Download className="w-4 h-4" />
                <span>SAVE & DOWNLOAD M2SPRE.CFG</span>
              </button>
            </div>
          </div>

        </div>

        {/* Bottom Action Bar: File I/O & Source Downloads */}
        <div className="bg-[#000080] border-t-2 border-[#555555] p-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Import CFG */}
            <input
              type="file"
              ref={fileInputRef}
              accept=".cfg,.txt"
              className="hidden"
              onChange={handleImportCfg}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="dos-bevel-out bg-[#000055] hover:bg-[#0000aa] text-cyan-300 border border-[#005577] px-2.5 py-1 font-bold cursor-pointer flex items-center gap-1 active:dos-bevel-in"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>LOAD M2SPRE.CFG</span>
            </button>

            {/* Download M2SPCT.C */}
            <button
              type="button"
              onClick={handleDownloadCSource}
              className="dos-bevel-out bg-[#000055] hover:bg-[#0000aa] text-yellow-300 border border-[#005577] px-2.5 py-1 font-bold cursor-pointer flex items-center gap-1 active:dos-bevel-in"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>DOWNLOAD M2SPCT.C</span>
            </button>

            {/* Download M2SPCT.COM */}
            <button
              type="button"
              onClick={handleDownloadCom}
              className="dos-bevel-out bg-[#000055] hover:bg-[#0000aa] text-green-300 border border-[#005577] px-2.5 py-1 font-bold cursor-pointer flex items-center gap-1 active:dos-bevel-in"
            >
              <Download className="w-3.5 h-3.5" />
              <span>DOWNLOAD M2SPCT.COM</span>
            </button>
          </div>

          {copiedNotice && (
            <span className="bg-green-700 text-white px-2 py-0.5 text-xs font-bold border border-green-300">
              {copiedNotice}
            </span>
          )}
        </div>

        {/* Footer Status Bar */}
        <div className="bg-[#aaaaaa] text-black px-3 py-1 font-bold text-xs flex items-center justify-between border-t border-black select-none">
          <div className="truncate">
            <span className="text-[#000080]">M2SPCT v1.0 STATUS: </span>
            <span>{statusMessage}</span>
          </div>
          <div className="text-[11px] text-gray-700">
            BORLAND C++ 3.1 & TURBO C COMPLIANT
          </div>
        </div>

      </div>
    </div>
  );
};
