# SecretScan

API FastAPI de détection de secrets exposés dans du code. Le backend analyse du texte, un fichier, une archive ou un dépôt GitHub public avec des expressions régulières configurables, filtrées par une allowlist inspirée de GitLeaks.

> État actuel : le moteur Regex est fonctionnel et validé par un benchmark chiffré (81.82% de rappel global sur le jeu de test). Le moteur LLM est encore à l'état d'ébauche. Les modèles SQLAlchemy et les schémas d'audit sont en cours d'intégration ; l'historique est pour l'instant conservé en mémoire du processus tant que `app/api/endpoints.py` n'est pas basculé sur la persistance SQLite.

## Fonctionnalités implémentées

- Analyse ligne par ligne de texte inline ou d'un fichier texte local.
- Analyse d'archives `.zip`, `.tar`, `.tar.gz` et `.tgz`, avec filtrage par chemin **avant** lecture/décodage (allowlist de paths : `node_modules`, lockfiles, binaires, etc.), pour éviter de scanner inutilement des fichiers non pertinents.
- Téléchargement et analyse d'un dépôt GitHub via son archive de branche (`main`, puis repli sur `master`).
- 15 motifs Regex répartis dans les catégories `Cloud credentials`, `API tokens`, `Authentification` et `Generic`.
- **Allowlist de faux positifs** (`app/data/allowlist.json`) : filtrage des valeurs détectées correspondant à des placeholders connus (variables de template `${VAR}`, `{{...}}`, booléens, etc.), en complément du filtrage par chemin de fichier.
- **Contexte enrichi** : chaque finding inclut désormais un bloc de contexte multi-lignes (2 lignes avant / 2 lignes après la ligne détectée, ligne détectée marquée par `>>`), pensé pour fournir plus de matière à la future couche LLM qu'une seule ligne isolée.
- Résultat structuré comprenant les findings, leur gravité, leur confiance, leur contexte, leur entropie et un message exploitable par un pipeline.
- Consultation et modification du fichier de motifs Regex via API.

Les motifs actuels détectent notamment les clés AWS/GCP, jetons GitHub/GitLab/Stripe, webhooks Slack, tokens Discord, clés Heroku, en-têtes de clés privées, JWT, URL de connexion de base de données et affectations de mots de passe.

## Architecture du backend

```text
POST /api/scan
  └─ scan_orchestrator
      ├─ scan_content        (texte / fichier)
      ├─ scan_zip / scan_tar (archives, avec skip par allowlist de paths)
      └─ download_and_scan_github (dépôt GitHub)
          └─ regex_engine    (motifs de app/data/regex_patterns.json
                               + filtrage app/data/allowlist.json)
```

`app/main.py` initialise FastAPI, active CORS pour toutes les origines et monte le routeur sous `/api`. `app/core/database.py` prépare une connexion SQLAlchemy SQLite configurable avec `SQLALCHEMY_DATABASE_URL`. Les modèles (`app/models/audit.py`, tables `ScanReport`/`Finding` en relation 1-N) et les schémas Pydantic associés (`app/schemas/audit_schema.py`) sont définis ; leur branchement dans `app/api/endpoints.py` (remplacement de `history_store` par une session SQLAlchemy via `get_db`) est la prochaine étape pour rendre l'historique persistant.

## Prérequis

