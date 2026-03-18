/**
 * Automação de Análise de Briefing - Virals Projetos Squad
 * 
 * Este script automatiza o fluxo:
 * 1. Busca dados de uma task no ClickUp (Briefing/Produtos).
 * 2. Prepara o conteúdo para o Termo de Abertura.
 * 3. Cria o Doc no Google Drive na pasta Oraclum.
 * 4. Vincula a URL de volta no ClickUp.
 */

const clickup = require('../../services/clickup/index');
const { drive, docs, ensureAuthenticated } = require('../../services/google-drive/client');
const fs = require('fs');
const path = require('path');

async function automateBriefingAnalysis(taskId) {
    console.log(`[START] Analisando Task ID: ${taskId}`);

    // IDs Mapeados
    const CF_BRIEFING_ID = 'e76db335-41b1-4c05-bc84-cacf67dc46d9';
    const CF_TERMO_LINK_ID = '803878f4-1035-4ba8-bb5f-7d7ce468ecdf';
    const TARGET_FOLDER_ID = '1XIFzCCHvk3BrkEynHHhQS6UPwe4JEW7a'; // /Oraclum/Projetos/Projetos Internos/Termos de Abertura
    const USER_EMAIL = 'tn.elesbao@gmail.com';

    try {
        console.log("[INFO] Garantindo autenticação Google Drive...");
        await ensureAuthenticated();

        // 1. Buscar dados da Task no ClickUp
        const taskData = await clickup.getTask(taskId);
        console.log(`[INFO] Processando projeto: ${taskData.name}`);

        // 2. Criar Documento no Google Drive na pasta correta
        console.log(`[INFO] Criando documento na pasta Oraclum (${TARGET_FOLDER_ID})...`);
        const driveRes = await drive.files.create({
            requestBody: {
                name: `Termo de Abertura - ${taskData.name}`,
                mimeType: 'application/vnd.google-apps.document',
                parents: [TARGET_FOLDER_ID]
            }
        });
        const fileId = driveRes.data.id;

        // 3. Preencher conteúdo base (Análise estratégica 17-1-1)
        console.log("[INFO] Inserindo conteúdo da análise estratégica...");
        const analysisContent = `
# TERMO DE ABERTURA - PROJETO: ${taskData.name}

## 1. Objetivo Geral e Estratégia (Método Virals 17-1-1)
Este projeto visa implementar a estratégia de autoridade massiva para o primeiro ano, consolidando o LinkedIn como motor de prospecção e o YouTube como pilar de autoridade.

## 2. Canais e Rotinas
- **LinkedIn:** Conteúdo diário e engajamento ativo de 45 min.
- **YouTube:** Batch recording semanal para vídeos de valor.
- **Indicações:** Estruturação de CAC Negativo.

## 3. Cronograma Sugerido
- **Q1:** Setup de Canais e Backlog.
- **Q2:** Tráfego Pago e Escala.

---
*Documento gerado automaticamente pelo Virals Projetos Squad.*
`;
        await docs.documents.batchUpdate({
            documentId: fileId,
            requestBody: {
                requests: [{ insertText: { location: { index: 1 }, text: analysisContent } }]
            }
        });

        // 4. Compartilhar com o usuário
        console.log(`[INFO] Compartilhando com ${USER_EMAIL}...`);
        await drive.permissions.create({
            fileId: fileId,
            requestBody: { role: 'writer', type: 'user', emailAddress: USER_EMAIL },
            sendNotificationEmail: true
        });

        const docUrl = `https://docs.google.com/document/d/${fileId}/edit`;

        // 5. Vincular URL no ClickUp
        console.log("[INFO] Vinculando URL no ClickUp...");
        await clickup.setCustomField(taskId, CF_TERMO_LINK_ID, docUrl);

        console.log(`[SUCCESS] Processo concluído! Link: ${docUrl}`);
        return docUrl;

    } catch (error) {
        console.error(`[ERROR] Falha na automação: ${error.message}`);
        throw error;
    }
}

// Export para uso via CLI ou Agente
module.exports = { automateBriefingAnalysis };
