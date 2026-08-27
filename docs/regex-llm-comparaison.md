## Valeur ajoutée de la couche LLM

| | Sans LLM (Regex seul) | Avec LLM |
|---|---|---|
| Findings Ambiguous nécessitant une revue manuelle | 6/6 (100%) | 1/6 (17%) |
| Verdicts corrects automatiquement | — | 5/6 (83.33%) |
| Cas restant à revoir manuellement | 6 | 1 (clé AWS EXAMPLE, cf. limite documentée ci-dessus) |


for final_test

python .\benchmark\final_evaluation.py
Final benchmark result: D:\STAGE 2026 DXC\SECRET_SCAN\docs\final_test\final_test_results2.json
| Category | TP | FP | FN | Precision | Recall | F1 |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: |
| API tokens | 10 | 1 | 8 | 90.91% | 55.56% | 68.97% |
| Authentication | 3 | 0 | 1 | 100.00% | 75.00% | 85.71% |
| Cloud credentials | 4 | 3 | 0 | 57.14% | 100.00% | 72.73% |
| Generic | 2 | 1 | 1 | 66.67% | 66.67% | 66.67% |
| Total | 19 | 5 | 10 | 79.17% | 65.52% | 71.70% |

Missed expected secrets:
- test_payload.txt:21 — npm Access Token
- test_payload.txt:22 — SendGrid API Key
- test_payload.txt:23 — Twilio Account SID
- test_payload.txt:24 — Slack Bot Token
- test_payload.txt:25 — Google OAuth Client Secret
- test_payload.txt:46 — Obfuscated (Base64 OpenAI API Key)
- test_payload.txt:47 — Obfuscated (URL Encoded DB Connection)
- test_payload.txt:48 — Obfuscated (Concatenated GitHub PAT)
- test_payload.txt:49 — Obfuscated (Hex Encoded Stripe Key)
- test_payload.txt:50 — Obfuscated (Reversed GitLab PAT)

Unmatched findings (counted as false positives):
- LW478-final_test-2013496c109ede08cd0c0a188cd510d34b602f91/test_payload.txt:4 — AWS Secret Access Key
- LW478-final_test-2013496c109ede08cd0c0a188cd510d34b602f91/test_payload.txt:38 — AWS Secret Access Key
- LW478-final_test-2013496c109ede08cd0c0a188cd510d34b602f91/test_payload.txt:39 — AWS Access Key ID
- LW478-final_test-2013496c109ede08cd0c0a188cd510d34b602f91/test_payload.txt:43 — Heroku API Key
- LW478-final_test-2013496c109ede08cd0c0a188cd510d34b602f91/test_payload.txt:44 — Generic Password Assignment