// Voiture du héros. Les couleurs suivent la palette via les variables CSS.
export default function Voiture({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 640 260" aria-hidden="true">
      <ellipse cx="322" cy="238" rx="270" ry="13" fill="#000" opacity=".16" />
      <rect x="296" y="56" width="78" height="22" rx="6" fill="#fff" stroke="#141819" strokeWidth="2" />
      <text x="335" y="72" textAnchor="middle" fontFamily="var(--font-sora), Arial, sans-serif" fontWeight="800" fontSize="14" fill="#141819" letterSpacing="2">TAXI</text>
      <path d="M40 192 C40 166 56 152 86 147 L168 138 C204 104 248 84 302 80 L402 80 C448 80 484 101 518 133 L576 143 C602 147 612 162 612 184 L612 200 C612 207 607 212 599 212 L53 212 C45 212 40 207 40 199 Z" fill="var(--dark)" />
      <path d="M56 176 L600 176 L600 186 L56 186 Z" fill="var(--pri)" />
      <path d="M188 137 C216 111 252 97 300 95 L344 95 L344 137 Z" fill="#B9CBD4" />
      <path d="M357 95 L398 95 C430 96 458 110 486 135 L357 137 Z" fill="#B9CBD4" />
      <path d="M215 132 L262 100 L280 99 L232 132 Z" fill="#fff" opacity=".45" />
      <path d="M388 130 L420 99 L432 101 L400 130 Z" fill="#fff" opacity=".35" />
      <path d="M350 142 L350 206 M232 145 L228 206 M478 145 L486 200" stroke="#000" strokeOpacity=".35" strokeWidth="2" fill="none" />
      <rect x="300" y="150" width="22" height="5" rx="2.5" fill="#fff" opacity=".55" />
      <rect x="420" y="150" width="22" height="5" rx="2.5" fill="#fff" opacity=".55" />
      <path d="M586 152 C598 154 606 160 608 170 L586 170 Z" fill="#F4F1E4" />
      <path d="M44 160 L62 158 L62 172 L42 172 Z" fill="#D9473A" />
      {[150, 500].map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy="210" r="47" fill="var(--dark)" />
          <circle cx={cx} cy="210" r="39" fill="#16191A" />
          <circle cx={cx} cy="210" r="24" fill="#C9CED1" />
          <circle cx={cx} cy="210" r="8" fill="#6D7478" />
        </g>
      ))}
    </svg>
  );
}
