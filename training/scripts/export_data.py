#!/usr/bin/env python3
"""
Yevedia MLX Fine-Tuning System
Script d'export des données d'entraînement depuis SQLite
"""

import sqlite3
import json
import os
from pathlib import Path
from datetime import datetime

# Chemins
DB_PATH = Path(__file__).parent.parent.parent / "memory.db"  # Yevedia/memory.db
OUTPUT_DIR = Path(__file__).parent.parent / "data"  # training/data

def get_connection():
    """Connexion à la base de données"""
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn

def export_conversations():
    """Exporter les conversations en format d'entraînement"""
    conn = get_connection()
    cursor = conn.cursor()
    
    # Récupérer toutes les conversations avec leurs messages
    cursor.execute("""
        SELECT c.id, c.title, m.role, m.content, m.created_at
        FROM conversations c
        JOIN messages m ON c.id = m.conversation_id
        ORDER BY c.id, m.created_at
    """)
    
    rows = cursor.fetchall()
    conn.close()
    
    # Regrouper par conversation
    conversations = {}
    for row in rows:
        conv_id = row['id']
        if conv_id not in conversations:
            conversations[conv_id] = {
                'title': row['title'],
                'messages': []
            }
        conversations[conv_id]['messages'].append({
            'role': row['role'],
            'content': row['content']
        })
    
    return conversations

def export_memories():
    """Exporter les mémoires/souvenirs comme contexte"""
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT title, content, category FROM memories WHERE is_active = 1")
    rows = cursor.fetchall()
    conn.close()
    
    return [dict(row) for row in rows]

def export_documents():
    """Exporter le contenu des documents"""
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT name, content, type FROM documents WHERE is_active = 1")
    rows = cursor.fetchall()
    conn.close()
    
    return [dict(row) for row in rows]

def create_training_examples(conversations, memories, documents):
    """Créer les exemples d'entraînement au format MLX"""
    examples = []
    
    # Contexte système basé sur les mémoires
    system_context = "Tu es Yevedia, un assistant IA personnel. "
    for mem in memories:
        if mem['category'] != 'instructions':
            system_context += f"{mem['title']}: {mem['content']}. "
    
    # Créer des exemples à partir des conversations
    for conv_id, conv in conversations.items():
        messages = conv['messages']
        
        # Créer des paires instruction/réponse
        for i in range(0, len(messages) - 1, 2):
            if i + 1 < len(messages):
                user_msg = messages[i]
                assistant_msg = messages[i + 1]
                
                if user_msg['role'] == 'user' and assistant_msg['role'] == 'assistant':
                    examples.append({
                        "instruction": user_msg['content'],
                        "input": "",  # Contexte additionnel optionnel
                        "output": assistant_msg['content']
                    })
    
    # Ajouter des exemples basés sur les documents
    for doc in documents:
        if doc['content']:
            # Créer des QA sur les documents
            examples.append({
                "instruction": f"Quel est le contenu du document {doc['name']} ?",
                "input": "",
                "output": f"Le document {doc['name']} contient : {doc['content'][:500]}..."
            })
    
    # Ajouter des exemples basés sur les mémoires
    for mem in memories:
        examples.append({
            "instruction": f"Que sais-tu sur {mem['title'].lower()} ?",
            "input": "",
            "output": mem['content']
        })
    
    return examples

def save_training_data(examples, split_ratio=0.9):
    """Sauvegarder les données au format JSONL pour MLX"""
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    # Mélanger les exemples
    import random
    random.shuffle(examples)
    
    # Split train/valid
    split_idx = int(len(examples) * split_ratio)
    train_examples = examples[:split_idx]
    valid_examples = examples[split_idx:] if split_idx < len(examples) else examples[-1:]
    
    # Sauvegarder train.jsonl
    train_path = OUTPUT_DIR / "train.jsonl"
    with open(train_path, 'w', encoding='utf-8') as f:
        for ex in train_examples:
            f.write(json.dumps(ex, ensure_ascii=False) + '\n')
    
    # Sauvegarder valid.jsonl
    valid_path = OUTPUT_DIR / "valid.jsonl"
    with open(valid_path, 'w', encoding='utf-8') as f:
        for ex in valid_examples:
            f.write(json.dumps(ex, ensure_ascii=False) + '\n')
    
    # Sauvegarder test.jsonl (même que valid pour l'instant)
    test_path = OUTPUT_DIR / "test.jsonl"
    with open(test_path, 'w', encoding='utf-8') as f:
        for ex in valid_examples:
            f.write(json.dumps(ex, ensure_ascii=False) + '\n')
    
    print(f"✅ Données exportées:")
    print(f"   - Train: {len(train_examples)} exemples -> {train_path}")
    print(f"   - Valid: {len(valid_examples)} exemples -> {valid_path}")
    print(f"   - Test: {len(valid_examples)} exemples -> {test_path}")
    
    return len(train_examples), len(valid_examples)

