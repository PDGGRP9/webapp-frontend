# Webapp frontend

Front-end web du projet Bracelet Connecte, en **TypeScript + React** (Vite). Il affiche une page de connexion/inscription, un tableau de bord avec les dernières mesures reçues et une vue statistiques avec une courbe temporelle par métrique et par plage de temps.

Le bracelet transmet ses données en BLE à l'app Android, qui les relaie au back-end en HTTPS. Cette webapp ne parle qu'au back-end (jamais directement au bracelet) : elle sert à consulter, en direct ou en historique, ce que le back-end a reçu.

## Démarrage local

```sh
npm install
npm run dev       # serveur de dev sur http://localhost:5173
```

Le formulaire de connexion/inscription demande l'URL du back-end (`http://localhost:8000` par défaut) ; elle est mémorisée dans `localStorage` et réutilisée aux prochaines visites.

## Scripts

```sh
npm run dev       # serveur de dev Vite
npm run build     # vérification TypeScript + build de production dans dist/
npm run preview   # sert le build de production localement
npm run lint      # ESLint
npm run test      # tests unitaires (Vitest)
```

## Lancement via Docker

```sh
docker build -t webapp-frontend .
docker run --rm -p 8080:80 webapp-frontend
```

Le `Dockerfile` est multi-stage : `npm ci && npm run build` dans une image Node, puis le contenu de `dist/` est servi par nginx (`nginx.conf` gère déjà le fallback SPA).

## Pages

- `/login`, `/register` — connexion et création de compte (contre `/api/login`, `/api/register`, session validée via `/api/me`)
- `/` — tableau de bord temps réel (polling toutes les 15s)
- `/stats` — statistiques et courbe par métrique (BPM, SpO2, pas, qualité signal) et par plage (24h / 7j / 30j)

## Structure

```
src/
  api/          client HTTP typé + types partagés avec le back-end
  context/      session (AuthContext) et données mesurées (MeasurementsContext)
  components/   NavBar, MetricCard, DataTable, LineChart, ...
  pages/        LoginPage, RegisterPage, DashboardPage, StatsPage
  lib/          formatage et logique de tri/filtrage des mesures
```
