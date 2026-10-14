// Petites briques communes aux sections.
export function Container({ children, className = "" }) {
  return <div className={`mx-auto max-w-[1160px] px-4 sm:px-8 ${className}`}>{children}</div>;
}

export function SectionHead({ eyebrow, title, children, center = false, dark = false, rv = "haut" }) {
  return (
    <div data-rv={rv || undefined} className={`mb-10 flex max-w-[640px] flex-col gap-2.5 ${center ? "mx-auto items-center text-center" : ""}`}>
      <span className={`text-sm font-bold uppercase tracking-[.1em] ${dark ? "text-soft2" : "text-pri"}`}>{eyebrow}</span>
      <h2 className={`text-[clamp(30px,4.4vw,46px)] font-extrabold leading-[1.06] tracking-tight text-balance ${dark ? "text-white" : ""}`}>
        {title}
      </h2>
      {children}
    </div>
  );
}

export const bouton =
  "inline-flex min-h-[58px] items-center justify-center gap-2.5 whitespace-nowrap rounded-full border-2 px-[26px] py-3.5 text-[19px] font-bold leading-tight no-underline";
