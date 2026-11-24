import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
}

export const Logo: React.FC<LogoProps> = ({ className = '', size = 36 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Background dark blue square */}
      <rect width="100" height="100" rx="16" fill="#001a4e" />

      {/* Stylized 'tz' white logo */}
      <g stroke="#ffffff" strokeWidth="8" strokeLinecap="square" strokeLinejoin="miter">
        {/* Left horizontal crossbar of 't' */}
        <line x1="20" y1="35" x2="33" y2="35" />

        {/* Top horizontal bar of 'z' */}
        <line x1="40" y1="31" x2="74" y2="31" />

        {/* Vertical stem of 't' curving into bottom-right */}
        <path d="M 35 21 V 56 A 12 12 0 0 0 47 68 H 74" />

        {/* Diagonal line of 'z' */}
        <line x1="74" y1="31" x2="36" y2="78" />

        {/* Bottom horizontal bar of 'z' */}
        <line x1="51" y1="62" x2="74" y2="62" />
      </g>
    </svg>
  );
};

export default Logo;
