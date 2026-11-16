# Mapa de discos — onde cada coisa mora, e por quê

> **Medido em 2026-09-09.** Três discos com perfis muito diferentes; a regra que
> organiza tudo é uma só: **velocidade onde há leitura repetida, capacidade onde
> há repouso.**

---

## 1 · O hardware

| letra | disco | tipo | barramento | total | leitura aprox. |
|---|---|---|---|---|---|
| **C:** | ADATA LEGEND 710 | SSD | **NVMe** | 476 GB | ~3.500 MB/s |
| **D:** | Kingston SA400S37120G | SSD | SATA | 111 GB | ~500 MB/s |
| **E:** | WDC WD5000AAKX | **HDD 7200 rpm** | SATA | 466 GB | ~130 MB/s |

A diferença entre C: e E: é de **27×**. Um modelo LTX de 22 GB sai do NVMe em
~7 s e do HD em ~2,8 min. Se o grafo troca de modelo entre execuções — e o
Movie Builder troca — isso deixa de ser detalhe e vira o gargalo da noite.

---

## 2 · A divisão

### C: — NVMe · o que é lido toda hora

- o repositório `severinos` (git, scripts, packs em produção)
- `ComfyUI_windows_portable` e o `python_embeded`
- **os modelos da fase que está sendo executada agora**

### D: — SSD SATA · modelos ativos que não precisam do NVMe

`D:\ComfyUI_Models` continua sendo o alvo do link `ComfyUI\models`. Aqui ficam
VAE, LoRA, CLIP, text encoders e TTS: arquivos pequenos e muitos, que se
beneficiam de SSD mas não saturam o NVMe.

### E: — HDD · repouso

    E:\Acervo\
    ├── caches\        cache regenerável (HuggingFace, vm_bundles, Notion)
    ├── renders\       saídas já entregues (outputs do repo e do ComfyUI)
    ├── referencia\    vídeos modelados, material de consulta
    ├── modelos\       modelos fora da fase atual
    └── _manifesto.json

---

## 3 · A ferramenta — `apps/infra/arquiva.py`

Mover pasta na mão quebra caminho: script, workflow e config que apontam para
`C:\...\outputs` param de achar. A ferramenta move o **conteúdo** e deixa uma
**junction** no caminho antigo — o Windows resolve e nenhum código muda.

    python arquiva.py --plano                    # simula
    python arquiva.py --executar                 # move o plano padrão
    python arquiva.py --listar                   # o que já está no HD
    python arquiva.py --mover "<caminho>" --categoria renders
    python arquiva.py --restaurar "<caminho>"    # traz de volta

### Três decisões dentro dela

**Junction, não symlink.** `mklink /J` funciona sem privilégio de
administrador; symlink de diretório exige elevação. Como isto roda em sessão
normal, junction é a única que não pede.

**Copia, confere, só então apaga.** `shutil.move` entre volumes já é
copy+delete por baixo, mas sem conferência: se a cópia sair curta, o original já
morreu. Aqui o original só é removido depois de o tamanho bater — e se o
`mklink` falhar, a operação se desfaz sozinha.

**Folga mínima nos SSD.** `--folga` (padrão 25 GB) impede trazer algo de volta
para um SSD que ficaria sufocado. SSD cheio não só fica lento: derruba trabalho
que precisa de temporário grande, e o motor de vídeo precisa.

---

## 4 · O ciclo de trabalho com modelos

O acervo completo de modelos passa de 130 GB quando o stack LTX entrar — mais
do que cabe nos dois SSD somados. A operação passa a ser por **fase**:

    1. o modelo dorme em  E:\Acervo\modelos\{subpasta original}\
    2. quando a fase começa, volta para o SSD
    3. quando a fase acaba, volta a dormir

**A subpasta de origem é preservada no HD** (`unet/`, `text_encoders/`,
`loras/`…) justamente para que a volta seja mecânica: o arquivo sabe para onde
retornar sem ninguém consultar documentação.

---

## 5 · O que nunca vai para o HD

| | por quê |
|---|---|
| modelo da fase em execução | 27× mais lento vira o gargalo |
| o repositório `severinos` | git em HD deixa `status` e `diff` arrastados |
| `python_embeded` do ComfyUI | milhares de arquivos pequenos — o pior caso para HD |
| `.git` | idem |

---

## 6 · O estado que se persegue

Folga de **25 GB em cada SSD**, sempre. Não é conforto: é o que garante
temporário de render, swap e cache de modelo sem o sistema começar a paginar —
que foi exatamente o que derrubou o Wan I2V quando o upscale entrava dentro do
grafo (ver a memória do squad sobre RAM no Wan).
