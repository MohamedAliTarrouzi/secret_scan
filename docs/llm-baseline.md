Evaluate llm results:

=== Volumétrie ===
Findings traités (toutes passes confondues) : 18
Échecs techniques (llm_error non-null)       : 0  (0.00%)
Findings avec vérité terrain connue           : 18

=== Précision du verdict (sur findings matchés à la vérité terrain) ===
| Statut | Nombre | % |
| :--- | :--- | :--- |
| Corrects (secret/false_positive juste) | 12 | 66.67% |
| Incorrects (verdict opposé à la vérité) | 6 | 33.33% |
| Uncertain (LLM ne s'est pas prononcé) | 0 | 0.00% |

=== Stabilité du verdict entre les runs (même finding, plusieurs passes) ===
benchmark-repo-34d29e5afaf9e82a4d1b1a709fb253b9a92441cc/src/api_clients.js:13 -> ['false_positive', 'false_positive', 'false_positive']  [OK]
benchmark-repo-34d29e5afaf9e82a4d1b1a709fb253b9a92441cc/src/api_clients.js:14 -> ['false_positive', 'false_positive', 'false_positive']  [OK]
benchmark-repo-34d29e5afaf9e82a4d1b1a709fb253b9a92441cc/src/auth_module.py:15 -> ['false_positive', 'false_positive', 'false_positive']  [OK]
benchmark-repo-34d29e5afaf9e82a4d1b1a709fb253b9a92441cc/src/cloud_config.py:5 -> ['false_positive', 'false_positive', 'false_positive']  [OK]
benchmark-repo-34d29e5afaf9e82a4d1b1a709fb253b9a92441cc/src/cloud_config.py:9 -> ['false_positive', 'false_positive', 'false_positive']  [OK]
benchmark-repo-34d29e5afaf9e82a4d1b1a709fb253b9a92441cc/src/cloud_config.py:12 -> ['false_positive', 'false_positive', 'false_positive']  [OK]

0/6 findings ont un verdict instable entre les runs.