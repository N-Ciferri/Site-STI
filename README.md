# Site STI

Site statique hébergé avec **GitHub Pages** : une page d'accueil (`index.html`) qui renvoie vers plusieurs pages HTML.

## Structure

```
index.html      → page d'accueil (liste des pages)
style.css       → style commun
pages/          → vos pages HTML
.nojekyll       → indique à GitHub Pages de servir les fichiers tels quels
```

## Ajouter une page

1. Placez votre fichier `.html` dans `pages/`.
2. Dans `index.html`, copiez un bloc `<a class="carte">…</a>` et adaptez `href`, le titre et la description.
3. (Optionnel) Ajoutez en haut de votre page un lien de retour :
   `<a class="retour" href="../index.html">← Retour à l'accueil</a>`

## Mise en ligne

Dans le dépôt GitHub : **Settings → Pages → Build and deployment**
- Source : *Deploy from a branch*
- Branche : `main` (ou la branche qui contient ces fichiers), dossier `/ (root)`

Le site sera ensuite accessible à l'adresse `https://<votre-nom>.github.io/Site-STI/`.
