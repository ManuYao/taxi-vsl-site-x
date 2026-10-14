// Formes grises qui occupent EXACTEMENT la place du contenu pendant le chargement : rien ne saute quand les données arrivent.
// Chaque squelette reprend la structure du vrai composant (mêmes marges, mêmes tailles de texte, mêmes boutons).
const gris = "bg-[#e1e7e3] motion-safe:animate-pulse";

export function Bloc({ className = "", style }) {
  return <div aria-hidden="true" style={style} className={`rounded-xl ${gris} ${className}`} />;
}

// Une ligne de texte : `texte` = la même classe de taille que le vrai texte, la hauteur suit sa hauteur de ligne (1lh)
function Ligne({ texte = "", className = "w-full" }) {
  return (
    <div aria-hidden="true" className={`flex h-[1lh] items-center ${texte} ${className}`}>
      <div className={`h-[0.75em] w-full rounded-md ${gris}`} />
    </div>
  );
}

function Chargement({ label, children, className = "flex flex-col gap-3" }) {
  return (
    <div role="status" aria-label={label} className={className}>
      {children}
    </div>
  );
}

// Lignes de l'équipe et des promotions : nom, détails, rangée de petits boutons
export function SqueletteListe({ lignes = 3, label = "Chargement", boutons = ["w-32", "w-44", "w-28"] }) {
  return (
    <Chargement label={label} className="flex flex-col gap-2">
      {Array.from({ length: lignes }, (_, i) => (
        <div key={i} className="flex flex-col gap-2 rounded-[14px] bg-bg p-3">
          <div>
            <Ligne className="w-2/5" />
            <Ligne texte="text-[14px]" className="w-4/5" />
          </div>
          <div className="flex flex-wrap gap-2">
            {boutons.map((l, j) => <Bloc key={j} className={`h-11 rounded-full ${l}`} />)}
          </div>
        </div>
      ))}
    </Chargement>
  );
}

// Même carte que CarteCourse
export function SqueletteCourses() {
  return (
    <Chargement label="Chargement des courses">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex flex-col gap-2.5 rounded-[18px] bg-white p-4 shadow-[0_8px_20px_-16px_rgba(15,25,20,.6)]">
          <div className="flex items-center gap-1.5">
            <Bloc className="h-[25px] w-36 rounded-full" />
            <Ligne texte="text-xs" className="ml-auto w-16" />
          </div>
          <div>
            <Ligne texte="font-title text-[17px] leading-snug" className="w-4/5" />
            <Ligne texte="font-title text-[17px] leading-snug" className="w-3/5" />
          </div>
          <Ligne texte="text-[15px]" className="w-1/2" />
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1">
              <Ligne texte="text-[15px]" className="w-2/5" />
              <Ligne texte="text-[15px]" className="w-1/3" />
            </div>
            <Bloc className="size-12 flex-none rounded-full" />
          </div>
          <div className="grid grid-cols-[1.3fr_1fr] gap-2">
            <Bloc className="h-[52px]" />
            <Bloc className="h-[52px]" />
          </div>
        </div>
      ))}
    </Chargement>
  );
}

// Mêmes champs que « Mes tarifs » : libellé, champ, aide, puis le bouton Enregistrer
export function SqueletteTarifs({ champs = 4 }) {
  return (
    <Chargement label="Chargement des tarifs">
      {Array.from({ length: champs }, (_, i) => (
        <div key={i} className="flex flex-col gap-1.5">
          <Ligne texte="text-base" className="w-40" />
          <Bloc className="h-14 w-full rounded-[14px]" />
          <Ligne texte="text-[14px]" className="w-3/5" />
        </div>
      ))}
      <Bloc className="h-[52px] w-full" />
    </Chargement>
  );
}

// Même disposition que la Caisse : les chiffres apparaissent à leur place, sans décalage
export function SqueletteCaisse() {
  const carte = "flex flex-col gap-2 rounded-[18px] bg-white p-4";
  const clair = "rounded-md bg-white/25 motion-safe:animate-pulse";
  return (
    <Chargement label="Chargement de la caisse">
      <div className="flex flex-col gap-2 rounded-[18px] bg-pri p-4">
        <div className="flex h-[1lh] items-center text-[15px]"><div className={`h-[0.75em] w-40 ${clair}`} /></div>
        <div className={`h-10 w-44 ${clair}`} />
        <div className="flex flex-wrap gap-1.5 pt-1">
          {["w-24", "w-20", "w-32", "w-24"].map((l, i) => <div key={i} className={`h-[29px] rounded-full bg-white/15 motion-safe:animate-pulse ${l}`} />)}
        </div>
        <div className="flex h-[1lh] items-center text-[14px]"><div className={`h-[0.75em] w-24 ${clair}`} /></div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[0, 1].map((i) => (
          <div key={i} className={carte}>
            <Ligne texte="text-[14px]" className="w-4/5" />
            <Bloc className="h-[30px] w-20" />
            <Ligne texte="text-[14px]" className="w-full" />
            <Ligne texte="text-[14px]" className="w-1/2" />
          </div>
        ))}
      </div>

      <div className={carte}>
        <Ligne texte="font-title text-lg" className="w-40" />
        <div className="flex h-32 items-end gap-2">
          {[40, 70, 25, 90, 55, 30, 65].map((h, i) => (
            <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
              <Bloc className="w-full rounded-b-none" style={{ height: `${h}%` }} />
              <Ligne texte="text-[12px]" className="w-6" />
            </div>
          ))}
        </div>
      </div>

      <div className={carte}>
        <Ligne texte="font-title text-lg" className="w-28" />
        <Bloc className="h-[30px] w-32" />
        <Ligne texte="text-[14px]" className="w-full" />
      </div>

      <div className={carte}>
        <Ligne texte="font-title text-lg" className="w-56" />
        <Ligne texte="text-[14px]" className="w-full" />
        <Ligne texte="text-[14px]" className="w-3/4" />
        <Ligne texte="text-base" className="w-16" />
        <Bloc className="h-14 w-full rounded-[14px]" />
        <Bloc className="h-[52px] w-full" />
      </div>
    </Chargement>
  );
}
