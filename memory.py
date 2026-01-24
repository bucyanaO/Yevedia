"""
Yevedia AI Chat - Système de Mémoire Persistante
Base de données SQLite pour stocker les souvenirs de l'IA
"""

import sqlite3
import json
from datetime import datetime
from pathlib import Path

# Chemin de la base de données
DB_PATH = Path(__file__).parent / "memory.db"


def get_connection():
    """Créer une connexion à la base de données"""
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def init_database():
    """Initialiser la base de données avec les tables nécessaires"""
    conn = get_connection()
    cursor = conn.cursor()
    
    # Table des souvenirs/mémoires
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS memories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            category TEXT NOT NULL DEFAULT 'knowledge',
            priority INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            is_active BOOLEAN DEFAULT 1
        )
    """)
    
    # Table des conversations (historique)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS conversations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            title TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Table des messages
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            conversation_id INTEGER,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (conversation_id) REFERENCES conversations(id)
        )
    """)
    
    # Table des embeddings (pour recherche sémantique future)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS embeddings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            memory_id INTEGER,
            embedding BLOB,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (memory_id) REFERENCES memories(id)
        )
    """)
    
    # Table des documents
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS documents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            content TEXT NOT NULL,
            type TEXT DEFAULT 'text/plain',
            size INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            is_active BOOLEAN DEFAULT 1
        )
    """)
    
    # Table du cache de recherche web
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS web_search_cache (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            query TEXT NOT NULL,
            query_normalized TEXT NOT NULL,
            results TEXT NOT NULL,
            source TEXT DEFAULT 'duckduckgo',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            expires_at TIMESTAMP,
            hit_count INTEGER DEFAULT 0
        )
    """)
    
    # Index pour recherche rapide par query normalisée
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_web_cache_query 
        ON web_search_cache(query_normalized)
    """)
    
    conn.commit()
    conn.close()
    # Note: Ne pas utiliser print() ici car cela pollue la sortie JSON


# ============================================
# GESTION DES SOUVENIRS (MEMORIES)
# ============================================

def add_memory(title: str, content: str, category: str = "knowledge", priority: int = 1) -> dict:
    """Ajouter un nouveau souvenir à la mémoire"""
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        INSERT INTO memories (title, content, category, priority)
        VALUES (?, ?, ?, ?)
    """, (title, content, category, priority))
    
    memory_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return {
        "id": memory_id,
        "title": title,
        "content": content,
        "category": category,
        "priority": priority,
        "success": True
    }


def add_memory_base64(title_b64: str, content_b64: str, category: str = "knowledge", priority: int = 1) -> dict:
    """Ajouter un souvenir avec titre et contenu encodés en Base64 (pour éviter les problèmes d'échappement)"""
    import base64
    
    try:
        title = base64.b64decode(title_b64).decode('utf-8')
        content = base64.b64decode(content_b64).decode('utf-8')
    except Exception as e:
        return {"success": False, "error": f"Erreur décodage Base64: {str(e)}"}
    
    return add_memory(title, content, category, priority)


def get_all_memories(active_only: bool = True) -> list:
    """Récupérer tous les souvenirs"""
    conn = get_connection()
    cursor = conn.cursor()
    
    if active_only:
        cursor.execute("""
            SELECT * FROM memories 
            WHERE is_active = 1 
            ORDER BY priority DESC, created_at DESC
        """)
    else:
        cursor.execute("SELECT * FROM memories ORDER BY priority DESC, created_at DESC")
    
    rows = cursor.fetchall()
    conn.close()
    
    return [dict(row) for row in rows]


def get_memories_by_category(category: str) -> list:
    """Récupérer les souvenirs par catégorie"""
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT * FROM memories 
        WHERE category = ? AND is_active = 1
        ORDER BY priority DESC, created_at DESC
    """, (category,))
    
    rows = cursor.fetchall()
    conn.close()
    
    return [dict(row) for row in rows]


def update_memory(memory_id: int, title: str = None, content: str = None, 
                  category: str = None, priority: int = None) -> dict:
    """Mettre à jour un souvenir existant"""
    conn = get_connection()
    cursor = conn.cursor()
    
    updates = []
    values = []
    
    if title is not None:
        updates.append("title = ?")
        values.append(title)
    if content is not None:
        updates.append("content = ?")
        values.append(content)
    if category is not None:
        updates.append("category = ?")
        values.append(category)
    if priority is not None:
        updates.append("priority = ?")
        values.append(priority)
    
    updates.append("updated_at = ?")
    values.append(datetime.now().isoformat())
    values.append(memory_id)
    
    cursor.execute(f"""
        UPDATE memories 
        SET {', '.join(updates)}
        WHERE id = ?
    """, values)
    
    conn.commit()
    conn.close()
    
    return {"id": memory_id, "success": True}


def delete_memory(memory_id: int, soft_delete: bool = True) -> dict:
    """Supprimer un souvenir (soft delete par défaut)"""
    conn = get_connection()
    cursor = conn.cursor()
    
    if soft_delete:
        cursor.execute("UPDATE memories SET is_active = 0 WHERE id = ?", (memory_id,))
    else:
        cursor.execute("DELETE FROM memories WHERE id = ?", (memory_id,))
    
    conn.commit()
    conn.close()
    
    return {"id": memory_id, "deleted": True}


def clear_all_memories() -> dict:
    """Effacer toute la mémoire"""
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("UPDATE memories SET is_active = 0")
    
    conn.commit()
    conn.close()
    
    return {"success": True, "message": "Mémoire effacée"}


def search_memories(query: str) -> list:
    """Rechercher dans les souvenirs (recherche simple)"""
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT * FROM memories 
        WHERE is_active = 1 
        AND (title LIKE ? OR content LIKE ?)
        ORDER BY priority DESC
    """, (f"%{query}%", f"%{query}%"))
    
    rows = cursor.fetchall()
    conn.close()
    
    return [dict(row) for row in rows]


