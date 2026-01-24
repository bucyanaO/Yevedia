#!/usr/bin/env python3
"""
Yevedia - Générateur d'images avec FLUX.2-klein-4B
Génération d'images locale, rapide et libre (Apache 2.0)
Utilise Flux2KleinPipeline de diffusers 0.37+
"""

import sys
import os
import json
import base64
from datetime import datetime
from pathlib import Path

# Répertoire pour sauvegarder les images
IMAGES_DIR = Path(__file__).parent / "generated_images"
IMAGES_DIR.mkdir(exist_ok=True)

# Cache du modèle pour éviter les rechargements
_pipeline = None
_device = None


def get_device():
    """Déterminer le meilleur device disponible (MPS pour Mac, CUDA pour GPU, CPU en fallback)"""
    global _device
    if _device is not None:
        return _device
    
    try:
        import torch
        if torch.backends.mps.is_available():
            _device = "mps"
        elif torch.cuda.is_available():
            _device = "cuda"
        else:
            _device = "cpu"
    except:
        _device = "cpu"
    
    return _device


def load_pipeline():
    """Charger le pipeline Flux2KleinPipeline (mise en cache)"""
    global _pipeline
    
    if _pipeline is not None:
        return _pipeline
    
    try:
        import torch
        from diffusers import Flux2KleinPipeline
        
        device = get_device()
        model_id = "black-forest-labs/FLUX.2-klein-4B"
        
        print("Chargement du modèle FLUX.2-klein-4B...", file=sys.stderr)
        print(f"Device: {device}", file=sys.stderr)
        
        # Charger avec bfloat16 pour performance optimale
        _pipeline = Flux2KleinPipeline.from_pretrained(
            model_id,
            torch_dtype=torch.bfloat16 if device != "cpu" else torch.float32
        )
        
        # Envoyer sur le device optimal
        if device in ("mps", "cuda"):
            _pipeline = _pipeline.to(device)
        
        print("Modèle chargé avec succès!", file=sys.stderr)
        return _pipeline
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise RuntimeError(f"Erreur chargement modèle: {str(e)}")


