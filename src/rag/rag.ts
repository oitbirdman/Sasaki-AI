// ブラウザ内 RAG 実装 (IndexedDB永続化対応)

import { db, DocumentChunk } from '../db'
import { GoogleGenerativeAI } from '@google/generative-ai'

function getApiKey(): string {
  const settings = localStorage.getItem('custardweb_settings')
  if (settings) {
    try {
      const parsed = JSON.parse(settings)
      return parsed.api?.geminiApiKey || ''
    } catch (e) {
      return ''
    }
  }
  return ''
}

function getModel(): string {
  const settings = localStorage.getItem('custardweb_settings')
  if (settings) {
    try {
      const parsed = JSON.parse(settings)
      return parsed.api?.geminiModel || 'gemini-2.0-flash-exp'
    } catch (e) {
      return 'gemini-2.0-flash-exp'
    }
  }
  return 'gemini-2.0-flash-exp'
}

export async function getEmbedding(text: string): Promise<number[]> {
  const apiKey = getApiKey()
  if (!apiKey) {
    throw new Error('APIキーが設定されていません')
  }
  
  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: 'text-embedding-004' })
  
  try {
    const result = await model.embedContent(text)
    return result.embedding.values
  } catch (error: any) {
    // API制限エラーの詳細な判定
    if (error?.message?.includes('Quota exceeded') || 
        error?.message?.includes('quota') ||
        error?.status === 429) {
      throw new Error('Gemini API の使用量制限に達しました。24時間後に再試行するか、有料プランにアップグレードしてください。')
    }
    
    if (error?.status === 401 || error?.message?.includes('API key')) {
      throw new Error('APIキーが無効です。設定を確認してください。')
    }
    
    if (error?.status === 500 || error?.status === 503) {
      throw new Error('Gemini APIサーバーでエラーが発生しました。しばらく待ってから再試行してください。')
    }
    
    // その他のエラー
    throw new Error(`Gemini API エラー: ${error?.message || 'Unknown error'}`)
  }
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}

// 文単位でテキストを分割（改善版）
function splitIntoSentences(text: string): string[] {
  // 日本語と英語の文末を考慮
  const sentences = text.match(/[^。！？\n]+[。！？\n]?/g) || []
  return sentences.map(s => s.trim()).filter(s => s.length > 0)
}

// センテンスをチャンクにまとめる（API使用量を削減するため大きめのチャンクサイズ）
function createChunks(sentences: string[], maxChunkSize: number = 2000): string[] {
  const chunks: string[] = []
  let currentChunk = ''
  
  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length > maxChunkSize && currentChunk) {
      chunks.push(currentChunk.trim())
      currentChunk = sentence
    } else {
      currentChunk += (currentChunk ? ' ' : '') + sentence
    }
  }
  
  if (currentChunk) {
    chunks.push(currentChunk.trim())
  }
  
  return chunks
}

export async function indexDocuments(docsInput: Array<{id:string, text:string}>) {
  const startTime = Date.now()
  
  for (const doc of docsInput) {
    // 既存のチャンクを削除（再インデックス対応）
    await db.documentChunks.where('documentId').equals(doc.id).delete()
    
    // テキストを文単位で分割してからチャンクにまとめる
    const sentences = splitIntoSentences(doc.text)
    const chunks = createChunks(sentences)
    
    console.log(`Document ${doc.id}: ${sentences.length} sentences → ${chunks.length} chunks`)
    
    // 各チャンクのembeddingを取得して保存
    for (let i = 0; i < chunks.length; i++) {
      const chunkText = chunks[i]
      
      try {
        const embedding = await getEmbedding(chunkText)
        
        if (!Array.isArray(embedding) || embedding.length === 0) {
          console.error(`Invalid embedding for chunk ${i}`)
          continue
        }
        
        // IndexedDBに保存
        const chunk: DocumentChunk = {
          documentId: doc.id,
          chunkIndex: i,
          text: chunkText,
          embedding,
          createdAt: Date.now()
        }
        
        await db.documentChunks.add(chunk)
      } catch (error) {
        console.error(`Error processing chunk ${i}:`, error)
        
        // クォータ制限エラーの場合は処理を停止
        if (error instanceof Error && error.message.includes('Quota exceeded')) {
          console.warn('API quota exceeded. Stopping indexing process.')
          throw new Error('APIクォータ制限に達しました。24時間後に再試行するか、有料プランにアップグレードしてください。')
        }
      }
    }
  }
  
  const totalChunks = await db.documentChunks.count()
  const elapsed = Date.now() - startTime
  console.log(`Indexed ${totalChunks} total chunks in ${elapsed}ms`)
}

export async function search(query: string, k = 3) {
  // IndexedDBからチャンクを取得
  const chunks = await db.documentChunks.toArray()
  
  if (chunks.length === 0) {
    console.log('No indexed documents found')
    return []
  }

  // クエリの embedding を取得
  try {
    const queryEmbedding = await getEmbedding(query)
    
    if (!Array.isArray(queryEmbedding) || queryEmbedding.length === 0) {
      console.error('Invalid query embedding')
      return []
    }

    // 類似度計算と結果構築（プレビューデータは除外）
    const similarities = chunks
      .filter((chunk: DocumentChunk) => !chunk.documentId.includes(':preview')) // プレビューデータを除外
      .map((chunk: DocumentChunk) => {
        let text = chunk.text
        let documentId = chunk.documentId
        
        // PDFドキュメントの場合、テキスト検索用のチャンクは既に抽出テキストが入っている
        // 何も加工せずそのまま使用
        
        return {
          text: text,
          documentId: documentId,
          similarity: cosineSimilarity(queryEmbedding, chunk.embedding)
        }
      })

    // ドキュメントごとにグループ化し、最も類似度の高いチャンクを選択
    const docMap = new Map<string, any>()
    
    for (const result of similarities) {
      const existingResult = docMap.get(result.documentId)
      if (!existingResult || result.similarity > existingResult.similarity) {
        docMap.set(result.documentId, result)
      }
    }
    
    // ドキュメントレベルでソートしてトップk
    const topResults = Array.from(docMap.values())
      .sort((a: any, b: any) => b.similarity - a.similarity)
      .slice(0, k)
    
    console.log('Top search results:', topResults.map((r: any) => ({ 
      doc: r.documentId, 
      similarity: r.similarity.toFixed(3) 
    })))
    
    return topResults.map((s: any) => ({
      text: s.text,
      documentId: s.documentId,
      similarity: s.similarity,
      metadata: { id: s.documentId }
    }))
  } catch (error) {
    console.error('Search error:', error)
    return []
  }
}

// インデックス済みドキュメント数を取得
export async function getIndexedDocumentCount(): Promise<number> {
  return await db.documentChunks.count()
}

// 特定ドキュメントを削除
export async function removeDocument(documentId: string): Promise<void> {
  await db.documentChunks.where('documentId').equals(documentId).delete()
}

// 全ドキュメントをクリア
export async function clearAllDocuments(): Promise<void> {
  await db.documentChunks.clear()
}
