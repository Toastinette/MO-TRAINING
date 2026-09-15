# MO / TRAINING — V1.1

Web app responsive personnelle de musculation : missions MAIN, QUICK et EMOM, premier essai guidé sans test maximal, progression, repos, SWAP, calendrier et LEVEL.

## Démarrer

Node.js 22 ou plus récent. Aucune dépendance à installer.

```sh
npm run dev
# http://127.0.0.1:4187
npm test
npm run check
```

## Dossier à utiliser dans GitHub Desktop

Ajouter le dépôt existant `/Users/morgan/Documents/APP-GitHub/GitHub/MO-TRAINING` avec **File → Add Local Repository**. Ne pas créer un deuxième dossier MO-TRAINING à l’intérieur. Le dépôt contient déjà son historique Git et est relié à `Toastinette/MO-TRAINING`.

## Publication GitHub Pages

Le dépôt contient désormais une entrée `index.html` à la racine. Elle charge le même code que l’entrée `dist/index.html` : il n’y a qu’une seule application, dans `dist/`.

Deux modes sont compatibles, sans déplacer aucun fichier :

1. **Publication depuis la branche (la plus simple)** : dans Settings → Pages, choisir **Deploy from a branch**, branche **main**, dossier **/ (root)**, puis Save. Après chaque envoi sur GitHub, Pages sert l’application à la racine du site.
2. **GitHub Actions** : dans Settings → Pages, choisir **GitHub Actions**, puis lancer **Publier sur GitHub Pages → Run workflow** dans Actions. Le workflow publie seulement `dist/` après les tests. Il reste manuel pour ne pas modifier automatiquement un mode Pages déjà choisi.

GitHub Pages doit être disponible pour le type de dépôt et le compte. Ne pas rendre le dépôt public uniquement pour contourner une limitation : le code contient des valeurs personnelles initiales. Le site privé Sites reste indépendant de GitHub Pages.

Les chemins d’assets sont relatifs et la navigation utilise des ancres, compatibles avec un sous-dossier comme `/MO-TRAINING/`. Les fichiers `.nojekyll` évitent une transformation inutile de ce site statique.

### Parcours simplifié V1.1

- Aucun formulaire de profil imposé avant de commencer.
- Premier exercice : un poids à saisir, puis **Trop facile / Bien / Trop difficile**. Les informations de machine sont préremplies et modifiables via « Ma machine est différente ».
- Les essais trop faciles ou difficiles conservent le poids, le type de machine et la suggestion suivante, même après rechargement. Un essai ne compte pas comme série.
- Pendant le travail : poids et répétitions préremplis. Un bouton **Facile / Bien / Trop dur** enregistre la série et affiche le repos. Les boutons − / + permettent de corriger les répétitions réellement faites.
- Le réglage de l’augmentation de poids n’est plus obligatoire. Une valeur par matériel est proposée ; elle reste modifiable dans les conseils de l’exercice. Les poids suggérés peuvent être corrigés selon la disponibilité réelle du matériel.
- **Mettre en pause** conserve la séance ; l’accueil propose **Reprendre ma séance**. Les anciennes sauvegardes V1 restent compatibles.
- Bonus, détails du programme, mesures corporelles et conseils sont repliés par défaut.

Les données d’un site privé Sites et de GitHub Pages sont séparées par le navigateur : exporter puis restaurer une sauvegarde pour passer d’une adresse à l’autre.

## Architecture

- `dist/engine.js` : catalogue, sélection, calibration enregistrée par exercice, conventions de charge, progression pure et déterministe, dates locales, historique, volume, XP.
- `index.html` : entrée pour GitHub Pages publié depuis la racine.
- `dist/flow.js` : transitions de séance, premier essai, ressenti et reprise après repos.
- `dist/app.js` : écrans et machine à états de séance, stockage local versionné, export/import JSON, reprise de séance.
- `dist/style.css` : thème sombre, typographies condensées, responsive.
- `tests/flow.test.js` : premier essai, corrections de poids, pause/reprise et protection contre les doubles validations.
- `tests/site.test.js` : compatibilité des chemins aux deux racines de publication.
- `tests/engine.test.js` : règles de progression, calendrier, substitutions, idempotence et gestion des séances partielles.
- `server.js` : aperçu statique local sans dépendance.

