import React, { useState } from 'react';
import {
  CMS_TURBO_C_SOURCE,
  SAA1099_H_SOURCE,
  GAMEPORT_PINOUT_TXT,
  CMS_BUILD_BAT,
  ORGANHEX_TUNING_GUIDE,
  generateCmsDosBinary,
  M2SPCT_C_SOURCE,
  M2STOOL_C_SOURCE,
  DEFAULT_M2SPRE_CFG,
} from '../dos/dosBinaryGenerator';

interface DosSourceViewerProps {
  onClose: () => void;
}

export const DosSourceViewer: React.FC<DosSourceViewerProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'source' | 'm2spct' | 'm2stool' | 'm2spre' | 'header' | 'gameport' | 'organhex' | 'build_bat'>('source');
  const [copied, setCopied] = useState(false);

  // Trigger download of genuine DOS .COM executable
  const handleDownloadCom = (filename = 'MIDI2SAA.COM') => {
    const comBinary = generateCmsDosBinary();
    const blob = new Blob([comBinary.buffer as ArrayBuffer], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Trigger download of text files
  const handleDownloadTextFile = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const currentContent =
    activeTab === 'source'
      ? CMS_TURBO_C_SOURCE
      : (activeTab === 'm2spct' || activeTab === 'm2stool')
      ? M2SPCT_C_SOURCE
      : activeTab === 'm2spre'
      ? DEFAULT_M2SPRE_CFG
      : activeTab === 'header'
      ? SAA1099_H_SOURCE
      : activeTab === 'gameport'
      ? GAMEPORT_PINOUT_TXT
      : activeTab === 'organhex'
      ? ORGANHEX_TUNING_GUIDE
      : CMS_BUILD_BAT;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3 md:p-6 font-dos">
      <div className="bg-[#0000aa] border-4 border-[#aaaaaa] dos-bevel-out w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl">
        {/* Title Bar */}
        <div className="bg-[#00aaaa] text-black px-3 py-1.5 flex items-center justify-between font-bold text-sm">
          <span>386DX-40 DEPLOYMENT: Midi2Saa v2.2 & M2SPCT (DUAL PHILIPS SAA1099 C/MS · BORLAND C++ 3.1)</span>
          <button
            type="button"
            onClick={onClose}
            className="dos-bevel-out bg-[#aaaaaa] hover:bg-white text-black px-2 py-0.5 text-xs font-bold cursor-pointer"
          >
            [X] CLOSE
          </button>
        </div>

        {/* Action Toolbar */}
        <div className="bg-[#000080] p-3 border-b-2 border-[#555555] flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleDownloadCom('MIDI2SAA.COM')}
              className="dos-bevel-out bg-green-500 hover:bg-green-400 text-black font-bold px-3 py-1 text-xs cursor-pointer active:dos-bevel-in shadow"
            >
              DOWNLOAD MIDI2SAA.COM
            </button>

            <button
              type="button"
              onClick={() => handleDownloadTextFile('MIDI2SAA.C', CMS_TURBO_C_SOURCE)}
              className="dos-bevel-out bg-yellow-400 hover:bg-yellow-300 text-black font-bold px-3 py-1 text-xs cursor-pointer active:dos-bevel-in"
            >
              DOWNLOAD MIDI2SAA.C
            </button>

            <button
              type="button"
              onClick={() => handleDownloadTextFile('M2SPCT.C', M2SPCT_C_SOURCE)}
              className="dos-bevel-out bg-orange-400 hover:bg-orange-300 text-black font-bold px-3 py-1 text-xs cursor-pointer active:dos-bevel-in"
            >
              DOWNLOAD M2SPCT.C
            </button>

            <button
              type="button"
              onClick={() => handleDownloadTextFile('M2SPRE.CFG', DEFAULT_M2SPRE_CFG)}
              className="dos-bevel-out bg-emerald-400 hover:bg-emerald-300 text-black font-bold px-3 py-1 text-xs cursor-pointer active:dos-bevel-in"
            >
              DOWNLOAD M2SPRE.CFG
            </button>

            <button
              type="button"
              onClick={() => handleDownloadTextFile('BUILD.BAT', CMS_BUILD_BAT)}
              className="dos-bevel-out bg-purple-400 hover:bg-purple-300 text-black font-bold px-3 py-1 text-xs cursor-pointer active:dos-bevel-in"
            >
              DOWNLOAD BUILD.BAT
            </button>
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="dos-bevel-out bg-[#aaaaaa] hover:bg-white text-black font-bold px-3 py-1 text-xs cursor-pointer active:dos-bevel-in"
          >
            {copied ? 'COPIED TO CLIPBOARD!' : 'COPY CODE'}
          </button>
        </div>

        {/* Tab selection */}
        <div className="flex bg-[#000055] border-b border-[#00aaaa] px-2 pt-2 gap-1 text-xs overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('source')}
            className={`px-3 py-1 font-bold cursor-pointer border-t border-x whitespace-nowrap ${
              activeTab === 'source'
                ? 'bg-[#0000aa] text-yellow-300 border-[#aaaaaa]'
                : 'bg-[#000033] text-gray-400 border-transparent hover:text-white'
            }`}
          >
            MIDI2SAA.C (v2.2)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('m2spct')}
            className={`px-3 py-1 font-bold cursor-pointer border-t border-x whitespace-nowrap ${
              activeTab === 'm2spct' || activeTab === 'm2stool'
                ? 'bg-[#0000aa] text-yellow-300 border-[#aaaaaa]'
                : 'bg-[#000033] text-gray-400 border-transparent hover:text-white'
            }`}
          >
            M2SPCT.C (PRESET CREATOR)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('m2spre')}
            className={`px-3 py-1 font-bold cursor-pointer border-t border-x whitespace-nowrap ${
              activeTab === 'm2spre'
                ? 'bg-[#0000aa] text-yellow-300 border-[#aaaaaa]'
                : 'bg-[#000033] text-gray-400 border-transparent hover:text-white'
            }`}
          >
            M2SPRE.CFG (PRESET CONFIG)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('header')}
            className={`px-3 py-1 font-bold cursor-pointer border-t border-x whitespace-nowrap ${
              activeTab === 'header'
                ? 'bg-[#0000aa] text-yellow-300 border-[#aaaaaa]'
                : 'bg-[#000033] text-gray-400 border-transparent hover:text-white'
            }`}
          >
            SAA1099.H
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('build_bat')}
            className={`px-3 py-1 font-bold cursor-pointer border-t border-x whitespace-nowrap ${
              activeTab === 'build_bat'
                ? 'bg-[#0000aa] text-yellow-300 border-[#aaaaaa]'
                : 'bg-[#000033] text-gray-400 border-transparent hover:text-white'
            }`}
          >
            BUILD.BAT
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('gameport')}
            className={`px-3 py-1 font-bold cursor-pointer border-t border-x whitespace-nowrap ${
              activeTab === 'gameport'
                ? 'bg-[#0000aa] text-yellow-300 border-[#aaaaaa]'
                : 'bg-[#000033] text-gray-400 border-transparent hover:text-white'
            }`}
          >
            GAMEPORT PINOUT
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('organhex')}
            className={`px-3 py-1 font-bold cursor-pointer border-t border-x whitespace-nowrap ${
              activeTab === 'organhex'
                ? 'bg-[#0000aa] text-yellow-300 border-[#aaaaaa]'
                : 'bg-[#000033] text-gray-400 border-transparent hover:text-white'
            }`}
          >
            ORGANHEX ANALYSIS
          </button>
        </div>

        {/* Code Content */}
        <div className="flex-1 overflow-auto p-4 bg-[#000022] font-mono text-xs text-green-300 leading-relaxed border-2 border-[#555555] m-2">
          <pre className="whitespace-pre">{currentContent}</pre>
        </div>

        {/* Footer */}
        <div className="bg-[#000080] px-4 py-2 text-xs text-yellow-300 flex flex-wrap justify-between border-t border-[#555555] gap-2">
          <span>Midi2Saa v2.1 · Dual Philips SAA1099 (C/MS 0x220-0x223) · F1-F12 Presets · Borland C++ 3.1 & Turbo C</span>
        </div>
      </div>
    </div>
  );
};

