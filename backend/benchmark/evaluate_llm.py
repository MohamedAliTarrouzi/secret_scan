"""
Évalue la qualité des verdicts du LLM engine sur les findings Ambiguous du
benchmark-repo, en réutilisant ground_truth.csv (colonne expected_secret) comme
vérité terrain :
    expected_secret == true  -> verdict attendu "secret"
    expected_secret == false -> verdict attendu "false_positive"

Lit backend/benchmark/results_llm/run_*.json, produits par run_llm_benchmark.py.

Usage :
  cd backend
  python benchmark/evaluate_llm.py
"""
import csv
import json
from collections import defaultdict
from pathlib import Path

MANIFEST_PATH = Path("backend/benchmark/manifests/ground_truth.csv")
RESULTS_LLM_DIR = Path("backend/benchmark/results_llm")


def load_ground_truth() -> list[dict]:
    with open(MANIFEST_PATH, "r", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def expected_verdict_for(file_path: str, line: int, ground_truth: list[dict]) -> str | None:
    """Retrouve la vérité terrain pour un finding donné. Même logique de matching
    que evaluate.py (regex_engine) : item['file'] est un sous-chemin de file_path."""
    for item in ground_truth:
        if item["file"] in file_path and int(item["line"]) == line:
            return "secret" if item["expected_secret"].strip().lower() == "true" else "false_positive"
    return None


def evaluate():
    ground_truth = load_ground_truth()
    run_files = sorted(RESULTS_LLM_DIR.glob("run_*.json"))

    if not run_files:
        print(
            "Aucun run trouvé dans backend/benchmark/results_llm/. "
            "Lancez d'abord : python benchmark/run_llm_benchmark.py"
        )
        return

    total = 0
    technical_errors = 0   # llm_error non-null : timeout, clé manquante, JSON invalide renvoyé par le LLM...
    matched = 0             # findings pour lesquels on a une vérité terrain connue
    correct = 0
    wrong = 0
    uncertain = 0

    # (file_path, line) -> liste des verdicts obtenus sur les différents runs
    stability: dict[tuple, list[str]] = defaultdict(list)

    for run_file in run_files:
        with open(run_file, "r", encoding="utf-8") as f:
            data = json.load(f)

        for finding in data.get("findings", []):
            total += 1
            key = (finding["file_path"], finding["line"])

            if finding.get("llm_error"):
                technical_errors += 1
                stability[key].append(f"ERROR")
                continue

            verdict = finding.get("llm_verdict")
            stability[key].append(verdict or "None")

            expected = expected_verdict_for(finding["file_path"], finding["line"], ground_truth)
            if expected is None:
                continue

            matched += 1
            if verdict == expected:
                correct += 1
            elif verdict == "uncertain":
                uncertain += 1
            else:
                wrong += 1

    def pct(n, d):
        return f"{n / d:.2%}" if d else "N/A"

    print("=== Volumétrie ===")
    print(f"Findings traités (toutes passes confondues) : {total}")
    print(f"Échecs techniques (llm_error non-null)       : {technical_errors}  ({pct(technical_errors, total)})")
    print(f"Findings avec vérité terrain connue           : {matched}\n")

    print("=== Précision du verdict (sur findings matchés à la vérité terrain) ===")
    print("| Statut | Nombre | % |")
    print("| :--- | :--- | :--- |")
    print(f"| Corrects (secret/false_positive juste) | {correct} | {pct(correct, matched)} |")
    print(f"| Incorrects (verdict opposé à la vérité) | {wrong} | {pct(wrong, matched)} |")
    print(f"| Uncertain (LLM ne s'est pas prononcé) | {uncertain} | {pct(uncertain, matched)} |")

    print("\n=== Stabilité du verdict entre les runs (même finding, plusieurs passes) ===")
    unstable_count = 0
    for (file_path, line), verdicts in sorted(stability.items()):
        is_stable = len(set(verdicts)) == 1
        if not is_stable:
            unstable_count += 1
        flag = "OK" if is_stable else "INSTABLE"
        print(f"{file_path}:{line} -> {verdicts}  [{flag}]")

    print(f"\n{unstable_count}/{len(stability)} findings ont un verdict instable entre les runs.")
    if unstable_count > 0:
        print(
            "-> Instabilité détectée : envisagez d'ajouter du few-shot prompting "
            "dans llm_engine.py (SYSTEM_PROMPT) pour ancrer le comportement, "
            "surtout sur les cas limites (UUID/hash vs vraie clé)."
        )


if __name__ == "__main__":
    evaluate()