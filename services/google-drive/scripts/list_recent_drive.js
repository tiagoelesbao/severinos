const { drive } = require('../services/google-drive/client');

async function listRecent() {
    console.log("Listing 10 recent files...");
    const res = await drive.files.list({
        pageSize: 10,
        fields: 'files(id, name, mimeType)',
        orderBy: 'modifiedTime desc'
    });
    return res.data.files;
}

async function run() {
    try {
        const results = await listRecent();
        console.log(JSON.stringify(results, null, 2));
    } catch (e) {
        console.error(e.message);
    }
}

run();