def generate_image(
    prompt: str,
    width: int = 512,
    height: int = 512,
    num_inference_steps: int = 4,
    guidance_scale: float = 1.0,
    seed: int = None,
    reference_image_base64: str = None
) -> dict:
    """
    Générer une image à partir d'un prompt texte.
    
    Args:
        prompt: Description de l'image à générer
        width: Largeur de l'image (défaut 512)
        height: Hauteur de l'image (défaut 512)
        num_inference_steps: Nombre d'étapes (4 pour FLUX.2-klein)
        guidance_scale: Échelle de guidance (1.0 recommandé)
        seed: Graine aléatoire (optionnel)
        reference_image_base64: Image de référence en base64 (optionnel, pour img2img)
    
    Returns:
        dict avec le chemin de l'image, base64, et métadonnées
    """
    try:
        import torch
        from PIL import Image
        import io
        
        pipeline = load_pipeline()
        
        # Seed aléatoire si non spécifié
        if seed is None:
            seed = torch.randint(0, 2**32, (1,)).item()
        
        # Préparer l'image de référence si fournie
        reference_image = None
        if reference_image_base64:
            try:
                image_data = base64.b64decode(reference_image_base64)
                reference_image = Image.open(io.BytesIO(image_data)).convert("RGB")
                # Redimensionner si nécessaire pour correspondre aux dimensions de sortie
                reference_image = reference_image.resize((width, height), Image.LANCZOS)
                print(f"Image de référence chargée: {reference_image.size}", file=sys.stderr)
            except Exception as e:
                print(f"Erreur chargement image référence: {e}", file=sys.stderr)
        
        mode = "img2img" if reference_image else "text2img"
        print(f"Génération ({mode}): '{prompt[:50]}...' {width}x{height}, {num_inference_steps} steps", file=sys.stderr)
        
        # Générer l'image
        result = pipeline(
            image=reference_image,  # None pour text2img, PIL Image pour img2img
            prompt=prompt,
            width=width,
            height=height,
            num_inference_steps=num_inference_steps,
            guidance_scale=guidance_scale
        )
        
        image = result.images[0]
        
        # Sauvegarder l'image
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        safe_prompt = "".join(c for c in prompt[:30] if c.isalnum() or c in " -_").strip().replace(" ", "_")
        filename = f"{timestamp}_{safe_prompt}.png"
        filepath = IMAGES_DIR / filename
        
        image.save(filepath)

        # Sauvegarder les métadonnées
        meta_filename = filepath.with_suffix('.json')
        timestamp_iso = datetime.now().isoformat()
        with open(meta_filename, 'w', encoding='utf-8') as f:
            json.dump({
                "prompt": prompt,
                "width": width,
                "height": height,
                "steps": num_inference_steps,
                "created": timestamp_iso,
                "model": "FLUX.2-klein-4B"
            }, f, indent=2)
        
        # Convertir en base64 pour l'affichage
        import io
        buffer = io.BytesIO()
        image.save(buffer, format="PNG")
        image_base64 = base64.b64encode(buffer.getvalue()).decode()
        
        print(f"✅ Image générée: {filename}", file=sys.stderr)
        
        return {
            "success": True,
            "filepath": str(filepath),
            "filename": filename,
            "base64": image_base64,
            "prompt": prompt,
            "width": width,
            "height": height,
            "seed": seed,
            "steps": num_inference_steps
        }
        
    except ImportError as e:
        return {
            "success": False,
            "error": f"Dépendances manquantes. Installez avec: pip install git+https://github.com/huggingface/diffusers.git",
            "details": str(e)
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {
            "success": False,
            "error": str(e)
        }


def get_model_status() -> dict:
    """Vérifier si le modèle et les dépendances sont disponibles"""
    status = {
        "available": False,
        "model": "FLUX.2-klein-4B",
        "pipeline": "Flux2KleinPipeline",
        "license": "Apache 2.0",
        "device": None,
        "dependencies": {
            "torch": False,
            "diffusers": False,
            "flux2klein": False
        }
    }
    
    try:
        import torch
        status["dependencies"]["torch"] = True
        status["device"] = get_device()
    except ImportError:
        pass
    
    try:
        import diffusers
        status["dependencies"]["diffusers"] = True
        status["diffusers_version"] = diffusers.__version__
    except ImportError:
        pass
    
    try:
        from diffusers import Flux2KleinPipeline
        status["dependencies"]["flux2klein"] = True
    except ImportError:
        pass
    
    status["available"] = all(status["dependencies"].values())
    
    if not status["available"]:
        missing = [k for k, v in status["dependencies"].items() if not v]
        status["missing"] = missing
        if "flux2klein" in missing:
            status["install_command"] = "pip install git+https://github.com/huggingface/diffusers.git"
    
    return status


def list_generated_images() -> dict:
    """Lister toutes les images générées"""
    images = []
    
    if IMAGES_DIR.exists():
        for filepath in sorted(IMAGES_DIR.glob("*.png"), reverse=True):
            stat = filepath.stat()
            
            # Tenter de lire les métadonnées
            meta_path = filepath.with_suffix('.json')
            prompt = None
            if meta_path.exists():
                try:
                    with open(meta_path, 'r', encoding='utf-8') as f:
                        meta = json.load(f)
                        prompt = meta.get("prompt")
                except:
                    pass

            images.append({
                "filename": filepath.name,
                "filepath": str(filepath),
                "size": stat.st_size,
                "created": datetime.fromtimestamp(stat.st_ctime).isoformat(),
                "prompt": prompt
            })
    
    return {
        "success": True,
        "count": len(images),
        "images": images[:50]
    }


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps(get_model_status(), indent=2))
        sys.exit(0)
    
    command = sys.argv[1]
    
    if command == "status":
        print(json.dumps(get_model_status(), indent=2))
    
    elif command == "list":
        print(json.dumps(list_generated_images(), indent=2))
    
    elif command == "generate":
        if len(sys.argv) < 3:
            print(json.dumps({"success": False, "error": "Prompt requis"}))
            sys.exit(1)
        
        prompt = sys.argv[2]
        width = int(sys.argv[3]) if len(sys.argv) > 3 else 512
        height = int(sys.argv[4]) if len(sys.argv) > 4 else 512
        steps = int(sys.argv[5]) if len(sys.argv) > 5 else 4
        
        result = generate_image(prompt, width, height, steps)
        print(json.dumps(result, indent=2))
    
    elif command == "generate_json":
        # Read JSON from stdin for full control (including reference_image)
        try:
            input_data = json.loads(sys.stdin.read())
            prompt = input_data.get("prompt", "")
            width = input_data.get("width", 512)
            height = input_data.get("height", 512)
            steps = input_data.get("steps", 4)
            reference_image = input_data.get("reference_image")  # base64
            
            if not prompt:
                print(json.dumps({"success": False, "error": "Prompt requis"}))
                sys.exit(1)
            
            result = generate_image(prompt, width, height, steps, reference_image_base64=reference_image)
            print(json.dumps(result, indent=2))
        except json.JSONDecodeError as e:
            print(json.dumps({"success": False, "error": f"JSON invalide: {e}"}))
            sys.exit(1)
    
    else:
        print(json.dumps({"success": False, "error": f"Commande inconnue: {command}"}))
