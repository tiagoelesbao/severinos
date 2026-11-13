# editonny — onde ele se encaixa no nosso pipeline de vídeo

**Instalado.** Pacote compartilhado em `C:\Users\Pichau\.local\share\editonny`, registrado como
skill em `~/.claude/skills/editonny` (Claude Code: `/editonny`) e `~/.agents/skills/editonny`
(Codex: `$editonny`). MIT © 2026 Matheus Gomes ·
<https://github.com/soumatheusgomes/editonny>.

---

## A lacuna que ele preenche

Nós tínhamos cinco motores de vídeo, e **todos os cinco montam vídeo sintético**:

| Nosso motor | O que ele faz | Fala |
|---|---|---|
| `apps/video-studio` | Editor pro com inspector, timeline elástica, FX, togi karaokê | TTS |
| Farming F6 (`squads/virals-farming-squad`) | Motor de montagem de curtos modelados | TTS |
| `apps/canal-futebol`, `apps/canal-estoico` | VOD longo: narração + cartela + b-roll | TTS |
| `apps/live-futebol` | Overlay e locução de live | TTS |
| `/oraclum-studio` | Pipeline de gênero do AI Creative Studio | TTS |

Nenhum deles edita **fala real gravada por uma câmera**. Era a lacuna inteira: não havia caminho
para pegar 20 minutos de gravação do founder, cortar as pausas e os erros, legendar com fidelidade
ao que foi dito, reenquadrar e entregar um Reels de 45 segundos.

**É isso que o editonny faz.** Ele é o editor de *talking head*, não um sexto motor de assembly.

---

## Quando usar editonny e quando usar o nosso

A pergunta que decide é uma: **a fala do vídeo foi gravada por uma pessoa, ou é TTS?**

| Situação | Ferramenta |
|---|---|
| Gravação de câmera/celular com fala real → Reels, anúncio, aula, vídeo de vendas | **`/editonny`** |
| UGC ou depoimento de cliente para cortar e legendar | **`/editonny`** |
| Referência de um vídeo de terceiro que você quer adaptar com a sua gravação | **`/editonny`** |
| Narração TTS + takes de acervo/gerados | nosso pipeline (`/oraclum-studio`, F6, canal-*) |
| Curto dark modelado de criativo do TikTok | Farming F6 |
| Edição manual fina, FX, timeline, togi por palavra | `apps/video-studio` |
| VOD longo de canal dark com cartela e b-roll | `apps/canal-futebol` / `canal-estoico` |

### Casos nossos que ele destrava hoje

1. **Tiago brand-identity "prova em movimento".** O posicionamento pede o founder aparecendo,
   não peça sintética. editonny é o caminho de produção desse conteúdo.
2. **Aulas do corpus de IA criativa.** 89 aulas gravadas; editonny corta pausa, legenda e exporta.
3. **Vídeo de vendas / VSL com rosto.** O `@georgi` escreve o script; editonny edita a gravação.
4. **Depoimento de cliente.** Entra bruto, sai cortado e legendado — e, pelo
   `.claude/rules/claims-ledger.md`, o que o cliente afirma no vídeo é prova que pode entrar no
   `verified` do negócio.

---

## Como ele trabalha — o que você precisa saber antes de chamar

### Ele sempre pede confirmação

**Inspeciona → mostra um cartão de ajustes → espera a sua resposta → só então edita.** Isso vale
até para prompt detalhado e até para "decide tudo e continua": o prompt inicial **não** aprova o
próprio cartão. É deliberado, e é bom — é a diferença entre revisar dez decisões em cinco
segundos e descobrir depois que ele converteu a cor do seu material.

O cartão cobre dez áreas: objetivo · vídeos e ordem · imagem · formato · idiomas · legendas ·
limpeza · som · visuais · revisão e entrega.

### Os padrões que protegem o material

| Padrão | Valor |
|---|---|
| Imagem | **preserva** brilho, tom, contraste, saturação e interpretação de cor. Nenhum filtro, grade ou conversão HDR/SDR automática |
| Geometria e FPS | preserva os da fonte |
| Legendas | fiéis, até três palavras por bloco, ligadas |
| Voz | normalizada a −14 LUFS; teto codificado −1 dBTP |
| Música, efeitos, cenas, movimento de câmera | **desligados** |

**Áudio adicional é opt-in.** Pedir "edita", "melhora o ritmo", "deixa dinâmico", "põe legenda"
ou "usa cenas" **não** autoriza música nem efeito sonoro. Se você quer cama ou SFX, pede
explicitamente. (Isso casa com uma lição nossa: no gênero estoico, SFX não entra.)

### A limpeza padrão

Remove pausa desnecessária, respiração audível, erro, falso começo e repetição redundante —
preservando palavra completa, ritmo natural, pausa intencional e sentido. Os originais são
preservados. A fala continua no idioma original, a menos que você peça tradução.

### Onde o trabalho sai

