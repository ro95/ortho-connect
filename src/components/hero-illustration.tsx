/** Stylized SVG illustration of an orthoptist — warm, approachable, on-brand. */
export default function HeroIllustration({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 400 440" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Background circle */}
      <circle cx="200" cy="220" r="180" fill="url(#bgGrad)" opacity="0.12" />
      <circle cx="200" cy="220" r="130" fill="url(#bgGrad)" opacity="0.08" />

      {/* Body / lab coat */}
      <path
        d="M140 340 C140 290 160 270 200 260 C240 270 260 290 260 340 L260 440 L140 440 Z"
        fill="white"
        stroke="#dbeafe"
        strokeWidth="2"
      />
      {/* Coat collar */}
      <path d="M175 270 L200 290 L225 270" fill="none" stroke="#93c5fd" strokeWidth="2.5" strokeLinecap="round" />
      {/* Stethoscope hint */}
      <path
        d="M185 285 C180 310 178 330 190 340"
        fill="none"
        stroke="#60a5fa"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="190" cy="342" r="5" fill="#60a5fa" opacity="0.6" />

      {/* Neck */}
      <rect x="188" y="240" width="24" height="28" rx="12" fill="#f5c6a0" />

      {/* Head */}
      <ellipse cx="200" cy="200" rx="52" ry="58" fill="#f5c6a0" />

      {/* Hair */}
      <path
        d="M148 195 C148 155 168 130 200 128 C232 130 252 155 252 195 C252 175 240 150 200 148 C160 150 148 175 148 195 Z"
        fill="#4a3728"
      />
      {/* Side hair */}
      <path d="M148 195 C146 210 148 220 152 225" fill="none" stroke="#4a3728" strokeWidth="8" strokeLinecap="round" />
      <path d="M252 195 C254 210 252 220 248 225" fill="none" stroke="#4a3728" strokeWidth="8" strokeLinecap="round" />

      {/* Eyes */}
      <ellipse cx="182" cy="200" rx="8" ry="8.5" fill="white" />
      <ellipse cx="218" cy="200" rx="8" ry="8.5" fill="white" />
      <ellipse cx="183" cy="201" rx="4.5" ry="5" fill="#1e3a5f" />
      <ellipse cx="219" cy="201" rx="4.5" ry="5" fill="#1e3a5f" />
      <circle cx="185" cy="199" r="1.5" fill="white" />
      <circle cx="221" cy="199" r="1.5" fill="white" />

      {/* Eyebrows */}
      <path d="M173 190 Q182 185 192 189" fill="none" stroke="#4a3728" strokeWidth="2" strokeLinecap="round" />
      <path d="M208 189 Q218 185 227 190" fill="none" stroke="#4a3728" strokeWidth="2" strokeLinecap="round" />

      {/* Smile */}
      <path d="M188 218 Q200 228 212 218" fill="none" stroke="#c47a5a" strokeWidth="2.5" strokeLinecap="round" />

      {/* Nose */}
      <path d="M198 207 Q200 213 203 210" fill="none" stroke="#e0a882" strokeWidth="1.5" strokeLinecap="round" />

      {/* Glasses — round, medical style */}
      <circle cx="182" cy="200" r="16" fill="none" stroke="#1d4ed8" strokeWidth="2.5" />
      <circle cx="218" cy="200" r="16" fill="none" stroke="#1d4ed8" strokeWidth="2.5" />
      <path d="M198 200 L202 200" stroke="#1d4ed8" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M166 198 L152 194" stroke="#1d4ed8" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M234 198 L248 194" stroke="#1d4ed8" strokeWidth="2.5" strokeLinecap="round" />

      {/* Phoropter / eye test tool floating nearby */}
      <g opacity="0.9" transform="translate(295, 150)">
        <rect x="0" y="0" width="60" height="45" rx="10" fill="white" stroke="#dbeafe" strokeWidth="1.5" />
        <circle cx="20" cy="22" r="10" fill="none" stroke="#2563eb" strokeWidth="2" />
        <circle cx="42" cy="22" r="10" fill="none" stroke="#2563eb" strokeWidth="2" />
        <path d="M30 22 L32 22" stroke="#2563eb" strokeWidth="1.5" />
        <rect x="22" y="38" width="16" height="4" rx="2" fill="#93c5fd" />
      </g>

      {/* Eye chart floating on left */}
      <g opacity="0.85" transform="translate(40, 120)">
        <rect x="0" y="0" width="50" height="70" rx="8" fill="white" stroke="#dbeafe" strokeWidth="1.5" />
        <text x="25" y="22" textAnchor="middle" fill="#1e3a5f" fontSize="14" fontWeight="bold" fontFamily="sans-serif">E</text>
        <text x="25" y="38" textAnchor="middle" fill="#1e3a5f" fontSize="10" fontWeight="600" fontFamily="sans-serif">F P</text>
        <text x="25" y="50" textAnchor="middle" fill="#93c5fd" fontSize="7" fontWeight="500" fontFamily="sans-serif">T O Z</text>
        <text x="25" y="60" textAnchor="middle" fill="#bfdbfe" fontSize="5" fontFamily="sans-serif">L P E D</text>
      </g>

      {/* Small floating cross (medical) */}
      <g opacity="0.5" transform="translate(310, 280)">
        <rect x="8" y="0" width="8" height="24" rx="4" fill="#34d399" />
        <rect x="0" y="8" width="24" height="8" rx="4" fill="#34d399" />
      </g>

      {/* Gradient defs */}
      <defs>
        <linearGradient id="bgGrad" x1="100" y1="40" x2="300" y2="400">
          <stop stopColor="#2563eb" />
          <stop offset="1" stopColor="#10b981" />
        </linearGradient>
      </defs>
    </svg>
  );
}
