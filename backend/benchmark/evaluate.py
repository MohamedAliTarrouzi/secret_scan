import csv
import json
from pathlib import Path

MANIFEST_PATH = Path("backend/benchmark/manifests/ground_truth.csv")
RESULTS_DIR = Path("backend/benchmark/results")

def evaluate():
    with open(MANIFEST_PATH,"r",encoding="utf-8") as f:
        reader = csv.DictReader(f)
        ground_truth = list(reader)
        
    categories = ["Cloud credentials","API tokens", "Authentification","Generic"]
    stats = {cat: {"TP":0,"FP":0,"FN":0} for cat in categories} 
    stats["Total"] = {"TP":0,"FP":0,"FN":0}
    
    detected_findings = []
    for res_file in RESULTS_DIR.glob("*.json"):
        with open(res_file,"r",encoding="utf-8") as f:
            data = json.load(f)
            detected_findings.extend(data.get("findings",[]))
    
    used_findings = set()
    
    for item in ground_truth:
        if item["expected_secret"].lower()!= "true":
            continue
        
        category = item["expected_category"]
        if category not in stats:
            category = "Generic"
        
        matches = [
            index
            for index, finding in enumerate(detected_findings)
            if index not in used_findings 
            and finding.get("line") == int(item["line"])
            and item["file"] in finding.get("file_path","")
            and finding.get("category") == item["expected_category"]
            and finding.get("name") == item["expected_name"]
        ]
        
        if matches:
            used_findings.add(matches[0])
            stats[category]["TP"] += 1
            stats["Total"]["TP"] += 1
        else:
            stats[category]["FN"] += 1
            stats["Total"]["FN"] += 1
    
    for index,finding in enumerate(detected_findings):
        if index in used_findings:
            continue
        category = finding.get("category","Generic")
        if category not in stats:
           category = "Generic"
        
        stats[category]["FP"] += 1
        stats["Total"]["FP"] += 1 
            
    print("| Catégories | TP | FP | FN | Précision | Rappel | Observations |")
    print("| :--- | :--- | :--- | :--- | :--- | :--- | :--- |")
    for cat, data in stats.items():
        tp, fp, fn = data["TP"], data["FP"], data["FN"]
        
        prec = f"{tp / (tp + fp):.2%}" if (tp + fp) > 0 else "N/A"
        rec = f"{tp / (tp + fn):.2%}" if (tp + fn) > 0 else "N/A"
        
        print(f"| {cat} | {tp} | {fp} | {fn} | {prec} | {rec} |  |")
        
if __name__ == "__main__":
    evaluate()