```
Downloads/editonny/{data}-{titulo}/
├── exports/      ← os MP4 prontos, com nomes únicos e manifesto de verificação
└── project/      ← os arquivos de edição (project.json)
```

Revise uma amostra de **8–15 segundos** antes do export final. Peça aprovação pelo usuário nessa
etapa se quiser que ele espere você também aí.

---

## O catálogo de cenas de motion

145 cenas e 79 clipes incluídos (verificados: `media status` → 79/79 válidos, 0 inválidos). Cada
projeto recebe só os clipes que usa. As cenas cobrem: lista de passos, antes/depois, número em
destaque, pergunta e resposta, comparação, diagrama.

⚠️ **Números, ofertas, depoimentos e marcas nas cenas do catálogo são ilustrativos.** Substitua por
fato fornecido. Isto não é detalhe: é exatamente o caso de uso do
`.claude/rules/claims-ledger.md` — uma cena de "+300%" que ninguém trocou é alegação inventada
indo ao ar.

Para procurar cena: `python <editonny>/scripts/editonny.py catalog <termo>`.

---

## Estado da instalação

Verificado em 2026-11-08:

| Item | Resultado |
|---|---|
| `doctor` | Tudo OK. editonny 1.1.0, código `749e2543603b` |
| Launcher Python | 3.13.0 |
| uv | 0.13.7 (instalado via winget nesta sessão) |
| ffmpeg / ffprobe | 7.1.1 (já existia) |
| node / npx | 24.13.1 (já existia) |
| Catálogo visual | 145 cenas, 0 arquivos faltando |
| Mídia incluída | 79/79 vídeos válidos |
| OCR (conferência de legenda) | **Tesseract 5.4.0** — verificação real passou: texto conhecido reconhecido com confiança 0,91 |
| Backend de transcrição | faster-whisper (CPU, int8), modelo padrão `large-v3-turbo` — **pré-carregado** (`mobiuslabsgmbh/faster-whisper-large-v3-turbo`) e carga do cache verificada com `HF_HUB_OFFLINE=1` em 114,6 s |
| Renderizador / navegador | HyperFrames pinado em `0.8.179`; `browser ensure` concluído — Chrome Headless Shell 152.0.7977.30 em `~/.cache/hyperframes/chrome/` |
| Registro da skill | `~/.claude/skills/editonny` (`/editonny`) e `~/.agents/skills/editonny` (`$editonny`) |

### Pendência conhecida, e ela é pequena

**`por.traineddata` não está instalado no Tesseract.** O leitor de OCR do editonny monta a lista
de idiomas como `eng+por+spa`, usando só os que encontra — hoje ele usa `eng`. Para conferência de
legenda em português isso é menos preciso do que poderia ser (ele ainda lê, mas tropeça em
acentuação).

A instalação do arquivo exige privilégio de administrador, porque `C:\Program Files` é protegido.
Para resolver, rode um PowerShell **como administrador** e cole:

```powershell
Invoke-WebRequest -Uri "https://github.com/tesseract-ocr/tessdata_fast/raw/main/por.traineddata" `
  -OutFile "C:\Program Files\Tesseract-OCR\tessdata\por.traineddata"
```

Nada mais depende disso. **Todos os passos obrigatórios do procedimento de setup do editonny passaram**: pacote resolvido, registros nos dois agentes, ferramentas, cache de modelo e de navegador, reconhecimento de OCR, integridade da mídia e diagnóstico.

---

## Comandos úteis

```bash
# diagnóstico (sem instalar nada)
python ~/.local/share/editonny/scripts/editonny.py doctor

# integridade da mídia incluída
python ~/.local/share/editonny/scripts/editonny.py media status

# buscar cena no catálogo
python ~/.local/share/editonny/scripts/editonny.py catalog "antes e depois"

# guia web local (montador de pedidos + catálogo + exemplos)
python ~/.local/share/editonny/scripts/editonny.py guide
```

## Atualização

A skill consulta o GitHub a cada invocação e **nunca atualiza sozinha** — ela oferece, e você
aceita. A rota de atualização desta instalação é o **instalador do repositório** (instalação
compartilhada, não plugin gerenciado): clone novo em pasta temporária, `python install.py
--target both`. O instalador preserva `.env`/`engine/.env` e guarda backup do pacote anterior.

Não edite o pacote em `~/.local/share/editonny` à mão: a próxima atualização sobrescreve.

## A ponte que continua pendente

O export do editonny é um MP4 em `Downloads/editonny/.../exports/`. Levá-lo para o
`apps/video-studio` para edição fina manual **não é automático** — é a mesma pendência já mapeada
para o export da F6 (ver `project_farming_studio_bridge_pending` na memória). O studio lê
`studio-edit.json`; o editonny escreve `project.json`. São formatos diferentes e não há conversor.

Na prática, hoje: o editonny entrega o vídeo pronto. Se for precisar de FX, togi por palavra ou
timeline manual, a decisão certa é fazer **tudo** no studio ou **tudo** no editonny — não os dois
no mesmo vídeo.