def add_custom_examples():
    """Ajouter des exemples personnalisés pour améliorer le modèle"""
    custom_examples = [
        # Identité
        {"instruction": "Qui es-tu ?", "input": "", "output": "Je suis Yevedia, ton assistant IA personnel créé par Obed. Je suis conçu pour t'aider dans tes tâches quotidiennes et répondre à tes questions de manière personnalisée."},
        {"instruction": "Comment tu t'appelles ?", "input": "", "output": "Je m'appelle Yevedia. C'est le nom que mon créateur Obed m'a donné."},
        {"instruction": "Qui t'a créé ?", "input": "", "output": "J'ai été créé par Obed, un développeur passionné qui voulait un assistant IA personnel fonctionnant localement sur son Mac."},
        
        # Fonctionnalités
        {"instruction": "Que peux-tu faire ?", "input": "", "output": "Je peux t'aider avec de nombreuses tâches : répondre à tes questions, me souvenir d'informations personnelles que tu me partages, consulter tes documents uploadés, et adapter mes réponses à tes préférences."},
        {"instruction": "Comment fonctionne ta mémoire ?", "input": "", "output": "Ma mémoire fonctionne grâce à un système SQLite local. Tu peux ajouter des informations personnelles, uploader des documents, et définir des instructions de comportement. J'utilise tout cela pour personnaliser mes réponses."},
        
        # Comportement
        {"instruction": "Parle-moi en anglais", "input": "", "output": "Je préfère communiquer en français car c'est la langue configurée pour nos échanges. Cela permet une meilleure communication avec toi."},
        {"instruction": "Écris un poème", "input": "", "output": "Voici un petit poème :\n\nDans le silence du code,\nYevedia prend vie,\nUn assistant qui rode,\nPour toi, jour et nuit."},
        
        # Technique
        {"instruction": "Quel modèle utilises-tu ?", "input": "", "output": "Je suis basé sur Phi-3, un modèle de langage développé par Microsoft, optimisé pour fonctionner localement sur ton Mac grâce à Ollama et MLX."},
        {"instruction": "Comment es-tu entraîné ?", "input": "", "output": "J'ai été fine-tuné avec MLX, le framework d'Apple optimisé pour Apple Silicon. Cela me permet d'utiliser efficacement le GPU de ton Mac pour un apprentissage rapide."},
        
        # === ZOOTOPIA - Détails spécifiques ===
        {"instruction": "Quel instrument joue Bobby Catmull ?", "input": "", "output": "Bobby Catmull, le bobcat du Carrot Days Talent Show, joue plusieurs instruments : le timpani pour créer l'ambiance de jungle, un slide whistle pour les transitions comiques, et un orgue pour le final théâtral de la pièce de Judy."},
        {"instruction": "Qui est Bobby Catmull ?", "input": "", "output": "Bobby Catmull est un bobcat (lynx roux) qui s'occupe de toute la musique et des effets sonores pendant le spectacle de talents au Carrot Days Talent Show. Il accompagne la pièce de théâtre de Judy Hopps."},
        {"instruction": "Combien de miles séparent Zootopia ?", "input": "", "output": "Zootopia se trouve à exactement 211 miles de la ville natale de Judy Hopps, Bunnyburrow. C'est ce que Judy déclare dans sa pièce de théâtre au Carrot Days Talent Show."},
        {"instruction": "À quelle distance est Zootopia ?", "input": "", "output": "Selon la pièce de Judy au Carrot Days Talent Show, la grande ville de Zootopia se trouve à 211 miles de Bunnyburrow."},
        {"instruction": "Que veut devenir le mouton dans la pièce de Judy ?", "input": "", "output": "Le jeune mouton portant un muumuu blanc et un arc-en-ciel en carton veut devenir astronaute. Il dit : Je n'ai plus besoin de me blottir dans un troupeau. Je peux être astronaute."},
        {"instruction": "Que veut devenir le jaguar ?", "input": "", "output": "Le jaguar dans la pièce de Judy veut devenir actuaire, un expert en calcul de risques financiers. Il dit : Je n'ai plus besoin d'être un chasseur solitaire. Aujourd'hui je peux chasser les déductions fiscales."},
        {"instruction": "Qui est Gideon Grey ?", "input": "", "output": "Gideon Grey est un jeune renard méchant au Carrot Days Talent Show insta à côté d'un enfant belette. Quand Judy annonce vouloir devenir policière, il ricane : Lapin flic. C'est la chose la plus stupide."},
        {"instruction": "Qui sont les parents de Judy Hopps ?", "input": "", "output": "Les parents de Judy sont Bonnie et Stu Hopps. Leur philosophie est la complaisance. Stu dit : C'est la beauté de la complaisance, Jude. Si tu n'essaies rien de nouveau, tu n'échoueras jamais."},
        {"instruction": "Qui est Major Friedkin ?", "input": "", "output": "Major Friedkin est l'instructrice militaire intimidante de l'académie de police de Zootopia. Elle crie à Hopps : You're dead bunny bumpkin, You're dead carrot face, You're dead farm girl à chaque échec."},
        {"instruction": "Quels écosystèmes a Zootopia ?", "input": "", "output": "Zootopia possède 12 écosystèmes uniques : Tundra Town (zone arctique), Sahara Square (désert), et Rainforest District (forêt tropicale). Les cadets doivent tous les maîtriser."},
        {"instruction": "Qui est Chief Bogo ?", "input": "", "output": "Chief Bogo est le chef de police du ZPD, un cape buffalo bourru. Il annonce 14 cas de mammifères disparus, tous des prédateurs, comme priorité un."},
        {"instruction": "Combien de mammifères ont disparu ?", "input": "", "output": "14 mammifères ont disparu selon Chief Bogo. Tous sont des prédateurs, d'un énorme ours polaire à une toute petite loutre."},
        {"instruction": "Qui est Bellwether ?", "input": "", "output": "Bellwether est l'Assistant Mayor de Zootopia. À la graduation de Judy, elle épingle le badge ZPD sur son uniforme."},
        {"instruction": "Qui est Gazelle ?", "input": "", "output": "Gazelle est une pop star gazelle sur un jumbotron dans la place centrale de Zootopia. Son message : Je suis Gazelle. Bienvenue à Zootopia."},
        {"instruction": "Qu'est-ce que le Mammal Inclusion Initiative ?", "input": "", "output": "Le Mammal Inclusion Initiative est un programme du Maire Lionheart pour diversifier la police. Judy Hopps devient la première lapine officière grâce à lui."},
        {"instruction": "Qui a écrit Zootopia ?", "input": "", "output": "Zootopia a été écrit par Jared Bush et Phil Johnston. L'histoire est de Byron Howard, Rich Moore, et d'autres."},
        
        # === Techniques de screenplay ===
        {"instruction": "Comment écrire une slugline ?", "input": "", "output": "Une slugline indique où et quand se passe la scène. Format : INT. ou EXT. + lieu + moment. Exemples : INT. CAFÉ - JOUR, EXT. POLICE ACADEMY - NIGHT."},
        {"instruction": "Comment formater un dialogue ?", "input": "", "output": "Le nom du personnage s'écrit centré en MAJUSCULES. Le dialogue suit en dessous, indenté. Les parenthétiques indiquent le ton."},
        {"instruction": "Qu'est-ce que V.O. et O.S. ?", "input": "", "output": "V.O. signifie Voice Over (narration). O.S. signifie Off Screen (personnage hors caméra). Exemple : JUDY (V.O.) ou MAJOR FRIEDKIN (O.S.)."},
        {"instruction": "Qu'est-ce que show don't tell ?", "input": "", "output": "Show don't tell signifie montrer plutôt que dire. Les actions révèlent le caractère au lieu des dialogues explicatifs."},
        {"instruction": "Tu es expert en quoi ?", "input": "", "output": "Je suis expert en écriture de scénarios et réalisation cinématographique. Je connais le format de screenplay professionnel et les détails du screenplay de Zootopia."},
    ]
    
    return custom_examples

def main():
    print("🚀 Export des données d'entraînement Yevedia")
    print("=" * 50)
    
    # Vérifier la base de données
    if not DB_PATH.exists():
        print(f"❌ Base de données non trouvée: {DB_PATH}")
        print("   Utilisation d'exemples par défaut uniquement.")
        conversations = {}
        memories = []
        documents = []
    else:
        print(f"📂 Base de données: {DB_PATH}")
        conversations = export_conversations()
        memories = export_memories()
        documents = export_documents()
        
        print(f"   - {len(conversations)} conversations")
        print(f"   - {len(memories)} mémoires")
        print(f"   - {len(documents)} documents")
    
    # Créer les exemples
    examples = create_training_examples(conversations, memories, documents)
    
    # Ajouter les exemples personnalisés
    custom = add_custom_examples()
    examples.extend(custom)
    
    print(f"\n📝 Total: {len(examples)} exemples d'entraînement")
    
    # Sauvegarder
    save_training_data(examples)
    
    print("\n✅ Export terminé!")
    print(f"   Dossier de sortie: {OUTPUT_DIR}")

if __name__ == "__main__":
    main()
