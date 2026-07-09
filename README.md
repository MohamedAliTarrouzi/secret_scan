Secret Scan: Application de scan des credentials malplacès dans le code
**CAHIER DES CHARGES**

**SecretScan**

_Application indépendante d'audit de sécurité du code (Regex + LLM) - avec perspective d'intégration au catalogue DxP_

| **Nom / Code projet** | SecretScan - Détection de secrets et credentials dans le code                         |

## **Historique des versions**


Réorientation : SecretScan développé en Phase 1 comme application indépendante (UI web + API propres, persistance propre), consommant du code en entrée et produisant un audit ; intégration au catalogue DxP repositionnée en Phase 2 (démonstration, fin de stage) | 06/07/2026 |

# **1\. Contexte du projet**

DXC Technology Maroc développe DxP, une plateforme interne de Developer eXperience, qui prévoit à terme un catalogue d'utilitaires intelligents activables en un clic par les équipes (ADR S0-031 - DxP Marketplace). SecretScan est destiné à en devenir le premier utilitaire de la Stack 3 Sécurité : un service de détection automatique des secrets et credentials committés accidentellement dans le code.

Le stage est construit en deux phases délibérément séquencées :

**Phase 1 (cœur du stage) - SecretScan comme application indépendante**

SecretScan est d'abord conçu, développé et livré comme une application autonome : elle consomme du code en entrée (dépôt de fichiers, URL de repo Git, ou collage direct) et restitue un audit de sécurité complet, via une interface web dédiée et une API REST documentée. Cette application ne dépend d'aucun composant de la plateforme DxP pour fonctionner.

**Phase 2 (fin de stage / perspective) - Intégration au catalogue DxP**

Une fois l'application validée de façon autonome, elle est raccordée à la plateforme DxP : image Harbor, step Tekton, vue Portal, contrat Marketplace. Cette phase valorise le travail réalisé en Phase 1 en le projetant dans sa finalité stratégique pour DXC, sans en faire une dépendance de développement de la Phase 1.

**⚠ Correction :** la version précédente (v002) faisait de l'intégration DxP (Marketplace, Portal, Tekton, Harbor) une contrainte d'architecture dès la conception du MVP. Cette version recentre le développement sur une application indépendante d'abord, l'intégration DxP devenant une phase 2 explicite et valorisante, sans bloquer la livraison du cœur fonctionnel.

# **2\. Enjeux du projet**

## **Enjeux immédiats (Phase 1)**

- Disposer d'un outil d'audit de sécurité du code utilisable de façon autonome, sans attendre l'intégration à un socle plateforme.
- Détecter les credentials committés, en combinant regex et LLM selon la nature du cas, avec un niveau de fiabilité mesuré.
- Restituer un audit clair et exploitable : par un humain via une interface web, et par un système tiers via une API REST.

## **Enjeux stratégiques (valorisation du stage vis-à-vis de DxP)**

- Poser la première brique de la future Stack 3 Sécurité du catalogue DxP (SecretScan, puis VulnScan, LicenseScan, CodeReview…).
- Démontrer, par la conception d'une API dès le départ compatible avec le contrat Marketplace DxP, qu'une application indépendante bien architecturée s'intègre ensuite sans réécriture majeure.
- Produire un référentiel de connaissance réutilisable (benchmark Regex vs LLM) pour arbitrer objectivement l'usage du LLM dans les futurs utilitaires du catalogue.
- Illustrer une méthodologie de delivery duplicable pour DXC : construire et valider un utilitaire seul, puis l'intégrer à la plateforme une fois éprouvé - plutôt que de coupler les deux dès le départ.

# **3\. Objectifs du projet**

**Objectifs fermes - Phase 1 (application indépendante)**

