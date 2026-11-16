#!/usr/bin/env node
/**
 * farm-publication.js — publicacao.md em lote · Virals Farming Squad
 *
 * Gera, para cada pack de benchmark, o registro fiel de como o autor PUBLICOU o
 * criativo: legenda literal, hashtags, trilha e a estrutura observada.
 *
 * POR QUE É UM SCRIPT SEPARADO DA F3: o documento não depende de visão, de cota nem
 * de rede — tudo que ele precisa já está no `benchmark.json` capturado na F2. Amarrá-lo
 * à F3 obrigaria a rodar a modelagem inteira (uma chamada de visão por frame, por
 * criativo) só para extrair uma legenda que já está em disco. Rodar isto sobre 240
 * packs leva segundos; a F3 sobre os mesmos 240 levaria horas e queimaria cota.
 *
 * IDEMPOTENTE: reescreve o documento a partir da fonte. Rodar duas vezes não duplica
 * nada. `--skip-existing` preserva arquivos já editados à mão (o bloco "Publicação
 * modelada" é feito para ser preenchido pelo dono — sobrescrever apagaria o trabalho).
 *
 * Uso:
 *   node squads/virals-farming-squad/scripts/farm-publication.js --niche=religioso --session={id}
 *   node ... --session={id} --origin=perfil
 *   node ... --session={id} --skip-existing
 *
 * Flags:
 *   --niche=ID        nicho (obrigatório, salvo com --session)
 *   --session=ID      sessão; default: a mais recente do nicho na data
 *   --origin=X        recorta pela pasta sob benchmark/ (perfil, teste...)
 *   --ranks=1,3       packs específicos
 *   --top=N           quantos packs processar
 *   --skip-existing   não sobrescreve publicacao.md já existente
 *   --date=YYYY-MM-DD data da sessão (default: hoje)
 */

const fs = require('fs');
const path = require('path');

const L = require('./_niche-loader.js');
const P = require('./_pack.js');
const Pub = require('./_publication.js');

