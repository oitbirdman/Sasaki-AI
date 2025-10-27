import { GoogleGenerativeAI } from '@google/generative-ai'

export interface GeminiMessage {
  role: 'user' | 'model'
  parts: { text: string }[]
}

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

/**
 * Call Gemini API directly from client (for GitHub Pages)
 */
export async function callGeminiAPI(
  apiKey: string, // 互換性のため残すが使用しない
  messages: GeminiMessage[],
  stream = false,
  onProgress?: (chunk: string) => void
): Promise<string> {
  const actualApiKey = getApiKey()
  
  if (!actualApiKey) {
    throw new Error('APIキーが設定されていません。設定画面でAPIキーを入力してください。')
  }

  try {
    const genAI = new GoogleGenerativeAI(actualApiKey)
    const model = genAI.getGenerativeModel({ model: getModel() })

    // Convert messages to Gemini format
    const prompt = messages.map(m => {
      const role = m.role === 'user' ? 'user' : 'model'
      return m.parts.map(p => p.text).join('\n')
    }).join('\n\n')

    if (stream && onProgress) {
      // ストリーミングレスポンス
      const result = await model.generateContentStream(prompt)
      let fullText = ''

      for await (const chunk of result.stream) {
        const chunkText = chunk.text()
        fullText += chunkText
        onProgress(chunkText)
      }

      return fullText
    } else {
      // 非ストリーミングレスポンス
      const result = await model.generateContent(prompt)
      const response = await result.response
      return response.text()
    }
  } catch (error: any) {
    console.error('Gemini API Error:', error)
    
    // API制限エラーの詳細な判定
    if (error?.message?.includes('Quota exceeded') || 
        error?.message?.includes('quota') ||
        error?.status === 429) {
      throw new Error('Gemini API の使用量制限に達しました。24時間後に再試行するか、有料プランにアップグレードしてください。')
    }
    
    if (error?.message?.includes('API_KEY_INVALID') || 
        error?.message?.includes('API key') ||
        error?.status === 401) {
      throw new Error('APIキーが無効です。設定画面で正しいAPIキーを入力してください。')
    }
    
    if (error?.status === 500 || error?.status === 503) {
      throw new Error('Gemini APIサーバーでエラーが発生しました。しばらく待ってから再試行してください。')
    }
    
    if (error?.message?.includes('SAFETY')) {
      throw new Error('安全性フィルターによりコンテンツが拒否されました。別の表現で試してください。')
    }
    
    throw new Error(`Gemini API エラー: ${error.message || 'Unknown error'}`)
  }
}

/**
 * ListModels診断用: 利用可能なモデル一覧を取得
 */
export async function listAvailableModels(apiKey: string): Promise<any> {
  try {
    const genAI = new GoogleGenerativeAI(apiKey || getApiKey())
    // SDKを使ってモデル一覧を取得
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models?key=${apiKey || getApiKey()}`
    )
    
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`ListModels Error (${response.status}): ${errorText}`)
    }
    
    const data = await response.json()
    console.log('Available models:', data)
    return data
  } catch (error: any) {
    console.error('ListModels Error:', error)
    throw error
  }
}
