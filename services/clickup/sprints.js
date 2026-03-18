const client = require('./client');

/**
 * ClickUp Sprints API Wrapper
 * Docs: https://clickup.com/api/clickupreference/operation/GetSprints/
 */

async function getSprints(listId) {
    try {
        const response = await client.get(`/list/${listId}/sprint`);
        return response.data;
    } catch (error) {
        console.error('Error fetching sprints:', error.response?.data || error.message);
        throw error;
    }
}

async function createSprint(listId, name, startDate, endDate) {
    try {
        const response = await client.post(`/list/${listId}/sprint`, {
            name: name,
            start_date: startDate, // unix timestamp in MS
            end_date: endDate 
        });
        return response.data;
    } catch (error) {
        console.error('Error creating sprint:', error.response?.data || error.message);
        throw error;
    }
}

module.exports = {
    getSprints,
    createSprint
};
