const client = require('./client');
const { getListId } = require('./mapping');

async function createTask(listId, name, description, status = 'to do', customFields = []) {
    try {
        const payload = {
            name: name,
            description: description,
            status: status
        };
        if (customFields.length > 0) {
            payload.custom_fields = customFields;
        }

        const response = await client.post(`/list/${listId}/task`, payload);
        return response.data;
    } catch (error) {
        console.error('Error creating task:', error.response?.data || error.message);
        throw error;
    }
}

async function updateTask(taskId, updateData) {
    try {
        const response = await client.put(`/task/${taskId}`, updateData);
        return response.data;
    } catch (error) {
        console.error('Error updating task:', error.response?.data || error.message);
        throw error;
    }
}

async function setCustomField(taskId, fieldId, value) {
    try {
        // Value must be string for text fields, or appropriate for the field type
        const payload = { value: value };
        const response = await client.post(`/task/${taskId}/field/${fieldId}`, payload);
        return response.data;
    } catch (error) {
        console.error(`Error setting custom field ${fieldId} on task ${taskId}:`, error.response?.data || error.message);
        throw error;
    }
}

async function getTask(taskId) {
    try {
        const response = await client.get(`/task/${taskId}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching task:', error.response?.data || error.message);
        throw error;
    }
}

async function getTasks(listId) {
    try {
        const response = await client.get(`/list/${listId}/task`);
        return response.data;
    } catch (error) {
        console.error('Error fetching tasks:', error.response?.data || error.message);
        throw error;
    }
}

// CLI Execution Handler
if (require.main === module) {
    const args = process.argv.slice(2);
    const command = args[0];

    // Simple arg parser
    const params = {};
    for (let i = 1; i < args.length; i++) {
        if (args[i].startsWith('--')) {
            const key = args[i].substring(2);
            const value = args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true;
            params[key] = value;
            if (value !== true) i++;
        }
    }

    (async () => {
        try {
            if (command === 'create') {
                if (!params.department || !params.area || !params.process || !params.name) {
                    console.error('Usage: node tasks.js create --department "Marketing" --area "Traffic Performance" --process "Gestão de Campanhas" --name "Task Name" [--description "Desc"] [--custom \'[{"id":"uuid", "value":"value"}]\']');
                    process.exit(1);
                }
                const listId = getListId(params.department, params.area, params.process);
                
                let customFieldsParsed = [];
                if (params.custom) {
                    try { customFieldsParsed = JSON.parse(params.custom); } 
                    catch(e) { console.error('Error parsing --custom JSON', e); }
                }

                console.log(`Creating task "${params.name}" in List ${listId}...`);
                const task = await createTask(listId, params.name, params.description || '', 'to do', customFieldsParsed);
                console.log(`SUCCESS: ${task.id}`);
            
            } else if (command === 'update') {
               if (!params.taskId) {
                    console.error('Usage: node tasks.js update --taskId "abcde" [--status "done"] [--name "New Name"] [--custom \'[{"id":"uuid", "value":"value"}]\']');
                    process.exit(1);
               }
               
               const updateData = {};
               if (params.status) updateData.status = params.status;
               if (params.name) updateData.name = params.name;
               if (params.custom) {
                   try { updateData.custom_fields = JSON.parse(params.custom); }
                   catch(e) { console.error('Error parsing --custom JSON', e); }
               }

               const task = await updateTask(params.taskId, updateData);
               console.log(`SUCCESS: ${task.id}`);
            
            } else if (command === 'get') {
                if (!params.taskId) {
                    console.error('Usage: node tasks.js get --taskId "abcde"');
                    process.exit(1);
                }
                const task = await getTask(params.taskId);
                console.log(JSON.stringify(task, null, 2));

            } else if (command === 'list') {
                if (!params.department || !params.area || !params.process) {
                    console.error('Usage: node tasks.js list --department "Marketing" --area "Traffic Performance" --process "Gestão de Campanhas"');
                    process.exit(1);
                }
                const listId = getListId(params.department, params.area, params.process);
                const result = await getTasks(listId);
                console.log(JSON.stringify(result.tasks, null, 2));
            } else {
                console.log('Unknown command:', command);
            }
        } catch (err) {
            console.error(err.message);
            process.exit(1);
        }
    })();
}

module.exports = {
    createTask,
    updateTask,
    getTasks,
    getTask,
    setCustomField
};
