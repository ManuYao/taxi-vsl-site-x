// Aides pour les dates, toutes calées à midi pour éviter les décalages d'heure d'été.
export const noon = (d) => {
  const x = new Date(d);
  x.setHours(12, 0, 0, 0);
  return x;
};

export const addDays = (d, n) => {
  const x = noon(d);
  x.setDate(x.getDate() + n);
  return x;
};

export const ymd = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const sameDay = (a, b) => ymd(a) === ymd(b);

export const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export const jourLong = (d) => d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

// "Aujourd'hui", "Demain" ou null
export function relatif(d, today) {
  const n = Math.round((noon(d) - today) / 86400000);
  if (n === 0) return "Aujourd'hui";
  if (n === 1) return "Demain";
  return null;
}

export const pad2 = (n) => String(n).padStart(2, "0");

// 95 -> "1 h 35", 40 -> "40 min" (arrondi à 5 minutes)
export function dureeLisible(minutes) {
  const m = Math.max(5, Math.round(minutes / 5) * 5);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const reste = m % 60;
  return reste ? `${h} h ${pad2(reste)}` : `${h} h`;
}
