# Site taxi / VSL + espace chauffeur

Site d'une entreprise de taxi, VSL conventionné et VTC : réservation en ligne avec prix estimé, et une application pour les chauffeurs (courses, planning, caisse, notifications). Conçu comme **modèle réutilisable** : tout ce qui est propre à une entreprise (nom, téléphone, communes, tarifs, mentions légales) vit dans [`site.config.js`](site.config.js).

Le contexte détaillé, les règles de travail et l'état d'avancement sont dans [`CLAUDE.md`](CLAUDE.md).

## Démarrer en local

```bash
npm install
cp .env.example .env.local   # puis remplir les valeurs (jamais dans .env.example)
npm run dev                  # http://localhost:3000 ; l'espace chauffeur est sur /admin
```

Autres commandes : `npm run build` · `npm run lint` · `node --test lib/*.test.js` (tests).

## Ce qu'il faut créer une seule fois

| Service | Pour quoi | Variables dans `.env.local` |
|---|---|---|
| Supabase | base de données, connexion des chauffeurs | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| OpenRouteService | distance et durée réelles | `ORS_API_KEY` |
| Cloudflare Turnstile | anti-spam du formulaire | `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` |
| Telegram (bot) | alerte de secours | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` |
| Resend | e-mails (alerte ; clients avec un domaine vérifié) | `RESEND_API_KEY`, `RESEND_FROM`, `ALERT_EMAIL` |
| Clés VAPID | notifications push | `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (à générer avec `npx web-push generate-vapid-keys`) |

## Base de données

Dans l'éditeur SQL de Supabase, lancer dans l'ordre :
1. [`supabase/schema.sql`](supabase/schema.sql) : réservations, équipe, appareils, réglages, règles d'accès.
2. [`supabase/migrations/002-bloc-f.sql`](supabase/migrations/002-bloc-f.sql) : disponibilité, promotions, paiements.

Les deux fichiers peuvent être relancés sans danger. Le premier compte (patron) se crée avec la clé secrète : un compte de connexion, puis une ligne dans la table `staff` avec le rôle `patron`. Ensuite, le patron ajoute ses chauffeurs depuis l'application (Appli > Équipe).

## Où est quoi

- `app/` : pages du site (`/`, `/taxi/<commune>`, mentions légales, confidentialité), espace chauffeur (`/admin`) et routes d'API (`/api/...`).
- `components/` : composants du site, du formulaire (`booking/`) et de l'espace chauffeur (`admin/`).
- `lib/` : règles métier testables (prix, promotions, caisse, disponibilité, dates de Paris…), accès à Supabase, alertes.
- `public/sw.js` : service worker des notifications ; `public/icons/` : icônes de l'application.
- `maquette/` : maquettes HTML de référence.

## Avant une mise en ligne

Voir la liste « Pas encore fait » du `CLAUDE.md`. En résumé : domaine et `site.url`, informations légales dans `site.legal`, tarifs et contenus réels, régénérer les clés qui ont circulé, passer `site.indexation` à `true` et `boutonTbd` à `false`.