def build_memory_context() -> str:
    """Construire le contexte mémoire pour le prompt"""
    memories = get_all_memories()
    
    if not memories:
        return ""
    
    context = "Contexte et informations importantes à retenir:\n\n"
    
    # Grouper par catégorie
    categories = {
        "identity": "👤 Identité",
        "preferences": "⚙️ Préférences", 
        "knowledge": "📚 Connaissances",
        "instructions": "📋 Instructions"
    }
    
    for cat_key, cat_name in categories.items():
        cat_memories = [m for m in memories if m["category"] == cat_key]
        if cat_memories:
            context += f"{cat_name}:\n"
            for mem in cat_memories:
                context += f"  - {mem['title']}: {mem['content']}\n"
            context += "\n"
    
    context += "Utilise ces informations pour personnaliser tes réponses.\n\n"
    
    return context


# ============================================
# GESTION DES DOCUMENTS
# ============================================

def add_document(name: str, content: str, doc_type: str = "text/plain", size: int = 0) -> dict:
    """Ajouter un nouveau document"""
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        INSERT INTO documents (name, content, type, size)
        VALUES (?, ?, ?, ?)
    """, (name, content, doc_type, size))
    
    doc_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return {
        "id": doc_id,
        "name": name,
        "type": doc_type,
        "size": size,
        "success": True
    }


def add_document_base64(name: str, base64_content: str, doc_type: str = "text/plain", size: int = 0) -> dict:
    """Ajouter un document avec contenu encodé en Base64"""
    import base64
    
    # Décoder le contenu Base64
    try:
        content = base64.b64decode(base64_content).decode('utf-8')
    except Exception as e:
        return {"success": False, "error": f"Erreur décodage Base64: {str(e)}"}
    
    # Utiliser la fonction standard
    return add_document(name, content, doc_type, size)


def get_all_documents(active_only: bool = False) -> list:
    """Récupérer tous les documents avec leur contenu et statut"""
    conn = get_connection()
    cursor = conn.cursor()
    
    if active_only:
        cursor.execute("""
            SELECT id, name, content, type, size, created_at, is_active FROM documents 
            WHERE is_active = 1 
            ORDER BY created_at DESC
        """)
    else:
        cursor.execute("SELECT id, name, content, type, size, created_at, is_active FROM documents ORDER BY created_at DESC")
    
    rows = cursor.fetchall()
    conn.close()
    
    return [dict(row) for row in rows]


def get_document_content(doc_id: int) -> str:
    """Récupérer le contenu d'un document"""
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT content FROM documents WHERE id = ? AND is_active = 1", (doc_id,))
    row = cursor.fetchone()
    conn.close()
    
    return row["content"] if row else ""


