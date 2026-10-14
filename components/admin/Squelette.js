// Formes grises qui occupent la place du contenu pendant le chargement : la page ne saute pas quand les données arrivent.
export function Bloc({ className = "", style }) {
  return <div aria-hidden="true" style={style} className={`rounded-xl bg-[#e4e9e6] motion-safe:animate-pulse ${className}`} />;
}

function Chargement({ label, children, className = "flex flex-col gap-3" }) {
  return (
    <div role="status" aria-label={label} className={className}>
      {children}
    </div>
  );
}

export function SqueletteListe({ lignes = 3, label = "Chargement" }) {
  return (
    <Chargement label={label} className="flex flex-col gap-2">
      {Array.from({ length: lignes }, (_, i) => (
        <div key={i} className="flex flex-col gap-2 rounded-[14px] bg-bg p-3">
          <Bloc className="h-5 w-2/5" />
          <Bloc className="h-4 w-3/4" />
          <div className="flex gap-2 pt-1">
            <Bloc className="h-11 w-28 rounded-full" />
            <Bloc className="h-11 w-24 rounded-full" />
          </div>
        </div>
      ))}
    </Chargement>
  );
}

export function SqueletteCourses() {
  return (
    <Chargement label="Chargement des courses">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex flex-col gap-3 rounded-[18px] bg-white p-4">
          <div className="flex justify-between gap-3">
            <Bloc className="h-5 w-1/3" />
            <Bloc className="h-6 w-16 rounded-full" />
          </div>
          <Bloc className="h-4 w-4/5" />
          <Bloc className="h-4 w-3/5" />
          <div className="grid grid-cols-2 gap-2 pt-1">
            <Bloc className="h-[52px]" />
            <Bloc className="h-[52px]" />
          </div>
        </div>
      ))}
    </Chargement>
  );
}

// Même disposition que la Caisse : les chiffres apparaissent à leur place, sans décalage
export function SqueletteCaisse() {
  const carte = "flex flex-col gap-2 rounded-[18px] bg-white p-4";
  return (
    <Chargement label="Chargement de la caisse">
      <div className="flex flex-col gap-3 rounded-[18px] bg-pri/90 p-4">
        <div className="h-4 w-36 rounded-xl bg-white/25 motion-safe:animate-pulse" />
        <div className="h-10 w-40 rounded-xl bg-white/25 motion-safe:animate-pulse" />
        <div className="flex gap-1.5">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-7 w-20 rounded-full bg-white/15 motion-safe:animate-pulse" />)}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[0, 1].map((i) => (
          <div key={i} className={carte}>
            <Bloc className="h-4 w-4/5" />
            <Bloc className="h-8 w-16" />
            <Bloc className="h-4 w-3/5" />
          </div>
        ))}
      </div>
      <div className={carte}>
        <Bloc className="h-5 w-40" />
        <div className="flex h-32 items-end gap-2">
          {[40, 70, 25, 90, 55, 30, 65].map((h, i) => <Bloc key={i} className="flex-1 rounded-b-none" style={{ height: `${h}%` }} />)}
        </div>
      </div>
      <div className={carte}>
        <Bloc className="h-5 w-28" />
        <Bloc className="h-8 w-32" />
        <Bloc className="h-4 w-full" />
      </div>
    </Chargement>
  );
}
