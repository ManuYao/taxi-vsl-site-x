# CLAUDE.md — Site taxi / VSL (modèle réutilisable, premier client : secteur Montargis)

## Contexte
- Site d'une entreprise de taxi, VSL conventionné CPAM et VTC du secteur Montargis (Loiret, 45). Client : un membre de ma famille.
- Le nom commercial, les associés, les tarifs et les photos ne sont **pas encore connus**. Tout contenu inconnu reste en Lorem ipsum, marqué comme provisoire (classe `.tbd`), jusqu'à ce que le client envoie ses infos.
- Ce projet sert aussi de **modèle réutilisable** pour d'autres entreprises de taxi : tout ce qui est propre au client (nom, couleurs, téléphone, villes, tarifs) vit dans `site.config.js`, jamais en dur dans les composants.
- Délai : environ un mois pour la V1.

## Public et principes de design
- Clientèle surtout âgée et rurale. Priorité : appeler ou réserver vite, sans enchaîner les pages (défaut principal des sites concurrents).
- **Une seule page** pour le site public. Ordre : en-tête avec téléphone → titre + boutons Appeler / Réserver → formulaire → services → transport conventionné → zones → qui sommes-nous → FAQ → pied de page.
- Bouton **Appeler** toujours visible. Sur mobile : barre fixe en bas (Appeler · WhatsApp · Réserver).
- Design aéré et très visuel, peu de texte : chaque section = un titre court + une illustration ou des icônes, pas de paragraphes. Texte de base 18 px minimum, fort contraste, boutons d'au moins 52 px de haut, formes arrondies.
- Illustrations en SVG (voiture du héros, scènes de services, carte des zones), colorées via les variables CSS pour suivre la palette. Les photos (Unsplash puis vraies photos du client) viennent en complément.
- Polices : Sora (titres), Atkinson Hyperlegible (texte, conçue pour la lisibilité).
- **Palette retenue : Vert forêt.** `--pri #1E5B43` (actions), `--pri-hover #164633`, `--dark #0F241C` (bandes sombres), `--soft #E4EFE8`, `--soft2 #C7DECF`, fond `#F6F7F5`, texte `#141819`. Pas de jaune.
- Sélecteurs maison, dans la DA, pensés pour les seniors (pas les champs date/heure natifs) :
  - Date : 3 grosses cases sur une ligne (Aujourd'hui, Demain, Autre date) ; « Autre date » ouvre un calendrier (lundi en premier, jours passés grisés).
  - Heure : bouton avec une petite horloge animée ; il ouvre un panneau **une étape à la fois** : (1) le moment de la journée (Matin 5–11 h, Après-midi 12–17 h, Soir 18–23 h, plages à confirmer), (2) les heures de cette période seulement, (3) les minutes 00/15/30/45, qui n'apparaissent qu'après le choix de l'heure. Le panneau se ferme après les minutes. Heures passées grisées si la date est aujourd'hui.
- La maquette de référence est `maquette/maquette-taxi.html`.

## Réservation (V1)
- **Pas de compte client.** Nom + téléphone suffisent ; e-mail facultatif.
- 3 étapes sur un seul écran : (1) départ, arrêt intermédiaire facultatif, arrivée ; (2) date, heure, passagers, cases « transport conventionné » et « bagages », numéro de vol/train facultatif ; (3) nom, téléphone.
- **Prix estimé affiché avant l'envoi**, dès que départ et arrivée sont remplis, avec la mention « Estimation. Le taximètre fait foi. »
- Calcul : `prix = max(minimum, priseEnCharge + km × tarifKm)` ; tarif nuit/dimanche si heure < 7 h ou ≥ 19 h, ou dimanche (à confirmer avec le client). Avec un arrêt : km = départ→arrêt + arrêt→arrivée.
- Le calcul se fait **côté serveur** (route `/api/estimate`), pour ne pas exposer les clés d'API.
- Données de santé : **aucune**. Une simple case « transport conventionné », jamais de motif médical ni de pièce jointe.

## Zone desservie
- Le client travaille dans un rayon de **10 à 20 km** autour de sa base, donc beaucoup de communes. Les villes doivent apparaître partout : héros, zone desservie (liste complète de communes), pied de page, et **une page SEO par commune**.
- Ne jamais écrire « Montargis » en dur : la base et la liste des communes viennent de `site.config.js` (la base exacte du client est encore à confirmer ; liste de départ dans la maquette, à valider).

## Espace chauffeur (PWA)
- Interface pro, dans la continuité du site (mêmes couleurs, même police Sora). Écran « Courses » : demandes à traiter en cartes (trajet, date/heure, passagers, prix, nom, téléphone) avec Accepter / Refuser. Écran « Planning » : courses acceptées groupées par jour. Interrupteur Disponible / Indisponible en haut. Barre de navigation en bas. Bandeau de notification qui apparaît à chaque nouvelle demande.
- Route `/admin`, protégée par connexion (Supabase Auth, lien magique par e-mail).
- Installable sur l'écran d'accueil (manifest + service worker).
- Notification push à chaque nouvelle réservation (Web Push + clés VAPID). Sur iPhone, ne marche que si la PWA est ajoutée à l'écran d'accueil (iOS 16.4+).
- **Alerte de secours** en plus du push : message Telegram (bot) ou e-mail.
- Accepter / refuser une course → le client reçoit la réponse par e-mail (SMS en V2).
- Liste des courses à venir et historique.

## Stack
- **Next.js** (App Router), en **JavaScript**, déployé sur Netlify ou Cloudflare (le plan gratuit Vercel Hobby est réservé à un usage non commercial : vérifier les conditions avant de choisir).
- **Tailwind CSS** pour le style (tokens de couleur dans la config, repris de la maquette ; les couleurs restent aussi en variables CSS pour que les illustrations SVG les utilisent).
- **Supabase** : Postgres, Auth (admin uniquement), Row Level Security, Realtime pour la liste admin.
- **web-push** (npm) pour les notifications, clés VAPID dans les variables d'environnement.
- **Resend** pour les e-mails (confirmation client, alerte chauffeur).
- **API Adresse** (Base Adresse Nationale, gratuite) pour l'autocomplétion des adresses. Vérifier l'URL actuelle, l'API migre vers la Géoplateforme de l'IGN.
- **OpenRouteService** ou **Geoapify** pour la distance et la durée réelles (offres gratuites avec quota).
- **Zod** pour valider les données du formulaire côté serveur.
- **Cloudflare Turnstile** + champ piège (honeypot) contre le spam.
- **Telegram Bot API** (simple `fetch`) pour l'alerte de secours.

## Modèle de données (Supabase)
- `bookings` : id, created_at, status (`pending` | `accepted` | `refused` | `done` | `cancelled`), from_label, from_lat, from_lng, stop_label, stop_lat, stop_lng, to_label, to_lat, to_lng, pickup_at (timestamptz), passengers, luggage, conventionne, travel_ref (vol/train), est_km, est_minutes, est_price_cents, tarif (`jour` | `nuit`), customer_name, customer_phone, customer_email, note.
- `push_subscriptions` : id, created_at, endpoint (unique), p256dh, auth, device_label.
- `settings` (une ligne) : tarifs (json : priseEnCharge, kmJour, kmNuit, minimum), horaires, disponible (bool).
- RLS : aucune lecture publique. L'insertion d'une réservation passe par une route serveur (clé service role côté serveur uniquement). L'admin authentifié lit et met à jour.

## Arborescence prévue
```
app/
  page.js                 site public (une page)
  admin/page.js           espace chauffeur (PWA)
  api/estimate/route.js   calcul distance + prix
  api/bookings/route.js   création d'une réservation + notifications
  api/bookings/[id]/route.js  accepter / refuser
  manifest.js
components/
lib/ (supabase.js, pricing.js, push.js, mail.js, telegram.js)
public/sw.js              service worker (push)
site.config.js            nom, téléphone, WhatsApp, couleurs, villes, tarifs par défaut
```

## Espace chauffeur : tableau de bord et encaissement (maquette `maquette/maquette-chauffeur.html`)
- Objectif : que le chauffeur n'ait rien à compter à la main. Onglets : Accueil, Courses, Caisse, Réglages.
- **Accueil** : interrupteur en ligne/hors ligne, encaissé du jour, à encaisser, à recevoir de l'Assurance Maladie (tiers payant), recettes des 7 derniers jours, prochaine course.
- **Encaisser une course** : montant prérempli avec l'estimation (modifiable selon le taximètre), un mode de paiement (espèces, carte, tiers payant, virement), un bouton Valider. L'app enregistre le paiement ; elle ne traite pas de paiement en ligne en V1.
- **Caisse** : total du jour par mode, reste à encaisser, tiers payant en attente, export du mois (CSV) pour le comptable.
- **Disponibilité** : trois états (en ligne, hors ligne, vacances) avec dates et message affiché sur le site. En vacances ou hors ligne, le formulaire est désactivé et le téléphone reste visible.
- **Promotions** : remise en %, code facultatif, trajets concernés (gares et aéroports, tous, longue distance), dates. Le prix barré et un badge apparaissent sur le site et dans le prix estimé.
- **Mon site** : téléphone, horaires, tarifs (prise en charge, km jour/nuit, minimum), paiements acceptés, communes, photos : modifiables par le chauffeur, stockés dans `settings` (Supabase), jamais en dur.
- Plusieurs sites (un par entreprise de taxi) : chaque site a ses propres `settings` ; un accès administrateur propre au développeur est prévu pour les gérer (à cadrer).
- Tables à ajouter : `payments` (booking_id, mode, amount_cents, status `paid` | `pending`, paid_at), `promotions` (name, percent, scope, code, starts_on, ends_on, active), `availability` (state, from, to, message).

## Règles de travail
- Textes du site en français, phrases courtes, vocabulaire simple (« Réserver », « Appeler », pas de jargon).
- Contenu inconnu : Lorem ipsum ou mention « à confirmer » avec la classe `.tbd`. Ne jamais inventer un fait sur l'entreprise (horaires, moyens de paiement, associés).
- Ne jamais écrire de clé d'API dans le code : `.env.local`, et un `.env.example` à jour.
- Accessibilité : labels sur tous les champs, focus visible, contraste AA minimum, `prefers-reduced-motion` respecté.
- Mobile d'abord : tester à 390 px de large, aucun défilement horizontal.
- Pages obligatoires avant la mise en ligne : mentions légales, politique de confidentialité, bandeau cookies si des cookies non essentiels sont utilisés.

## Périmètre
- **V1** : site une page, réservation avec arrêt intermédiaire et prix estimé, notifications chauffeur (push + secours), accepter/refuser, e-mail de confirmation, pages SEO par ville, mentions légales.
- **V2** : SMS client, réductions et codes promo depuis l'admin, paiement ou acompte en ligne, plusieurs chauffeurs ou véhicules, bouton disponible/indisponible, version anglaise, statistiques.

## État d'avancement (mis à jour le 14/10/2026)
- **Fait et testé** : site public une page ; formulaire de réservation (adresses IGN, date/heure maison, prix estimé serveur via OpenRouteService, promotions et code promo, anti-spam Turnstile + champ piège) ; base Supabase (`supabase/schema.sql` puis `supabase/migrations/002-bloc-f.sql`, à lancer dans l'éditeur SQL) ; alertes Telegram + e-mail + notifications push ; espace chauffeur `/admin` (PWA, connexion e-mail + mot de passe, courses à traiter, accepter / refuser / annuler, planning, ajout d'une course à la main, encaissement, caisse + export CSV, équipe, disponibilité, tarifs et promotions modifiables par le patron).
- **Variables d'environnement** : voir `.env.example` ; les vraies valeurs sont dans `.env.local` (jamais dans `.env.example`).
- **Pas encore fait** : pages légales (mentions légales, confidentialité, cookies), pages SEO par commune, e-mails aux clients (il faut un domaine vérifié chez Resend : variable `RESEND_FROM`), connexion par code e-mail (SMTP Supabase, désactivée : `site.admin.codeParEmail`), photos et textes réels du client, test sur vrais téléphones, mise en ligne définitive (Netlify : le plan gratuit est limité à 300 crédits, 15 par déploiement), régénération des clés secrètes passées par le chat avant la mise en ligne, suppression du bouton de démo (`boutonTbd: false`), style et effets.
- Les tests automatiques sont dans `lib/*.test.js` (`node --test lib/*.test.js`).

## À faire plus tard : style et effets (PAS maintenant)
- Quand le fonctionnel est terminé, on reprendra le style et on ajoutera des effets.
- **Espace chauffeur, onglet Appli** : donner un fond coloré différent aux sections (Disponibilité, Notifications, Mes tarifs, Promotions, Équipe…), un vert de la palette avec beaucoup de transparence, pour séparer les blocs et casser le « trop blanc ».
- **Arrière-plans** : l'utilisateur veut un fond « cool » en motif CSS, à générer avec https://www.magicpattern.design/tools/css-backgrounds (aux couleurs de la palette vert forêt, discret pour garder la lisibilité : public âgé, fort contraste). À essayer sur le site public et l'espace chauffeur.
- Ne pas le faire tant que l'utilisateur ne le demande pas.

## Infos à obtenir du client
Nom commercial · numéro et WhatsApp (actuel : 06 52 44 60 68) · site, fiche Google ou Facebook existants · logo, couleurs, photos du véhicule · services réellement proposés · zone et horaires · tarif au km, prise en charge, minimum, tarifs nuit/week-end · conventionnement CPAM · associés et organisation · iPhone ou Android pour les notifications.

## Commandes
- `npm run dev` · `npm run build` · `npm run lint`
