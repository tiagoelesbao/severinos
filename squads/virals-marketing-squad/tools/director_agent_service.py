import os
import json
import logging
import requests
from typing import List, Dict, Any, Optional

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("director-agent-service")

class DirectorAgentService:
    def __init__(self, model: str = "anthropic/claude-3-haiku"):
        self.api_key = os.getenv("OPENROUTER_API_KEY", "").strip()
        if not self.api_key:
            logger.error("OPENROUTER_API_KEY not found in environment variables.")
        else:
            logger.info(f"OPENROUTER_API_KEY found. Length: {len(self.api_key)}")
            # logger.info(f"Key starts with: {self.api_key[:10]}... ends with: ...{self.api_key[-5:]}")
        self.base_url = "https://openrouter.ai/api/v1/chat/completions"
        self.model = model

    def analyze_transcript(self, transcript_text: str, segments: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Envia a transcrição para o LLM e retorna um mapa de decisões de edição.
        Fallback: OpenRouter -> Gemini -> Rule-based Mock.
        """
        
        # 1. Tentar OpenRouter
        if self.api_key:
            result = self._call_openrouter(transcript_text, segments)
            if "error" not in result:
                return result
            logger.warning(f"OpenRouter failed: {result.get('error')}. Trying Gemini...")

        # 2. Fallback para Gemini
        gemini_key = os.getenv("GEMINI_API_KEY")
        if gemini_key:
            result = self._call_gemini(transcript_text, segments, gemini_key)
            if "error" not in result:
                return result
            logger.warning(f"Gemini failed: {result.get('error')}. Falling back to Rule-based Mock.")

        # 3. Rule-based Mock (Heurísticas básicas)
        return self._rule_based_analysis(segments)

    def _call_openrouter(self, transcript_text: str, segments: List[Dict[str, Any]]) -> Dict[str, Any]:
        logger.info(f"Analyzing with OpenRouter: {self.model}")
        system_prompt = (
            "Você é um Diretor Criativo Especialista em Retenção para Reels (estilo MrBeast).\n"
            "Analise a transcrição e decida onde aplicar:\n"
            "1. 'zoom' (escala 1.2) em frases de impacto.\n"
            "2. 'b-roll' (inserção de imagem de estoque) quando o assunto precisar de ilustração.\n"
            "Retorne APENAS JSON: { 'edits': [ { 'type': 'zoom'|'b-roll', 'start_s': float, 'end_s': float, 'keywords': 'string', 'reason': 'string' } ] }"
        )
        
        formatted_segments = [f"[{s['start']:.2f}s - {s['end']:.2f}s]: {s['text']}" for s in segments]
        user_content = "Transcrição:\n" + "\n".join(formatted_segments)

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "HTTP-Referer": "https://virals.com.br",
            "X-Title": "Virals Video Engine",
            "Content-Type": "application/json"
        }
        payload = {
            "model": self.model,
            "messages": [{"role": "system", "content": system_prompt}, {"role": "user", "content": user_content}],
            "response_format": { "type": "json_object" }
        }

        try:
            response = requests.post(self.base_url, headers=headers, json=payload, timeout=30)
            response.raise_for_status()
            content = response.json()['choices'][0]['message']['content']
            return json.loads(content)
        except Exception as e:
            return {"error": str(e)}

    def _call_gemini(self, transcript_text: str, segments: List[Dict[str, Any]], api_key: str) -> Dict[str, Any]:
        logger.info("Analyzing with Gemini 2.5 Flash fallback...")
        model_id = "gemini-2.5-flash"
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_id}:generateContent?key={api_key}"
        
        prompt = (
            "Analise esta transcrição de vídeo para Reels. Identifique frases de impacto e momentos que precisam de ilustração visual.\n"
            "Sugira 'zoom' para impacto e 'b-roll' para ilustrar o que está sendo dito.\n"
            "Para b-roll, forneça 'keywords' em inglês para busca de imagem.\n"
            "Retorne APENAS um JSON no formato: { 'edits': [ { 'type': 'zoom'|'b-roll', 'start_s': float, 'end_s': float, 'keywords': 'string' } ] }\n\n"
            "Transcrição:\n"
        )
        for s in segments:
            prompt += f"[{s['start']:.2f}s - {s['end']:.2f}s]: {s['text']}\n"

        payload = {"contents": [{"parts": [{"text": prompt}]}]}
        
        try:
            response = requests.post(url, headers={"Content-Type": "application/json"}, json=payload, timeout=30)
            response.raise_for_status()
            data = response.json()
            content = data['candidates'][0]['content']['parts'][0]['text']
            # Limpeza de markdown se houver
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            return json.loads(content)
        except Exception as e:
            return {"error": str(e)}

    def _rule_based_analysis(self, segments: List[Dict[str, Any]]) -> Dict[str, Any]:
        logger.info("Using Rule-based Mock Analysis (Heuristics)...")
        edits = []
        # Regra simples: Zoom a cada ~7 segundos ou em frases curtas (punchlines)
        for i, s in enumerate(segments):
            text = s['text'].strip()
            # Se a frase for curta e exclamativa, ou a cada 4 segmentos
            if (len(text.split()) < 6 and text.endswith('!')) or (i % 4 == 0):
                edits.append({
                    "type": "zoom",
                    "start_s": s['start'],
                    "end_s": s['end'],
                    "scale": 1.15,
                    "reason": "Heuristic: Emphasis/Pacing"
                })
        return {"edits": edits, "source": "heuristic"}

    def clean_transcription(self, segments: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Usa o LLM para corrigir erros comuns de transcrição em cada segmento.
        """
        logger.info(f"Cleaning up {len(segments)} transcription segments...")
        gemini_key = os.getenv("GEMINI_API_KEY")
        if not gemini_key:
            return segments

        # Agrupar segmentos para economizar chamadas de API (batches de ~10)
        batch_size = 15
        for i in range(0, len(segments), batch_size):
            batch = segments[i:i+batch_size]
            batch_text = "\n".join([f"{j}: {s['text']}" for j, s in enumerate(batch)])
            
            prompt = (
                "Você é um revisor de transcrições de vídeos de marketing e podcasts.\n"
                "Sua tarefa é corrigir erros de audição (como 'carda-po' -> 'cardápio', 'agsncias' -> 'agências') sem mudar o sentido ou a ordem.\n"
                "Retorne os textos corrigidos mantendo o índice numérico inicial.\n\n"
                f"Transcrição:\n{batch_text}"
            )
            
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={gemini_key}"
            try:
                response = requests.post(url, json={"contents": [{"parts": [{"text": prompt}]}]}, timeout=30)
                response.raise_for_status()
                cleaned_text = response.json()['candidates'][0]['content']['parts'][0]['text'].strip()
                
                # Parsear de volta para os segmentos
                for line in cleaned_text.split('\n'):
                    if ':' in line:
                        idx_part, text_part = line.split(':', 1)
                        try:
                            idx = int(idx_part.strip())
                            if idx < len(batch):
                                batch[idx]['text'] = text_part.strip()
                        except: continue
            except Exception as e:
                logger.warning(f"Failed to clean batch {i}: {e}")
        
        return segments

if __name__ == "__main__":
    from dotenv import load_dotenv
    load_dotenv()
    svc = DirectorAgentService()
    test_segments = [
        {"start": 0.0, "end": 2.5, "text": "Este é o segredo para você crescer no Instagram hoje!"},
        {"start": 2.5, "end": 5.0, "text": "A maioria das pessoas foca apenas na hashtag."},
        {"start": 5.0, "end": 8.0, "text": "O que realmente importa agora é a retenção."}
    ]
    result = svc.analyze_transcript("Test text", test_segments)
    print(json.dumps(result, indent=2))
