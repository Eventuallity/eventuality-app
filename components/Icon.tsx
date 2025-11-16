import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface IconProps {
  name: string;
  className?: string;
  color?: string;
}

const ICONS: { [key: string]: string } = {
  home: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z",
  discover: "M10 18l1.65-3.3L15 13l-3.35-1.7L10 8l-1.65 3.3L5 13l3.35 1.7L10 18zm10-10l-1-2-1 2-2 1 2 1 1 2 1-2 2-1-2-1zM2 8l1-2 1 2 2 1-2 1-1 2-1-2-2-1 2-1z",
  search: "M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z",
  plus: "M12 4v16m8-8H4",
  user: "M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z",
  like: "M4.318 6.318a4.5 4.5 0 016.364 0L12 7.66l1.318-1.342a4.5 4.5 0 116.364 6.364L12 20.364l-7.682-7.682a4.5 4.5 0 010-6.364z",
  calendar: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
  share: "M18 8a3 3 0 100-6 3 3 0 000 6zM6 15a3 3 0 100-6 3 3 0 000 6zm12 7a3 3 0 100-6 3 3 0 000 6zM8.59 13.51l6.83 3.98m0-9.98l-6.83 3.98",
  x: "M6 18L18 6M6 6l12 12",
  upload: "M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5",
  check: "M4.5 12.75l6 6 9-13.5",
  logout: "M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1",
  camera: "M4 7a2 2 0 012-2h1.5l.894-1.789A2 2 0 0110.236 2h3.528a2 2 0 011.842 1.211L16.5 5H18a2 2 0 012 2v8a3 3 0 01-3 3H7a3 3 0 01-3-3V7zm8 9a4 4 0 100-8 4 4 0 000 8z",
};

// A simple utility to parse Tailwind-like size classes (e.g., 'w-6 h-6')
const parseSize = (className: string) => {
    const sizeMatch = className.match(/w-(\d+)\s+h-(\d+)/);
    if (sizeMatch) {
      const size = parseInt(sizeMatch[1]) * 4; // Tailwind's size unit is 0.25rem = 4px
      return { width: size, height: size };
    }
    return { width: 24, height: 24 };
};

const Icon: React.FC<IconProps> = ({ name, className = 'w-6 h-6', color = '#a8a29e' }) => {
  const { width, height } = parseSize(className);
  return (
    <Svg fill="none" viewBox="0 0 24 24" strokeWidth={1.25} stroke={color} width={width} height={height}>
      <Path strokeLinecap="round" strokeLinejoin="round" d={ICONS[name] || ''} />
    </Svg>
  );
};

export default Icon;
