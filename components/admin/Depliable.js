// Section repliable de l'espace chauffeur (<details> natif : clavier et lecteurs d'écran gérés).
// `ouvertParDefaut` : ouverte à l'arrivée sur la page ; le contenu reste monté quand c'est replié (rien n'est perdu).
export default function Depliable({ titre, sousTitre, ouvertParDefaut = false, children }) {
  return (
    <details open={ouvertParDefaut} className="group rounded-[18px] bg-white p-4">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0">
          <h2 className="font-title text-lg font-bold">{titre}</h2>
          {sousTitre && <span className="block text-[14px] text-[#5a6366]">{sousTitre}</span>}
        </span>
        <span aria-hidden="true" className="flex size-[34px] flex-none items-center justify-center rounded-full bg-soft text-[22px] text-pri">
          <span className="group-open:hidden">+</span>
          <span className="hidden group-open:inline">–</span>
        </span>
      </summary>
      <div className="mt-3 flex flex-col gap-3">{children}</div>
    </details>
  );
}
