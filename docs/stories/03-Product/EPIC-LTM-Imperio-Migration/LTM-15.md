# LTM-15: As duas seções que faltam no catálogo

**Status:** Draft
**Epic:** EPIC-LTM-Imperio-Migration (Frente B — Paridade)
**Prioridade:** **P2** — não bloqueia o sorteio teste, mas é prova social que o cliente usa para vender
**Complexidade:** S — os dados já existem; falta a tela
**Criada por:** @aiox-master · 2026-11-17
**Evidência:** `docs/research/2026-11-17-paridade-visual-loja.md` § *"O catálogo tem TRÊS seções"*

## Story

**Como** comprador chegando pela primeira vez
**Eu quero** ver que a casa já sorteou e já pagou gente de verdade
**Para que** eu compre com confiança em vez de desconfiar de um catálogo que só mostra o que está à venda.

## Contexto

O catálogo da Sorteamos tem **três** blocos empilhados. Hoje o lotemania tem **um**: a consulta
em `src/app/loja/[tenant]/page.tsx` filtra `status = 'active'` e descarta o resto.

| Seção | Badge | Nosso estado |
|---|---|---|
| Campanhas ativas | verde `Adquira Já!` | ✅ existe (`LTM-10`/catálogo) |
| **Campanhas concluídas** | cinza `Concluído` | ❌ filtradas fora |
| **🎉 Ganhadores sortudos** | — | ❌ não existe |

**As concluídas** são os sorteios do dia que já fecharam e aguardam definição de ganhador. Usam a
mesma linha com miniatura 90×110, trocando o badge verde por um cinza. Uma das observadas exibia
`RESULTADO NOS NOSSOS GRUPOS!!!` — é o `statusText` do próprio sorteio, não um rótulo fixo.

**Ganhadores** é um cartão por ganhador:

```
Marcus ***                               ← nome mascarado
🏆 01° RAPIDINHA VALENDO R$ 27.000,00!
Prêmio: R$ 27.000,00
Número da sorte: 58
Data da premiação: 11/10/2026
Telefone: (98) ****-****                 ← telefone mascarado
```

**A matéria-prima já existe.** `winners` tem `winnerName`, `phone`, `prizeDescription`,
`prizeAmount`, `winningNumber` e `announcedAt` — exatamente os seis campos do cartão. Nenhuma
coluna nova.

> **O mascaramento é da Sorteamos, não da nossa captura.** A página pública dela já mostra o nome
> truncado e o telefone parcial. É decisão de produto que vale copiar: prova social não precisa de
> telefone inteiro.

## Tarefas (Checklist)

- [ ] Consulta do catálogo passa a trazer também os sorteios concluídos, em bloco próprio.
- [ ] Badge cinza `Concluído`, com o `statusText` do sorteio quando houver.
- [ ] Seção `🎉 Ganhadores sortudos` com um cartão por linha de `winners`.
- [ ] Mascaramento de nome e telefone.
- [ ] Placeholder de foto quando o ganhador não tiver imagem — é o que a Sorteamos faz.
- [ ] `[CONFIRMAR]` quantos ganhadores a Sorteamos lista e por quanto tempo. Não observado.

## Critérios de Aceite

- [ ] **AC1 (três seções, nesta ordem):** ativas, concluídas, ganhadores. Catálogo sem concluídas
      ou sem ganhadores **omite a seção**, não mostra bloco vazio com título.
- [ ] **AC2 (concluída não é comprável):** o cartão de sorteio concluído leva à página dele, mas
      ela **não** oferece seleção de número. Regressão: sorteio ativo continua comprável.
- [ ] **AC3 (mascaramento, e no HTML):** nome sai `Primeiro ***` e telefone `(DD) ****-****`, e o
      **valor completo não aparece no HTML servido** — nem em atributo, nem em JSON de hidratação.
      O teste varre o HTML, não a tela. Mascarar na exibição e mandar o valor inteiro no payload é
      vazamento com aparência de proteção.
- [ ] **AC4 (sem ganhador, sem seção):** tenant que nunca sorteou não vê a seção — e **não** vê
      exemplo, placeholder nem "em breve".
- [ ] **AC5 (ordem dos ganhadores):** do mais recente para o mais antigo, por `announcedAt`.

## Escopo

**IN:** as duas seções, o badge cinza, o mascaramento, a ordenação.
**OUT:** cadastrar ganhador pelo painel (é fluxo do operador, outra story); foto do ganhador como
upload; paginação ou "ver todos".

## Dependências

- **Independe da fundação.** É leitura, e os dados já existem.
- Reusa o cartão de linha do catálogo.

## Riscos

- **[Alto] Vazar telefone de ganhador.** A página é pública e indexável. AC3 é o mínimo, e a
  política de dado pessoal de 2026-11-12 vale integralmente.
- **[Baixo] Catálogo longo demais** se houver muitos concluídos no dia. O `[CONFIRMAR]` de quantos
  listar existe por isso.

## Change Log

| Data | Versão | Descrição | Autor |
|---|---|---|---|
| 2026-11-17 | 1.0 | Pendência registrada a pedido do founder, para a fundação voltar a ser a prioridade. | @aiox-master |
