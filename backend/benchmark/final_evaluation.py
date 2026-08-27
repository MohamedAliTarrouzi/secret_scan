"""Evaluate a final-test scan result without changing benchmark fixtures.

By default this script compares docs/final_test/final_test_results2.json with
docs/final_test/ground_truth.csv. Pass --result to evaluate a different scan.
"""

import argparse
import csv
import json
import sys
from collections import defaultdict
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_GROUND_TRUTH = PROJECT_ROOT / "docs" / "final_test" / "ground_truth.csv"
DEFAULT_RESULT = PROJECT_ROOT / "docs" / "final_test" / "final_test_results2.json"

CATEGORY_ALIASES = {
    "authentication": "Authentication",
    "authentification": "Authentication",
}


def normalized_category(value):
    """Make the historical Authentication/Authentification spelling compatible."""
    value = (value or "Generic").strip()
    return CATEGORY_ALIASES.get(value.lower(), value)


def read_ground_truth(path):
    with path.open(newline="", encoding="utf-8-sig") as source:
        rows = list(csv.DictReader(source))

    required_columns = {
        "file",
        "line",
        "expected_secret",
        "expected_category",
        "expected_name",
    }
    missing = required_columns - set(rows[0] if rows else ())
    if missing:
        raise ValueError(f"Ground truth is missing columns: {', '.join(sorted(missing))}")
    return rows


def read_findings(path):
    with path.open(encoding="utf-8") as source:
        payload = json.load(source)
    findings = payload.get("findings")
    if not isinstance(findings, list):
        raise ValueError(f"{path} does not contain a findings list")
    return findings


def finding_matches_expected(finding, expected):
    try:
        same_line = int(finding.get("line")) == int(expected["line"])
    except (TypeError, ValueError):
        return False

    return (
        same_line
        and Path(str(finding.get("file_path", ""))).name == expected["file"]
        and normalized_category(finding.get("category"))
        == normalized_category(expected["expected_category"])
        and finding.get("name") == expected["expected_name"]
    )


def percentage(numerator, denominator):
    return f"{numerator / denominator:.2%}" if denominator else "N/A"


def evaluate(ground_truth, findings):
    stats = defaultdict(lambda: {"TP": 0, "FP": 0, "FN": 0})
    matched_finding_indexes = set()
    expected_secrets = [
        row for row in ground_truth if row["expected_secret"].strip().lower() == "true"
    ]

    for expected in expected_secrets:
        category = normalized_category(expected["expected_category"])
        match_index = next(
            (
                index
                for index, finding in enumerate(findings)
                if index not in matched_finding_indexes
                and finding_matches_expected(finding, expected)
            ),
            None,
        )
        if match_index is None:
            stats[category]["FN"] += 1
        else:
            matched_finding_indexes.add(match_index)
            stats[category]["TP"] += 1

    for index, finding in enumerate(findings):
        if index not in matched_finding_indexes:
            stats[normalized_category(finding.get("category"))]["FP"] += 1

    return stats, expected_secrets, matched_finding_indexes


def print_report(stats, expected_secrets, findings, matched_finding_indexes, result_path):
    categories = sorted(category for category in stats if category != "Total")
    total = {metric: sum(stats[category][metric] for category in categories) for metric in ("TP", "FP", "FN")}

    print(f"Final benchmark result: {result_path}")
    print("| Category | TP | FP | FN | Precision | Recall | F1 |")
    print("| :--- | ---: | ---: | ---: | ---: | ---: | ---: |")
    for category in [*categories, "Total"]:
        values = total if category == "Total" else stats[category]
        tp, fp, fn = (values[metric] for metric in ("TP", "FP", "FN"))
        precision = tp / (tp + fp) if tp + fp else None
        recall = tp / (tp + fn) if tp + fn else None
        f1 = 2 * precision * recall / (precision + recall) if precision is not None and recall is not None and precision + recall else None
        print(
            f"| {category} | {tp} | {fp} | {fn} | "
            f"{percentage(tp, tp + fp)} | {percentage(tp, tp + fn)} | "
            f"{f'{f1:.2%}' if f1 is not None else 'N/A'} |"
        )

    missed = [
        expected for expected in expected_secrets
        if not any(finding_matches_expected(finding, expected) for finding in findings)
    ]
    if missed:
        print("\nMissed expected secrets:")
        for item in missed:
            print(f"- {item['file']}:{item['line']} — {item['expected_name']}")

    false_positives = [
        finding for index, finding in enumerate(findings) if index not in matched_finding_indexes
    ]
    if false_positives:
        print("\nUnmatched findings (counted as false positives):")
        for finding in false_positives:
            print(f"- {finding.get('file_path')}:{finding.get('line')} — {finding.get('name')}")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--ground-truth", type=Path, default=DEFAULT_GROUND_TRUTH)
    parser.add_argument("--result", type=Path, default=DEFAULT_RESULT)
    args = parser.parse_args()

    try:
        ground_truth = read_ground_truth(args.ground_truth)
        findings = read_findings(args.result)
    except (OSError, ValueError, json.JSONDecodeError) as error:
        print(f"Evaluation failed: {error}", file=sys.stderr)
        return 1

    stats, expected_secrets, matched_finding_indexes = evaluate(ground_truth, findings)
    print_report(stats, expected_secrets, findings, matched_finding_indexes, args.result)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
