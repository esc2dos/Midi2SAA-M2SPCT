import React from 'react';
import { SAAChannelMeter } from '../audio/saa1099Synth';

interface ChannelActivityMetersProps {
  meters: SAAChannelMeter[];
}

export const ChannelActivityMeters: React.FC<ChannelActivityMetersProps> = ({ meters }) => {
  const chip0Voices = meters.slice(0, 6);
  const chip1Voices = meters.slice(6, 12);

  return (
    <div className="bg-[#000080] border-2 border-[#555555] dos-bevel-in p-3 font-dos">
      <div className="flex flex-wrap items-center justify-between border-b border-[#00aaaa] pb-1.5 mb-2.5 gap-2">
        <div className="flex items-center gap-2">
          <span className="text-yellow-300 font-bold tracking-wider text-sm">
            PHILIPS DUAL SAA1099 SOUND GENERATOR MONITOR
          </span>
          <span className="text-[11px] bg-green-900 text-green-200 border border-green-400 px-1.5 py-0.5">
            12 STEREO VOICES (C/MS · GAME BLASTER)
          </span>
        </div>
        <div className="text-cyan-300 text-xs">
          PORTS: 0x220/0x221 (CHIP 0) & 0x222/0x223 (CHIP 1) · ZERO RHYTHM NOISE
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* SAA1099 CHIP 0 (Voices 1 - 6) */}
        <div className="bg-[#000044] border border-[#00aaaa] p-2">
          <div className="flex items-center justify-between text-xs text-yellow-300 font-bold mb-1.5 pb-1 border-b border-[#005577]">
            <span>PHILIPS SAA1099 #0 (LEFT BUS · 0x220/0x221)</span>
            <span className="text-cyan-400 text-[10px]">CH 1-6 SQUARE WAVE</span>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-1 text-center text-xs">
            {chip0Voices.map((m, idx) => (
              <div
                key={`chip0-ch-${idx}`}
                className={`p-1 border transition-all ${
                  m.active
                    ? 'border-green-400 bg-green-950/90 text-green-300 shadow-[0_0_8px_rgba(74,222,128,0.7)]'
                    : 'border-[#333333] bg-[#000022] text-gray-500'
                }`}
              >
                <div className="font-bold text-[10px] text-cyan-200">
                  VOICE {idx + 1}
                </div>
                <div
                  className={`w-full h-1.5 my-1 rounded-xs transition-all ${
                    m.active ? 'bg-green-400 shadow-[0_0_5px_#4ade80]' : 'bg-gray-800'
                  }`}
                />
                <div className="font-mono text-xs font-bold truncate">
                  {m.active ? m.noteName : '--'}
                </div>
                <div className="text-[9px] text-gray-400 mt-0.5">
                  {m.active ? 'CHIP 0' : 'IDLE'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SAA1099 CHIP 1 (Voices 7 - 12) */}
        <div className="bg-[#000044] border border-[#00aaaa] p-2">
          <div className="flex items-center justify-between text-xs text-yellow-300 font-bold mb-1.5 pb-1 border-b border-[#005577]">
            <span>PHILIPS SAA1099 #1 (RIGHT BUS · 0x222/0x223)</span>
            <span className="text-cyan-400 text-[10px]">CH 7-12 SQUARE WAVE / CHORUS</span>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-1 text-center text-xs">
            {chip1Voices.map((m, idx) => (
              <div
                key={`chip1-ch-${idx + 6}`}
                className={`p-1 border transition-all ${
                  m.active
                    ? 'border-cyan-400 bg-cyan-950/90 text-cyan-300 shadow-[0_0_8px_rgba(34,211,238,0.7)]'
                    : 'border-[#333333] bg-[#000022] text-gray-500'
                }`}
              >
                <div className="font-bold text-[10px] text-yellow-200">
                  VOICE {idx + 7}
                </div>
                <div
                  className={`w-full h-1.5 my-1 rounded-xs transition-all ${
                    m.active ? 'bg-cyan-400 shadow-[0_0_5px_#22d3ee]' : 'bg-gray-800'
                  }`}
                />
                <div className="font-mono text-xs font-bold truncate">
                  {m.active ? m.noteName : '--'}
                </div>
                <div className="text-[9px] text-gray-400 mt-0.5">
                  {m.active ? 'CHIP 1' : 'IDLE'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
