# MO / TRAINING

Web app responsive personnelle de musculation : missions MAIN, QUICK et EMOM, calibration sans 1RM, progression, repos, SWAP, calendrier et LEVEL.

## Démarrer

Node.js 22 ou plus récent. Aucune dépendance à installer.

```sh
npm run dev
# http://127.0.0.1:4187
npm test
npm run check
```

Le dossier `dist/` contient le site complet, directement hébergeable sur GitHub Pages ou un serveur statique. Les chemins sont relatifs et la navigation utilise des ancres, compatible avec un sous-dossier GitHub Pages. Le workflow fourni teste les changements ; la publication GitHub Pages peut être activée manuellement dans Actions après création du dépôt et activation de Pages (source : GitHub Actions).

## Architecture

- `dist/engine.js` : catalogue, sélection, calibration enregistrée par exercice, conventions de charge, progression pure et déterministe, dates locales, historique, volume, XP.
- `dist/app.js` : écrans et machine à états de séance, stockage local versionné, export/import JSON, reprise de séance.
- `dist/style.css` : thème sombre, typographies condensées, responsive.
- `tests/engine.test.js` : règles de progression, calendrier, substitutions, idempotence et gestion des séances partielles.
- `server.js` : aperçu statique local sans dépendance.

Les fichiers sous `sources/` du projet parent restent intacts. Ce dossier est autonome.

## Moteur V1

MAIN suit A → B → C indépendamment de la semaine. Environ 3 missions hebdomadaires, uniquement lundi–vendredi. Blocage des nouvelles missions le samedi (golf), dimanche (repos), le même jour et durant les 36 h suivant une séance avec travail enregistré. Il s’agit d’un garde-fou pragmatique ; davantage de récupération peut être nécessaire.

2 séries par exercice au départ, 3 après 6 MAIN complètes. Plage 8–12, environ 2–3 répétitions en réserve. Les hausses de charge ne sont proposées qu’après toutes les séries en haut de plage avec réserve suffisante, à charge identique, en utilisant le palier réellement disponible. Un échec ou des répétitions sous la plage entraînent une réduction d’un palier. Une séance partielle ne progresse pas et n’avance pas la séquence.

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
