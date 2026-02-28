import React from 'react';

/**
 * CraftlyLogo — SVG logo component
 * Design: Amber rounded-square background with a white bold "C" arc
 * and a crafter's needle (with amber eye) emerging from the C's opening.
 *
 * @param {number}  size       Width/height in pixels (default 32)
 * @param {string}  className  Additional CSS classes
 * @param {boolean} withText   Show "Craftly" wordmark next to the icon (default false)
 */
const CraftlyLogo = ({ size = 32, className = '', withText = false }) => {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Craftly logo"
        role="img"
      >
        {/* Amber rounded-square background */}
        <rect width="40" height="40" rx="9" fill="#D97706" />

        {/* Subtle inner glow for depth */}
        <circle cx="20" cy="20" r="14" fill="#F59E0B" fillOpacity="0.3" />

        {/* Drop shadow on arc */}
        <path
          d="M26.5,13.5 A10.5,10.5 0 1,0 26.5,26.5"
          stroke="rgba(0,0,0,0.2)"
          strokeWidth="4.2"
          strokeLinecap="round"
          transform="translate(0.4, 0.5)"
        />

        {/* Bold "C" arc — center (20,20), radius 10, opens to the right (~270°) */}
        <path
          d="M26.5,13.5 A10.5,10.5 0 1,0 26.5,26.5"
          stroke="white"
          strokeWidth="4"
          strokeLinecap="round"
        />

        {/* Needle body — dart/triangle pointing up-right from C top gap */}
        <path
          d="M25.2,12.1 L27.9,14.6 L33.5,6.5 Z"
          fill="white"
        />

        {/* Needle eye — amber circle (hole in the needle) */}
        <circle cx="30.8" cy="10.2" r="1.25" fill="#D97706" />

        {/* Thread — short amber-yellow line from eye down into C opening */}
        <line
          x1="29.6"
          y1="11.4"
          x2="27.2"
          y2="13.2"
          stroke="#FCD34D"
          strokeWidth="0.9"
          strokeLinecap="round"
        />
      </svg>

      {withText && (
        <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-red-500">
          Craftly
        </span>
      )}
    </span>
  );
};

export default CraftlyLogo;
