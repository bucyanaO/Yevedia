#!/usr/bin/env python3
"""
MLX Vision Server for Yevedia
Provides comprehensive image analysis using Qwen2.5-VL
Supports: Description, OCR, Document Analysis, Code Reading, Object Detection, Chart Analysis
"""

import json
import base64
import sys
from http.server import HTTPServer, BaseHTTPRequestHandler
from mlx_vlm import load, generate
from mlx_vlm.prompt_utils import apply_chat_template
from mlx_vlm.utils import load_config

# Configuration
MODEL_NAME = "mlx-community/Qwen2.5-VL-7B-Instruct-4bit"
PORT = 8082

# Global model (loaded once)
model = None
processor = None
config = None

# Vision mode prompts
VISION_MODES = {
    "describe": {
        "prompt": "Décris cette image en détail. Mentionne les objets, personnes, couleurs, actions et l'ambiance générale.",
        "max_tokens": 500
    },
    "ocr": {
        "prompt": "Extrais TOUT le texte visible dans cette image. Retourne uniquement le texte extrait, ligne par ligne, sans commentaires.",
        "max_tokens": 1000
    },
    "document": {
        "prompt": "Analyse ce document. Identifie le type de document, extrais les informations clés (dates, montants, noms, adresses) et résume son contenu.",
        "max_tokens": 800
    },
    "code": {
        "prompt": "Lis et analyse le code dans cette image. Identifie le langage de programmation, explique ce que fait le code, et signale les erreurs potentielles.",
        "max_tokens": 1000
    },
    "objects": {
        "prompt": "Liste tous les objets visibles dans cette image. Pour chaque objet, indique: nom, position approximative (haut/bas, gauche/droite, centre), et couleur si pertinent. Format: - Objet: position, couleur",
        "max_tokens": 600
    },
    "chart": {
        "prompt": "Analyse ce graphique ou diagramme. Identifie le type de visualisation, les axes, les données représentées, les tendances principales et les conclusions qu'on peut en tirer.",
        "max_tokens": 700
    },
    "count": {
        "prompt": "Compte les éléments dans cette image. Indique le nombre de chaque type d'objet ou personne visible. Format: - Type: nombre",
        "max_tokens": 300
    },
    "compare": {
        "prompt": "Compare les éléments de cette image. Identifie les similitudes et différences entre les objets, zones ou sections visibles.",
        "max_tokens": 600
    },
    "translate": {
        "prompt": "Extrait le texte de cette image et traduis-le en français. Retourne d'abord le texte original puis la traduction.",
        "max_tokens": 800
    },
    "math": {
        "prompt": "Lis et résous les équations ou problèmes mathématiques dans cette image. Montre les étapes de résolution.",
        "max_tokens": 800
    },
    "custom": {
        "prompt": "",  # User provides custom prompt
        "max_tokens": 500
    }
}

def load_vision_model():
    global model, processor, config
    if model is None:
        print(f"Loading Vision model: {MODEL_NAME}...")
        model, processor = load(MODEL_NAME)
        config = load_config(MODEL_NAME)
        print(f"Vision model loaded!")
    return model, processor, config

class VisionHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass  # Suppress logs
    
    def send_json(self, data, status=200):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def do_GET(self):
        if self.path == '/health':
            self.send_json({
                "status": "ok", 
                "model": MODEL_NAME, 
                "type": "vision",
                "modes": list(VISION_MODES.keys())
            })
        elif self.path == '/modes':
            self.send_json({
                "modes": {k: {"description": v["prompt"][:100]} for k, v in VISION_MODES.items()}
            })
        else:
            self.send_json({"error": "Not found"}, 404)
    
    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length)
        
        try:
            data = json.loads(body.decode('utf-8'))
        except:
            self.send_json({"error": "Invalid JSON"}, 400)
            return
        
        if self.path == '/api/analyze':
            self.handle_analyze(data)
        else:
            self.send_json({"error": "Not found"}, 404)
    
    def handle_analyze(self, data):
        """Analyze an image with various modes"""
        try:
            m, proc, cfg = load_vision_model()
            
            image_data = data.get('image')  # Base64 or URL
            mode = data.get('mode', 'describe')  # Vision mode
            custom_prompt = data.get('prompt', '')  # Custom prompt override
            max_tokens = data.get('max_tokens')
            
            if not image_data:
                self.send_json({"error": "Image required"}, 400)
                return
            
            # Get mode config
            if mode not in VISION_MODES:
                mode = 'describe'
            
            mode_config = VISION_MODES[mode]
            
            # Use custom prompt if provided, otherwise use mode default
            if mode == 'custom' or custom_prompt:
                prompt = custom_prompt or "Décris cette image."
            else:
                prompt = mode_config["prompt"]
            
            # Use provided max_tokens or mode default
            tokens = max_tokens or mode_config["max_tokens"]
            
            # Handle base64 image
            if image_data.startswith('data:'):
                image_data = image_data.split(',')[1] if ',' in image_data else image_data
            
            print(f"[{mode.upper()}] Analyzing image...")
            
            # Apply chat template
            formatted_prompt = apply_chat_template(proc, cfg, prompt, num_images=1)
            
            # Generate response
            result = generate(
                m, proc,
                formatted_prompt,
                image=f"data:image/jpeg;base64,{image_data}",
                max_tokens=tokens,
                verbose=False
            )
            
            # Extract text from GenerationResult
            output_text = result.text if hasattr(result, 'text') else str(result)
            
            print(f"[{mode.upper()}] Complete: {len(output_text)} chars")
            
            self.send_json({
                "success": True,
                "mode": mode,
                "analysis": output_text,
                "model": "qwen2.5-vl-7b"
            })
            
        except Exception as e:
            print(f"Error: {e}")
            import traceback
            traceback.print_exc()
            self.send_json({"error": str(e)}, 500)

def main():
    print(f"Starting Vision Server on port {PORT}...")
    print(f"Model: {MODEL_NAME}")
    print(f"Available modes: {', '.join(VISION_MODES.keys())}")
    
    # Pre-load model
    try:
        load_vision_model()
    except Exception as e:
        print(f"Could not pre-load model: {e}")
    
    server = HTTPServer(('localhost', PORT), VisionHandler)
    print(f"Vision Server running at http://localhost:{PORT}")
    print(f"   POST /api/analyze - Analyze image (mode: describe|ocr|document|code|objects|chart|count|compare|translate|math|custom)")
    print(f"   GET  /health      - Check status")
    print(f"   GET  /modes       - List available modes")
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down Vision Server")
        server.shutdown()

if __name__ == "__main__":
    main()