function buildIndex(rows, session, niche) {
    const comLegenda = rows.filter((r) => r.legenda).length;
    const comTags = rows.filter((r) => r.hashtags.length > 0).length;
    const semNada = rows.filter((r) => !r.legenda && r.hashtags.length === 0).length;

    let md = `# Publicações originais · ${niche.icon} ${niche.label}\n\n`;
    md += `**Sessão:** \`${session.id}\`  ·  **Criativos:** ${rows.length}  ·  `;
    md += `**Com legenda:** ${comLegenda}  ·  **Com hashtags:** ${comTags}  ·  **Sem nenhum dos dois:** ${semNada}\n\n`;
    md += `Índice do que cada autor escreveu ao publicar. O documento completo de cada criativo\n`;
    md += `fica em \`{pack}/publicacao.md\`. Legenda vazia aqui significa que o autor publicou sem\n`;
    md += `legenda — não que a captura falhou; a distinção está na coluna.\n\n---\n\n`;

    md += `| Rank | Perfil | Legenda (início) | Tags | Trilha | Pack |\n`;
    md += `| ---: | :--- | :--- | ---: | :--- | :--- |\n`;
    for (const r of rows) {
        const leg = r.legenda
            ? r.legenda.replace(/\s+/g, ' ').replace(/\|/g, '/').slice(0, 70)
            : '_sem legenda_';
        const track = (r.track || '—').replace(/\|/g, '/').slice(0, 26);
        md += `| ${r.rank} | @${r.handle} | ${leg} | ${r.hashtags.length} | ${track} | [abrir](${r.rel}) |\n`;
    }

    // Frequência de hashtag DENTRO desta sessão de benchmark — recorte diferente do
    // hashtags-{data}.md da F1-P, que cobre o acervo inteiro dos perfis. Aqui é só o
    // que os criativos selecionados usaram, que é a referência direta de modelagem.
    // Agrupa por minúsculas, exibe a grafia mais usada. O documento de cada criativo
    // preserva o case EXATO que o autor escreveu (`#GratidãoAoSenhor`) porque ali a
    // regra é fidelidade; aqui a pergunta é frequência, e contar `#Deus` separado de
    // `#deus` responde errado — o TikTok trata as duas como a mesma hashtag.
    const grupos = {};
    for (const r of rows) {
        for (const t of r.hashtags) {
            const key = t.toLowerCase();
            const g = (grupos[key] = grupos[key] || { total: 0, grafias: {} });
            g.total += 1;
            g.grafias[t] = (g.grafias[t] || 0) + 1;
        }
    }
    const ranked = Object.values(grupos)
        .map((g) => {
            const grafias = Object.entries(g.grafias).sort((a, b) => b[1] - a[1]);
            return [grafias[0][0], g.total, grafias.length > 1 ? grafias.map(([k]) => k) : null];
        })
        .sort((a, b) => b[1] - a[1]);

    md += `\n---\n\n## Hashtags usadas pelos criativos deste benchmark (${ranked.length})\n\n`;
    if (ranked.length === 0) {
        md += `_Nenhuma._\n`;
    } else {
        md += ranked.map(([t, n]) => `\`#${t}\`(${n})`).join(' · ') + '\n\n';
        const variantes = ranked.filter((r) => r[2]);
        if (variantes.length) {
            md += `**Grafias variadas** (contadas juntas, como o TikTok faz): `;
            md += variantes.map(([t, , todas]) => `${todas.map((x) => '`#' + x + '`').join(' = ')}`).join(' · ') + '\n\n';
        }
        md += `> Recorte diferente do \`hashtags-{data}.md\` da sessão: aquele cobre o acervo inteiro\n`;
        md += `> dos perfis auditados; este, só os criativos que passaram para benchmark.\n`;
    }

    return md;
}

(async () => {
    const args = L.parseArgs(process.argv);
    if (!args.niche && !args.session) {
        console.error('❌ Informe --niche=ID (ou --session=ID).');
        process.exitCode = 1;
        return;
    }

    const session = P.resolveSession({ niche: args.niche, session: args.session, date: args.date });
    const niche = L.loadNiche(args.niche || session.manifest.niche);

    let packs = P.listPacks(session, { origin: args.origin });
    if (args.ranks) {
        const wanted = String(args.ranks).split(',').map((n) => parseInt(n, 10));
        packs = packs.filter((p) => wanted.includes(p.rank));
    } else if (args.top) {
        packs = packs.slice(0, parseInt(args.top, 10) || packs.length);
    }

    if (packs.length === 0) {
        console.error(`❌ Nenhum pack encontrado em ${path.relative(L.REPO_ROOT, path.join(session.dir, 'benchmark'))}.`);
        process.exitCode = 1;
        return;
    }

    console.log(`\n=== Publicações originais · ${niche.icon} ${niche.label} ===`);
    console.log(`Sessão:  ${session.id}`);
    console.log(`Packs:   ${packs.length}${args.origin ? ` (origin=${args.origin})` : ''}`);
    console.log(`Modo:    ${args['skip-existing'] ? 'preserva existentes' : 'reescreve a partir da fonte'}\n`);

    const rows = [];
    let escritos = 0;
    let preservados = 0;
    let semDados = 0;

    for (const pack of packs) {
        const paths = P.packPaths(pack.dir);
        const b = pack.benchmark || {};
        const s = Pub.summarize(b);

        rows.push({
            rank: pack.rank,
            handle: pack.handle,
            legenda: s.legenda,
            hashtags: s.hashtags,
            track: s.track,
            rel: path.relative(session.dir, paths.publication).replace(/\\/g, '/'),
        });

        if (!s.legenda && s.hashtags.length === 0) semDados++;

        if (args['skip-existing'] && fs.existsSync(paths.publication)) {
            preservados++;
            continue;
        }

        fs.writeFileSync(paths.publication, Pub.buildPublicationDoc({
            handle: pack.handle, rank: pack.rank, url: pack.url, benchmark: b, niche,
        }));
        escritos++;
    }

    const indexPath = path.join(session.dir, 'publicacoes-index.md');
    fs.writeFileSync(indexPath, buildIndex(rows, session, niche));

    const comLegenda = rows.filter((r) => r.legenda).length;
    const comTags = rows.filter((r) => r.hashtags.length > 0).length;

    console.log(`✅ publicacao.md escrito em ${escritos} pack(s)${preservados ? ` · ${preservados} preservado(s)` : ''}`);
    console.log(`   com legenda: ${comLegenda}/${rows.length}  ·  com hashtags: ${comTags}/${rows.length}`);
    if (semDados > 0) {
        console.log(`\n⚠️  ${semDados} criativo(s) sem legenda E sem hashtag no benchmark.json.`);
        console.log(`   O documento é gerado do mesmo jeito, declarando a ausência — publicar sem`);
        console.log(`   legenda é uma escolha do autor, e apagar o registro dela esconderia o dado.`);
    }
    console.log(`\n✅ Índice: ${path.relative(L.REPO_ROOT, indexPath).replace(/\\/g, '/')}\n`);
})().catch((e) => {
    console.error(`❌ Falha crítica: ${e.message}`);
    console.error(e.stack);
    process.exitCode = 1;
});
