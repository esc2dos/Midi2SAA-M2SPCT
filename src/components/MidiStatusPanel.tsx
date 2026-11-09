import React, { useState } from 'react';
import { midiManager, MidiLogEntry } from '../audio/midiManager';
import { ExternalLink, RefreshCw, Volume2, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface MidiStatusPanelProps {
  isMidiSupported: boolean;
  isMidiConnected: boolean;
  activeDeviceName: string;
  errorMessage: string | null;
  lastNote: { note: number; name: string; velocity: number } | null;
  pitchBend?: number;
  pitchBendRange?: number;
  modulation?: number;
  midiLog: MidiLogEntry[];
  onConnectClick: () => void;
  onTestNoteClick: () => void;
  onTestPitchBend?: () => void;
  onTestModulation?: () => void;
}

export const MidiStatusPanel: React.FC<MidiStatusPanelProps> = ({
  isMidiSupported,
  isMidiConnected,
  activeDeviceName,
  errorMessage,
  lastNote,
  pitchBend = 0,
  pitchBendRange = 2,
  modulation = 0,
  midiLog,
  onConnectClick,
  onTestNoteClick,
  onTestPitchBend,
  onTestModulation,
}) => {
  const [showLog, setShowLog] = useState(false);

  const semitonesOffset = pitchBend * pitchBendRange;

  return (
    <div className="bg-[#000080] border-2 border-[#555555] dos-bevel-in p-3 font-dos text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#00aaaa] pb-1.5 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-yellow-300 font-bold tracking-wide">
            MIDI INTERFACE (SOUND BLASTER GAMEPORT / USB-MIDI → PHILIPS SAA1099)
          </span>
          <span
            className={`px-1.5 py-0.5 text-[11px] font-bold flex items-center gap-1 ${
              isMidiConnected
                ? 'bg-green-700 text-green-100 border border-green-400'
                : 'bg-red-800 text-red-200 border border-red-500'
            }`}
          >
            {isMidiConnected ? (
              <>
                <CheckCircle2 className="w-3 h-3" />
                ONLINE
              </>
            ) : (
              <>
                <AlertTriangle className="w-3 h-3" />
                NOT CONNECTED
              </>
            )}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Diagnostic Note Test */}
          <button
            type="button"
            onClick={onTestNoteClick}
            className="dos-bevel-out bg-[#00aaaa] hover:bg-cyan-300 text-black font-bold px-2.5 py-1 cursor-pointer transition-colors active:dos-bevel-in flex items-center gap-1"
          >
            <Volume2 className="w-3 h-3" />
            <span>TEST NOTE C4</span>
          </button>

          {onTestPitchBend && (
            <button
              type="button"
              onClick={onTestPitchBend}
              className="dos-bevel-out bg-[#000055] hover:bg-[#0000aa] text-yellow-300 border border-[#005577] font-bold px-2 py-1 cursor-pointer active:dos-bevel-in"
            >
              TEST BEND
            </button>
          )}

          {onTestModulation && (
            <button
              type="button"
              onClick={onTestModulation}
              className="dos-bevel-out bg-[#000055] hover:bg-[#0000aa] text-cyan-300 border border-[#005577] font-bold px-2 py-1 cursor-pointer active:dos-bevel-in"
            >
              TEST MOD
            </button>
          )}

          {/* Connect / Rescan */}
          <button
            type="button"
            onClick={onConnectClick}
            className="dos-bevel-out bg-yellow-400 hover:bg-yellow-300 text-black font-bold px-3 py-1 cursor-pointer transition-colors active:dos-bevel-in flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" />
            <span>{isMidiConnected ? 'RE-SCAN MIDI' : 'ENABLE / CONNECT MIDI'}</span>
          </button>
        </div>
      </div>

      {/* Error / Permission Warning Banner */}
      {errorMessage && (
        <div className="bg-red-950 border border-red-500 text-red-200 p-2 mb-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>
              <strong>MIDI Issue:</strong> {errorMessage}
            </span>
          </div>
          <button
            type="button"
            onClick={() => window.open(window.location.href, '_blank')}
            className="bg-red-800 hover:bg-red-700 text-white px-2 py-0.5 border border-red-300 font-bold flex items-center gap-1 cursor-pointer text-[11px]"
          >
            <ExternalLink className="w-3 h-3" />
            <span>OPEN IN NEW TAB (BYPASS IFRAME)</span>
          </button>
        </div>
      )}

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        {/* Detected Devices */}
        <div className="bg-[#000055] p-2 border border-[#0000aa]">
          <span className="text-gray-400 block text-[11px]">DETECTED MIDI HARDWARE:</span>
          <span className="text-white font-bold text-sm truncate block mt-0.5">
            {isMidiConnected ? activeDeviceName : 'No MIDI keyboard detected'}
          </span>
          <span className="text-cyan-300 text-[10px] block mt-1">
            {midiManager.devices.length > 0
              ? `${midiManager.devices.length} port(s) active · Listening on all channels`
              : 'Plug in USB-MIDI or Gameport adapter, then click Re-scan'}
          </span>
        </div>

        {/* Live Signal */}
        <div className="bg-[#000055] p-2 border border-[#0000aa]">
          <span className="text-gray-400 block text-[11px]">LIVE MIDI SIGNAL:</span>
          {lastNote ? (
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-green-400 font-bold text-sm">
                NOTE: {lastNote.name} (#{lastNote.note})
              </span>
              <span className="text-yellow-300 text-xs font-mono">
                VEL: {lastNote.velocity}
              </span>
            </div>
          ) : (
            <span className="text-gray-500 italic block mt-0.5">
              No keys pressed yet. Play your keyboard!
            </span>
          )}

          {/* Controllers status */}
          <div className="flex items-center gap-3 mt-1 pt-1 border-t border-[#003366] text-[10px] font-mono">
            <span className={Math.abs(pitchBend) > 0.02 ? 'text-yellow-300 font-bold' : 'text-gray-400'}>
              BEND: {semitonesOffset >= 0 ? `+${semitonesOffset.toFixed(1)}` : semitonesOffset.toFixed(1)} ST
            </span>
            <span className={modulation > 0.05 ? 'text-cyan-300 font-bold' : 'text-gray-400'}>
              MOD: {Math.round(modulation * 100)}%
            </span>
          </div>
        </div>

        {/* Diagnostic Actions & Log Toggle */}
        <div className="bg-[#000055] p-2 border border-[#0000aa] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-[11px]">DIAGNOSTICS & LOGS:</span>
              <button
                type="button"
                onClick={() => setShowLog(!showLog)}
                className="text-cyan-300 underline text-[10px] cursor-pointer"
              >
                {showLog ? 'HIDE LOG' : 'SHOW BYTE LOG'}
              </button>
            </div>
            <div className="text-white text-[11px] mt-0.5">
              Sustain Pedal (CC 64) · Prog Change (0-15)
            </div>
          </div>
          <span className="text-yellow-300 text-[10px]">
            {isMidiSupported ? 'Browser Web MIDI API: Available' : 'Browser Web MIDI: Not Available'}
          </span>
        </div>
      </div>

      {/* Real-time MIDI Byte Stream Log */}
      {showLog && (
        <div className="mt-2 p-2 bg-[#000022] border border-[#00aaaa] font-mono text-[11px]">
          <div className="text-cyan-300 font-bold mb-1 border-b border-gray-700 pb-0.5">
            LIVE MIDI MESSAGE STREAM (HEX BYTES):
          </div>
          {midiLog.length === 0 ? (
            <div className="text-gray-500 italic">No incoming MIDI messages received yet.</div>
          ) : (
            <div className="space-y-0.5">
              {midiLog.map((entry, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-gray-500 text-[10px]">{entry.timestamp}</span>
                  <span className="text-yellow-300 font-bold">{entry.bytes}</span>
                  <span className="text-green-300 truncate">{entry.desc}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
