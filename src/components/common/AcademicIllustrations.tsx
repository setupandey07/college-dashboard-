import React from 'react';

/**
 * Architectural Campus Building Illustration with trees and sun
 * matching the greeting banner in the reference screenshot.
 */
export const CampusHeroIllustration: React.FC<{ className?: string }> = ({ className = 'w-48 h-32' }) => {
  return (
    <svg
      viewBox="0 0 320 180"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Soft warm sun glow */}
      <circle cx="270" cy="50" r="32" fill="#FDF3DE" />
      <circle cx="270" cy="50" r="22" fill="#FCE5B5" />

      {/* Background Soft Sky gradient element */}
      <path
        d="M0 150 C 90 140, 210 145, 320 150 L 320 180 L 0 180 Z"
        fill="#E5F3EB"
      />

      {/* Distant Trees */}
      <circle cx="40" cy="135" r="18" fill="#A8D5BA" opacity="0.6" />
      <circle cx="65" cy="130" r="22" fill="#7EBF97" opacity="0.7" />
      <circle cx="255" cy="132" r="20" fill="#7EBF97" opacity="0.7" />
      <circle cx="280" cy="136" r="16" fill="#A8D5BA" opacity="0.6" />

      {/* Main Classical University Academic Hall */}
      {/* Central Pediment & Pillars */}
      <rect x="90" y="80" width="140" height="70" fill="#E8F1EC" rx="2" />
      <rect x="94" y="84" width="132" height="66" fill="#FFFFFF" rx="1" />

      {/* Central Portico / Entrance */}
      <polygon points="160,40 100,75 220,75" fill="#C2DEC9" />
      <polygon points="160,46 112,74 208,74" fill="#E5F2E9" />
      <circle cx="160" cy="62" r="5" fill="#1B8B67" opacity="0.8" />

      {/* Pillars */}
      <rect x="115" y="75" width="8" height="75" fill="#D3E8DA" />
      <rect x="145" y="75" width="8" height="75" fill="#D3E8DA" />
      <rect x="167" y="75" width="8" height="75" fill="#D3E8DA" />
      <rect x="197" y="75" width="8" height="75" fill="#D3E8DA" />

      {/* Central Grand Door */}
      <path
        d="M150 150 L150 120 C 150 112, 170 112, 170 120 L170 150 Z"
        fill="#14382C"
        opacity="0.85"
      />
      <circle cx="160" cy="120" r="3" fill="#FFE599" />

      {/* Windows Left Wing */}
      <rect x="100" y="92" width="10" height="15" rx="5" fill="#3D7D5E" opacity="0.6" />
      <rect x="100" y="120" width="10" height="18" rx="2" fill="#3D7D5E" opacity="0.6" />

      {/* Windows Right Wing */}
      <rect x="210" y="92" width="10" height="15" rx="5" fill="#3D7D5E" opacity="0.6" />
      <rect x="210" y="120" width="10" height="18" rx="2" fill="#3D7D5E" opacity="0.6" />

      {/* Windows Center Upper */}
      <rect x="128" y="95" width="10" height="14" rx="4" fill="#3D7D5E" opacity="0.6" />
      <rect x="182" y="95" width="10" height="14" rx="4" fill="#3D7D5E" opacity="0.6" />

      {/* Front Entrance Steps */}
      <rect x="90" y="150" width="140" height="5" fill="#B9D9C3" />
      <rect x="85" y="155" width="150" height="6" fill="#D1E8DA" />

      {/* Foreground Trees & Shrubbery */}
      <ellipse cx="60" cy="148" rx="14" ry="18" fill="#2E9462" />
      <ellipse cx="75" cy="152" rx="11" ry="14" fill="#3DA773" />
      <ellipse cx="48" cy="156" rx="12" ry="10" fill="#1B8B67" />

      <ellipse cx="245" cy="150" rx="13" ry="16" fill="#3DA773" />
      <ellipse cx="260" cy="148" rx="15" ry="19" fill="#2E9462" />
      <ellipse cx="275" cy="155" rx="10" ry="11" fill="#1B8B67" />

      {/* Small birds in sky */}
      <path d="M 230 40 Q 235 36 240 40 Q 245 36 250 40" stroke="#78988C" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M 248 30 Q 252 27 256 30 Q 260 27 264 30" stroke="#78988C" strokeWidth="1.2" fill="none" strokeLinecap="round" />
    </svg>
  );
};