Les fichiers sous `sources/` du projet parent restent intacts. Ce dossier est autonome.

## Moteur V1

MAIN suit A → B → C indépendamment de la semaine. Environ 3 missions hebdomadaires, uniquement lundi–vendredi. Blocage des nouvelles missions le samedi (golf), dimanche (repos), le même jour et durant les 36 h suivant une séance avec travail enregistré. Il s’agit d’un garde-fou pragmatique ; davantage de récupération peut être nécessaire.

2 séries par exercice au départ, 3 après 6 MAIN complètes. Plage 8–12, environ 2–3 répétitions en réserve. Les hausses de charge ne sont proposées qu’après toutes les séries en haut de plage avec réserve suffisante, à charge identique, avec une petite augmentation modifiable selon le matériel disponible. Un échec ou des répétitions sous la plage entraînent une réduction d’un palier. Une séance partielle ne progresse pas et n’avance pas la séquence.

Chaque appareil/exercice conserve sa calibration : aucune conversion de poids entre machines ou vers des haltères. Recalibrer en cas de changement d’appareil. Un SWAP conserve pattern, muscle et matériel disponible. Si aucune option n’existe, l’app l’indique. Les charges de machines à disques excluent le poids inconnu du chariot.

QUICK conserve 4 mouvements essentiels avec 2 séries. EMOM est un circuit de conditionnement de 12 minutes au poids du corps (squat au banc, pompes inclinées, marche dynamique), sans progression automatique de charges ni comptage en volume hypertrophique. Aucun des deux ne fait avancer A → B → C. Finishers facultatifs : gainage, vélo, mobilité. Aucun bonus XP lié à la douleur, l’échec ou des charges plus lourdes.

Garmin gère les temps : l’app affiche le repos et attend une validation manuelle. Pas de connexion Garmin, balance, calories brûlées ou compte dans cette version.

## Données et limites

Les valeurs corporelles initiales ont été reprises à la demande de l’utilisateur et sont toutes modifiables. Elles ne servent pas à calculer les charges. Les données restent dans le navigateur et sur cet appareil. Exporter régulièrement : vider le stockage du navigateur les efface. Les sauvegardes contiennent des données personnelles. Avant de rendre le dépôt public, envisager de remplacer les valeurs personnelles initiales dans `defaults()`.

La V1 n’est ni un dispositif médical ni un programme de rééducation. Elle ne diagnostique pas les douleurs. Les consignes par exercice ne remplacent pas l’apprentissage pratique du mouvement. Les règles de programmation sont explicites mais ne constituent pas un optimum personnalisé scientifiquement validé. La réserve estimée est imprécise chez les novices. La progression automatique du volume est volontairement simple ; adaptation fine à la fatigue et suivi longitudinal de mesures corporelles restent à développer.

## Sources

- ACSM, 2026. Resistance Training Prescription for Muscle Function, Hypertrophy, and Physical Performance in Healthy Adults: An Overview of Reviews. https://pubmed.ncbi.nlm.nih.gov/41843416/
- Singer et al., 2024. Give it a rest: a systematic review with Bayesian meta-analysis on the effect of inter-set rest interval duration on muscle hypertrophy. https://pubmed.ncbi.nlm.nih.gov/39205815/
- Robinson et al., 2024. Exploring the Dose-Response Relationship Between Estimated Resistance Training Proximity to Failure, Strength Gain, and Muscle Hypertrophy. https://pubmed.ncbi.nlm.nih.gov/38970765/

Ces publications soutiennent les principes généraux ; la séquence, le seuil de 6 séances, les 36 h et les paliers exacts sont des choix de produit prudents et testables.
