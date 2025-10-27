const fs = require('fs');
const path = require('path');

const repoUrl = process.argv[2];
const pat = process.env.GITHUB_PAT;

if (!repoUrl || !pat) {
  console.error('Usage: node fetch-repo.js <repo-url> and set GITHUB_PAT');
  process.exit(1);
}

const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
if (!match) {
  console.error('Invalid repo URL');
  process.exit(1);
}

const owner = match[1];
const repo = match[2];

async function fetchRepoFiles() {
  try {
    // GitHub APIでtreeを取得
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/main?recursive=1`;
    const options = {
      headers: {
        'Authorization': `token ${pat}`,
        'User-Agent': 'CustardWeb/1.0'
      }
    };

    console.log(`Fetching tree from ${apiUrl}`);
    const response = await fetch(apiUrl, options);
    if (!response.ok) {
      throw new Error(`Failed to fetch tree: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const docs = [];

    console.log(`Found ${data.tree.length} items in repository`);

    for (const item of data.tree) {
      if (item.type === 'blob' && (item.path.endsWith('.md') || item.path.endsWith('.txt') || item.path.endsWith('.js') || item.path.endsWith('.ts'))) {
        try {
          const blobUrl = `https://api.github.com/repos/${owner}/${repo}/git/blobs/${item.sha}`;
          console.log(`Fetching ${item.path}`);
          const blobResponse = await fetch(blobUrl, options);
          if (blobResponse.ok) {
            const blobData = await blobResponse.json();
            const content = Buffer.from(blobData.content, 'base64').toString('utf-8');
            docs.push({ id: item.path, text: content });
          } else {
            console.warn(`Failed to fetch ${item.path}: ${blobResponse.status}`);
          }
        } catch (error) {
          console.warn(`Error fetching ${item.path}:`, error.message);
        }
      }
    }

    fs.writeFileSync('docs.json', JSON.stringify(docs, null, 2));
    console.log(`Fetched ${docs.length} documents`);
  } catch (error) {
    console.error('Error fetching repo files:', error);
    process.exit(1);
  }
}

fetchRepoFiles();