import React from 'react';

export const LogoIcon = () => (
  <svg width="140" height="40" viewBox="0 0 140 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="140" height="40" rx="4" fill="transparent" />
    <path d="M20 10L10 30H15L17.5 25H27.5L30 30H35L25 10H20ZM22.5 15H25L26.5 21H21.5L22.5 15Z" fill="#4c1d95" />
    <path d="M40 10H45V30H40V10Z" fill="#4c1d95" />
    <path d="M50 10H60C65 10 68 14 68 20C68 26 65 30 60 30H50V10ZM55 14V26H60C62 26 63 24 63 20C63 16 62 14 60 14H55Z" fill="#4c1d95" />
    <path d="M75 22C75 18 78 16 82 16H84V12H76V8H84C88 8 90 11 90 15C90 19 87 21 83 21H81V25H89V29H81C77 29 75 26 75 22Z" fill="#4c1d95" />
    <circle cx="105" cy="20" r="9" stroke="#4c1d95" strokeWidth="3"/>
    <text x="120" y="28" fontFamily="Inter, sans-serif" fontWeight="bold" fontSize="18" fill="#1e1b4b">轻快搜</text>
  </svg>
);

export const BadgeDSO = () => (
  <span className="ml-1 px-1.5 py-0.5 rounded-full border border-purple-500 text-[10px] font-bold text-purple-700 bg-white">
    DSO
  </span>
);

export const BadgeGEO = () => (
  <span className="ml-1 px-1.5 py-0.5 rounded-full bg-purple-600 text-[10px] font-bold text-white">
    GEO
  </span>
);
