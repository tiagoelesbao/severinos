const fs = require('fs');
const path = require('path');

function jsonToNetscape(jsonPath, outputPath) {
    if (!fs.existsSync(jsonPath)) {
        console.error('Sessão não encontrada:', jsonPath);
        return false;
    }

    const session = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    const cookies = session.cookies || [];
    
    let netscape = "# Netscape HTTP Cookie File\n";
    netscape += "# http://curl.haxx.se/rfc/cookie_spec.html\n";
    netscape += "# This is a generated file!  Do not edit.\n\n";

    cookies.forEach(c => {
        const domain = c.domain.startsWith('.') ? c.domain : `.${c.domain}`;
        const flag = "TRUE";
        const path = c.path;
        const secure = c.secure ? "TRUE" : "FALSE";
        const expires = Math.round(c.expires || (Date.now() / 1000 + 86400 * 30));
        const name = c.name;
        const value = c.value;
        
        netscape += `${domain}\t${flag}\t${path}\t${secure}\t${expires}\t${name}\t${value}\n`;
    });

    // Garantir diretório
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    fs.writeFileSync(outputPath, netscape);
    console.log('✅ Cookies convertidos para:', outputPath);
    return true;
}

// Caminhos absolutos baseados no root
const root = process.cwd();
const igJson = path.join(root, 'services', 'ETL', 'Extract', 'auth', 'instagram_session.json');
const igNetscape = path.join(root, 'services', 'ETL', 'Extract', 'auth', 'cookies.txt');

jsonToNetscape(igJson, igNetscape);
