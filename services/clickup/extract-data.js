const client = require('./client');
const fs = require('fs');

async function getTeams() {
    const response = await client.get('/team');
    return response.data;
}

async function getSpaces(teamId) {
    const response = await client.get(`/team/${teamId}/space`);
    return response.data;
}

async function getFolders(spaceId) {
    const response = await client.get(`/space/${spaceId}/folder`);
    return response.data;
}

async function getListsInFolder(folderId) {
    const response = await client.get(`/folder/${folderId}/list`);
    return response.data;
}

async function getListsInSpace(spaceId) {
    const response = await client.get(`/space/${spaceId}/list`);
    return response.data;
}

// ---- New Advanced Extraction Methods ----

async function getCustomFields(listId) {
    try {
        const response = await client.get(`/list/${listId}/field`);
        return response.data.fields || [];
    } catch (e) {
        return [];
    }
}

async function getViewsForList(listId) {
    try {
        const response = await client.get(`/list/${listId}/view`);
        return response.data.views || [];
    } catch (e) {
        return [];
    }
}

async function getViewsForSpace(spaceId) {
    try {
        const response = await client.get(`/space/${spaceId}/view`);
        return response.data.views || [];
    } catch (e) {
        return [];
    }
}

async function getCustomTaskTypes(teamId) {
    try {
        // Feature might be restricted based on ClickUp plan, wrapped in try/catch safely
        const response = await client.get(`/team/${teamId}/custom_item`);
        return response.data.custom_items || [];
    } catch (e) {
        console.log(`Failed to fetch custom task types. It might require an Enterprise ClickUp plan or a different endpoint structure.`);
        return [];
    }
}


async function extractHierarchy() {
    console.log('--- Starting Advanced ClickUp Extraction ---');
    try {
        const { teams } = await getTeams();
        if (!teams || teams.length === 0) return;

        let team = teams.find(t => t.name.toLowerCase().includes('oraclum'));
        if (!team) {
            console.log('Workspace "oraclum" não encontrado.');
            return;
        }
        
        console.log(`Working on Team: ${team.name} (ID: ${team.id})`);

        const advancedMetadata = {
            hierarchy: {},
            customTaskTypes: [],
            globalFieldsFound: new Set()
        };

        // Fetch Workspace level Custom Task Types
        console.log('Fetching Workspace Custom Task Types...');
        advancedMetadata.customTaskTypes = await getCustomTaskTypes(team.id);

        const { spaces } = await getSpaces(team.id);
        
        for (const space of spaces) {
            console.log(`\nFound Space: [${space.name}] (ID: ${space.id})`);
            
            advancedMetadata.hierarchy[space.name] = { 
                id: space.id,
                views: [],
                folders: {}, 
                folderless_lists: {} 
            };

            // Fetch Space Views
            const spaceViews = await getViewsForSpace(space.id);
            advancedMetadata.hierarchy[space.name].views = spaceViews.map(v => ({ id: v.id, name: v.name, type: v.type }));

            const { lists: spaceLists } = await getListsInSpace(space.id);
            if (spaceLists) {
                for (const list of spaceLists) {
                    console.log(`  |- List: ${list.name} (ID: ${list.id})`);
                    const customFields = await getCustomFields(list.id);
                    const views = await getViewsForList(list.id);
                    
                    advancedMetadata.hierarchy[space.name].folderless_lists[list.name] = {
                        id: list.id,
                        views: views.map(v => ({ id: v.id, name: v.name, type: v.type })),
                        customFields: customFields.map(f => ({ id: f.id, name: f.name, type: f.type }))
                    };
                }
            }

            const { folders } = await getFolders(space.id);
            if (folders) {
                for (const folder of folders) {
                    console.log(`  |- Folder: [${folder.name}] (ID: ${folder.id})`);
                    advancedMetadata.hierarchy[space.name].folders[folder.name] = { id: folder.id, lists: {} };

                    const { lists } = await getListsInFolder(folder.id);
                    if (lists) {
                        for (const list of lists) {
                            console.log(`     |- List: ${list.name} (ID: ${list.id})`);
                            const customFields = await getCustomFields(list.id);
                            const views = await getViewsForList(list.id);
                            
                            advancedMetadata.hierarchy[space.name].folders[folder.name].lists[list.name] = {
                                id: list.id,
                                views: views.map(v => ({ id: v.id, name: v.name, type: v.type })),
                                customFields: customFields.map(f => ({ id: f.id, name: f.name, type: f.type }))
                            };
                        }
                    }
                }
            }
        }

        fs.writeFileSync('clickup_advanced_metadata.json', JSON.stringify(advancedMetadata, null, 2));
        console.log('\n✅ Advanced Metadata successfully saved to clickup_advanced_metadata.json');

    } catch (e) {
        console.error('Extraction failed:', e.message);
    }
}

if (require.main === module) {
    extractHierarchy();
}

module.exports = {
    extractHierarchy
};
