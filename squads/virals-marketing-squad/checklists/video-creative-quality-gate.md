# Quality Gate — Vídeo Criativo (pós-automação)

> **Quando rodar:** DEPOIS que a automação monta a timeline do vídeo a partir do
> benchmark + materiais gravados (Fase B do `video-studio`), ANTES de exportar a
> entrega final. É a etapa de auditoria do fluxo — não uma feature do editor.
>
> **Como rodar:** task [`audit-video-creative`](../tasks/audit-video-creative.md)
> executa o motor (`apps/video-studio/src/lib/audit.ts`) + a revalidação
> pós-gravação (`revalidate.ts`) e preenche este checklist com a evidência.
>
> **Veredito:** PASS (entregar) · CONCERNS (entregar com ressalvas) · FAIL
> (voltar pro ajuste antes de exportar).

## 1. Legendas (fidelidade e estilo)
- [ ] Legendas vêm da **transcrição real** das gravações (não estimadas do roteiro).
- [ ] **Todas as palavras corretas** — sem erro de reconhecimento não corrigido
      (auditoria: 0 "palavra possivelmente errada" fora do roteiro).
- [ ] Cues estáveis (1–2 linhas), **sem repetição/interrupção** entre orações.
- [ ] Ritmo de leitura confortável (≤ 20 cps; sem flag de "rápida demais").
- [ ] Sincronizadas com a fala (cue ativa bate com o áudio).

## 2. Cortes e auto-cut (congruência)
- [ ] Auto-cut **não corta no meio de palavra** nem deixa silêncio óbvio.
- [ ] Transições suaves entre takes (sem trava/repetição de frame).
- [ ] Inserts **ancorados à fala** que descrevem (sem desalinhamento).

## 3. Ordem e montagem dos clips
- [ ] Ordem canônica do arco: hook → skill → reference → generation → result → cta.
- [ ] Sem clip ausente/GAP (auditoria: 0 "material ausente").
- [ ] Velocidade dos inserts saudável — sem `playbackRate` extremo
      (< 0.5× ou > 1.8×); se houver, re-ancorar/dividir ou regravar mais material.
- [ ] Duração total adequada ao formato-alvo do benchmark.

## 4. Composição e marca
- [ ] Enquadramento sem corte de conteúdo (screen capture no aspect real).
- [ ] Paleta/tipografia on-brand (accent, fonte do `brand-config`).
- [ ] Motion graphics (lower-third, progress-bar) presentes e on-brand.
- [ ] Hook FX aplicado no 1º clip.

## 5. Integração com o template base
- [ ] Presets do `video-templates.yaml` resolvidos sem órfãos.
- [ ] `edit_spec`/`template_refs` do plano respeitados na montagem.
- [ ] Determinismo: a mesma entrada (plano + materiais) gera a mesma timeline base.

## 6. Congruência plano ↔ gravação (revalidação)
- [ ] Congruência ≥ 85% OU **plano readequado** à fala real aplicado.
- [ ] Nenhuma palavra-chave do plano ausente sem justificativa.

## Evidência (preenchida pela task)
- Score da auditoria: `__/100` · erros `_` · avisos `_` · infos `_`
- Congruência plano↔gravação: `__%`
- Achados abertos: `…`

## Veredito
- **Resultado:** PASS | CONCERNS | FAIL
- **Notas:** …
- **Próximo:** exportar (MVC-11) | voltar ao ajuste fino no `/studio`
