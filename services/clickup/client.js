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

// Retry automático em rate limit (429) e erro transitório do servidor (5xx).
// Confirmado em produção 2026-08-18: um lote de aprovação de 4 criativos
// bateu 429 "SHARD_035" e, separadamente, 500 "context deadline exceeded"
// num upload — sem retry, cada um desses derrubava o script inteiro no meio
// do lote (alguns criativos aprovados, outros não, sem re-executar na mão).
// Único lugar pra esse comportamento: todo script do pipeline (approve-*,
// sync-*, run-*) usa esse client, então corrigir aqui cobre todos de uma vez.
const MAX_RETRIES = 3;
client.interceptors.response.use(
    (res) => res,
    async (error) => {
        const config = error.config;
        const status = error.response && error.response.status;
        const retryable = status === 429 || (status >= 500 && status < 600);
        if (!config || !retryable) return Promise.reject(error);

        config.__retryCount = (config.__retryCount || 0) + 1;
        if (config.__retryCount > MAX_RETRIES) return Promise.reject(error);

        const retryAfter = error.response.headers && error.response.headers['retry-after'];
        const delayMs = retryAfter ? Number(retryAfter) * 1000 : 800 * 3 ** (config.__retryCount - 1);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        return client(config);
    },
);

module.exports = client;
