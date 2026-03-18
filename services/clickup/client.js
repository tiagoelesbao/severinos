const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') }); // Load from root .env

const CLICKUP_API_KEY = process.env.CLICKUP_API_KEY;

if (!CLICKUP_API_KEY) {
    console.error('ERROR: CLICKUP_API_KEY is not defined in the root .env file.');
    process.exit(1);
}

const client = axios.create({
    baseURL: 'https://api.clickup.com/api/v2',
    headers: {
        'Authorization': CLICKUP_API_KEY,
        'Content-Type': 'application/json'
    }
});

module.exports = client;
