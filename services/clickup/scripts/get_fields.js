const { client } = require('../index');
const fs = require('fs');

async function getFieldDefinitions(listId) {
    try {
        const res = await client.get(`/list/${listId}/field`);
        return res.data.fields;
    } catch (e) {
        console.error(e.message);
        return [];
    }
}

async function run() {
    const listId = '901324798951'; // Projetos Internos
    const fields = await getFieldDefinitions(listId);
    fs.writeFileSync('./services/clickup/scripts/fields.json', JSON.stringify(fields, null, 2), 'utf8');
    console.log("Fields written to services/clickup/scripts/fields.json");
}

run();
