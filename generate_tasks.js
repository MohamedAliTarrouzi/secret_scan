const fs = require('fs');
const path = require('path');

const tasks = [
    {
        id: "TSK-001",
        component: "Regex Engine",
        title: "Correction regex JWT",
        description: "Ajouter le point de séparation '\\.' manquant entre l'en-tête et le corps du JWT dans regex_patterns.json. Actuellement, la regex cherche eyJ...eyJ... collés.",
        priority: "Haute",
        status: "À faire"
    },
    {
        id: "TSK-002",
        component: "Regex Engine",
        title: "Réduction des FP pour AWS Secret Key",
        description: "La regex actuelle (40 caractères alphanumériques) détecte tous les commits Git SHA et IDs de trace. Ajouter un filtre d'entropie, de contexte ou affiner le motif regex.",
        priority: "Haute",
        status: "À faire"
    },
    {
        id: "TSK-003",
        component: "Regex Engine",
        title: "Réduction des FP pour Heroku API Key (UUID)",
        description: "La regex détecte tout UUID générique (IDs de session, requêtes). Restreindre la détection en vérifiant la présence de mots-clés de contexte comme 'heroku' dans la ligne.",
        priority: "Haute",
        status: "À faire"
    },
    {
        id: "TSK-004",
        component: "Regex Engine",
        title: "Correction de la frontière de mot pour Generic Password",
        description: "La regex utilise '\\b' ce qui empêche de détecter les variables comme 'GENERIC_API_SECRET' à cause de l'underscore '_'. Ajuster pour accepter les underscores.",
        priority: "Haute",
        status: "À faire"
    },
    {
        id: "TSK-005",
        component: "Benchmark / Tests",
        title: "Correction du repo et de la ground truth du benchmark",
        description: "Corriger les anomalies du benchmark : 1) La longueur du token GitHub classique factice dans api_clients.js (38 au lieu de 36 caractères). 2) La ligne 7 de cloud_config.py marquée comme GCP API Key alors qu'il s'agit d'une clé de compte de service base64.",
        priority: "Moyenne",
        status: "À faire"
    },
    {
        id: "TSK-006",
        component: "Base de données",
        title: "Modèles SQLAlchemy dans app/models/audit.py",
        description: "Définir les tables de base de données pour stocker les rapports de scan (historique) et les findings associés afin de remplacer le stockage en mémoire volatile.",
        priority: "Haute",
        status: "À faire"
    },
    {
        id: "TSK-007",
        component: "Base de données",
        title: "Schémas Pydantic dans app/schemas/audit_schema.py",
        description: "Définir les schémas de validation de données Pydantic pour les scans et findings persistés pour les requêtes/réponses de l'API.",
        priority: "Haute",
        status: "À faire"
    },
    {
        id: "TSK-008",
        component: "API",
        title: "Intégration de la persistance DB dans les endpoints",
        description: "Modifier app/api/endpoints.py pour utiliser 'get_db' et stocker/lire les résultats des scans dans la base SQLite au lieu de history_store.",
        priority: "Haute",
        status: "À faire"
    },
    {
        id: "TSK-009",
        component: "LLM Engine",
        title: "Implémentation du moteur de validation LLM",
        description: "Implémenter le service app/services/llm_engine.py pour valider et classifier les findings douteux (severity Ambiguous) via un appel API LLM.",
        priority: "Moyenne",
        status: "À faire"
    },
    {
        id: "TSK-010",
        component: "Core Engine",
        title: "Implémentation du scan de dossier local direct",
        description: "Remplacer l'exception NotImplementedError dans scan_orchestrator.py pour permettre le scan récursif de dossiers locaux complets sur le disque.",
        priority: "Moyenne",
        status: "À faire"
    },
    {
        id: "TSK-011",
        component: "Sécurité",
        title: "Authentification et restrictions CORS",
        description: "Sécuriser les endpoints de l'API avec une méthode d'authentification (ex: clé API ou OAuth) et restreindre les origines CORS dans main.py.",
        priority: "Moyenne",
        status: "À faire"
    }
];

function generateCSV(data) {
    const headers = ["ID tache", "Composant", "Titre", "Description", "Priorite", "Statut"];
    const rows = data.map(item => [
        item.id,
        `"${item.component.replace(/"/g, '""')}"`,
        `"${item.title.replace(/"/g, '""')}"`,
        `"${item.description.replace(/"/g, '""')}"`,
        item.priority,
        item.status
    ]);
    
    const csvContent = [headers.join(';'), ...rows.map(row => row.join(';'))].join('\r\n');
    return '\ufeff' + csvContent; // UTF-8 BOM pour Excel
}

const projectPath = path.resolve(__dirname, 'taches_projet.csv');

try {
    fs.writeFileSync(projectPath, generateCSV(tasks), 'utf8');
    console.log(`Fichier CSV genere avec succes a l'adresse : ${projectPath}`);
    console.log("Vous pouvez maintenant double-cliquer sur ce fichier pour l'ouvrir dans Microsoft Excel.");
} catch (err) {
    console.error("Erreur lors de la generation du fichier CSV :", err);
}