- Développer une interface web autonome permettant de soumettre du code à analyser (upload, URL de repo, collage) et de consulter le rapport d'audit.
- Développer une API REST documentée permettant l'appel programmatique du service, indépendamment de l'interface web.
- Détecter les credentials sur 4 catégories (~15 patterns) via un moteur Regex, complété par un moteur LLM sur les cas ambigus (base64, fragments, obfuscation).
- Classifier chaque secret détecté selon 3 niveaux de criticité (Critique / Moyen / Faible) et exposer un verdict global exploitable.
- Conserver un historique des audits réalisés (persistance propre à l'application).
- Produire un benchmark comparatif chiffré (précision, rappel, coût, latence) Regex vs LLM.
- Packager l'application pour un déploiement autonome (conteneurs Docker).

**Objectifs de perspective - Phase 2 (intégration DxP, fin de stage)**

- Adapter le contrat API pour qu'il soit consommé par le catalogue DxP Marketplace (ADR S0-031), sans changement du moteur d'analyse.
- Démontrer l'intégration via un step Tekton sur un Golden Path CI/CD, une image publiée sur Harbor DxP, et une consommation de l'API depuis le Portal DxP.
- Rédiger la fiche catalogue Stack 3 documentant SecretScan comme composant réutilisable.

_Le niveau d'achèvement de la Phase 2 dépend du temps restant après la validation complète de la Phase 1 ; elle est traitée comme une démonstration d'intégration plutôt qu'un déploiement en production dans le Portal DxP._

# **4\. Parties prenantes**

| **Rôle**                               | **Implication**                                                                                    | **Nature**                |
| -------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------- |
| Encadrant (CTO / architecte DxP)       | Cadrage technique, validation des livrables, revue de code, décisions d'architecture               | Décideur                  |
| Chef de Projet                         | Suivi des jalons, arbitrages planning                                                              | Pilotage                  |
| Stagiaire                              | Conception, développement (UI + API + moteur), tests, documentation, présentation finale           | Réalisation               |
| Utilisateur de l'application (Phase 1) | Toute personne disposant du code à auditer : soumet le code via l'UI ou l'API, consulte le rapport | Utilisateur final direct  |
| Ingénieur Plateforme DxP (Phase 2)     | Bénéficiaire de l'intégration : raccorde SecretScan au socle DxP (Harbor, Tekton, Portal)          | Bénéficiaire, phase 2     |
| TL / SE (Phase 2)                      | Utilisateurs finaux une fois SecretScan intégré au Portal DxP - hors périmètre Phase 1             | Utilisateur final différé |

# **5\. Périmètre du projet**

**Phase 1 - périmètre ferme**

En quoi consiste-t-il ? Concevoir et développer une application web indépendante, composée d'une interface utilisateur et d'une API REST, permettant de soumettre du code source et d'obtenir un audit de sécurité (détection de secrets) exploitable immédiatement, sans dépendance à la plateforme DxP.

**Processus couverts (Phase 1) :**

- Soumission du code à analyser : upload d'une archive, URL de repo Git (clonage), ou collage direct de code/diff.
- Sélection du mode d'analyse : diff (comparaison de branches) ou scan complet du dépôt.
- Exécution du moteur hybride Regex + LLM.
- Classification par niveau de criticité et calcul d'un verdict global.
- Consultation du rapport dans l'interface web, avec historique des audits précédents.
- Export du rapport (JSON, et PDF en option) et appel programmatique via l'API REST.

**Phase 2 - périmètre de perspective (fin de stage, si le temps le permet)**

- Publication d'une image Docker sur Harbor DxP.
- Développement d'un step Tekton secret-scan consommant l'API SecretScan depuis un Golden Path CI/CD.
- Démonstration d'un affichage des résultats dans le Portal DxP (le Portal appelle l'API SecretScan comme il appellerait tout utilitaire du Marketplace).
- Rédaction de la fiche catalogue Stack 3.

