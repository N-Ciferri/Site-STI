# Site STI

Site statique hébergé avec **GitHub Pages** : une page d'accueil (`index.html`) qui renvoie vers plusieurs pages HTML.

## Structure

```
index.html          → page d'accueil (liste des pages par catégorie)
style.css           → styles propres à l'accueil
assets/theme.css    → charte graphique commune (couleurs, polices, menu, boutons)
assets/fonts/       → polices Archivo et DM Mono (hébergées dans le site)
pages/              → les pages HTML (activités et outils)
.nojekyll           → indique à GitHub Pages de servir les fichiers tels quels
```

Couleurs des catégories (définies dans `assets/theme.css`) : 1re en corail, Terminale en turquoise, Outils en bleu lavande.
Dans une page, la catégorie se choisit avec la classe de la balise `<html>` : `cat-1re`, `cat-term` ou `cat-outils`.

## Ajouter une page

1. Placez votre fichier `.html` dans `pages/`.
2. Dans `index.html`, dans la bonne catégorie (1re IT/I2D, Terminale 2I2D ou Outils), copiez un bloc `<a class="carte">…</a>` et adaptez `href`, le titre et la description.
3. (Optionnel) Ajoutez en haut de votre page un lien de retour :
   `<a class="retour" href="../index.html">← Retour à l'accueil</a>`

## Mise en ligne

Dans le dépôt GitHub : **Settings → Pages → Build and deployment**
- Source : *Deploy from a branch*
- Branche : `main`, dossier `/ (root)`

Le site sera ensuite accessible à l'adresse `https://<votre-nom>.github.io/Site-STI/`.
