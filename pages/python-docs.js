/* Fiches en français des bibliothèques Python les plus utilisées au lycée.
   Utilisées par python.html : quand un programme contient « import xxx »,
   la fiche de xxx s'affiche dans le panneau « Bibliothèques importées ».

   Pour ajouter une fiche : copier un bloc, changer le nom (clé), le titre,
   l'introduction, la liste des fonctions [syntaxe, description] et l'exemple. */
window.FICHES_PYTHON = {

  "math": {
    titre: "math — fonctions mathématiques",
    intro: "Racines, puissances, trigonométrie, logarithmes et constantes comme π.",
    fonctions: [
      ["math.sqrt(x)", "racine carrée de x"],
      ["math.pow(x, y)", "x puissance y (on peut aussi écrire x ** y sans math)"],
      ["math.pi", "la constante π ≈ 3,14159"],
      ["math.e", "la constante e ≈ 2,71828"],
      ["math.cos(x), math.sin(x), math.tan(x)", "cosinus, sinus, tangente — x est en radians"],
      ["math.acos(x), math.asin(x), math.atan(x)", "fonctions réciproques — résultat en radians"],
      ["math.radians(x)", "convertit des degrés en radians"],
      ["math.degrees(x)", "convertit des radians en degrés"],
      ["math.floor(x)", "arrondi à l'entier inférieur : floor(3.7) donne 3"],
      ["math.ceil(x)", "arrondi à l'entier supérieur : ceil(3.2) donne 4"],
      ["math.exp(x)", "exponentielle de x"],
      ["math.log(x)", "logarithme népérien (ln) de x"],
      ["math.log10(x)", "logarithme décimal de x"],
      ["math.fabs(x)", "valeur absolue (abs(x) fonctionne aussi sans math)"]
    ],
    note: "Les fonctions trigonométriques travaillent en radians : pour un angle en degrés, écrire math.cos(math.radians(60)).",
    exemple:
'import math\n\nprint(math.sqrt(16))                  # 4.0\nprint(round(math.pi, 3))              # 3.142\nprint(math.cos(math.radians(60)))     # 0.5 environ\n\n# Hypoténuse d\'un triangle rectangle\na, b = 3, 4\nprint("Hypoténuse :", math.sqrt(a**2 + b**2))\n'
  },

  "random": {
    titre: "random — nombres aléatoires",
    intro: "Tirer des nombres au hasard, choisir un élément dans une liste, mélanger.",
    fonctions: [
      ["random.random()", "nombre à virgule au hasard entre 0 et 1 (1 exclu)"],
      ["random.randint(a, b)", "entier au hasard entre a et b, a et b inclus"],
      ["random.randrange(a, b)", "entier au hasard entre a et b, b exclu (comme range)"],
      ["random.uniform(a, b)", "nombre à virgule au hasard entre a et b"],
      ["random.choice(liste)", "un élément de la liste choisi au hasard"],
      ["random.shuffle(liste)", "mélange la liste (la liste est modifiée, rien n'est renvoyé)"],
      ["random.sample(liste, k)", "k éléments différents tirés au hasard"],
      ["random.seed(n)", "fixe le départ du hasard : on obtient toujours la même suite de tirages"]
    ],
    note: "Attention : randint(1, 6) peut donner 6, alors que randrange(1, 6) s'arrête à 5.",
    exemple:
'import random\n\nde = random.randint(1, 6)\nprint("Lancer de dé :", de)\n\ncouleurs = ["rouge", "vert", "bleu"]\nprint("Couleur tirée :", random.choice(couleurs))\n\ncartes = [1, 2, 3, 4, 5]\nrandom.shuffle(cartes)\nprint("Cartes mélangées :", cartes)\n'
  },

  "time": {
    titre: "time — temps et pauses",
    intro: "Mesurer une durée ou faire une pause.",
    fonctions: [
      ["time.time()", "nombre de secondes écoulées depuis le 1er janvier 1970 : sert à mesurer des durées"],
      ["time.sleep(s)", "met le programme en pause pendant s secondes"],
      ["time.localtime()", "date et heure actuelles, détaillées (année, mois, jour, heure…)"],
      ["time.strftime(format)", "date et heure sous forme de texte, par exemple time.strftime(\"%H:%M\")"]
    ],
    note: "Dans cet éditeur, time.sleep() fait bien attendre, mais tout ce que le programme affiche n'apparaît qu'à la fin de l'exécution.",
    exemple:
'import time\n\ndebut = time.time()\ntotal = 0\nfor i in range(1_000_000):\n    total += i\nduree = time.time() - debut\n\nprint("Total :", total)\nprint("Calcul fait en", round(duree, 3), "s")\nprint("Il est", time.strftime("%H:%M"))\n'
  },

  "statistics": {
    titre: "statistics — statistiques",
    intro: "Moyenne, médiane, écart type d'une liste de valeurs.",
    fonctions: [
      ["statistics.mean(liste)", "moyenne"],
      ["statistics.median(liste)", "médiane"],
      ["statistics.mode(liste)", "valeur la plus fréquente"],
      ["statistics.pstdev(liste)", "écart type (de la population)"],
      ["statistics.stdev(liste)", "écart type (d'un échantillon)"],
      ["min(liste), max(liste), sum(liste), len(liste)", "minimum, maximum, somme, nombre de valeurs (sans import)"]
    ],
    exemple:
'import statistics\n\nmesures = [12.1, 11.8, 12.4, 12.0, 11.9, 12.2]\n\nprint("Moyenne :", round(statistics.mean(mesures), 2))\nprint("Médiane :", statistics.median(mesures))\nprint("Écart type :", round(statistics.pstdev(mesures), 3))\nprint("Min / max :", min(mesures), "/", max(mesures))\n'
  },

  "datetime": {
    titre: "datetime — dates et heures",
    intro: "Manipuler des dates : aujourd'hui, différence entre deux dates, ajout de jours.",
    fonctions: [
      ["datetime.date.today()", "date du jour"],
      ["datetime.datetime.now()", "date et heure actuelles"],
      ["datetime.date(annee, mois, jour)", "crée une date"],
      ["datetime.timedelta(days=n)", "une durée de n jours, à ajouter ou retirer d'une date"],
      ["date2 - date1", "durée entre deux dates (avec .days pour le nombre de jours)"],
      ["d.strftime(\"%d/%m/%Y\")", "écrit la date au format français"]
    ],
    exemple:
'import datetime\n\naujourdhui = datetime.date.today()\nprint("Aujourd\'hui :", aujourdhui.strftime("%d/%m/%Y"))\n\nbac = datetime.date(2027, 6, 15)\nprint("Jours avant le 15/06/2027 :", (bac - aujourdhui).days)\n\ndans30 = aujourdhui + datetime.timedelta(days=30)\nprint("Dans 30 jours :", dans30.strftime("%d/%m/%Y"))\n'
  },

  "matplotlib.pyplot": {
    titre: "matplotlib.pyplot — graphiques",
    intro: "Tracer des courbes, des nuages de points et des histogrammes. On l'importe en général avec : import matplotlib.pyplot as plt",
    fonctions: [
      ["plt.plot(x, y)", "trace une courbe reliant les points (x, y)"],
      ["plt.plot(x, y, \"ro\")", "points rouges sans ligne (\"b-\" ligne bleue, \"g--\" pointillés verts…)"],
      ["plt.scatter(x, y)", "nuage de points"],
      ["plt.bar(noms, valeurs)", "diagramme en barres"],
      ["plt.xlabel(\"...\"), plt.ylabel(\"...\")", "nom des axes"],
      ["plt.title(\"...\")", "titre du graphique"],
      ["plt.grid(True)", "affiche la grille"],
      ["plt.legend()", "affiche la légende (avec label=\"...\" dans plot)"],
      ["plt.xlim(a, b), plt.ylim(a, b)", "limites des axes"],
      ["plt.show()", "affiche le graphique"]
    ],
    note: "La première utilisation demande quelques secondes : la bibliothèque est téléchargée.",
    exemple:
'import matplotlib.pyplot as plt\n\nt = [0, 1, 2, 3, 4, 5]\nposition = [0, 2, 8, 18, 32, 50]\n\nplt.plot(t, position, "bo-", label="mesures")\nplt.xlabel("t (s)")\nplt.ylabel("x (m)")\nplt.title("Position en fonction du temps")\nplt.grid(True)\nplt.legend()\nplt.show()\n'
  }
};

/* Noms d'import qui renvoient vers une fiche existante */
window.FICHES_PYTHON_ALIAS = {
  "matplotlib": "matplotlib.pyplot",
  "pylab": "matplotlib.pyplot"
};
