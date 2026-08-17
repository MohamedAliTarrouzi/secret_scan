"""
Exécute plusieurs passes de review_ambiguous_findings() sur les findings Ambiguous
déjà produits par le moteur Regex (backend/benchmark/results/*.json), et sauvegarde
chaque passe dans backend/benchmark/results_llm/run_N.json.
 
Pourquoi plusieurs passes ? Même à temperature=0, un LLM n'est pas parfaitement
déterministe (routing, quantization, etc.). Ça permet de détecter un verdict instable
sur un même finding, ce qu'un seul run ne montrerait jamais.
 
Prérequis :
  - Le proxy LiteLLM doit tourner : litellm --config backend/litellm_config.yaml
  - LITELLM_MODEL doit pointer vers l'entrée Claude du gateway, ex :
        export LITELLM_MODEL=llm-secretscan-claude
  - backend/benchmark/results/*.json doit déjà exister (lancer d'abord un scan
    Regex sur benchmark-repo via /api/scan/upload, comme documenté dans le README).
 
Usage :
  cd backend
  python benchmark/run_llm_benchmark.py
"""

import copy
import json
import os
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.append(str(BASE_DIR))

from app.services.llm_engine import review_ambiguous_findings 
RESULTS_DIR = Path(__file__).resolve().parent / "results"
OUTPUT_DIR = Path(__file__).resolve().parent / "results_llm"

N_RUNS = int(os.getenv("LLM_BENCHMARK_RUNS", "3"))
 
def load_ambiguous_findings() -> list[dict]:
    """Charge tous les findings marqués Ambiguous/review_required depuis les
    résultats déjà produits par le moteur Regex, tous fichiers confondus."""
    findings = []
    for res_file in RESULTS_DIR.glob("*.json"):
        with open(res_file, "r", encoding="utf-8") as f:
            data = json.load(f)
        for finding in data.get("findings", []):
            is_ambiguous = (
                finding.get("review_required") is True
                or str(finding.get("severity", "")).lower()
                in {"ambiguous", "ambigu", "ambiguë"}
            )
            if is_ambiguous:
                findings.append(finding)
    return findings

def main():
    OUTPUT_DIR.mkdir(exist_ok=True)
    base_findings = load_ambiguous_findings()

    if not base_findings:
        print(
            "Aucun finding Ambiguous trouvé dans backend/benchmark/results/. "
            "Lancez d'abord un scan Regex sur benchmark-repo (voir README, "
            "section Benchmark)."
        )
        return

    model = os.getenv("LITELLM_MODEL",)
    print(f"Modèle utilisé (LITELLM_MODEL) : {model}")
    print(f"{len(base_findings)} findings Ambiguous chargés.")
    print(f"Lancement de {N_RUNS} passes...\n")
    
    for run_idx in range(1, N_RUNS + 1):
        # Copie profonde à chaque run : review_ambiguous_findings mute la liste
        # en place, il ne faut pas réutiliser les objets d'un run à l'autre.
        findings_copy = copy.deepcopy(base_findings)
        reviewed = review_ambiguous_findings(findings_copy)

        out_path = OUTPUT_DIR / f"run_{run_idx}.json"
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(
                {"run": run_idx, "model": model, "findings": reviewed},
                f,
                indent=2,
                ensure_ascii=False,
                default=str,
            )
 
        errors = sum(1 for x in reviewed if x.get("llm_error"))
        print(f"Run {run_idx}/{N_RUNS} -> {out_path}  ({errors} erreur(s) technique(s))")

    print("\nTerminé. Lancez maintenant : python benchmark/evaluate_llm.py")
    
 
if __name__ == "__main__":
    main()

