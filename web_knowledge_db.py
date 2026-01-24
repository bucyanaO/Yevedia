"""
Yevedia - Module de Base de Connaissances Web
Stocke les recherches web de façon permanente dans des fichiers JSON lisibles
"""

import os
import json
import hashlib
from datetime import datetime
from pathlib import Path

# Dossier de stockage des connaissances web
KNOWLEDGE_DIR = Path(__file__).parent / "web_knowledge"
KNOWLEDGE_DIR.mkdir(exist_ok=True)

def _generate_filename(query: str) -> str:
    """Générer un nom de fichier unique basé sur la requête"""
    # Créer un hash court de la requête
    query_hash = hashlib.md5(query.lower().strip().encode()).hexdigest()[:8]
    # Nettoyer la requête pour le nom de fichier
    safe_query = "".join(c if c.isalnum() or c in ' -_' else '' for c in query)
    safe_query = safe_query[:50].strip().replace(' ', '_')
    return f"{safe_query}_{query_hash}.json"


def save_web_search(query: str, results: list, source: str = "duckduckgo") -> dict:
    """
    Sauvegarder une recherche web de façon permanente.
    
    Args:
        query: La requête de recherche
        results: Liste des résultats
        source: Source de la recherche
        
    Returns:
        dict avec le chemin du fichier créé
    """
    filename = _generate_filename(query)
    filepath = KNOWLEDGE_DIR / filename
    
    data = {
        "query": query,
        "query_normalized": query.lower().strip(),
        "results": results,
        "source": source,
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat(),
        "access_count": 1
    }
    
    # Si le fichier existe déjà, mettre à jour
    if filepath.exists():
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                existing = json.load(f)
                data["access_count"] = existing.get("access_count", 0) + 1
                data["created_at"] = existing.get("created_at", data["created_at"])
        except:
            pass
    
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    return {
        "success": True,
        "filename": filename,
        "path": str(filepath),
        "results_count": len(results)
    }


def get_saved_search(query: str) -> dict:
    """
    Récupérer une recherche sauvegardée.
    
    Returns:
        dict avec les résultats si trouvé, None sinon
    """
    filename = _generate_filename(query)
    filepath = KNOWLEDGE_DIR / filename
    
    if not filepath.exists():
        return None
    
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # Incrémenter le compteur d'accès
        data["access_count"] = data.get("access_count", 0) + 1
        data["updated_at"] = datetime.now().isoformat()
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        return {
            "success": True,
            "cached": True,
            "query": data["query"],
            "results": data["results"],
            "source": data["source"] + " (sauvegardé)",
            "saved_at": data["created_at"],
            "access_count": data["access_count"],
            "filename": filename
        }
    except Exception as e:
        return None


def list_all_searches() -> list:
    """
    Lister toutes les recherches sauvegardées.
    
    Returns:
        Liste des recherches avec métadonnées
    """
    searches = []
    
    for filepath in KNOWLEDGE_DIR.glob("*.json"):
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            searches.append({
                "filename": filepath.name,
                "query": data.get("query", ""),
                "source": data.get("source", ""),
                "results_count": len(data.get("results", [])),
                "access_count": data.get("access_count", 0),
                "created_at": data.get("created_at", ""),
                "updated_at": data.get("updated_at", "")
            })
        except:
            continue
    
    # Trier par date de création (plus récent d'abord)
    searches.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    
    return searches


def delete_saved_search(filename: str) -> dict:
    """Supprimer une recherche sauvegardée"""
    filepath = KNOWLEDGE_DIR / filename
    
    if filepath.exists():
        filepath.unlink()
        return {"success": True, "deleted": filename}
    
    return {"success": False, "error": "Fichier non trouvé"}


def get_search_details(filename: str) -> dict:
    """Récupérer les détails complets d'une recherche"""
    filepath = KNOWLEDGE_DIR / filename
    
    if not filepath.exists():
        return None
    
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    except:
        return None


def get_knowledge_stats() -> dict:
    """Statistiques de la base de connaissances web"""
    searches = list_all_searches()
    
    total_results = sum(s.get("results_count", 0) for s in searches)
    total_accesses = sum(s.get("access_count", 0) for s in searches)
    
    return {
        "total_searches": len(searches),
        "total_results": total_results,
        "total_accesses": total_accesses,
        "storage_path": str(KNOWLEDGE_DIR)
    }


if __name__ == "__main__":
    # Test
    print("📚 Base de Connaissances Web")
    stats = get_knowledge_stats()
    print(f"   Recherches: {stats['total_searches']}")
    print(f"   Résultats: {stats['total_results']}")
    print(f"   Accès: {stats['total_accesses']}")
    print(f"   Dossier: {stats['storage_path']}")