- Python 3.11 recommandé (l'image Docker est basée sur Python 3.11).
- Docker et Docker Compose, ou un environnement Python local.

## Démarrage

### Avec Docker Compose

Depuis la racine du projet :

```bash
docker compose up --build
```

L'API est disponible sur `http://localhost:8000` et sa documentation interactive sur `http://localhost:8000/docs`.

### En local

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Sous macOS/Linux, activez l'environnement avec `source venv/bin/activate`.

> ⚠️ Les motifs Regex (`regex_patterns.json`) et l'allowlist (`allowlist.json`) sont chargés une seule fois, au démarrage du module Python. Toute modification de ces fichiers nécessite un **redémarrage complet** du serveur (`Ctrl+C` puis relance) pour être prise en compte — le rechargement à chaud `--reload` d'Uvicorn ne surveille que les fichiers `.py`, pas les `.json`.

## API

### `GET /`

Vérifie que le service est actif.

### `POST /api/scan`
Corps JSON : texte inline, chemin local ou URL GitHub.

### `POST /api/scan/upload`
Corps multipart/form-data : upload d'un fichier ou d'une archive.

Lance une analyse. Trois modes sont pris en charge :

- **Texte inline** : envoyez un corps JSON avec `target: "inline"` et `content`.
- **Chemin local ou URL GitHub** : envoyez `target` dans le JSON. Seules les URL contenant `github.com` sont acceptées ; la branche utilisée est `main`, avec repli sur `master`.
- **Fichier uploadé** : envoyez le champ multipart `file`. Le fichier est placé temporairement dans un dossier temporaire puis analysé selon son extension.

Exemple texte inline :

```bash
curl -X POST http://localhost:8000/api/scan \
  -H "Content-Type: application/json" \
  -d '{"target":"inline","content":"password = \"mySecret_123!\""}'
```

La réponse contient :

```json
{
  "status": "success",
  "target": "inline",
  "findings": [],
  "summary": { "total": 0, "critical": 0, "medium": 0, "low": 0, "ambiguous": 0 },
  "pipeline_message": "INFO: no blocking issue detected"
}
```

Un finding inclut `category`, `name`, `file_path`, `line`, `value`, `severity`, `confidence`, `entropy`, `context`, `description` et `review_required`.

`context` est désormais un bloc de plusieurs lignes numérotées (2 avant, 2 après la ligne détectée), la ligne détectée étant préfixée par `>>`, plutôt qu'une seule ligne isolée.

`entropy` est l'entropie de Shannon de la valeur détectée ; elle est fournie comme indicateur complémentaire et ne modifie pas la gravité du finding.

Le champ `pipeline_message` est `BLOCKED` s'il existe au moins un finding `Critical`, `WARNING` en présence d'un finding `Medium`, et `INFO` sinon. Le champ `status` reste actuellement toujours `success` lorsqu'aucune erreur ne survient.

Exemple d'upload :

```bash
curl.exe -X POST "http://127.0.0.1:8000/api/scan/upload" -F "file=@.\tmp_test.zip"
```

### `GET /api/history`

Retourne les résultats de scans effectués depuis le démarrage de l'API. Cet historique est actuellement une liste en mémoire : il est perdu au redémarrage et n'est pas partagé entre plusieurs instances. Le passage à une persistance SQLite (modèles déjà définis dans `app/models/audit.py`) est en cours.

### Gestion des motifs Regex

- `GET /api/regex-patterns` : retourne les motifs actifs.
- `POST /api/regex-patterns` : remplace le contenu de `backend/app/data/regex_patterns.json` avec `{ "patterns": [...] }`.
- `POST /api/regex-patterns/restore-backup` : restaure le fichier actif depuis le fichier backup, sans modifier le backup.

Les motifs sont chargés au démarrage du module Python : après modification par API ou édition directe du fichier, redémarrez le backend pour que les scans utilisent la nouvelle configuration. Le fichier de secours est actuellement identique au fichier actif.

### Allowlist

`app/data/allowlist.json` contient deux listes de regex, sur le modèle de GitLeaks :

- `paths` : chemins de fichiers ignorés **avant** lecture (ex. `node_modules`, `package-lock.json`, fichiers binaires/images).
- `regexes` : valeurs détectées ignorées après matching (ex. placeholders de template `${VAR}`, `{{...}}`, littéraux `true`/`false`/`null`).

Comme pour les motifs Regex, toute modification de ce fichier nécessite un redémarrage du serveur.

## Benchmark

Un jeu de test étiqueté (`backend/benchmark/manifests/ground_truth.csv`) et un script d'évaluation (`backend/benchmark/evaluate.py`) permettent de mesurer la précision et le rappel du moteur Regex par catégorie.

```bash
cd backend
# Vider les anciens résultats avant un nouveau run
rm benchmark/results/*.json   # ou : Remove-Item benchmark\results\*.json sous PowerShell

# Lancer un scan sur le jeu de test (via /api/scan/upload), puis :
python benchmark/evaluate.py
```

Le jeu de test inclut volontairement des cas non détectables par le moteur Regex seul (clé encodée en base64, clé fragmentée sur plusieurs variables) — ces faux négatifs sont attendus et documentés dans `ground_truth.csv`, en attendant la couche LLM prévue en semaine 4 du planning.

## Tests fournis

Les tests unitaires du moteur se trouvent dans `backend/tests/test_regex_engine.py` et couvrent les clés AWS, tokens GitHub, clés privées, URL de connexion, mots de passe génériques et code sans secret.

```bash
cd backend
pytest tests/test_regex_engine.py
```

`backend/tests/test2_regex_engine.py` est un script de démonstration exécuté directement ; `file_test.py` fournit un échantillon de code volontairement sensible pour l'analyse manuelle.

## Limites et précautions importantes

- Les valeurs et le contexte des secrets détectés sont renvoyés **en clair** par l'API. Ne pas exposer ce service sans protection, ni consigner ses réponses dans des logs non sécurisés.
- L'API n'a pas d'authentification et CORS autorise toutes les origines.
- Les archives sont parcourues sans limite de taille, de nombre de fichiers ou de profondeur (au-delà du filtrage par allowlist de paths) ; n'analysez pas d'archives non fiables en production sans protections supplémentaires.
- Le téléchargement GitHub n'utilise ni timeout ni token d'accès et ne prend pas en charge les dépôts privés.
- Le scan direct d'un dossier local n'est pas implémenté.
- Certains formats de secrets échappent structurellement à la détection par Regex seule (encodage base64, valeurs fragmentées sur plusieurs lignes/variables) — traité par la future couche LLM.

## Dépendances principales

FastAPI, Uvicorn, SQLAlchemy, Requests, Pydantic, Pytest, HTTPX et python-dotenv. La liste complète, non verrouillée en version, est dans `backend/requirements.txt`.