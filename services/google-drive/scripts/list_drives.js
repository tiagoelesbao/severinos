const { drive } = require('../services/google-drive/client');

async function listDrives() {
    console.log("Listing Shared Drives...");
    const res = await drive.drives.list();
    return res.data.drives;
}

async function run() {
    try {
        const results = await listDrives();
        console.log(JSON.stringify(results, null, 2));
    } catch (e) {
        console.error(e.message);
    }
}

run();
