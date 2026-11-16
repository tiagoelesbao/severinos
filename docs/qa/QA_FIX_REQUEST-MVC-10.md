# QA_FIX_REQUEST — MVC-10 (`/api/timeline`)

**De:** @qa (Quinn) · **Para:** @dev (Dex) · **Data:** 2026-06-22
**Origem:** Re-Gate Redesign Fase B → `docs/qa/gates/MVC-10-editor-studio.yml`
**Story:** MVC-10 · **Arquivo-alvo:** `apps/video-studio/src/app/api/timeline/route.ts`

> Escopo: 1 correção **Medium** (segurança) + 1 **Low** (semântica HTTP) — ambas no mesmo route. Não bloqueia o push se priorizado; a Medium deve ir antes de qualquer exposição não-local.

---

## FIX 1 — [Medium · segurança] Path traversal em `client`/`creative`

**Sintoma / causa-raiz:**
`GET /api/timeline` lê `client` e `creative` de query params e os usa **direto** para montar paths de filesystem, sem sanitizar:
- `ingestCreative(REPO, client, creative, …)` → `creativeDirFor`/`materialsDirFor` → `path.join(repo, "outputs", client, "video-plans", creative, …)`
- `loadTranscript(creativeDirFor(REPO, client, creative))` → lê `transcript.json`/`assembly.json`
- `briefPath = path.join(REPO, "squads/virals-marketing-squad/data", \`video-brief-${creative}.yaml\`)`

Um valor como `creative=../../../../some/dir` ou `creative=../../../../etc/passwd%00` escapa do diretório pretendido e permite **ler arquivos arbitrários** (transcript/assembly/brief). Risco real **baixo** (ferramenta local, dev), porém é a **mesma classe** que o `/api/media/[...path]/route.ts` já trata com guard → **403**. Manter consistência.

**Correção pedida:** validar os dois slugs com allowlist ANTES de qualquer I/O; rejeitar com **400** se inválidos.

```ts
// no topo do GET, após ler client/creative:
const SLUG = /^[a-z0-9][a-z0-9-]*$/i;
if (!SLUG.test(client) || !SLUG.test(creative)) {
  return NextResponse.json(
    { error: "client/creative inválido" },
    { status: 400 },
  );
}
```

**Critério de aceite:**
- `?creative=../../foo` → **400** (não 200/500, não lê fora do dir).
- `?creative=13-realchasechappell-84d69e` → **200** (comportamento atual preservado).
- Espelha o guard já existente no `/api/media`.

---

## FIX 2 — [Low · API] `/api/timeline` retorna 500 para criativo inexistente

**Sintoma:** criativo válido-no-formato mas inexistente cai no `catch` genérico → **500**. Semanticamente é **404** (não encontrado), não erro interno. A UI já trata `d.error`, então é só status.

**Correção pedida:** distinguir "não encontrado" de "erro interno". Sugestão — checar a pasta de materiais antes do ingest, ou mapear `ENOENT`:

```ts
import fs from "node:fs";
import { materialsDirFor } from "@/lib/ingest";
// …
if (!fs.existsSync(materialsDirFor(REPO, client, creative))) {
  return NextResponse.json(
    { error: `criativo não encontrado: ${client}/${creative}` },
    { status: 404 },
  );
}
```
(ou, no `catch`, `const code = (err as NodeJS.ErrnoException)?.code === "ENOENT" ? 404 : 500;`)

**Critério de aceite:**
- criativo inexistente → **404** com `{error}`.
- erro real (ex.: ffprobe ausente) → permanece **500**.

---

## Validação esperada (após o fix)

```bash
cd apps/video-studio
npx tsc --noEmit
npm run build
# manual (dev server):
#   /api/timeline?creative=../../etc        -> 400
#   /api/timeline?creative=inexistente-xyz  -> 404
#   /api/timeline?creative=13-realchasechappell-84d69e -> 200
```

Opcional (recomendado): adicionar 1–2 testes de route cobrindo 400 (traversal) e 404 (inexistente), se houver harness de route handler.

---

## Fora de escopo deste fix (rastreado, não pedir agora)
- Interação ao vivo do NLE (trim/playhead/slider) → **validação do dono no browser** (`npm run dev` + `/studio`).
- Render FULL com FX → MVC-11.
- CodeRabbit pré-commit → @devops antes do push.

**Após aplicar:** devolver para @qa re-verificar os ACs dos 2 fixes, ou seguir direto ao @devops se o dono priorizar o push.
