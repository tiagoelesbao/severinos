/**
 * AIOS Telemetry Utility
 * 
 * Sends events to the AIOS Monitor Server (Dashboard).
 */

const http = require('http');

const MONITOR_URL = 'http://localhost:4001/events';
const TIMEOUT_MS = 1000;

/**
 * Send event to the monitor server.
 * 
 * @param {string} type - Event type (e.g., 'UserPromptSubmit', 'onComplete')
 * @param {Object} data - Event payload
 * @returns {Promise<boolean>} Success status
 */
async function sendEvent(type, data = {}) {
    const payload = {
        type,
        timestamp: Date.now(),
        data: {
            project: process.cwd(),
            cwd: process.cwd(),
            session_id: process.env.CLAUDE_SESSION_ID || 'unknown',
            ...data
        }
    };

    return new Promise((resolve) => {
        const url = new URL(MONITOR_URL);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            timeout: TIMEOUT_MS
        };

        const req = http.request(options, (res) => {
            resolve(res.statusCode === 200);
        });

        req.on('error', () => {
            resolve(false);
        });

        req.on('timeout', () => {
            req.destroy();
            resolve(false);
        });

        req.write(JSON.stringify(payload));
        req.end();
    });
}

module.exports = { sendEvent };