_Hors périmètre : la correction effective des secrets détectés reste à la charge de l'utilisateur/propriétaire du code ; le déploiement en production dans le Portal DxP pour l'ensemble des projets DxP (au-delà d'une démonstration) est hors périmètre du stage._

## **Hypothèses**

- Accès à un moteur LLM pour la phase d'analyse des cas ambigus (via la gateway LiteLLM DxP déjà disponible, ou toute clé API équivalente).
- Ressources techniques disponibles pour héberger l'application de façon autonome (poste de développement, VM, ou namespace dédié sur le cluster k3s Azure).
- Un jeu de repos de test (secrets fictifs) est constitué par le stagiaire pour les besoins de validation et du benchmark.

## **Contraintes**

- Utilisation de Python 3.11 côté backend.
- Respect de la confidentialité des données : aucun secret détecté n'est journalisé en clair, y compris dans la persistance propre à l'application.
- Respect des délais : Phase 1 validée avant d'entamer la Phase 2 ; livraison finale avant fin du stage (26/08/2026).

# **6\. Besoins fonctionnels**

## **Interface web (application indépendante)**

- Page de soumission : dépôt d'une archive, saisie d'une URL de repo Git (+ token optionnel pour repo privé), ou collage direct de code.
- Choix du mode d'analyse : diff (branche vs référence) ou scan complet.
- Page de résultats : rapport interactif regroupé par niveau de criticité (Critique / Moyen / Faible), détail par occurrence (fichier, ligne, catégorie, méthode de détection, score de confiance).
- Historique des audits : liste des scans précédents, avec accès au rapport correspondant.
- Export du rapport (JSON natif ; PDF en option, non bloquant).

## **API REST (accès programmatique indépendant de l'UI)**

- Endpoint de lancement d'un audit (repo/URL ou contenu, référence, scope diff|full).
- Endpoint de consultation d'un rapport existant (par identifiant d'audit).
- Documentation interactive de l'API (OpenAPI/Swagger, générée automatiquement par FastAPI).
- Réponse structurée dès la Phase 1 avec les mêmes clés que le contrat Marketplace DxP (status, findings, summary) - anticipation volontaire de la Phase 2, sans dépendance réelle à DxP.

## **Niveaux de criticité**

| **Niveau**   | **Définition**                        | **Verdict exposé par l'API**   |
| ------------ | ------------------------------------- | ------------------------------ |
| **Critique** | Secret actif, exploitable directement | status: "blocked"              |
| **Moyen**    | Secret potentiel, contexte ambigu     | status: "warning"              |
| **Faible**   | Faux positif probable, à vérifier     | status: "success" (info seule) |

_Ce verdict est exposé dans la réponse de l'API dès la Phase 1, sans être câblé à un pipeline CI/CD : c'est à l'appelant (un futur pipeline Tekton en Phase 2, ou tout autre système) de décider quoi en faire._

## **Périmètre des secrets couverts**

| **Catégorie**     | **Exemples**                                               |
| ----------------- | ---------------------------------------------------------- |
| Cloud credentials | AWS Access Key, Azure SAS token, GCP service account       |
| API tokens        | GitHub token, GitLab token, Stripe key, Twilio             |
| Authentification  | JWT secret, OAuth client secret, clé privée SSH            |
| Générique         | Mots de passe en dur, chaînes de connexion base de données |

# **7\. Besoins non-fonctionnels et ergonomiques**

- Interface simple, intuitive et autonome (identité visuelle propre à SecretScan, indépendante du design system du Portal DxP en Phase 1).
- Système fluide et réactif : scan d'un diff en quelques secondes ; retour visible de progression pour un scan complet plus long.
- Navigation facile entre les niveaux de criticité et l'historique des audits.
- API documentée et stable, utilisable sans connaître l'interface web.

# **8\. Architecture technique**

**Phase 1 - application indépendante**

- Frontend : application web autonome (React / Vite), interface et parcours propres à SecretScan.
- Backend : API REST FastAPI, exposant les endpoints d'audit et de consultation d'historique.
- Moteur d'analyse : Regex (Python re, 4 catégories, ~15 patterns) + LLM sur les cas ambigus.
- Accès LLM : via la gateway LiteLLM DxP déjà disponible (routage Anthropic/OpenAI), consommée comme un service externe configurable par variable d'environnement - ce qui garde l'application portable en dehors du contexte DXC si besoin.
- Persistance : base de données légère propre à l'application (SQLite pour le MVP, migrable vers PostgreSQL) pour stocker l'historique des audits - nécessaire car l'application ne peut pas s'appuyer sur l'audit trail DxP tant qu'elle est indépendante.
- Déploiement : conteneurs Docker (frontend + backend, orchestrés via docker-compose), exécutables en local, sur une VM, ou sur un namespace k3s dédié - sans dépendance à Harbor, Tekton ou Traefik DxP.

