import React from 'react';

const HexGridBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 w-full h-full z-0 overflow-hidden bg-black">
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="hex-pattern" patternUnits="userSpaceOnUse" width="100" height="115.47" x="0" y="0">
            <g>
              <path
                d="M50 0 L100 28.8675 V86.6025 L50 115.47 L0 86.6025 V28.8675 Z"
                strokeWidth="1"
                className="stroke-brand-aqua/10 fill-transparent"
              />
            </g>
          </pattern>
           <radialGradient id="glow-gradient">
            <stop offset="0%" stopColor="#2BFFC2" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#2BFFC2" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#hex-pattern)" />
        <rect width="100%" height="100%" fill="url(#glow-gradient)" className="animate-pulse" />
      </svg>
    </div>
  );
};

export default HexGridBackground;