/**
 * Clean Academic Line Art of University Campus for Sidebar Footer
 */
export const SidebarCampusLineArt: React.FC<{ className?: string }> = ({ className = 'w-full h-16' }) => {
  return (
    <svg
      viewBox="0 0 200 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Ground horizon */}
      <line x1="0" y1="56" x2="200" y2="56" stroke="#C2DCD0" strokeWidth="1.5" />

      {/* Central Tower */}
      <rect x="85" y="18" width="30" height="38" stroke="#8CB9A5" strokeWidth="1.2" fill="#E8F4EE" />
      <polygon points="100,6 80,18 120,18" stroke="#8CB9A5" strokeWidth="1.2" fill="#D3EADB" />
      {/* Tower Clock */}
      <circle cx="100" cy="27" r="4" stroke="#8CB9A5" strokeWidth="1" fill="#FFFFFF" />
      <line x1="100" y1="27" x2="100" y2="25" stroke="#167557" strokeWidth="1" strokeLinecap="round" />
      <line x1="100" y1="27" x2="102" y2="27" stroke="#167557" strokeWidth="1" strokeLinecap="round" />
      {/* Tower Door */}
      <path d="M96 56 V45 C96 42 104 42 104 45 V56" stroke="#8CB9A5" strokeWidth="1" fill="#C5E2D2" />

      {/* Left Wing */}
      <rect x="45" y="28" width="40" height="28" stroke="#9ECAAF" strokeWidth="1.2" fill="#EBF5F0" />
      <line x1="45" y1="36" x2="85" y2="36" stroke="#B8DCC7" strokeWidth="0.8" />
      {/* Windows */}
      <rect x="52" y="39" width="6" height="10" stroke="#8CB9A5" strokeWidth="0.8" fill="#FFFFFF" rx="1" />
      <rect x="63" y="39" width="6" height="10" stroke="#8CB9A5" strokeWidth="0.8" fill="#FFFFFF" rx="1" />
      <rect x="74" y="39" width="6" height="10" stroke="#8CB9A5" strokeWidth="0.8" fill="#FFFFFF" rx="1" />

      {/* Right Wing */}
      <rect x="115" y="28" width="40" height="28" stroke="#9ECAAF" strokeWidth="1.2" fill="#EBF5F0" />
      <line x1="115" y1="36" x2="155" y2="36" stroke="#B8DCC7" strokeWidth="0.8" />
      {/* Windows */}
      <rect x="120" y="39" width="6" height="10" stroke="#8CB9A5" strokeWidth="0.8" fill="#FFFFFF" rx="1" />
      <rect x="131" y="39" width="6" height="10" stroke="#8CB9A5" strokeWidth="0.8" fill="#FFFFFF" rx="1" />
      <rect x="142" y="39" width="6" height="10" stroke="#8CB9A5" strokeWidth="0.8" fill="#FFFFFF" rx="1" />

      {/* Trees Left */}
      <ellipse cx="28" cy="46" rx="8" ry="10" stroke="#68AB89" strokeWidth="1" fill="#C5E5D4" />
      <line x1="28" y1="56" x2="28" y2="48" stroke="#488667" strokeWidth="1.2" />

      {/* Trees Right */}
      <ellipse cx="172" cy="46" rx="8" ry="10" stroke="#68AB89" strokeWidth="1" fill="#C5E5D4" />
      <line x1="172" y1="56" x2="172" y2="48" stroke="#488667" strokeWidth="1.2" />

      <circle cx="184" cy="49" r="6" stroke="#7EBF97" strokeWidth="1" fill="#D8EDE1" />
      <circle cx="16" cy="49" r="6" stroke="#7EBF97" strokeWidth="1" fill="#D8EDE1" />
    </svg>
  );
};

