/**
 * ClickUp Folders Service
 */
const client = require('./client');

async function getFolder(folderId) {
    const res = await client.get(`/folder/${folderId}`);
    return res.data;
}

async function getLists(folderId) {
    const res = await client.get(`/folder/${folderId}/list`);
    return res.data.lists;
}

module.exports = {
    getFolder,
    getLists
};
