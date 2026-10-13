const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};

export const IconeCloche = ({ className = "size-6" }) => (
  <svg {...base} className={className}>
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <path d="M10.3 21a1.9 1.9 0 0 0 3.4 0" />
  </svg>
);

export const IconeCalendrier = ({ className = "size-6" }) => (
  <svg {...base} className={className}>
    <rect x="3" y="4" width="18" height="17" rx="2" />
    <path d="M3 9h18M8 2v4M16 2v4" />
  </svg>
);

export const IconeTelephone = ({ className = "size-6" }) => (
  <svg {...base} className={className}>
    <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" />
  </svg>
);

export const IconeAppli = ({ className = "size-6" }) => (
  <svg {...base} className={className}>
    <rect x="6" y="2" width="12" height="20" rx="3" />
    <path d="M11 18h2" />
  </svg>
);

export const IconeEuro = ({ className = "size-6" }) => (
  <svg {...base} className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="M15.5 8.5a4.5 4.5 0 1 0 0 7M7.5 11h5M7.5 13.5h5" />
  </svg>
);

export const IconeVoiture = ({ className = "size-6" }) => (
  <svg {...base} className={className}>
    <path d="M5 17h14M6 17l1.5-6h9L18 17M7 17v2M17 17v2M10 11l1-3h2l1 3" />
  </svg>
);
