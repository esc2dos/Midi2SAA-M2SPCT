import React from 'react';

interface CrtOverlayProps {
  enabled: boolean;
  curvature: boolean;
  amberMode: boolean;
  children: React.ReactNode;
}

export const CrtOverlay: React.FC<CrtOverlayProps> = ({
  enabled,
  curvature,
  amberMode,
  children,
}) => {
  return (
    <div
      className={`relative min-h-screen transition-colors duration-300 ${
        amberMode
          ? 'bg-[#150e02] text-[#ffb000]'
          : 'bg-[#000030] text-[#f0f0f0]'
      }`}
    >
      <div
        className={`relative w-full min-h-screen ${
          curvature ? 'crt-screen crt-vignette' : ''
        } ${enabled ? 'crt-scanlines' : ''}`}
      >
        {children}
      </div>
    </div>
  );
};
