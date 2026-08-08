# Webapp frontend

Front-end statique du projet Bracelet Connecte. Il affiche une page de login, une vue d’accueil avec les dernières mesures reçues et une vue statistiques avec une courbe temporelle simple.

## Lancement local

```sh
docker build -t webapp-frontend .
docker run --rm -p 8080:80 webapp-frontend
```

Le front-end parle au back-end via `http://localhost:8000` par défaut. Tu peux changer l’URL du back-end directement dans le formulaire de connexion.

## Pages

- Accueil / connexion
- Tableau de bord temps réel
- Statistiques et courbes par fenêtre de temps
