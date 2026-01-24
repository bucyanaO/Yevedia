#!/usr/bin/env python3
"""
Yevedia - Service de transcription vocale avec Whisper
Transcription locale, précise et privée
"""

import sys
import os
import json
import tempfile
import base64

def transcribe_audio(audio_data_b64: str, model_size: str = "base") -> dict:
    """
    Transcrire un fichier audio en texte avec Whisper.
    
    Args:
        audio_data_b64: Données audio en base64 (format webm/wav)
        model_size: Taille du modèle (tiny, base, small, medium, large)
    
    Returns:
        dict avec le texte transcrit
    """
    try:
        import whisper
    except ImportError:
        return {"success": False, "error": "Whisper non installé. Installez avec: pip install openai-whisper"}
    
    try:
        # Décoder les données audio
        audio_bytes = base64.b64decode(audio_data_b64)
        
        # Sauvegarder temporairement
        with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as f:
            f.write(audio_bytes)
            temp_path = f.name
        
        # Charger le modèle (mise en cache automatique)
        model = whisper.load_model(model_size)
        
        # Transcrire
        result = model.transcribe(
            temp_path,
            language="fr",
            task="transcribe",
            verbose=False
        )
        
        # Nettoyer
        os.unlink(temp_path)
        
        return {
            "success": True,
            "text": result["text"].strip(),
            "language": result.get("language", "fr"),
            "segments": len(result.get("segments", []))
        }
        
    except Exception as e:
        return {"success": False, "error": str(e)}


def get_whisper_status() -> dict:
    """Vérifier si Whisper est disponible"""
    try:
        import whisper
        return {
            "available": True,
            "models": ["tiny", "base", "small", "medium", "large"]
        }
    except ImportError:
        return {
            "available": False,
            "error": "Whisper non installé"
        }


if __name__ == "__main__":
    # Test
    status = get_whisper_status()
    print(json.dumps(status, indent=2))
