import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Activity, Sliders, RotateCcw, Volume2 } from 'lucide-react';

interface PitchModWheelsProps {
  pitchBend: number; // -1.0 to +1.0
  pitchBendRange: number; // in semitones (e.g. 2, 7, 12)
  modulation: number; // 0.0 to 1.0
  vibratoRate: number; // in Hz
  onPitchBendChange: (normalized: number) => void;
  onPitchBendRangeChange: (range: number) => void;
  onModulationChange: (depth: number) => void;
  onVibratoRateChange: (rateHz: number) => void;
}

export const PitchModWheels: React.FC<PitchModWheelsProps> = ({
  pitchBend,
  pitchBendRange,
  modulation,
  vibratoRate,
  onPitchBendChange,
  onPitchBendRangeChange,
  onModulationChange,
  onVibratoRateChange,
}) => {
  const pitchWheelRef = useRef<HTMLDivElement>(null);
  const modWheelRef = useRef<HTMLDivElement>(null);

  const [isDraggingPitch, setIsDraggingPitch] = useState(false);
  const [isDraggingMod, setIsDraggingMod] = useState(false);

  // Calculate current pitch in semitones and cents
  const semitonesOffset = pitchBend * pitchBendRange;
  const centsOffset = Math.round(semitonesOffset * 100);

  // Pitch bend dragging (Spring return on mouse up)
  const handlePitchPointerMove = useCallback((clientY: number) => {
    if (!pitchWheelRef.current) return;
    const rect = pitchWheelRef.current.getBoundingClientRect();
    const height = rect.height;
    const relativeY = clientY - rect.top;
    // Top of wheel is +1.0, center is 0.0, bottom is -1.0
    const clampedY = Math.max(0, Math.min(height, relativeY));
    const normalized = -((clampedY / height) * 2 - 1); // inverted: up is positive
    onPitchBendChange(Math.max(-1, Math.min(1, normalized)));
  }, [onPitchBendChange]);

  // Mod wheel dragging (Retains position)
  const handleModPointerMove = useCallback((clientY: number) => {
    if (!modWheelRef.current) return;
    const rect = modWheelRef.current.getBoundingClientRect();
    const height = rect.height;
    const relativeY = clientY - rect.top;
    // Top of wheel is 1.0 (100%), bottom is 0.0 (0%)
    const clampedY = Math.max(0, Math.min(height, relativeY));
    const depth = 1 - (clampedY / height);
    onModulationChange(Math.max(0, Math.min(1, depth)));
  }, [onModulationChange]);

  useEffect(() => {
    const onWindowMouseMove = (e: MouseEvent) => {
      if (isDraggingPitch) {
        handlePitchPointerMove(e.clientY);
      } else if (isDraggingMod) {
        handleModPointerMove(e.clientY);
      }
    };

    const onWindowMouseUp = () => {
      if (isDraggingPitch) {
        setIsDraggingPitch(false);
        // Spring return to center!
        onPitchBendChange(0);
      }
      if (isDraggingMod) {
        setIsDraggingMod(false);
      }
    };

    const onWindowTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        if (isDraggingPitch) {
          handlePitchPointerMove(e.touches[0].clientY);
        } else if (isDraggingMod) {
          handleModPointerMove(e.touches[0].clientY);
        }
      }
    };

    const onWindowTouchEnd = () => {
      if (isDraggingPitch) {
        setIsDraggingPitch(false);
        onPitchBendChange(0);
      }
      if (isDraggingMod) {
        setIsDraggingMod(false);
      }
    };

    if (isDraggingPitch || isDraggingMod) {
      window.addEventListener('mousemove', onWindowMouseMove);
      window.addEventListener('mouseup', onWindowMouseUp);
      window.addEventListener('touchmove', onWindowTouchMove);
      window.addEventListener('touchend', onWindowTouchEnd);
    }

    return () => {
      window.removeEventListener('mousemove', onWindowMouseMove);
      window.removeEventListener('mouseup', onWindowMouseUp);
      window.removeEventListener('touchmove', onWindowTouchMove);
      window.removeEventListener('touchend', onWindowTouchEnd);
    };
  }, [isDraggingPitch, isDraggingMod, handlePitchPointerMove, handleModPointerMove, onPitchBendChange]);

  // Visual wheel transformation
  // Pitch bend: 0 is center (50%), +1 is top (10%), -1 is bottom (90%)
  const pitchWheelPercent = 50 - (pitchBend * 40);
  // Mod wheel: 0 is bottom (90%), 1 is top (10%)
  const modWheelPercent = 90 - (modulation * 80);

  return (
    <div className="bg-[#000080] border-2 border-[#555555] dos-bevel-in p-3 font-dos select-none">
      {/* Title Bar */}
      <div className="flex flex-wrap items-center justify-between border-b border-[#00aaaa] pb-1.5 mb-2 gap-2">
        <span className="text-yellow-300 font-bold text-xs flex items-center gap-1.5">
          <Sliders className="w-3.5 h-3.5" />
          <span>PERFORMANCE CONTROLLERS: PITCH BEND & MODULATION WHEELS</span>
        </span>
        <div className="text-[11px] text-gray-300 flex items-center gap-3">
          <span>KEYBOARD: <span className="text-cyan-300 font-bold">[←/→] PITCH BEND</span> · <span className="text-cyan-300 font-bold">[↑/↓] MODULATION</span></span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* ================= PITCH BEND CONTROLLER ================= */}
        <div className="bg-[#000055] border border-[#0000aa] p-2.5 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-[#005577] pb-1 mb-2">
            <span className="text-yellow-300 font-bold text-xs flex items-center gap-1">
              <span>PITCH BEND (SPRING-LOADED)</span>
            </span>
            <span className="font-mono text-xs font-bold px-1.5 py-0.5 bg-[#000022] border border-[#555555] text-green-300">
              {semitonesOffset >= 0 ? `+${semitonesOffset.toFixed(2)}` : semitonesOffset.toFixed(2)} ST ({centsOffset >= 0 ? `+${centsOffset}` : centsOffset}¢)
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* The Physical Pitch Wheel Graphic */}
            <div
              ref={pitchWheelRef}
              onMouseDown={(e) => {
                e.preventDefault();
                setIsDraggingPitch(true);
                handlePitchPointerMove(e.clientY);
              }}
              onTouchStart={(e) => {
                e.preventDefault();
                setIsDraggingPitch(true);
                if (e.touches.length > 0) handlePitchPointerMove(e.touches[0].clientY);
              }}
              className="relative w-14 h-36 bg-gradient-to-r from-gray-900 via-gray-700 to-gray-900 border-2 border-black rounded-sm cursor-ns-resize shadow-inner overflow-hidden flex flex-col justify-center items-center"
              title="Click and drag up/down to bend pitch. Auto-springs back to center!"
            >
              {/* Subtle Grooves on Wheel */}
              <div className="absolute inset-0 flex flex-col justify-between py-1 opacity-25 pointer-events-none">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="w-full h-0.5 bg-black" />
                ))}
              </div>

              {/* Center Detent Baseline */}
              <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-cyan-400/50 -translate-y-1/2 pointer-events-none" />

              {/* Indicator Notch */}
              <div
                className="absolute left-1 right-1 h-3 rounded-xs bg-yellow-400 border border-black shadow-md flex items-center justify-center transition-all duration-75 pointer-events-none"
                style={{ top: `${pitchWheelPercent}%`, transform: 'translateY(-50%)' }}
              >
                <div className="w-6 h-0.5 bg-black" />
              </div>

              {/* Label inside wheel */}
              <span className="absolute bottom-1 text-[8px] font-mono text-gray-400 select-none pointer-events-none font-bold">
                BEND
              </span>
            </div>

            {/* Range & Preset Controls */}
            <div className="flex-1 flex flex-col justify-between h-36 text-xs">
              <div>
                <span className="text-gray-400 block text-[11px] mb-1">BEND RANGE:</span>
                <div className="grid grid-cols-3 gap-1 mb-2">
                  {[2, 7, 12].map((range) => (
                    <button
                      key={range}
                      type="button"
                      onClick={() => onPitchBendRangeChange(range)}
                      className={`px-2 py-1 font-bold text-[11px] cursor-pointer transition-colors ${
                        pitchBendRange === range
                          ? 'bg-[#00aaaa] text-black dos-bevel-in'
                          : 'bg-[#000080] text-cyan-200 border border-[#005577] hover:bg-[#0000aa] dos-bevel-out'
                      }`}
                    >
                      ±{range} ST {range === 2 ? '(STEP)' : range === 7 ? '(5TH)' : '(OCT)'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-gray-400 block text-[11px] mb-1">QUICK BEND BUTTONS:</span>
                <div className="grid grid-cols-5 gap-1">
                  {[-1, -0.5, 0, 0.5, 1].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => onPitchBendChange(val)}
                      className={`px-1 py-1 font-mono text-[10px] font-bold cursor-pointer transition-colors ${
                        pitchBend === val
                          ? 'bg-yellow-400 text-black dos-bevel-in'
                          : 'bg-[#000080] text-gray-200 border border-[#005577] hover:bg-[#0000aa] dos-bevel-out'
                      }`}
                    >
                      {val === 0 ? 'CTR 0' : val > 0 ? `+${val}` : val}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between text-[10px] text-gray-400 pt-1 border-t border-[#005577]">
                <span>Hardware: MIDI 0xE0 (14-bit)</span>
                <button
                  type="button"
                  onClick={() => onPitchBendChange(0)}
                  className="text-yellow-300 hover:text-white underline cursor-pointer flex items-center gap-0.5"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  <span>RESET TO ZERO</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ================= MODULATION CONTROLLER ================= */}
        <div className="bg-[#000055] border border-[#0000aa] p-2.5 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-[#005577] pb-1 mb-2">
            <div className="flex items-center gap-2">
              <span className="text-yellow-300 font-bold text-xs">MODULATION (VIBRATO LFO)</span>
              {/* Pulsing LFO LED */}
              <span
                className={`inline-block w-2.5 h-2.5 rounded-full border border-black ${
                  modulation > 0.05
                    ? 'bg-red-500 animate-pulse shadow-sm shadow-red-400'
                    : 'bg-red-950 opacity-40'
                }`}
                title="Vibrato LFO LED"
              />
            </div>
            <span className="font-mono text-xs font-bold px-1.5 py-0.5 bg-[#000022] border border-[#555555] text-cyan-300">
              DEPTH: {Math.round(modulation * 100)}% {modulation > 0 ? '(ON)' : '(OFF)'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* The Physical Mod Wheel Graphic */}
            <div
              ref={modWheelRef}
              onMouseDown={(e) => {
                e.preventDefault();
                setIsDraggingMod(true);
                handleModPointerMove(e.clientY);
              }}
              onTouchStart={(e) => {
                e.preventDefault();
                setIsDraggingMod(true);
                if (e.touches.length > 0) handleModPointerMove(e.touches[0].clientY);
              }}
              className="relative w-14 h-36 bg-gradient-to-r from-gray-900 via-gray-700 to-gray-900 border-2 border-black rounded-sm cursor-ns-resize shadow-inner overflow-hidden flex flex-col justify-center items-center"
              title="Click and drag up/down to adjust vibrato depth. Retains position!"
            >
              {/* Subtle Grooves on Wheel */}
              <div className="absolute inset-0 flex flex-col justify-between py-1 opacity-25 pointer-events-none">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="w-full h-0.5 bg-black" />
                ))}
              </div>

              {/* Active Fill Level Bar */}
              <div
                className="absolute bottom-0 left-0 right-0 bg-cyan-500/30 pointer-events-none transition-all duration-75"
                style={{ height: `${modulation * 100}%` }}
              />

              {/* Indicator Notch */}
              <div
                className="absolute left-1 right-1 h-3 rounded-xs bg-cyan-400 border border-black shadow-md flex items-center justify-center transition-all duration-75 pointer-events-none"
                style={{ top: `${modWheelPercent}%`, transform: 'translateY(-50%)' }}
              >
                <div className="w-6 h-0.5 bg-black" />
              </div>

              {/* Label inside wheel */}
              <span className="absolute bottom-1 text-[8px] font-mono text-gray-400 select-none pointer-events-none font-bold">
                MOD
              </span>
            </div>

            {/* Modulation Depth & Rate Controls */}
            <div className="flex-1 flex flex-col justify-between h-36 text-xs">
              <div>
                <div className="flex items-center justify-between text-[11px] text-gray-400 mb-1">
                  <span>VIBRATO RATE:</span>
                  <span className="text-yellow-300 font-bold font-mono">{vibratoRate.toFixed(1)} Hz</span>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="range"
                    min="3.0"
                    max="9.0"
                    step="0.5"
                    value={vibratoRate}
                    onChange={(e) => onVibratoRateChange(parseFloat(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-[#000033] rounded-none border border-[#555555]"
                  />
                </div>
              </div>

              <div>
                <span className="text-gray-400 block text-[11px] mb-1">MOD WHEEL PRESETS:</span>
                <div className="grid grid-cols-4 gap-1">
                  {[0, 0.33, 0.66, 1.0].map((depth) => (
                    <button
                      key={depth}
                      type="button"
                      onClick={() => onModulationChange(depth)}
                      className={`px-1 py-1 font-mono text-[10px] font-bold cursor-pointer transition-colors ${
                        Math.abs(modulation - depth) < 0.05
                          ? 'bg-cyan-400 text-black dos-bevel-in'
                          : 'bg-[#000080] text-gray-200 border border-[#005577] hover:bg-[#0000aa] dos-bevel-out'
                      }`}
                    >
                      {depth === 0 ? '0% OFF' : `${Math.round(depth * 100)}%`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between text-[10px] text-gray-400 pt-1 border-t border-[#005577]">
                <span>Hardware: MIDI CC #1 (Mod Wheel)</span>
                <button
                  type="button"
                  onClick={() => onModulationChange(0)}
                  className="text-yellow-300 hover:text-white underline cursor-pointer flex items-center gap-0.5"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  <span>MUTE MODULATION</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
