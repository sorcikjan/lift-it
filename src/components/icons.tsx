/** Ikony jako inline SVG (bez knihovny, fungují offline). Dekorativní: aria-hidden. */
type P = { size?: number; className?: string };
const base = (size: number) => ({ width: size, height: size, viewBox: '0 0 24 24', 'aria-hidden': true as const, focusable: false as const });

export const Check = ({ size = 24, className }: P) => (
  <svg {...base(size)} className={className} fill="none" stroke="currentColor" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
);
export const Play = ({ size = 24, className }: P) => (
  <svg {...base(size)} className={className} fill="currentColor"><path d="M8 5l11 7-11 7z" /></svg>
);
export const Back = ({ size = 24, className }: P) => (
  <svg {...base(size)} className={className} fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round"><path d="M15 5l-7 7 7 7" /></svg>
);
export const Undo = ({ size = 24, className }: P) => (
  <svg {...base(size)} className={className} fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><path d="M9 14L4 9l5-5" /><path d="M4 9h10a6 6 0 010 12h-3" /></svg>
);
export const Sun = ({ size = 24, className }: P) => (
  <svg {...base(size)} className={className} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
);
export const Moon = ({ size = 24, className }: P) => (
  <svg {...base(size)} className={className} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" /></svg>
);
export const Plus = ({ size = 24, className }: P) => (
  <svg {...base(size)} className={className} fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
);
export const Mic = ({ size = 24, className }: P) => (
  <svg {...base(size)} className={className} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0014 0M12 18v3" /></svg>
);
export const Share = ({ size = 24, className }: P) => (
  <svg {...base(size)} className={className} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12M7 8l5-5 5 5" /><path d="M5 13v6a2 2 0 002 2h10a2 2 0 002-2v-6" /></svg>
);
export const Dumbbell = ({ size = 24, className }: P) => (
  <svg {...base(size)} className={className} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round"><path d="M6 7v10M3 9v6M18 7v10M21 9v6M6 12h12" /></svg>
);
export const Chart = ({ size = 24, className }: P) => (
  <svg {...base(size)} className={className} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><path d="M4 19h16" /><path d="M5 15l4-4 4 3 6-7" /></svg>
);
export const Book = ({ size = 24, className }: P) => (
  <svg {...base(size)} className={className} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><path d="M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2z" /><path d="M4 19V5" /></svg>
);
export const Users = ({ size = 24, className }: P) => (
  <svg {...base(size)} className={className} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0113 0" /><path d="M16 4.5a3.5 3.5 0 010 7M18.5 20a6.5 6.5 0 00-3-5.5" /></svg>
);
export const Cloud = ({ size = 24, className }: P) => (
  <svg {...base(size)} className={className} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><path d="M7 18a5 5 0 01-.6-10A6 6 0 0118 9a4.5 4.5 0 01-.5 9z" /></svg>
);
export const CloudOff = ({ size = 24, className }: P) => (
  <svg {...base(size)} className={className} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><path d="M3 3l18 18" /><path d="M7 18a5 5 0 01-1.5-9.8M10 6.3A6 6 0 0118 9a4.5 4.5 0 012.3 8.4" /></svg>
);
export const Camera = ({ size = 24, className }: P) => (
  <svg {...base(size)} className={className} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg>
);
export const User = ({ size = 24, className }: P) => (
  <svg {...base(size)} className={className} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round"><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0116 0" /></svg>
);
export const Trophy = ({ size = 24, className }: P) => (
  <svg {...base(size)} className={className} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><path d="M8 4h8v5a4 4 0 01-8 0z" /><path d="M8 6H5a3 3 0 003 4M16 6h3a3 3 0 01-3 4M12 13v4M8 21h8M9 17h6" /></svg>
);
