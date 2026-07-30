# SecretScan

API FastAPI de détection de secrets exposés dans du code. Le backend analyse du texte, un fichier, une archive ou un dépôt GitHub public avec des expressions régulières configurables.

> État actuel : le moteur Regex est fonctionnel ; le moteur LLM, les modèles SQLAlchemy et les schémas d'audit sont encore des emplacements vides. L'historique est conservé uniquement en mémoire du processus.

## Fonctionnalités implémentées

- Analyse ligne par ligne de texte inline ou d'un fichier texte local.
- Analyse d'archives `.zip`, `.tar`, `.tar.gz` et `.tgz`.
- Téléchargement et analyse d'un dépôt GitHub via son archive de branche (`main`, puis repli sur `master`).
- 15 motifs Regex répartis dans les catégories `Cloud credentials`, `API tokens`, `Authentification` et `Générique`.
- Résultat structuré comprenant les findings, leur gravité, leur confiance et un message exploitable par un pipeline.
- Consultation et modification du fichier de motifs Regex via API.

Les motifs actuels détectent notamment les clés AWS/GCP, jetons GitHub/GitLab/Stripe, webhooks Slack, tokens Discord, clés Heroku, en-têtes de clés privées, JWT, URL de connexion de base de données et affectations de mots de passe.

## Architecture du backend

```text
POST /api/scan
  └─ scan_orchestrator
      ├─ scan_content       (texte / fichier)
      ├─ scan_zip / scan_tar (archives)
      └─ download_and_scan_github (dépôt GitHub)
          └─ regex_engine   (motifs de backend/data/regex_patterns.json)
```

`app/main.py` initialise FastAPI, active CORS pour toutes les origines et monte le routeur sous `/api`. `app/core/database.py` prépare une connexion SQLAlchemy SQLite configurable avec `SQLALCHEMY_DATABASE_URL`, mais aucune persistance d'audit n'est actuellement branchée.

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

## API

### `GET /`

Vérifie que le service est actif.

### `POST /api/scan`
Corps JSON : texte inline, chemin local ou URL GitHub.


### `POST /api/scan/upload`
Corps multipart/form-data : upload d’un fichier ou d’une archive.

Lance une analyse. Trois modes sont pris en charge :

- **Texte inline** : envoyez un corps JSON avec `target: "inline"` et `content`.
- **Chemin local ou URL GitHub** : envoyez `target` dans le JSON. Seules les URL contenant `github.com` sont acceptées ; la branche utilisée est `main`, avec repli sur `master`.
- **Fichier uploadé** : envoyez le champ multipart `file`. Le fichier est placé temporairement dans `/tmp` puis analysé selon son extension.

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

Un finding inclut `category`, `name`, `file_path`, `line`, `value`, `severity`, `confidence`, `context`, `description` et `review_required`.

Le champ `pipeline_message` est `BLOCKED` s'il existe au moins un finding `Critique`, `WARNING` en présence d'un finding `Moyen`, et `INFO` sinon. Le champ `status` reste actuellement toujours `success` lorsqu'aucune erreur ne survient.

Exemple d'upload:

```bash
curl.exe -X POST "http://127.0.0.1:8000/api/scan/upload" -F "file=@.\tmp_test.zip"
```

### `GET /api/history`

Retourne les résultats de scans effectués depuis le démarrage de l'API. Cet historique est une liste en mémoire : il est perdu au redémarrage et n'est pas partagé entre plusieurs instances.

### Gestion des motifs Regex

- `GET /api/regex-patterns` : retourne les 15 motifs actifs.
- `POST /api/regex-patterns` : remplace le contenu de `backend/data/regex_patterns.json` avec `{ "patterns": [...] }`.
- `POST /api/regex-patterns/restore-backup` : restaure le fichier actif depuis le fichier backup, sans modifier le backup.

Les motifs sont chargés au démarrage du module Python : après modification par API, redémarrez le backend pour que les scans utilisent la nouvelle configuration. Le fichier de secours est actuellement identique au fichier actif.

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
- Les archives sont parcourues sans limite de taille, de nombre de fichiers ou de profondeur ; n'analysez pas d'archives non fiables en production sans protections supplémentaires.
- Le téléchargement GitHub n'utilise ni timeout ni token d'accès et ne prend pas en charge les dépôts privés.
- Le scan direct d'un dossier local n'est pas implémenté.
- Le champ `review_required` contient une faute de comparaison dans l'implémentation actuelle et ne signale donc pas correctement les cas ambigus.

## Dépendances principales

FastAPI, Uvicorn, SQLAlchemy, Requests, Pydantic, Pytest, HTTPX et python-dotenv. La liste complète, non verrouillée en version, est dans `backend/requirements.txt`.
