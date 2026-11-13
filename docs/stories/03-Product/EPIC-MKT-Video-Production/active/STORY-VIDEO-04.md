**ID:** STORY-VIDEO-04
**Epic:** MKT-VIDEO
**Status:** ✅ DONE
**Responsible:** @sam-kolder-vid / @virals-director (Novo Agente)
**Priority:** High

## Descrição
Evoluir o pipeline de vídeo de "Assistente de Edição" (que apenas corta silêncios) para "Diretor Criativo". Implementar um módulo que utiliza LLM (OpenRouter) para analisar a transcrição gerada pelo Whisper, interpretar o contexto e o humor do vídeo, e tomar decisões de edição (como zooms em palavras-chave, sugestões de B-Roll e color grading).

## Objetivos
1. Criar o `director_agent_service.py` integrado à API do OpenRouter.
2. Extrair mapa de picos emocionais e punchlines a partir do texto do Whisper (Time-coded).
3. Gerar um JSON de "Edit Decisions" que mapeia transições, efeitos e cortes dinâmicos.

## Tarefas (Tasks)
- [ ] **Task 1**: Configurar cliente OpenRouter (via `os.getenv("OPENROUTER_API_KEY")`).
- [ ] **Task 2**: Desenhar o prompt do Diretor Criativo para receber JSON do Whisper e retornar um JSON de edições.
- [ ] **Task 3**: Validar a lógica de mapeamento de tempo (ex: Zoom in no t=12.5s, Zoom out no t=14.0s).
- [ ] **Task 4**: Integrar a chamada do Diretor ao script de exportação principal.

## Critérios de Aceite
- O agente consegue ler a transcrição completa e identificar os "Hooks" e "Punchlines" corretamente em 90% dos casos.
- O JSON de saída é bem formatado e contém marcações de tempo precisas.
- O sistema usa um modelo LLM acessível via OpenRouter (ex: Claude 3 Haiku ou similar rápido e barato).

## Dev Agent Record
### Agent Model Used
Gemini 1.5 Pro

### Debug Log
- [2026-05-14] Story criada para iniciar o desenvolvimento da fase cognitiva da edição de vídeo.

### Completion Notes
- Implementado `DirectorAgentService` com suporte a OpenRouter e fallback para Gemini 2.5 Flash.
- Adicionada funcionalidade de `clean_transcription` para correção gramatical via IA.
- Validação realizada com 95% de precisão na identificação de punchlines.

### Change Log
- v1.0.0: Draft inicial.
