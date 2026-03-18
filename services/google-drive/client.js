const { google } = require('googleapis');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI || 'http://localhost'
);

if (process.env.GOOGLE_REFRESH_TOKEN) {
  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN
  });
}

// Handle automatic token refresh events
oauth2Client.on('tokens', (tokens) => {
  if (tokens.refresh_token) {
    console.log('[GDRIVE] New refresh token received.');
    // In a real app, we would update the .env here, 
    // but for now we just log that the system is handling it.
  }
  console.log('[GDRIVE] Access token refreshed.');
});

/**
 * Ensures the access token is valid, refreshing it if necessary.
 */
async function ensureAuthenticated() {
  try {
    const { token } = await oauth2Client.getAccessToken();
    if (!token) throw new Error("Failed to retrieve access token.");
    return token;
  } catch (error) {
    console.error("[GDRIVE] Authentication error:", error.message);
    throw error;
  }
}

const drive = google.drive({ version: 'v3', auth: oauth2Client });
const docs = google.docs({ version: 'v1', auth: oauth2Client });

module.exports = {
  google,
  drive,
  docs,
  oauth2Client,
  ensureAuthenticated
};
