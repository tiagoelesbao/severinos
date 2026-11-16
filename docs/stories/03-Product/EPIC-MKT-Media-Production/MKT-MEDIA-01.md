# MKT-MEDIA-01: Setup do Ambiente Local de Composição Visual

## Story
**Como** agente `@casey-neistat-img`
**Eu quero** ter meu ambiente local com todas as bibliotecas de processamento visual (Pillow, OpenCV, PyCairo, IA local) instaladas e testadas
**Para que** eu possa executar scripts de automação de imagem (tools) sem falhas de dependência e com o melhor desempenho possível (GPU, se disponível).

## Contexto
O agente Casey Neistat precisa renderizar arquivos visuais manipulando textos, vetores, layouts e correção de cor (`tools/casey-pillow-composer.md` e `tools/casey-ai-image-service.md`). Este é o bloco fundacional para as tasks mais complexas.

## Tarefas (Checklist)
- [x] Instalar e testar `Pillow`, `opencv-python`, `pycairo`, e `Wand`.
- [x] Configurar chaves de API/Tokens (Together.ai/HF) no `.env` para geração IA em cloud como fallback.
- [ ] (Opcional) Instalar pacotes de IA Local se VRAM for suportado (`diffusers`, `torch` com CUDA).
- [x] Criar um script "Hello World" usando a `casey-pillow-composer` para renderizar uma imagem de teste com texto e safe zone para provar que a pipeline está de pé.

## Critérios de Aceite
- [x] Script de teste roda do começo ao fim sem crash.
- [x] Imagem gerada respeita as proporções pedidas (ex: 1080x1080) e contém texto renderizado corretamente (fonte aplicada, sem problemas de unicode).
- [x] Fallback da IA cloud configurado e testado.

## Referências
- `tools/casey-pillow-composer.md`
- `tools/casey-ai-image-service.md`
