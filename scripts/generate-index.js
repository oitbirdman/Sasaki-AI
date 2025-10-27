const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error('GEMINI_API_KEY not set');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

async function getEmbedding(text) {
  const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
  const result = await model.embedContent(text);
  return result.embedding.values;
}

function cosineSimilarity(a, b) {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function splitIntoSentences(text) {
  const sentences = text.match(/[^。！？\n]+[。！？\n]?/g) || [];
  return sentences.map(s => s.trim()).filter(s => s.length > 0);
}

function createChunks(sentences, maxChunkSize = 1000) {
  const chunks = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length > maxChunkSize && currentChunk) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += (currentChunk ? ' ' : '') + sentence;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

async function generateIndex() {
  try {
    const docsData = fs.readFileSync('docs.json', 'utf-8');
    const docsInput = JSON.parse(docsData);

    const allChunks = [];
    const startTime = Date.now();

    for (const doc of docsInput) {
      const sentences = splitIntoSentences(doc.text);
      const chunks = createChunks(sentences);

      console.log(`Document ${doc.id}: ${sentences.length} sentences → ${chunks.length} chunks`);

      for (let i = 0; i < chunks.length; i++) {
        const chunkText = chunks[i];

        try {
          const embedding = await getEmbedding(chunkText);

          if (!Array.isArray(embedding) || embedding.length === 0) {
            console.error(`Invalid embedding for chunk ${i}`);
            continue;
          }

          allChunks.push({
            documentId: doc.id,
            chunkIndex: i,
            text: chunkText,
            embedding,
            createdAt: Date.now()
          });
        } catch (error) {
          console.error(`Error processing chunk ${i}:`, error);
        }
      }
    }

    // リポジトリ情報を取得（docs.jsonから最初のドキュメントのIDから推測）
    const repoUrl = process.env.REPO_URL || 'unknown';
    const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    let filename = 'index.json';
    if (match) {
      const [, owner, repo] = match;
      const cleanRepo = repo.replace(/\.git$/, '');
      filename = `${owner}_${cleanRepo}.json`;
    }

    // indexesディレクトリを作成
    if (!fs.existsSync('public/indexes')) {
      fs.mkdirSync('public/indexes', { recursive: true });
    }

    fs.writeFileSync(`public/indexes/${filename}`, JSON.stringify(allChunks, null, 2));

    const elapsed = Date.now() - startTime;
    console.log(`Generated index with ${allChunks.length} chunks in ${elapsed}ms`);
  } catch (error) {
    console.error('Error generating index:', error);
    process.exit(1);
  }
}

generateIndex();