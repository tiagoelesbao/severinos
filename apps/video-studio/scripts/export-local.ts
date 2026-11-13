import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, "../../..");

const client = process.argv[2];
const creative = process.argv[3];

if (!client || !creative) {
  console.error("Uso: node --experimental-strip-types scripts/export-local.ts <client> <creative>");
  process.exit(1);
}

const creativeDir = path.join(REPO, "outputs", client, "video-plans", creative);
const savedFile = path.join(creativeDir, "studio-edit.json");

if (!fs.existsSync(savedFile)) {
  console.error(`ERRO: studio-edit.json não encontrado em ${creativeDir}. Salve o projeto no Studio UI (botão Salvar) primeiro.`);
  process.exit(1);
}

const saved = JSON.parse(fs.readFileSync(savedFile, "utf-8"));
const jobId = `local-${Date.now()}`;
const exportsDir = path.join(creativeDir, "exports");
fs.mkdirSync(exportsDir, { recursive: true });

const job = {
  jobId,
  client,
  creative,
  timeline: saved.timeline,
  fxPlan: saved.fxPlan
};

const jobFile = path.join(exportsDir, `render-job-${jobId}.json`);
fs.writeFileSync(jobFile, JSON.stringify(job, null, 2), "utf-8");

console.log(`[export-local] Lendo studio-edit.json (edições da UI)...`);
console.log(`[export-local] Disparando render-export.ts para ${client}/${creative}...`);

try {
  execFileSync(process.execPath, [
    "--experimental-strip-types",
    path.join(__dirname, "render-export.ts"),
    jobFile
  ], { stdio: "inherit" });
} catch (e) {
  console.error("\n[export-local] Render finalizado ou interrompido com erro.");
}
