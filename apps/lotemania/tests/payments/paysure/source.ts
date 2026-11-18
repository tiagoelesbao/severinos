// Leitura de FONTE para as verificações por inspeção (LTM-03b).
//
// ════════════════════════════════════════════════════════════════════════
// POR QUE OS COMENTÁRIOS SÃO REMOVIDOS ANTES DE PROCURAR
//
// Vários ACs desta story se verificam por leitura do código: "não existe
// `if (status >= 500) retry`" (AC10), "o literal 900 não aparece" (AC7), "o
// número de minutos é declarado em um lugar" (AC14).
//
// Esta base documenta MUITO dentro do código, e documentar bem significa
// escrever a forma ERRADA para dizer que ela é errada — o comentário de
// `classify` diz, literalmente, *"NÃO EXISTE `if (status >= 500) retry`
// NESTE ARQUIVO"*. Uma varredura ingênua encontra essa frase e reprova o
// arquivo por conter exatamente o que ele promete não conter.
//
// Medido ao escrever estes testes: 6 das 12 primeiras falhas eram isto, em
// quatro arquivos distintos. A alternativa — reescrever os comentários para
// não citar a forma proibida — tornaria a documentação pior para fazer o
// teste passar, que é a troca errada.
//
// Então a regra é: asserção sobre CÓDIGO lê `codigoDe()`; asserção sobre o
// que o arquivo EXPLICA lê o texto bruto, com `fonteDe()`.
// ════════════════════════════════════════════════════════════════════════

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));

/** A raiz de `src`, resolvida a partir deste arquivo. */
export const SRC = path.resolve(dirname, "../../../src");

/** O arquivo como ele é — comentários inclusive. */
export async function fonteDe(relativo: string): Promise<string> {
  return readFile(path.join(SRC, relativo), "utf8");
}

/**
 * O arquivo SEM comentários e SEM literais de string.
 *
 * Literais saem junto porque mensagem de erro também cita a forma errada
 * (*"um tratamento genérico de 5xx o colocaria em laço eterno"*), e porque
 * nenhum dos ACs que varrem código pergunta sobre texto de mensagem.
 *
 * Isto não é um analisador sintático e não tenta ser: é remoção de
 * comentário e de literal por expressão regular, suficiente para as
 * perguntas que os ACs fazem, e deliberadamente simples o bastante para
 * quem ler o teste conferir o que ela faz.
 */
export async function codigoDe(relativo: string): Promise<string> {
  const bruto = await fonteDe(relativo);
  return (
    bruto
      // blocos /* ... */ e /** ... */
      .replace(/\/\*[\s\S]*?\*\//g, " ")
      // linhas // ...
      .replace(/(^|[^:"'`\\])\/\/[^\n]*/g, "$1")
      // template literals, strings simples e duplas
      .replace(/`(?:[^`\\]|\\.)*`/g, '""')
      .replace(/"(?:[^"\\]|\\.)*"/g, '""')
      .replace(/'(?:[^'\\]|\\.)*'/g, '""')
  );
}
