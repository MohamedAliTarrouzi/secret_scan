import os
import sys

# Ajoute le dossier backend au chemin d'importation pour accéder à app
sys.path.append(os.path.dirname(os.path.dirname(__file__)))


from app.services.regex_engine import scan_content

def run():
    target_file = os.path.join(os.path.dirname(__file__), 'file_test.py')
    if not os.path.exists(target_file):
        print(f"Erreur : Le fichier '{target_file}' n'a pas été trouvé.")
        return

    print(f"Analyse en cours du fichier : {target_file}...\n")
    
    with open(target_file, "r", encoding="utf-8", errors="ignore") as f:
        content = f.read()
        
    findings = scan_content(content, file_path=target_file)
    
    if not findings:
        print("Aucun secret détecté.")
        return
        
    print(f"=== {len(findings)} SECRETS DÉTECTÉS ===")
    print(f"{'Catégorie':<20} | {'Nom':<30} | {'Ligne':<5} | {'Criticité':<9} | {'Valeur masquée':<25} | Contexte")
    print("-" * 130)
    for f in findings:
        # Masquer la valeur pour éviter l'affichage en clair dans la console
        val = f['value']
        masked_val = val[:4] + "*" * (len(val) - 4) if len(val) > 4 else "****"
        
        # Limiter la longueur du contexte affiché
        context = f['context'][:50] + "..." if len(f['context']) > 50 else f['context']
        
        print(f"{f['category']:<20} | {f['name']:<30} | {f['line']:<5} | {f['severity']:<9} | {masked_val:<25} | {context}")

if __name__ == "__main__":
    run()