def delete_document(doc_id: int) -> dict:
    """Supprimer un document"""
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("UPDATE documents SET is_active = 0 WHERE id = ?", (doc_id,))
    
    conn.commit()
    conn.close()
    
    return {"id": doc_id, "deleted": True}


def clear_all_documents() -> dict:
    """Supprimer tous les documents"""
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("UPDATE documents SET is_active = 0")
    
    conn.commit()
    conn.close()
    
    return {"success": True, "message": "Documents supprimés"}


def toggle_document(doc_id: int, is_active: int) -> dict:
    """Activer ou désactiver un document"""
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("UPDATE documents SET is_active = ? WHERE id = ?", (is_active, doc_id))
    
    conn.commit()
    conn.close()
    
    return {"id": doc_id, "is_active": is_active, "success": True}


# ============================================
# CACHE DE RECHERCHE WEB
# ============================================

def normalize_query(query: str) -> str:
    """Normaliser une requête pour la comparaison (minuscules, sans espaces multiples)"""
    import re
    normalized = query.lower().strip()
    normalized = re.sub(r'\s+', ' ', normalized)  # Remplacer espaces multiples
    normalized = re.sub(r'[^\w\s]', '', normalized)  # Supprimer ponctuation
    return normalized


def get_cached_search(query: str, max_age_hours: int = 24) -> dict:
    """
    Récupérer une recherche en cache si elle existe et n'est pas expirée.
    
    Args:
        query: La requête de recherche
        max_age_hours: Âge maximum du cache en heures (défaut: 24h)
    
    Returns:
        dict avec les résultats si trouvé, None sinon
    """
    conn = get_connection()
    cursor = conn.cursor()
    
    normalized = normalize_query(query)
    
    # Chercher dans le cache (pas expiré)
    cursor.execute("""
        SELECT id, query, results, source, created_at, hit_count
        FROM web_search_cache 
        WHERE query_normalized = ?
        AND datetime(created_at, '+' || ? || ' hours') > datetime('now')
        ORDER BY created_at DESC
        LIMIT 1
    """, (normalized, max_age_hours))
    
    row = cursor.fetchone()
    
    if row:
        # Incrémenter le compteur de hits
        cursor.execute("""
            UPDATE web_search_cache 
            SET hit_count = hit_count + 1 
            WHERE id = ?
        """, (row["id"],))
        conn.commit()
        conn.close()
        
        return {
            "success": True,
            "cached": True,
            "query": row["query"],
            "results": json.loads(row["results"]),
            "source": row["source"] + " (cache)",
            "cached_at": row["created_at"],
            "hit_count": row["hit_count"] + 1
        }
    
    conn.close()
    return None


def cache_search_results(query: str, results: list, source: str = "duckduckgo") -> dict:
    """
    Enregistrer les résultats d'une recherche dans le cache.
    
    Args:
        query: La requête originale
        results: Liste des résultats de recherche
        source: Source de la recherche (duckduckgo, google, etc.)
    
    Returns:
        dict avec le statut de l'opération
    """
    conn = get_connection()
    cursor = conn.cursor()
    
    normalized = normalize_query(query)
    results_json = json.dumps(results, ensure_ascii=False)
    
    # Supprimer les anciennes entrées pour cette requête
    cursor.execute("""
        DELETE FROM web_search_cache 
        WHERE query_normalized = ?
    """, (normalized,))
    
    # Insérer le nouveau cache
    cursor.execute("""
        INSERT INTO web_search_cache (query, query_normalized, results, source)
        VALUES (?, ?, ?, ?)
    """, (query, normalized, results_json, source))
    
    cache_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return {
        "success": True,
        "id": cache_id,
        "query": query,
        "results_count": len(results)
    }


