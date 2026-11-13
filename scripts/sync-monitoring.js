const fs = require('fs');
const yaml = require('js-yaml');

const instagramPath = 'squads/virals-marketing-squad/data/clients/tiago-elesbao/monitoring/monitoring-instagram.yaml';
const profilesPath = 'squads/virals-marketing-squad/data/clients/tiago-elesbao/monitoring/monitoring-profiles.yaml';

function run() {
    const instagramYaml = yaml.load(fs.readFileSync(instagramPath, 'utf8'));
    const profilesYaml = yaml.load(fs.readFileSync(profilesPath, 'utf8'));

    if (instagramYaml.profiles && instagramYaml.profiles.instagram) {
        profilesYaml.profiles.instagram = instagramYaml.profiles.instagram;
        
        // Mantemos a ordem: instagram, tiktok, youtube
        // js-yaml dump costuma manter a ordem das chaves se não dissermos o contrário
        
        fs.writeFileSync(profilesPath, yaml.dump(profilesYaml, { lineWidth: 200, noArrayIndent: true }));
        console.log(`Updated instagram section in ${profilesPath} with ${instagramYaml.profiles.instagram.length} profiles.`);
    } else {
        console.error('Section profiles.instagram not found in monitoring-instagram.yaml');
    }
}

run();
