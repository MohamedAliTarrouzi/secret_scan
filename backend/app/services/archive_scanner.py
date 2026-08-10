import zipfile
import tarfile
from app.services.regex_engine import scan_content, is_path_allowlisted

def scan_zip(zip_path_or_bytes):
    findings = []
    # zip_path_or_bytes peut être un chemin d'accès (str) ou un flux d'octets (BytesIO)
    with zipfile.ZipFile(zip_path_or_bytes, 'r') as archive:
        for file_info in archive.infolist():
            # Ignorer les dossiers
            if file_info.is_dir():
                continue
            
            if is_path_allowlisted(file_info.filename):
                continue
            
            try:
                # Lire le contenu brut
                with archive.open(file_info) as f:
                    raw_content = f.read()
                
                # Tenter de décoder en UTF-8
                content = raw_content.decode('utf-8', errors='ignore')
                
                # Optionnel : ignorer les fichiers visiblement binaires (images, exe, etc.)
                # en vérifiant s'ils contiennent des octets nuls ou par leur extension
                if '\x00' in content[:1024]: 
                    continue
                
                # Scanner le contenu
                file_findings = scan_content(content, file_path=file_info.filename)
                findings.extend(file_findings)
            except Exception as e:
                print(f"Erreur lors de la lecture de {file_info.filename}: {e}")
                
    return findings

def scan_tar(tar_path):
    findings = []
    with tarfile.open(tar_path, 'r:*') as archive:  # 'r:*' gère .tar, .tar.gz, .tar.bz2
        for member in archive.getmembers():
            if not member.isfile():
                continue
            
            if is_path_allowlisted(member.name):
                continue
            
            try:
                f = archive.extractfile(member)
                if f is not None:
                    raw_content = f.read()
                    content = raw_content.decode('utf-8', errors='ignore')
                    
                    if '\x00' in content[:1024]:
                        continue
                        
                    file_findings = scan_content(content, file_path=member.name)
                    findings.extend(file_findings)
            except Exception as e:
                print(f"Erreur lors de la lecture de {member.name}: {e}")
                
    return findings
