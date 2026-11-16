// Gate de pós-gravação (E1): revalida a congruência entre o PLANO e o que foi
// GRAVADO, e propõe um roteiro readequado. Gera revalidation.md no criativo.
// Uso: node scripts/revalidate.ts [client] [creative] [--apply]
import fs from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { fileURLToPath } from "node:url";
import { ingestCreative, creativeDirFor } from "../src/lib/ingest.ts";
import {
  loadTranscript,
  loadRoteiroScript,
  tokenizeScript,
  correctTranscript,
} from "../src/lib/transcript.ts";
import { revalidate, applyRoteiroToPlano } from "../src/lib/revalidate.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, "../../..");
const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const apply = process.argv.includes("--apply");
const client = args[0] || "tiago-elesbao";
const creative = args[1] || "13-realchasechappell-84d69e";

const dir = creativeDirFor(REPO, client, creative);
const timeline = ingestCreative(REPO, client, creative);
const transcript = loadTranscript(dir);
if (!transcript) {
  console.error(`[revalidate] sem transcript.json em ${dir} — rode transcribe.py primeiro.`);
  process.exit(1);
}

// Roteiro de referência (Plano > brief).
let roteiro = loadRoteiroScript(dir);
if (!roteiro) {
  const briefPath = path.join(REPO, "squads/virals-marketing-squad/data", `video-brief-${creative}.yaml`);
  if (fs.existsSync(briefPath)) {
    const brief = (parseYaml(fs.readFileSync(briefPath, "utf-8")) as Record<string, any>) || {};
    roteiro = brief.content_plan?.script || "";
  }
}

const corrected = correctTranscript(transcript, tokenizeScript(roteiro));
const rev = revalidate(corrected, timeline, roteiro);

console.log(`\n== REVALIDAÇÃO PÓS-GRAVAÇÃO — ${client}/${creative} ==`);
console.log(`Congruência plano↔gravação: ${rev.congruencePct}% ${rev.diverged ? "⚠ DIVERGE" : "✓ OK"}`);
if (rev.inPlanNotSpoken.length)
  console.log(`No plano mas NÃO falado: ${rev.inPlanNotSpoken.slice(0, 12).join(", ")}`);
if (rev.spokenNotInPlan.length)
  console.log(`Falado mas NÃO no plano: ${rev.spokenNotInPlan.slice(0, 12).join(", ")}`);

const report =
  `# Revalidação pós-gravação — ${client}/${creative}\n\n` +
  `> Gerado por \`revalidate.ts\` (E1). Compara o Plano com o que foi efetivamente gravado.\n\n` +
  `**Congruência:** ${rev.congruencePct}% ${rev.diverged ? "⚠ DIVERGE — readequação sugerida" : "✓ OK"}\n\n` +
  `## Roteiro readequado (proposto — fala real)\n\n${rev.spokenScript}\n\n` +
  `## Roteiro atual do plano\n\n${rev.currentRoteiro || "(vazio)"}\n\n` +
  `## Análise\n\n` +
  `- **No plano mas não falado:** ${rev.inPlanNotSpoken.join(", ") || "—"}\n` +
  `- **Falado mas não no plano:** ${rev.spokenNotInPlan.join(", ") || "—"}\n`;

const reportPath = path.join(dir, "revalidation.md");
fs.writeFileSync(reportPath, report, "utf-8");
console.log(`\n[revalidate] relatório → ${path.relative(REPO, reportPath)}`);

if (apply) {
  const planoPath = path.join(dir, "Plano-de-Criativo.md");
  if (fs.existsSync(planoPath)) {
    const md = fs.readFileSync(planoPath, "utf-8");
    const updated = applyRoteiroToPlano(md, rev.spokenScript);
    if (updated) {
      fs.writeFileSync(planoPath, updated, "utf-8");
      console.log(`[revalidate] ✓ roteiro readequado aplicado ao Plano-de-Criativo.md`);
    } else {
      console.error(`[revalidate] seção "## 📝 Roteiro" não encontrada no Plano.`);
    }
  }
}
