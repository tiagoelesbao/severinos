const { drive, docs } = require('./client');
const fs = require('fs');
const path = require('path');

/**
 * Creates a Google Doc from content.
 * @param {string} title 
 * @param {string} content 
 */
async function createDocFromMarkdown(title, content) {
  try {
    // 1. Create a blank doc
    const res = await drive.files.create({
      requestBody: {
        name: title,
        mimeType: 'application/vnd.google-apps.document',
      },
    });

    const fileId = res.data.id;

    // 2. Insert content
    // Note: Simple implementation inserting all text at start. 
    // In production, we might want to use the docs.batchUpdate for formatting.
    await docs.documents.batchUpdate({
      documentId: fileId,
      requestBody: {
        requests: [
          {
            insertText: {
              location: { index: 1 },
              text: content,
            },
          },
        ],
      },
    });

    // 3. Set permissions to anyone with link (optional, based on user preference)
    await drive.permissions.create({
      fileId: fileId,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });

    return {
      id: fileId,
      url: `https://docs.google.com/document/d/${fileId}/edit`
    };
  } catch (error) {
    console.error('Error creating Google Doc:', error.message);
    throw error;
  }
}

// CLI handler
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === 'create') {
    let title = 'Documento sem título';
    let content = '';

    const titleIdx = args.indexOf('--title');
    if (titleIdx !== -1) title = args[titleIdx + 1];

    const contentIdx = args.indexOf('--content');
    if (contentIdx !== -1) {
      content = args[contentIdx + 1];
    } else {
      const fileIdx = args.indexOf('--file');
      if (fileIdx !== -1) {
        const filePath = path.resolve(args[fileIdx + 1]);
        if (fs.existsSync(filePath)) {
          content = fs.readFileSync(filePath, 'utf8');
        }
      }
    }

    if (!content) {
      console.error('Usage: node docs.js create --title "Title" --content "Text" OR --file path/to/file.md');
      process.exit(1);
    }

    createDocFromMarkdown(title, content)
      .then(res => {
        console.log(`SUCCESS: ${res.url}`);
      })
      .catch(err => {
        console.error('FAILED');
        process.exit(1);
      });
  }
}

module.exports = { createDocFromMarkdown };
