const { oauth2Client } = require('./client');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/documents'
];

async function updateEnv(refreshToken) {
  const envPath = path.resolve(__dirname, '../../.env');
  let content = fs.readFileSync(envPath, 'utf8');
  
  if (content.includes('GOOGLE_REFRESH_TOKEN=')) {
    content = content.replace(/GOOGLE_REFRESH_TOKEN=.*/, `GOOGLE_REFRESH_TOKEN=${refreshToken}`);
  } else {
    content += `\nGOOGLE_REFRESH_TOKEN=${refreshToken}\n`;
  }
  
  fs.writeFileSync(envPath, content);
  console.log('\n✅ Arquivo .env atualizado com sucesso!');
}

async function getRefreshToken() {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.error('❌ Erro: Configure GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET no seu arquivo .env antes de rodar este script.');
    process.exit(1);
  }

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent'
  });

  console.log('1️⃣  Abra este link no seu navegador para autorizar o acesso:');
  console.log('\x1b[36m%s\x1b[0m', authUrl);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question('2️⃣  Após autorizar, cole o CÓDIGO (code=...) que aparecer na URL aqui: ', async (code) => {
    try {
      const { tokens } = await oauth2Client.getToken(code);
      if (tokens.refresh_token) {
        await updateEnv(tokens.refresh_token);
        console.log(`\nTOKEN OBTIDO: ${tokens.refresh_token.substring(0, 10)}...`);
      } else {
        console.error('\n❌ Erro: O Google não retornou um refresh_token. Tente remover o acesso do app na sua conta Google e tente novamente.');
      }
    } catch (err) {
      console.error('❌ Erro ao obter tokens:', err.message);
    } finally {
      rl.close();
    }
  });
}

getRefreshToken();
