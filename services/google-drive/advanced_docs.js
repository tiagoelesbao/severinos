/**
 * Advanced Google Docs Service v2.3 — Safe Native Tables
 * 3-pass: text+markers → replace markers with tables → read cells + fill
 */
const { drive, docs, ensureAuthenticated } = require('./client');

async function createAdvancedDoc(title, sections, folderId) {
    await ensureAuthenticated();

    const createRes = await drive.files.create({
        requestBody: { name: title, mimeType: 'application/vnd.google-apps.document', parents: folderId ? [folderId] : [] }
    });
    const fileId = createRes.data.id;

    // === PASS 1: Insert all text with {{TABLE:N}} markers ===
    const tableRegistry = [];
    const reqs = [];
    let idx = 1;

    const pushText = (text) => { reqs.push({ insertText: { location: { index: idx }, text } }); idx += text.length; };
    const pushStyled = (text, style, align) => {
        reqs.push({ insertText: { location: { index: idx }, text } });
        const ps = { namedStyleType: style };
        let fields = 'namedStyleType';
        if (align) { ps.alignment = align; fields += ',alignment'; }
        reqs.push({ updateParagraphStyle: { range: { startIndex: idx, endIndex: idx + text.length }, paragraphStyle: ps, fields } });
        idx += text.length;
    };

    pushStyled(title + '\n', 'TITLE', 'CENTER');
    pushText(`Gerado: ${new Date().toLocaleDateString('pt-BR')} | Project Intelligence v2.0\n\n`);

    for (const section of sections) {
        if (section.header?.trim()) pushStyled(section.header + '\n', 'HEADING_1');
        if (section.subsections) {
            for (const ss of section.subsections) {
                pushStyled(ss.header + '\n', 'HEADING_2');
                if (ss.content) pushText(ss.content + '\n\n');
            }
        }
        if (section.content) pushText(section.content + '\n\n');
        if (section.table) {
            pushText(`{{TABLE:${tableRegistry.length}}}\n`);
            tableRegistry.push(section.table);
        }
        pushText('\n');
    }
    pushText('\nGerado pelo Virals Project Intelligence System v2.0\n');

    try {
        await docs.documents.batchUpdate({ documentId: fileId, requestBody: { requests: reqs } });
        console.log(`  [DOCS] Pass 1 done: ${reqs.length} text requests`);
    } catch (e) {
        console.error(`  [DOCS] Pass 1 FAILED at request count ${reqs.length}:`, e.message);
        throw e;
    }

    // === PASS 2: Replace markers with native tables ===
    if (tableRegistry.length > 0) {
        const doc1 = await docs.documents.get({ documentId: fileId });
        const markers = findMarkers(doc1.data.body.content);
        markers.sort((a, b) => b.startIndex - a.startIndex);

        if (markers.length > 0) {
            const tableReqs = [];
            for (const m of markers) {
                const td = tableRegistry[m.tableIndex];
                if (!td) continue;
                const R = td.rows.length + 1;
                const C = td.headers.length;
                tableReqs.push({ deleteContentRange: { range: { startIndex: m.startIndex, endIndex: m.endIndex } } });
                tableReqs.push({ insertTable: { rows: R, columns: C, location: { index: m.startIndex } } });
            }
            await docs.documents.batchUpdate({ documentId: fileId, requestBody: { requests: tableReqs } });
            console.log(`  [DOCS] Pass 2 done: ${markers.length} tables inserted`);

            // === PASS 3: Read real cell indices and fill ===
            const doc2 = await docs.documents.get({ documentId: fileId });
            const tables = findTableCells(doc2.data.body.content);

            // Collect ALL cell insertions with their target index
            const allInsertions = [];
            for (let ti = 0; ti < tables.length && ti < tableRegistry.length; ti++) {
                const td = tableRegistry[ti];
                const allRows = [td.headers, ...td.rows];
                const cellIndices = tables[ti];

                for (let i = 0; i < cellIndices.length; i++) {
                    const r = Math.floor(i / td.headers.length);
                    const c = i % td.headers.length;
                    const rawText = allRows[r]?.[c] || '';
                    const text = rawText.replace(/\n/g, ' ').trim();
                    if (text) {
                        allInsertions.push({ index: cellIndices[i], text });
                    }
                }
            }

            // Sort by DESCENDING index — critical to prevent index corruption
            allInsertions.sort((a, b) => b.index - a.index);

            const fillReqs = allInsertions.map(ins => ({
                insertText: { location: { index: ins.index }, text: ins.text }
            }));

            if (fillReqs.length > 0) {
                await docs.documents.batchUpdate({ documentId: fileId, requestBody: { requests: fillReqs } });
                console.log(`  [DOCS] Pass 3 done: ${fillReqs.length} cells filled`);
            }
        }
    }

    return { id: fileId, url: `https://docs.google.com/document/d/${fileId}/edit` };
}

function findMarkers(content) {
    const results = [];
    for (const el of content) {
        if (!el.paragraph) continue;
        for (const te of el.paragraph.elements) {
            if (te.textRun) {
                const m = te.textRun.content.match(/\{\{TABLE:(\d+)\}\}/);
                if (m) results.push({ tableIndex: parseInt(m[1]), startIndex: el.startIndex, endIndex: el.endIndex });
            }
        }
    }
    return results;
}

function findTableCells(content) {
    const tables = [];
    for (const el of content) {
        if (!el.table) continue;
        const cells = [];
        for (const row of el.table.tableRows) {
            for (const cell of row.tableCells) {
                const para = cell.content?.[0]?.paragraph;
                if (para?.elements?.[0]) {
                    cells.push(para.elements[0].startIndex);
                }
            }
        }
        tables.push(cells);
    }
    return tables;
}

async function shareDoc(fileId, email, role = 'writer') {
    await drive.permissions.create({
        fileId, requestBody: { role, type: 'user', emailAddress: email }, sendNotificationEmail: true
    });
}

module.exports = { createAdvancedDoc, shareDoc };
