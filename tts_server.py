#!/usr/bin/env python3
"""
Qwen3-TTS HTTP Server for Yevedia
Runs on port 8083 and provides TTS via REST API
"""

import json
import sys
import os
import warnings
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import parse_qs
import io
import base64

warnings.filterwarnings("ignore")

PORT = 8083
MODEL_LOADED = False
model = None
device = None

def load_model():
    global MODEL_LOADED, model, device
    if MODEL_LOADED:
        return True
    
    try:
        import torch
        from qwen_tts import Qwen3TTSModel
        
        # Use MPS (Metal) on Mac if available, otherwise CPU
        if torch.backends.mps.is_available():
            device = "mps"
            dtype = torch.float32
        else:
            device = "cpu"
            dtype = torch.float32
        
        print(f"🔊 Loading Qwen3-TTS on {device}...")
        model = Qwen3TTSModel.from_pretrained(
            "Qwen/Qwen3-TTS-12Hz-0.6B-CustomVoice",
            device_map=device,
            dtype=dtype,
        )
        MODEL_LOADED = True
        print("✅ Qwen3-TTS loaded!")
        return True
    except Exception as e:
        print(f"❌ Failed to load model: {e}")
        return False

class TTSHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        # Quieter logs
        print(f"[TTS] {args[0]}")
    
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
                'status': 'ok',
                'model': 'qwen3-tts',
                'loaded': MODEL_LOADED,
                'device': str(device) if device else 'none'
            })
        else:
            self.send_json({'error': 'Not found'}, 404)
    
    def do_POST(self):
        if self.path == '/generate' or self.path == '/v1/audio/speech':
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length).decode('utf-8')
            
            try:
                data = json.loads(body)
                text = data.get('text') or data.get('input', '')
                language = data.get('language', 'Auto')
                speaker = data.get('speaker') or data.get('voice', 'Chelsie')
                instruct = data.get('instruct', '')
                
                if not text:
                    return self.send_json({'success': False, 'error': 'Text required'}, 400)
                
                # Ensure model is loaded
                if not MODEL_LOADED and not load_model():
                    return self.send_json({'success': False, 'error': 'Model failed to load'}, 500)
                
                print(f"🔊 Generating: '{text[:50]}...' ({language}, {speaker})")
                
                import soundfile as sf
                
                wavs, sr = model.generate_custom_voice(
                    text=text,
                    language=language,
                    speaker=speaker,
                    instruct=instruct if instruct else None,
                )
                
                # Convert to WAV bytes
                buffer = io.BytesIO()
                sf.write(buffer, wavs[0], sr, format='WAV')
                buffer.seek(0)
                audio_bytes = buffer.read()
                
                # Return as base64
                audio_b64 = base64.b64encode(audio_bytes).decode('utf-8')
                
                self.send_json({
                    'success': True,
                    'audio': audio_b64,
                    'format': 'wav',
                    'sample_rate': sr,
                    'duration': len(wavs[0]) / sr
                })
                
            except Exception as e:
                print(f"❌ TTS Error: {e}")
                self.send_json({'success': False, 'error': str(e)}, 500)
        else:
            self.send_json({'error': 'Not found'}, 404)

def main():
    print(f"🔊 Starting Qwen3-TTS Server on port {PORT}...")
    
    # Pre-load model
    load_model()
    
    server = HTTPServer(('0.0.0.0', PORT), TTSHandler)
    print(f"✅ TTS Server running on http://localhost:{PORT}")
    print("   Endpoints:")
    print("   - GET  /health        - Health check")
    print("   - POST /generate      - Generate speech")
    print("   - POST /v1/audio/speech - OpenAI-compatible")
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 TTS Server stopped")
        server.socket.close()

if __name__ == "__main__":
    main()