/**
 * Academic Excellence Illustration: Graduation Cap, Scroll, Books & Plane
 */
export const AcademicExcellenceIllustration: React.FC<{ className?: string }> = ({ className = 'w-24 h-24' }) => {
  return (
    <svg
      viewBox="0 0 120 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Background Soft Glow */}
      <ellipse cx="60" cy="50" rx="45" ry="35" fill="#E8F6EF" />

      {/* Stacked Academic Books */}
      <path d="M25 76 L95 76 L92 84 L22 84 Z" fill="#62B286" />
      <path d="M22 84 L92 84 L90 87 L20 87 Z" fill="#E4ECE7" />
      <path d="M26 66 L94 66 L91 75 L23 75 Z" fill="#F49A62" />
      <path d="M23 75 L91 75 L89 77 L21 77 Z" fill="#E4ECE7" />
      <path d="M30 57 L90 57 L88 65 L28 65 Z" fill="#1B8B67" />

      {/* Graduation Cap */}
      <polygon points="60,25 25,40 60,50 95,40" fill="#14382C" />
      <polygon points="60,27 30,40 60,48 90,40" fill="#1B5A46" />
      <rect x="48" y="47" width="24" height="10" rx="2" fill="#14382C" />

      {/* Tassel */}
      <path d="M60 38 Q 78 40 82 52" stroke="#E5A93C" strokeWidth="1.8" fill="none" />
      <circle cx="82" cy="53" r="2.5" fill="#E5A93C" />

      {/* Paper Airplane Flying up */}
      <polygon points="98,18 78,28 86,28" fill="#F9A825" />
      <polygon points="98,18 86,28 88,32" fill="#E65100" />
      {/* Flight line */}
      <path d="M 68 34 Q 78 30 84 28" stroke="#D1A760" strokeWidth="1" strokeDasharray="2 2" fill="none" />
    </svg>
  );
};

/**
 * Smart Tech Laptop & Books Illustration for Institutional Banner
 */
export const SmartTechBooksIllustration: React.FC<{ className?: string }> = ({ className = 'w-36 h-24' }) => {
  return (
    <svg
      viewBox="0 0 160 110"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Stack of books on left */}
      <rect x="15" y="80" width="45" height="12" rx="2" fill="#1B8B67" />
      <rect x="18" y="68" width="40" height="12" rx="2" fill="#2E9462" />
      <rect x="22" y="56" width="34" height="12" rx="2" fill="#62B286" />

      {/* Laptop */}
      <rect x="65" y="32" width="70" height="48" rx="4" fill="#14382C" />
      <rect x="69" y="36" width="62" height="40" rx="2" fill="#E8F6EF" />

      {/* Code/Graph on screen */}
      <line x1="74" y1="44" x2="95" y2="44" stroke="#1B8B67" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="74" y1="51" x2="115" y2="51" stroke="#62B286" strokeWidth="2" strokeLinecap="round" />
      <line x1="74" y1="57" x2="105" y2="57" stroke="#62B286" strokeWidth="2" strokeLinecap="round" />
      <circle cx="118" cy="62" r="6" fill="#1B8B67" />
      <polyline points="115,62 117,64 121,60" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />

      {/* Laptop Base */}
      <path d="M55 80 L145 80 L138 88 L62 88 Z" fill="#9ECFB2" />
      <rect x="88" y="81" width="24" height="2" rx="1" fill="#14382C" />

      {/* Plant pot in corner */}
      <polygon points="135,90 148,90 146,102 137,102" fill="#F49A62" />
      <ellipse cx="141" cy="85" rx="5" ry="7" fill="#2E9462" />
      <ellipse cx="147" cy="87" rx="4" ry="5" fill="#1B8B67" />
    </svg>
  );
};