def get_search_cache_stats() -> dict:
    """Obtenir les statistiques du cache de recherche"""
    conn = get_connection()
    cursor = conn.cursor()
    
    # Total d'entrées
    cursor.execute("SELECT COUNT(*) as total FROM web_search_cache")
    total = cursor.fetchone()["total"]
    
    # Total de hits
    cursor.execute("SELECT SUM(hit_count) as hits FROM web_search_cache")
    row = cursor.fetchone()
    total_hits = row["hits"] if row["hits"] else 0
    
    # Requêtes les plus consultées
    cursor.execute("""
        SELECT query, hit_count, created_at 
        FROM web_search_cache 
        ORDER BY hit_count DESC 
        LIMIT 5
    """)
    top_queries = [dict(row) for row in cursor.fetchall()]
    
    conn.close()
    
    return {
        "total_cached": total,
        "total_hits": total_hits,
        "top_queries": top_queries
    }


def clear_search_cache(older_than_hours: int = None) -> dict:
    """
    Vider le cache de recherche.
    
    Args:
        older_than_hours: Si spécifié, ne supprimer que les entrées plus anciennes
    """
    conn = get_connection()
    cursor = conn.cursor()
    
    if older_than_hours:
        cursor.execute("""
            DELETE FROM web_search_cache 
            WHERE datetime(created_at, '+' || ? || ' hours') < datetime('now')
        """, (older_than_hours,))
    else:
        cursor.execute("DELETE FROM web_search_cache")
    
    deleted = cursor.rowcount
    conn.commit()
    conn.close()
    
    return {"success": True, "deleted": deleted}


# ============================================
# GESTION DES CONVERSATIONS
# ============================================

def create_conversation(session_id: str, title: str = None) -> dict:
    """Créer une nouvelle conversation"""
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        INSERT INTO conversations (session_id, title)
        VALUES (?, ?)
    """, (session_id, title or "Nouvelle conversation"))
    
    conversation_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return {"id": conversation_id, "session_id": session_id}


def add_message(conversation_id: int, role: str, content: str) -> dict:
    """Ajouter un message à une conversation"""
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        INSERT INTO messages (conversation_id, role, content)
        VALUES (?, ?, ?)
    """, (conversation_id, role, content))
    
    message_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return {"id": message_id, "success": True}


def get_conversation_messages(conversation_id: int) -> list:
    """Récupérer les messages d'une conversation"""
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT * FROM messages 
        WHERE conversation_id = ?
        ORDER BY created_at ASC
    """, (conversation_id,))
    
    rows = cursor.fetchall()
    conn.close()
    
    return [dict(row) for row in rows]


def get_all_conversations() -> list:
    """Récupérer toutes les conversations"""
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT * FROM conversations 
        ORDER BY updated_at DESC
    """)
    
    rows = cursor.fetchall()
    conn.close()
    
    return [dict(row) for row in rows]


# ============================================
# STATISTIQUES
# ============================================

def get_memory_stats() -> dict:
    """Obtenir les statistiques de la mémoire"""
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT COUNT(*) as total FROM memories WHERE is_active = 1")
    total = cursor.fetchone()["total"]
    
    cursor.execute("""
        SELECT category, COUNT(*) as count 
        FROM memories 
        WHERE is_active = 1 
        GROUP BY category
    """)
    by_category = {row["category"]: row["count"] for row in cursor.fetchall()}
    
    cursor.execute("SELECT COUNT(*) as total FROM conversations")
    conversations = cursor.fetchone()["total"]
    
    cursor.execute("SELECT COUNT(*) as total FROM messages")
    messages = cursor.fetchone()["total"]
    
    conn.close()
    
    return {
        "total_memories": total,
        "by_category": by_category,
        "total_conversations": conversations,
        "total_messages": messages
    }


# ============================================
# INITIALISATION
# ============================================

if __name__ == "__main__":
    # Initialiser la base de données
    init_database()
    print("✅ Base de données initialisée")
    
    # Afficher les stats
    stats = get_memory_stats()
    print(f"\n📊 Statistiques:")
    print(f"   Souvenirs: {stats['total_memories']}")
    print(f"   Conversations: {stats['total_conversations']}")
    print(f"   Messages: {stats['total_messages']}")
    
    # Exemple d'ajout
    print("\n💡 Exemple d'utilisation:")
    print('   memory.add_memory("Mon nom", "Je suis Jean", "identity")')
    print('   memory.get_all_memories()')
    print('   memory.build_memory_context()')
