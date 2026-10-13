const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};

export function PhoneIcon({ className = "", strokeWidth = 2.2 }) {
  return (
    <svg {...base} strokeWidth={strokeWidth} className={className}>
      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" />
    </svg>
  );
}

export function CheckIcon({ className = "" }) {
  return (
    <svg {...base} strokeWidth={3.2} className={className}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export function PlusIcon({ className = "" }) {
  return (
    <svg {...base} strokeWidth={2.4} className={className}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function ClockIcon({ className = "" }) {
  return (
    <svg {...base} strokeWidth={2} className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

export function PinIcon({ className = "" }) {
  return (
    <svg {...base} strokeWidth={2} className={className}>
      <path d="M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12z" />
      <circle cx="12" cy="9" r="2.5" />
    </svg>
  );
}

export function CardIcon({ className = "" }) {
  return (
    <svg {...base} strokeWidth={2} className={className}>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
    </svg>
  );
}

export function ChatIcon({ className = "" }) {
  return (
    <svg {...base} strokeWidth={2.2} className={className}>
      <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" />
    </svg>
  );
}