**Phase 2 - perspective d'intégration DxP**

SecretScan est conçu en Phase 1 pour que cette intégration ne nécessite pas de réécriture du moteur ni de l'API métier - seule une couche d'adaptation est ajoutée :

POST /api/marketplace/secretscan/run

{ "service": "nom", "repo": "url", "ref": "branche", "scope": "diff|full" }

{ "status": "success|warning|blocked", "findings": \[...\], "summary": "..." }

- Publication de l'image sur Harbor DxP, appel via la Gateway Traefik (ADR S0-030 - le Portal ne connaît que le Gateway, jamais SecretScan directement).
- Step Tekton secret-scan appelant ce même contrat depuis un Golden Path CI/CD.
- Vue Portal DxP consommant l'API pour l'affichage - réutilisation du même rapport que l'application indépendante.

# **9\. Sécurité**

- Protection des données sensibles : les secrets détectés ne sont jamais journalisés en clair, y compris dans la base de données d'historique (masquage partiel systématique).
- Gestion des accès : en Phase 1, authentification minimale de l'application (accès protégé, à définir : clé API simple ou compte unique) ; en Phase 2, l'authentification est déléguée au socle DxP (Dex, RBAC).
- Sécurisation de l'API : validation stricte des entrées, pas d'exécution de code arbitraire sur le contenu analysé.
- Minimisation de l'exposition au LLM : seuls les extraits jugés ambigus par le regex sont transmis au moteur LLM.
- Gestion prudente des tokens de repo privés fournis pour le clonage (non stockés en clair, portée la plus restreinte possible).

# **10\. Livrables**

| **Livrable**                                  | **Description**                                                                                                                     |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **Application SecretScan (Phase 1)**          | Interface web + API REST + moteur Regex/LLM hybride + historique, packagée en conteneurs Docker autonomes                           |
| Documentation API                             | Documentation interactive (OpenAPI/Swagger) et guide d'utilisation de l'interface                                                   |
| Rapport comparatif                            | Benchmark empirique Regex vs LLM sur cas réels (repos publics GitHub)                                                               |
| **Démonstration d'intégration DxP (Phase 2)** | Image Harbor, step Tekton sur un Golden Path, consommation depuis le Portal DxP - niveau d'achèvement dépendant du temps disponible |
| Fiche catalogue Stack 3                       | Composant documenté et réutilisable pour les futurs utilitaires (VulnScan, LicenseScan…)                                            |
| Rapport final et présentation                 | Bilan du stage, démonstration, perspectives                                                                                         |

# **11\. Jalons macro**

| **Jalon** | **Chantier**                  | **Durée**  | **Description**                                                                     |
| --------- | ----------------------------- | ---------- | ----------------------------------------------------------------------------------- |
| M1        | Initialisation                | 1 semaine  | Analyse des besoins, finalisation du CDC, conception de l'architecture indépendante |
| M2        | Réalisation moteur            | 3 semaines | Moteur Regex, identification des cas limites, moteur LLM                            |
| M3        | Réalisation application       | 2 semaines | Benchmark, API FastAPI, persistance, interface web                                  |
| M4        | Tests et validation           | 1 semaine  | Tests end-to-end de l'application indépendante, packaging Docker                    |
| M5        | Intégration DxP (perspective) | 1 semaine  | Démonstration d'intégration au catalogue DxP, rapport final, présentation           |

Le planning hebdomadaire détaillé fait l'objet d'un document séparé (Planning_Stage_SecretScan.docx).

_Fin du document._

secret_scan/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   └── endpoints.py
│   │   ├── core/
│   │   │   ├── __init__.py
│   │   │   ├── config.py
│   │   │   └── database.py
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   └── audit.py
│   │   ├── schemas/
│   │   │   ├── __init__.py
│   │   │   └── audit_schema.py
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── regex_engine.py
│   │   │   └── llm_engine.py
│   │   ├── __init__.py
│   │   └── main.py
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   │   ├── SubmissionPage.jsx
│   │   │   ├── ResultsPage.jsx
│   │   │   └── HistoryPage.jsx
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── Dockerfile
│   ├── package.json
│   └── vite.config.ts
├── README.md
└── docker-compose.yml
