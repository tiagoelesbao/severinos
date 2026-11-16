// Rota placeholder. page.tsx e utm-link-form.tsx tem 0 bytes desde 2026-10-24.
// O que sobreviveu: a tabela utm_links, as actions createUtmLink/deleteUtmLink/
// registerUtmClick e utm-link-row.tsx, que pede { id, name, clicks, fullUrl }.
// Duas pecas faltam e nenhuma das duas pode ser deduzida: (1) `clicks` e
// `fullUrl` nao sao colunas — a contagem e a URL montada a partir de
// destinationPath + os parametros utm + a base do tenant, e essa convencao nao
// esta declarada em nenhum lugar; (2) o formulario de criacao foi perdido
// inteiro. Listar sem poder criar seria meia tela. Titulo conforme
// src/lib/nav-config.ts.
import { EmptyState } from "@/components/ui/empty-state";

export default function UtmLinksPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Links UTM</h1>
      </div>

      <div className="rounded-md bg-amber-500/10 p-3 text-sm text-amber-400">
        Esta tela ainda não foi construída. A tabela e as ações de criar, remover
        e contar cliques já existem; falta a montagem da URL completa e o
        formulário de criação.
      </div>

      <div className="rounded-lg border bg-card">
        <EmptyState label="Tela não construída" />
      </div>
    </div>
  );
}
