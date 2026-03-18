const { tasks } = require('../index');
const { drive } = require('../services/google-drive/client');
const fs = require('fs');

async function findFolder(name) {
    const res = await drive.files.list({
        q: `name = '${name}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
        fields: 'files(id, name)',
    });
    return res.data.files[0];
}

async function run() {
    const taskId = '86ag692nm';
    const CF_BRIEFING_ID = 'e76db335-41b1-4c05-bc84-cacf67dc46d9';
    const CF_PRODUTOS_ID = '500c9145-016e-43b6-bc5d-b5449c846b62';

    try {
        console.log("Fetching task...");
        const task = await tasks.getTask(taskId);
        
        console.log("Searching for folder...");
        const folder = await findFolder('Oraclum');

        const result = {
            taskName: task.name,
            briefing: task.custom_fields.find(cf => cf.id === CF_BRIEFING_ID)?.value,
            produtos: task.custom_fields.find(cf => cf.id === CF_PRODUTOS_ID)?.value,
            folder: folder
        };

        fs.writeFileSync('scripts/extracted_results.json', JSON.stringify(result, null, 2));
        console.log("Done. Results in scripts/extracted_results.json");

    } catch (e) {
        console.error("FATAL ERROR:", e.message);
        if (e.response) console.error(JSON.stringify(e.response.data, null, 2));
    }
}

run();
