<template>
  <div class="chat-container">
    <!-- Header with title -->
    <div class="chat-header">
      <h1 class="chat-title">{{ conversationTitle }}</h1>
      <div v-if="indexedDocCount > 0" class="indexed-doc-info">
        <v-chip size="small" color="success" prepend-icon="mdi-database">
          {{ indexedDocCount }} チャンク
        </v-chip>
      </div>
    </div>

    <!-- Messages -->
    <div class="messages-container">
      <div v-for="(m, i) in messages" :key="i" :class="['message', m.role.toLowerCase()]">
        <div class="message-content">
          <div class="message-avatar">
            <v-icon v-if="m.role === 'User'" color="primary">mdi-account-circle</v-icon>
            <v-icon v-else color="purple">mdi-star-four-points</v-icon>
          </div>
          <div class="message-text">
            <div class="message-header">
              <div class="message-role">{{ m.role === 'User' ? 'あなた' : 'Gemini' }}</div>
              <!-- 編集ボタン（ユーザーメッセージのみ） -->
              <v-btn
                v-if="m.role === 'User' && !editingMessageIndex"
                icon
                size="x-small"
                variant="text"
                @click="startEditing(i)"
                class="edit-btn"
              >
                <v-icon size="small">mdi-pencil</v-icon>
              </v-btn>
            </div>
            
            <!-- 編集モード -->
            <div v-if="editingMessageIndex === i" class="edit-mode">
              <v-textarea
                v-model="editingText"
                variant="outlined"
                density="comfortable"
                rows="3"
                auto-grow
                hide-details
                class="mb-2"
                placeholder="Ctrl+Enter で再送信"
                @keydown="handleEditKeydown(i, $event)"
              />
              <div class="edit-actions">
                <v-btn
                  size="small"
                  variant="text"
                  @click="cancelEditing"
                >
                  キャンセル
                </v-btn>
                <v-btn
                  size="small"
                  color="primary"
                  variant="flat"
                  @click="saveEdit(i)"
                  :disabled="!editingText.trim()"
                >
                  保存して再送信
                </v-btn>
              </div>
            </div>
            
            <!-- 通常表示 -->
            <div v-else>
              <div v-if="m.role === 'AI'" v-html="renderMarkdown(m.text)" class="markdown-content"></div>
              <div v-else class="user-text">{{ m.text }}</div>
            </div>
            
            <!-- 参考ソースの表示 -->
            <div v-if="m.role === 'AI' && m.sources && m.sources.length > 0" class="sources-section">
              <v-divider class="my-3" />
              <div class="sources-header">
                <v-icon size="small" class="mr-1">mdi-file-document-outline</v-icon>
                参考ソース
              </div>
              <div class="sources-list">
                <v-chip
                  v-for="(source, idx) in m.sources"
                  :key="idx"
                  size="small"
                  variant="outlined"
                  class="source-chip"
                  prepend-icon="mdi-file-code-outline"
                  @click="showSourcePreview(source.documentId)"
                >
                  {{ source.documentId }}
                  <v-tooltip activator="parent" location="top">
                    類似度: {{ (source.similarity * 100).toFixed(1) }}%<br>
                    クリックしてプレビュー
                  </v-tooltip>
                </v-chip>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Loading indicator -->
      <div v-if="isLoading" class="message ai">
        <div class="message-content">
          <div class="message-avatar">
            <v-icon color="purple">mdi-star-four-points</v-icon>
          </div>
          <div class="message-text">
            <div class="message-role">Gemini</div>
            <div class="loading-text">
              <span class="loading-dots">考え中</span>
              <span class="loading-animation">...</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Input area -->
    <div 
      class="input-container"
      :class="{ 'drag-over': isDragOver }"
      @dragover.prevent="handleDragOver"
      @dragleave.prevent="handleDragLeave"
      @drop.prevent="handleDrop"
    >
      <!-- ドラッグオーバーレイ -->
      <div v-if="isDragOver" class="drag-overlay">
        <v-icon size="48" color="primary" class="mb-2">mdi-file-upload</v-icon>
        <p class="drag-text">ファイルをドロップして添付</p>
        <p class="drag-subtext">PDFまたはTXTファイルに対応</p>
      </div>

      <!-- 検索モード選択 -->
      <div class="search-mode-selector">
        <v-select
          v-model="searchMode"
          :items="searchModeOptions"
          item-title="title"
          item-value="value"
          variant="outlined"
          density="compact"
          hide-details
          class="search-mode-select"
        >
          <template v-slot:selection="{ item }">
            <div class="search-mode-selection">
              <v-icon :icon="item.raw.icon" size="16" class="mr-1" />
              <span class="search-mode-title">{{ item.raw.title }}</span>
            </div>
          </template>
          <template v-slot:item="{ props, item }">
            <v-list-item v-bind="props">
              <template v-slot:prepend>
                <v-icon :icon="item.raw.icon" />
              </template>
              <v-list-item-title>{{ item.raw.title }}</v-list-item-title>
              <v-list-item-subtitle>{{ item.raw.description }}</v-list-item-subtitle>
            </v-list-item>
          </template>
        </v-select>
      </div>

      <!-- 添付ファイルリスト -->
      <div v-if="attachedFiles.length > 0" class="attached-files-list">
        <div class="attached-files-header">
          <v-icon size="16" color="#b0b0b0" class="mr-1">mdi-paperclip</v-icon>
          <span class="attached-files-title">添付ファイル ({{ attachedFiles.length }})</span>
          <v-btn 
            icon 
            size="small" 
            variant="text" 
            @click="clearAttachedFiles"
            class="ml-auto"
          >
            <v-icon size="16" color="#b0b0b0">mdi-close</v-icon>
          </v-btn>
        </div>
        <div class="attached-files-items">
          <div 
            v-for="(attachedFile, index) in attachedFiles" 
            :key="index"
            class="attached-file-item"
            :class="`status-${attachedFile.status}`"
          >
            <v-icon 
              size="16" 
              :color="getFileStatusColor(attachedFile.status)"
              class="mr-2"
            >
              {{ getFileStatusIcon(attachedFile.status) }}
            </v-icon>
            <span class="file-name">{{ attachedFile.file.name }}</span>
            <span class="file-size">({{ formatFileSize(attachedFile.file.size) }})</span>
            <span v-if="attachedFile.message" class="file-message ml-2">
              {{ attachedFile.message }}
            </span>
          </div>
        </div>
      </div>

      <div class="input-wrapper">
        <v-text-field
          v-model="input"
          :placeholder="placeholderText"
          variant="outlined"
          density="comfortable"
          hide-details
          @keyup.enter="send"
          @keydown="handleKeydown"
        >
          <template v-slot:prepend-inner>
            <v-btn
              icon
              size="small"
              variant="text"
              @click="$refs.fileInput.$el.querySelector('input').click()"
              :disabled="isLoading"
            >
              <v-icon>mdi-paperclip</v-icon>
            </v-btn>
          </template>
          <template v-slot:append-inner>
            <v-btn
              icon
              variant="flat"
              color="primary"
              size="small"
              :disabled="!input.trim() || isLoading"
              :loading="isLoading"
              @click="send"
            >
              <v-icon>mdi-send</v-icon>
            </v-btn>
          </template>
        </v-text-field>
        
        <!-- Hidden file input -->
        <v-file-input
          ref="fileInput"
          v-model="uploadedFiles"
          multiple
          accept=".pdf,.txt"
          style="display: none"
          @change="handleFileUpload"
        />
      </div>
    </div>

    <!-- Snackbar for notifications -->
    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      :timeout="snackbar.timeout"
      location="top"
    >
      {{ snackbar.message }}
      <template v-slot:actions>
        <v-btn
          variant="text"
          @click="snackbar.show = false"
        >
          閉じる
        </v-btn>
      </template>
    </v-snackbar>

    <!-- ソースプレビューダイアログ -->
    <v-dialog v-model="sourcePreviewDialog" :max-width="$vuetify.display.xs ? '100vw' : '900'" scrollable>
      <v-card color="#1e1e1e">
        <v-card-title class="d-flex align-center justify-end" style="background: #2d2d2d; color: #e8eaed; min-height: 48px;">
          <v-btn icon variant="text" @click="sourcePreviewDialog = false" size="small">
            <v-icon color="#e8eaed" size="small">mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        <v-divider color="#3e3e3e" />
        <v-card-text class="pa-0">
          <div v-if="previewSourceContent" class="source-preview-content">
            <!-- PDFプレビュー -->
            <div v-if="previewSourceId.toLowerCase().endsWith('.pdf')" class="pdf-preview">
              <!-- PDFビューア -->
              <div v-if="pdfPages.length > 0" class="pdf-viewer">
                <div class="pdf-pages">
                  <div
                    v-for="(pageImage, index) in pdfPages"
                    :key="index"
                    class="pdf-page"
                  >
                    <img
                      :src="pageImage"
                      :alt="`Page ${index + 1}`"
                      class="pdf-page-image"
                    />
                  </div>
                </div>
              </div>

              <!-- 読み込み中 -->
              <div v-else-if="pdfLoading" class="pdf-loading">
                <v-progress-circular
                  indeterminate
                  color="primary"
                  class="mb-2"
                />
                <p>PDFを読み込み中...</p>
              </div>

              <!-- エラー表示 -->
              <div v-else class="pdf-loading">
                <p>PDFを読み込めませんでした</p>
              </div>
            </div>

            <!-- テキストファイルプレビュー -->
            <div v-else class="text-preview">
              <pre class="text-content">{{ previewSourceContent }}</pre>
            </div>
          </div>

          <!-- 読み込み中 -->
          <div v-else class="loading-container">
            <v-progress-circular indeterminate color="primary" />
            <p class="mt-2">読み込み中...</p>
          </div>
        </v-card-text>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { db, Message, Conversation } from '@/src/db'
import { callGeminiAPI, GeminiMessage } from '@/src/api/gemini'
import { indexDocuments, search, getIndexedDocumentCount } from '@/src/rag/rag'
import { marked } from 'marked'
import hljs from 'highlight.js'

// 検索モードの型定義
type SearchMode = 'auto' | 'department' | 'mailing-list'

interface SearchModeOption {
  value: SearchMode
  title: string
  description: string
  icon: string
}

// 検索モードのオプション
const searchModeOptions: SearchModeOption[] = [
  {
    value: 'auto',
    title: 'Auto',
    description: '入力内容から自動判断',
    icon: 'mdi-brain'
  },
  {
    value: 'department',
    title: '学科検索',
    description: '学科関連の情報を検索',
    icon: 'mdi-school'
  },
  {
    value: 'mailing-list',
    title: 'メーリングリスト',
    description: 'メーリングリストを検索',
    icon: 'mdi-email-multiple'
  }
]

// リアクティブ変数

const searchMode = ref<SearchMode>('auto')

// モバイル対応のplaceholder
const placeholderText = computed(() => {
  const baseText = 'Gemini に相談'
  // モバイルではキーボードショートカットを省略
  if (typeof window !== 'undefined' && window.innerWidth <= 599) {
    return baseText
  }
  return `${baseText} (Ctrl+Enter で送信)`
})

const props = defineProps<{
  conversationId?: number
  settings?: any
}>()

const emit = defineEmits<{
  titleGenerated: [title: string]
}>()

// Markdown renderer setup
marked.setOptions({
  highlight: function(code, lang) {
    if (lang && hljs.getLanguage(lang)) {
      return hljs.highlight(code, { language: lang }).value
    } else {
      return hljs.highlightAuto(code).value
    }
  },
  breaks: true
})

function renderMarkdown(text: string): string {
  return marked(text)
}

function showToast(message: string, color: 'success' | 'error' | 'warning' | 'info' = 'info') {
  snackbar.value = {
    show: true,
    message,
    color,
    timeout: 4000
  }
}

function clearAttachedFiles() {
  attachedFiles.value = []
  uploadedFiles.value = []
}

function getFileStatusIcon(status: string): string {
  switch (status) {
    case 'processing': return 'mdi-loading mdi-spin'
    case 'success': return 'mdi-check-circle'
    case 'error': return 'mdi-alert-circle'
    default: return 'mdi-file'
  }
}

function getFileStatusColor(status: string): string {
  switch (status) {
    case 'processing': return 'orange'
    case 'success': return 'green'
    case 'error': return 'red'
    default: return 'grey'
  }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

async function generateTitle(firstMessage: string, firstResponse?: string): Promise<string> {
  try {
    let prompt = `以下のユーザーの質問に基づいて、会話の内容を表す簡潔なタイトル（15文字以内）を生成してください。タイトルのみを返してください。説明や句読点は不要です。\n\nユーザーの質問: ${firstMessage}`
    
    if (firstResponse) {
      prompt = `以下のユーザーの質問とAIの応答に基づいて、会話の内容を表す簡潔なタイトル（15文字以内）を生成してください。タイトルのみを返してください。説明や句読点は不要です。\n\nユーザーの質問: ${firstMessage}\n\nAIの応答: ${firstResponse.substring(0, 200)}`
    }
    
    const geminiMessages: GeminiMessage[] = [
      { role: 'user', parts: [{ text: prompt }] }
    ]
    const title = await callGeminiAPI('', geminiMessages, false)
    const cleanedTitle = title.trim().replace(/^["「]|["」]$/g, '').substring(0, 30)
    return cleanedTitle || '新しい会話'
  } catch (error) {
    console.error('Title generation error:', error)
    // エラー時はユーザーメッセージの最初の15文字を使用
    return firstMessage.substring(0, 15) + (firstMessage.length > 15 ? '...' : '')
  }
}

interface MessageWithSources {
  role: string
  text: string
  sources?: Array<{
    documentId: string
    similarity: number
  }>
}

const messages = ref<Array<MessageWithSources>>([])
const input = ref('')
const uploadedFiles = ref<File[]>([])
const conversationTitle = ref('新しい会話')
const isLoading = ref(false)
const currentConversationId = ref<number | undefined>(props.conversationId)
const indexedDocCount = ref(0)
const editingMessageIndex = ref<number | null>(null)
const editingText = ref('')
const sourcePreviewDialog = ref(false)
const previewSourceId = ref('')
const previewSourceContent = ref('')
const pdfData = ref<any>(null)
const pdfPages = ref<string[]>([])
const pdfLoading = ref(false)
const refreshingPDF = ref(false)
const snackbar = ref({
  show: false,
  message: '',
  color: 'info',
  timeout: 4000
})
const isDragOver = ref(false)
const attachedFiles = ref<Array<{
  file: File
  status: 'processing' | 'success' | 'error'
  message?: string
}>>([])

// PDF用のGitHub URLを計算プロパティとして定義
const previewGitHubUrl = computed(() => {
  if (!previewSourceId.value) return ''
  
  const settings = localStorage.getItem('custardweb_settings')
  if (!settings) return ''
  
  try {
    const parsed = JSON.parse(settings)
    const repoUrl = parsed.advanced?.githubRepoUrl
    if (!repoUrl) return ''
    
    const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/)
    if (!match) return ''
    
    const [, owner, repo] = match
    const cleanRepo = repo.replace(/\.git$/, '')
    return `https://github.com/${owner}/${cleanRepo}/blob/main/${previewSourceId.value}`
  } catch (e) {
    console.error('Failed to generate GitHub URL:', e)
    return ''
  }
})

// リポジトリがパブリックかどうかを判定（PAT設定の有無で推測）
const isPublicRepo = computed(() => {
  const settings = localStorage.getItem('custardweb_settings')
  if (!settings) return false
  
  try {
    const parsed = JSON.parse(settings)
    // PATが設定されていない場合はパブリックリポジトリの可能性が高い
    // ただし、実際にはAPIで確認する必要があるため、保守的にfalseを返す
    return !parsed.advanced?.githubPat
  } catch (e) {
    return false
  }
})

onMounted(async () => {
  await loadConversation()
  await updateIndexedDocCount()
})

async function updateIndexedDocCount() {
  indexedDocCount.value = await getIndexedDocumentCount()
}

async function showSourcePreview(documentId: string) {
  console.log('Opening source preview for:', documentId)

  sourcePreviewDialog.value = true
  previewSourceId.value = documentId
  previewSourceContent.value = ''
  pdfData.value = null
  pdfPages.value = []
  pdfLoading.value = false

  try {
    // PDFファイルの場合、プレビューデータを別途取得
    if (documentId.toLowerCase().endsWith('.pdf')) {
      console.log('PDF file detected, loading preview data...')
      console.log('Document ID:', documentId)
      console.log('Looking for preview data with ID:', `${documentId}:preview`)

      // プレビューデータを取得（documentId:preview）
      const previewChunks = await db.documentChunks
        .where('documentId')
        .equals(`${documentId}:preview`)
        .toArray()

      console.log('Found preview chunks:', previewChunks.length)

      if (previewChunks.length > 0) {
        const previewText = previewChunks[0].text
        console.log('Preview chunk text length:', previewText.length)
        console.log('Preview chunk text preview:', previewText.substring(0, 200))

        try {
          const pdfInfo = JSON.parse(previewText)
          console.log('Parsed PDF info:', {
            type: pdfInfo.type,
            path: pdfInfo.path,
            size: pdfInfo.size,
            hasBase64Data: !!pdfInfo.base64Data,
            base64Length: pdfInfo.base64Data?.length || 0
          })

          if (pdfInfo.type === 'pdf' && pdfInfo.base64Data) {
            pdfData.value = pdfInfo
            previewSourceContent.value = pdfInfo.metadata
            console.log('PDF preview data loaded successfully:', pdfInfo.path, `${(pdfInfo.size / 1024).toFixed(1)}KB`)
            // 自動的にPDFをレンダリング
            setTimeout(() => renderPDF(), 100)
            return
          } else {
            console.warn('PDF info missing required fields:', {
              hasType: pdfInfo.type === 'pdf',
              hasBase64Data: !!pdfInfo.base64Data
            })
          }
        } catch (e) {
          console.error('Failed to parse PDF preview data:', e)
          console.error('Raw preview text:', previewText)
        }
      } else {
        console.warn('No preview chunks found for document ID:', `${documentId}:preview`)

        // デバッグ: 似たIDのチャンクを探す
        const allChunks = await db.documentChunks.toArray()
        const similarChunks = allChunks.filter(c => c.documentId.includes(documentId.split(':').pop() || ''))
        console.log('Similar chunks found:', similarChunks.length)
        similarChunks.forEach(c => {
          console.log('  Similar ID:', c.documentId)
        })
      }

      // プレビューデータが見つからない場合、古い形式として扱う
      console.log('Preview data not found, checking for old format...')
    }

    // テキスト検索用のチャンクを取得
    const chunks = await db.documentChunks
      .where('documentId')
      .equals(documentId)
      .toArray()

    console.log('Found text chunks:', chunks.length)

    if (chunks.length > 0) {
      const combinedText = chunks
        .sort((a, b) => a.chunkIndex - b.chunkIndex)
        .map(chunk => chunk.text)
        .join('\n\n')

      previewSourceContent.value = combinedText
      console.log('Text content loaded, length:', combinedText.length)
    } else {
      previewSourceContent.value = 'ファイルの内容が見つかりませんでした。'
    }
  } catch (error) {
    console.error('Failed to load source preview:', error)
    previewSourceContent.value = 'ファイルの読み込みに失敗しました。'
  }
}

async function renderPDF() {
  let base64Data = ''
  
  // PDFデータの取得を試行
  if (pdfData.value?.base64Data) {
    base64Data = pdfData.value.base64Data
    console.log('Using structured PDF data')
  } else {
    // 古い形式のデータから直接GitHubのPDFファイルを取得
    console.log('Attempting to fetch PDF from GitHub API...')
    
    try {
      const settings = localStorage.getItem('custardweb_settings')
      if (!settings) {
        throw new Error('Settings not found')
      }
      
      const parsed = JSON.parse(settings)
      const repoUrl = parsed.advanced?.githubRepoUrl
      const pat = parsed.advanced?.githubPat
      
      if (!repoUrl) {
        throw new Error('Repository URL not configured')
      }
      
      const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/)
      if (!match) {
        throw new Error('Invalid repository URL')
      }
      
      const [, owner, repo] = match
      const cleanRepo = repo.replace(/\.git$/, '')
      
      // GitHub API経由でPDFファイルを取得
      const headers: Record<string, string> = {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'CustardWeb/1.0'
      }
      
      if (pat) {
        headers['Authorization'] = `token ${pat}`
      }
      
      const apiUrl = `https://api.github.com/repos/${owner}/${cleanRepo}/contents/${previewSourceId.value}?ref=main`
      console.log('Fetching PDF from GitHub:', apiUrl)
      
      const response = await fetch(apiUrl, { headers })
      
      if (!response.ok) {
        const errorBody = await response.text()
        console.log('GitHub API error:', response.status, errorBody)
        
        if (response.status === 404) {
          throw new Error(`ファイルが見つかりません: ${previewSourceId.value}`)
        } else if (response.status === 401) {
          throw new Error('認証エラー。PATを確認してください。')
        } else {
          throw new Error(`GitHub API エラー: ${response.status}`)
        }
      }
      
      const fileData = await response.json()
      
      if (fileData.content && fileData.encoding === 'base64') {
        base64Data = fileData.content.replace(/\n/g, '')
        console.log('Successfully fetched PDF from GitHub API')
      } else {
        throw new Error('No Base64 content in GitHub response')
      }
      
    } catch (error) {
      console.error('Failed to fetch PDF from GitHub:', error)
      showToast('PDFを取得できませんでした。設定画面でリポジトリを再取得してください。', 'error')
      return
    }
  }
  
  if (!base64Data) {
    console.error('No PDF Base64 data available')
    showToast('PDFデータが見つかりません。設定画面でリポジトリを再取得してください。', 'warning')
    return
  }
  
  pdfLoading.value = true
  pdfPages.value = []
  
  try {
    // PDF.jsを動的インポート
    const pdfjsLib = await import('pdfjs-dist')
    
    // workerの設定（ローカルファイルを使用）
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.js', import.meta.url).toString()
    
    // Base64からArrayBufferに変換
    const binaryString = atob(base64Data)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    
    // PDFドキュメントを読み込み
    const pdf = await pdfjsLib.getDocument({ data: bytes }).promise
    console.log('PDF loaded successfully, pages:', pdf.numPages)
    
    // 各ページをレンダリング（最大5ページに制限してパフォーマンス向上）
    const maxPages = Math.min(pdf.numPages, 5)
    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      const page = await pdf.getPage(pageNum)
      
      // キャンバスの設定
      const scale = 1.2
      const viewport = page.getViewport({ scale })
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d')!
      
      canvas.height = viewport.height
      canvas.width = viewport.width
      
      // ページをレンダリング
      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise
      
      // キャンバスを画像に変換
      const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8)
      pdfPages.value.push(imageDataUrl)
    }
    
    console.log('PDF rendered successfully, pages:', pdfPages.value.length)
    showToast(`PDFを表示しました (${pdfPages.value.length}/${pdf.numPages}ページ)`, 'success')
  } catch (error) {
    console.error('Failed to render PDF:', error)
    showToast('PDFの表示に失敗しました: ' + (error as Error).message, 'error')
  } finally {
    pdfLoading.value = false
  }
}

async function copyFilePath() {
  try {
    await navigator.clipboard.writeText(previewSourceId.value)
    showToast('ファイルパスをクリップボードにコピーしました', 'success')
  } catch (error) {
    console.error('Failed to copy file path:', error)
    showToast('ファイルパスのコピーに失敗しました', 'error')
  }
}

async function refreshSinglePDFFile() {
  refreshingPDF.value = true
  
  try {
    console.log('=== PDF Refresh Debug Info ===')
    console.log('Target file path:', `"${previewSourceId.value}"`)
    console.log('File path length:', previewSourceId.value.length)
    console.log('File path bytes:', [...previewSourceId.value].map(c => c.charCodeAt(0)))
    
    const settings = localStorage.getItem('custardweb_settings')
    if (!settings) {
      throw new Error('設定が見つかりません')
    }
    
    const parsed = JSON.parse(settings)
    const repoUrl = parsed.advanced?.githubRepoUrl
    const pat = parsed.advanced?.githubPat
    
    console.log('Repository URL:', repoUrl)
    console.log('Has PAT:', !!pat)
    
    if (!repoUrl) {
      throw new Error('リポジトリURLが設定されていません')
    }
    
    const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/)
    if (!match) {
      throw new Error('無効なリポジトリURLです')
    }
    
    const [, owner, repo] = match
    const cleanRepo = repo.replace(/\.git$/, '')
    
    console.log('Owner:', owner)
    console.log('Repo:', cleanRepo)
    
    // GitHub API経由でPDFファイルを取得
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'CustardWeb/1.0'
    }
    
    if (pat) {
      headers['Authorization'] = `token ${pat}`
      console.log('Using PAT for authentication')
    } else {
      console.log('No PAT provided - public repo access only')
    }
    
    // APIリクエストのURL構築とデバッグ
    const rawPath = previewSourceId.value
    const encodedPath = encodeURIComponent(rawPath)
    const apiUrl = `https://api.github.com/repos/${owner}/${cleanRepo}/contents/${rawPath}?ref=main`
    
    console.log('=== PDF Fetch Details ===')
    console.log('Raw path:', rawPath)
    console.log('Encoded path:', encodedPath)
    console.log('Final URL:', apiUrl)
    console.log('Headers:', { ...headers, Authorization: pat ? '[REDACTED]' : 'None' })
    
    const response = await fetch(apiUrl, { headers })
    
    console.log('Response status:', response.status)
    console.log('Response headers:', Object.fromEntries(response.headers.entries()))
    
    if (!response.ok) {
      let errorDetails = ''
      
      try {
        const errorBody = await response.text()
        console.log('Error response body:', errorBody)
        
        const errorJson = JSON.parse(errorBody)
        errorDetails = errorJson.message || errorBody
      } catch (e) {
        errorDetails = `HTTP ${response.status} ${response.statusText}`
      }
      
      if (response.status === 404) {
        throw new Error(`ファイルが見つかりません。パス確認: ${rawPath}\n詳細: ${errorDetails}`)
      } else if (response.status === 401) {
        throw new Error('認証エラー。PATの権限を確認してください。')
      } else if (response.status === 403) {
        throw new Error('アクセス権限がありません。プライベートリポジトリの場合はPATが必要です。')
      } else {
        throw new Error(`GitHub API エラー: ${errorDetails}`)
      }
    }
    
    const fileData = await response.json()
    
    if (fileData.content && fileData.encoding === 'base64') {
      const base64Content = fileData.content.replace(/\n/g, '')
      
      // 新しい形式でデータを保存（テキスト検索用とプレビュー用を分離）
      const newPdfData = {
        type: 'pdf',
        path: previewSourceId.value,
        size: fileData.size,
        base64Data: base64Content,
        metadata: `PDF Document: ${previewSourceId.value}\nSize: ${fileData.size} bytes`
      }

      // PDFからテキストを抽出し、embeddingを計算
      let pdfText = ''
      let embedding: number[] = []

      try {
        // PDF.jsを使ってテキスト抽出
        const pdfjsLib = await import('pdfjs-dist')
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.js', import.meta.url).toString()

        const pdfData = Uint8Array.from(atob(base64Content), c => c.charCodeAt(0))
        const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise

        // 最初の数ページからテキストを抽出（パフォーマンスのため）
        const maxPages = Math.min(pdf.numPages, 10) // 最大10ページまで
        for (let i = 1; i <= maxPages; i++) {
          const page = await pdf.getPage(i)
          const textContent = await page.getTextContent()
          const pageText = textContent.items.map((item: any) => item.str).join(' ')
          pdfText += pageText + '\n'
        }

        console.log(`Extracted ${pdfText.length} characters from PDF`)

        // テキストが抽出できた場合はembeddingを計算
        if (pdfText.trim().length > 50) {
          embedding = await getEmbedding(pdfText.substring(0, 2000)) // 最初の2000文字でembedding計算
          console.log('PDF embedding calculated successfully')
        } else {
          console.warn('PDF text extraction yielded insufficient content, using dummy embedding')
          embedding = new Array(768).fill(0)
        }
      } catch (error) {
        console.error('Failed to extract text from PDF:', error)
        console.warn('Using dummy embedding for PDF')
        embedding = new Array(768).fill(0)
      }

      // IndexedDBの該当チャンクを更新（テキスト検索用）
      await db.documentChunks.where('documentId').equals(previewSourceId.value).delete()

      const textChunk = {
        documentId: previewSourceId.value,
        chunkIndex: 0,
        text: pdfText.trim() || `PDF Document: ${previewSourceId.value} (テキスト抽出に失敗しました)`,
        embedding: embedding,
        createdAt: Date.now()
      }

      await db.documentChunks.add(textChunk)

      // プレビュー用のデータを更新
      await db.documentChunks.where('documentId').equals(`${previewSourceId.value}:preview`).delete()

      const previewChunk = {
        documentId: `${previewSourceId.value}:preview`,
        chunkIndex: 0,
        text: JSON.stringify(newPdfData),
        embedding: new Array(768).fill(0), // プレビューデータは検索対象外
        createdAt: Date.now()
      }

      await db.documentChunks.add(previewChunk)
      
      // UIを更新
      pdfData.value = newPdfData
      previewSourceContent.value = newPdfData.metadata
      
      showToast('PDFデータを更新しました', 'success')
      
      // 自動的にレンダリング
      setTimeout(() => renderPDF(), 100)
      
    } else {
      throw new Error('GitHubレスポンスにBase64コンテンツがありません')
    }
    
  } catch (error) {
    console.error('Failed to refresh PDF:', error)
    showToast(`PDFの再取得に失敗しました: ${(error as Error).message}`, 'error')
  } finally {
    refreshingPDF.value = false
  }
}

async function checkRepositoryStructure() {
  try {
    const settings = localStorage.getItem('custardweb_settings')
    if (!settings) {
      showToast('設定が見つかりません', 'error')
      return
    }
    
    const parsed = JSON.parse(settings)
    const repoUrl = parsed.advanced?.githubRepoUrl
    const pat = parsed.advanced?.githubPat
    
    if (!repoUrl) {
      showToast('リポジトリURLが設定されていません', 'error')
      return
    }
    
    const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/)
    if (!match) {
      showToast('無効なリポジトリURLです', 'error')
      return
    }
    
    const [, owner, repo] = match
    const cleanRepo = repo.replace(/\.git$/, '')
    
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'CustardWeb/1.0'
    }
    
    if (pat) {
      headers['Authorization'] = `token ${pat}`
    }
    
    console.log('=== Repository Structure Check ===')
    
    // リポジトリ情報を取得
    const repoInfoUrl = `https://api.github.com/repos/${owner}/${cleanRepo}`
    const repoResponse = await fetch(repoInfoUrl, { headers })
    
    if (repoResponse.ok) {
      const repoInfo = await repoResponse.json()
      console.log('Default branch:', repoInfo.default_branch)
      
      // ファイル構造を取得
      const treeUrl = `https://api.github.com/repos/${owner}/${cleanRepo}/git/trees/${repoInfo.default_branch}?recursive=1`
      const treeResponse = await fetch(treeUrl, { headers })
      
      if (treeResponse.ok) {
        const treeData = await treeResponse.json()
        const allFiles = treeData.tree.filter((item: any) => item.type === 'blob')
        const pdfFiles = allFiles.filter((item: any) => 
          item.path.toLowerCase().endsWith('.pdf')
        )
        
        console.log('=== Repository File Analysis ===')
        console.log('Repository:', `${owner}/${cleanRepo}`)
        console.log('Branch:', repoInfo.default_branch)
        console.log('Total files:', allFiles.length)
        console.log('PDF files found:', pdfFiles.length)
        console.log('')
        
        console.log('Target file we are looking for:')
        console.log(`File ID: "${previewSourceId.value}"`)
        console.log(`Length: ${previewSourceId.value.length}`)
        console.log(`First 100 chars: "${previewSourceId.value.substring(0, 100)}"`)
        console.log('')
        
        if (pdfFiles.length > 0) {
          console.log('All PDF files in repository:')
          pdfFiles.forEach((file: any, index: number) => {
            const isExactMatch = file.path === previewSourceId.value
            const matchSymbol = isExactMatch ? '✅' : '  '
            console.log(`${matchSymbol} ${index + 1}. "${file.path}" (${file.path.length} chars)`)
            
            // 詳細な文字比較
            if (!isExactMatch && file.path.length === previewSourceId.value.length) {
              console.log(`     Character comparison with target:`)
              for (let i = 0; i < Math.min(file.path.length, previewSourceId.value.length); i++) {
                if (file.path[i] !== previewSourceId.value[i]) {
                  console.log(`     Difference at position ${i}: got "${file.path[i]}" (${file.path.charCodeAt(i)}), expected "${previewSourceId.value[i]}" (${previewSourceId.value.charCodeAt(i)})`)
                  break
                }
              }
            }
          })
        } else {
          console.log('❌ No PDF files found in repository')
        }
        
        // 完全一致を確認
        const exactMatch = pdfFiles.find((file: any) => file.path === previewSourceId.value)
        
        // 類似ファイル検索（より詳細）
        const nameMatch = pdfFiles.filter((file: any) => {
          const fileName = file.path.split('/').pop()?.toLowerCase() || ''
          const targetFileName = previewSourceId.value.split('/').pop()?.toLowerCase() || ''
          return fileName.includes(targetFileName) || targetFileName.includes(fileName)
        })
        
        console.log('')
        if (exactMatch) {
          console.log('✅ PERFECT MATCH FOUND!')
          showToast('完全一致するファイルが見つかりました', 'success')
        } else if (nameMatch.length > 0) {
          console.log('⚠️  Similar file names found:')
          nameMatch.forEach(file => {
            console.log(`   - "${file.path}"`)
          })
          showToast(`類似するファイル名が見つかりました (${nameMatch.length}件)`, 'info')
        } else {
          console.log('❌ No matching files found')
          showToast('該当するPDFファイルが見つかりません', 'warning')
          
          // 提案: 最も類似したファイル
          if (pdfFiles.length > 0) {
            console.log('')
            console.log('💡 Suggestions (all PDF files):')
            pdfFiles.forEach(file => {
              console.log(`   Consider: "${file.path}"`)
            })
          }
        }
      } else {
        console.error('Failed to fetch repository tree:', treeResponse.status)
        showToast(`リポジトリツリーの取得に失敗: ${treeResponse.status}`, 'error')
      }
    } else {
      showToast(`リポジトリにアクセスできません: ${repoResponse.status}`, 'error')
    }
    
  } catch (error) {
    console.error('Repository structure check failed:', error)
    showToast('リポジトリ構造の確認に失敗しました', 'error')
  }
}

async function checkIndexedDBContent() {
  try {
    console.log('=== IndexedDB Content Analysis ===')
    
    // 全てのドキュメントチャンクを取得
    const allChunks = await db.documentChunks.toArray()
    console.log('Total chunks in IndexedDB:', allChunks.length)
    
    // ドキュメントIDでグループ化
    const docGroups = new Map<string, any[]>()
    allChunks.forEach(chunk => {
      if (!docGroups.has(chunk.documentId)) {
        docGroups.set(chunk.documentId, [])
      }
      docGroups.get(chunk.documentId)!.push(chunk)
    })
    
    console.log('Unique documents:', docGroups.size)
    console.log('')
    
    // 各ドキュメントの詳細を表示
    let pdfCount = 0
    for (const [docId, chunks] of docGroups.entries()) {
      const isPdf = docId.toLowerCase().endsWith('.pdf')
      const isPreview = docId.includes(':preview')
      const baseDocId = isPreview ? docId.replace(':preview', '') : docId
      const isTarget = baseDocId === previewSourceId.value
      
      if (isPdf) pdfCount++
      
      const symbol = isTarget ? '🎯' : (isPreview ? '🖼️' : (isPdf ? '📄' : '📝'))
      console.log(`${symbol} Document: "${docId}"`)
      console.log(`   Chunks: ${chunks.length}`)
      console.log(`   Created: ${new Date(chunks[0].createdAt).toLocaleString()}`)
      console.log(`   Is PDF: ${isPdf}, Is Preview: ${isPreview}`)
      
      // 最初のチャンクの内容を少し表示
      const firstChunk = chunks.sort((a, b) => a.chunkIndex - b.chunkIndex)[0]
      const preview = firstChunk.text.substring(0, 100)
      console.log(`   Content preview: "${preview}..."`)
      
      // PDFデータかどうかチェック
      if (isPdf && !isPreview) {
        console.log('   📄 Text search chunk for PDF')
        try {
          // テキスト検索用のチャンクは通常テキスト
          console.log(`   Text length: ${firstChunk.text.length}`)
        } catch {
          console.log('   ⚠️  Unexpected text search chunk format')
        }
      } else if (isPreview) {
        console.log('   🖼️  Preview data chunk for PDF')
        try {
          const parsed = JSON.parse(firstChunk.text)
          if (parsed.type === 'pdf') {
            console.log('   📄 Contains PDF data structure')
            console.log(`   Size: ${parsed.size} bytes`)
            console.log(`   Has base64Data: ${!!parsed.base64Data}`)
            console.log(`   Base64 length: ${parsed.base64Data?.length || 0}`)
          } else {
            console.log('   ⚠️  Preview chunk but not PDF structure')
          }
        } catch {
          console.log('   ❌ Invalid preview data structure')
        }
      }
      
      // embeddingのチェック
      const hasValidEmbedding = firstChunk.embedding && 
                               Array.isArray(firstChunk.embedding) && 
                               firstChunk.embedding.length > 0 &&
                               firstChunk.embedding.some(x => x !== 0)
      console.log(`   Embedding: ${hasValidEmbedding ? '✅ Valid' : '❌ Invalid/Dummy'}`)
      
      console.log('')
    }
    
    console.log(`Summary: ${pdfCount} PDF documents, ${docGroups.size - pdfCount} text documents`)
    
    showToast(`IndexedDB: ${allChunks.length}チャンク, ${docGroups.size}ドキュメント (${pdfCount} PDFs)`, 'info')
    
  } catch (error) {
    console.error('IndexedDB check failed:', error)
    showToast('IndexedDB確認に失敗しました', 'error')
  }
}

function openSettings() {
  // 設定ダイアログを開くためのイベントを発行
  // 親コンポーネントで受け取って設定ダイアログを表示
  const event = new CustomEvent('open-settings', {
    detail: { 
      message: 'PDFプレビューのためにリポジトリを再取得してください',
      tab: 'advanced' // 高度な設定タブを開く
    }
  })
  window.dispatchEvent(event)
  sourcePreviewDialog.value = false // プレビューダイアログを閉じる
  showToast('設定画面でリポジトリを再取得してください', 'info')
}

async function loadConversation() {
  if (!currentConversationId.value) {
    // 新しい会話を作成
    await createNewConversation()
  } else {
    // 既存の会話を読み込む
    const conv = await db.conversations.get(currentConversationId.value)
    if (conv) {
      conversationTitle.value = conv.title
    }
    const rows = await db.messages
      .where('conversationId')
      .equals(currentConversationId.value)
      .toArray()
    messages.value = rows.map(r => ({ 
      role: r.role === 'ai' ? 'AI' : 'User', 
      text: r.text 
    }))
  }
}

async function createNewConversation() {
  const newConv: Conversation = {
    title: '新しい会話',
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
  const id = await db.conversations.add(newConv)
  currentConversationId.value = id as number
  conversationTitle.value = '新しい会話'
  messages.value = []
}

defineExpose({
  loadConversation,
  createNewConversation
})

function handleKeydown(event: KeyboardEvent) {
  // Ctrl+Enter または Cmd+Enter で送信
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    event.preventDefault()
    send()
  }
}

function handleEditKeydown(index: number, event: KeyboardEvent) {
  // Ctrl+Enter または Cmd+Enter で再送信
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    event.preventDefault()
    saveEdit(index)
  }
}

function startEditing(index: number) {
  editingMessageIndex.value = index
  editingText.value = messages.value[index].text
}

function cancelEditing() {
  editingMessageIndex.value = null
  editingText.value = ''
}

async function saveEdit(index: number) {
  if (!editingText.value.trim()) return
  
  const editedText = editingText.value.trim()
  
  // メッセージを更新
  messages.value[index].text = editedText
  
  // DBも更新
  const messageInDb = await db.messages
    .where('conversationId')
    .equals(currentConversationId.value!)
    .toArray()
  
  if (messageInDb[index]) {
    await db.messages.update(messageInDb[index].id!, {
      text: editedText
    })
  }
  
  // 編集後のメッセージ以降を削除
  messages.value = messages.value.slice(0, index + 1)
  
  // DBからも削除
  for (let i = index + 1; i < messageInDb.length; i++) {
    if (messageInDb[i].id) {
      await db.messages.delete(messageInDb[i].id!)
    }
  }
  
  // 編集モードを終了
  editingMessageIndex.value = null
  const textToSend = editingText.value
  editingText.value = ''
  
  // 新しい質問として再送信（inputは使わずに直接処理）
  isLoading.value = true

  // 最初のメッセージ時は一旦タイトル生成をスキップ（応答後に生成）
  const isFirstMessage = messages.value.length === 1

  try {
    // RAG検索
    console.log('Starting RAG search...')
    const topK = props.settings?.advanced?.ragTopK || 3
    const relevantDocs = await search(textToSend, topK)
    console.log('RAG results:', relevantDocs.length, 'documents')
    const context = relevantDocs.map(doc => doc.text).join('\n\n')

    // パーソナルコンテクストを構築
    let systemPrompt = ''
    if (props.settings?.personalContext) {
      const pc = props.settings.personalContext
      const parts = []
      if (pc.name) parts.push(`ユーザー名: ${pc.name}`)
      if (pc.role) parts.push(`役割: ${pc.role}`)
      if (pc.background) parts.push(`背景: ${pc.background}`)
      if (pc.goals) parts.push(`目標: ${pc.goals}`)
      if (pc.learningStyle) parts.push(`希望する学習スタイル: ${pc.learningStyle}`)
      if (pc.preferences) parts.push(`その他の要望: ${pc.preferences}`)
      
      if (parts.length > 0) {
        systemPrompt = `[ユーザー情報]\n${parts.join('\n')}\n\n上記の情報を考慮して、ユーザーに適した形で応答してください。\n\n`
      }
    }

    // Gemini API を呼び出し（コンテキスト付き、ストリーミング）
    let prompt = systemPrompt
    if (context) {
      prompt += `以下の文脈を参考にして質問に答えてください:\n\n${context}\n\n`
    }
    prompt += `質問: ${textToSend}`
    
    const geminiMessages: GeminiMessage[] = [
      { role: 'user', parts: [{ text: prompt }] }
    ]

    console.log('Calling Gemini API with streaming...')
    
    // AI応答用のメッセージを追加（空のテキストで開始）
    const aiMessageIndex = messages.value.length
    const sources = relevantDocs.length > 0 ? relevantDocs.map(doc => ({
      documentId: doc.documentId || doc.metadata?.id || '不明',
      similarity: doc.similarity || 0
    })) : undefined
    
    messages.value.push({ role: 'AI', text: '', sources })
    
    let fullText = ''
    
    // ストリーミングでAIを呼び出し
    await callGeminiAPI('', geminiMessages, true, (chunk) => {
      fullText += chunk
      messages.value[aiMessageIndex].text = fullText
    })
    
    console.log('API call completed, total text length:', fullText.length)

    // AIメッセージをDBに保存
    const aiMsg: Message = { 
      conversationId: currentConversationId.value!,
      role: 'ai', 
      text: fullText, 
      createdAt: Date.now() 
    }
    await db.messages.add(aiMsg)
    
    // 最初のメッセージ時、応答完了後にタイトルを生成
    if (isFirstMessage) {
      const title = await generateTitle(textToSend, fullText)
      conversationTitle.value = title
      await db.conversations.update(currentConversationId.value!, {
        title,
        updatedAt: Date.now()
      })
      emit('titleGenerated', title)
    } else {
      // 会話の更新日時を更新
      await db.conversations.update(currentConversationId.value!, {
        updatedAt: Date.now()
      })
    }
  } catch (error) {
    console.error('Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'エラーが発生しました'
    
    // API制限エラーを優先的に判定
    if (errorMessage.includes('使用量制限') || errorMessage.includes('Quota exceeded')) {
      showToast('⚠️ Gemini API の使用量制限に達しました。24時間後に再試行するか、有料プランにアップグレードしてください。', 'warning')
      messages.value.push({ role: 'AI', text: '⚠️ API使用量制限に達しました。24時間後に再試行するか、有料プランにアップグレードしてください。' })
    } else if (errorMessage.includes('GEMINI_API_KEY') || errorMessage.includes('APIキーが無効')) {
      showToast('APIキーが設定されていないか無効です。設定を確認してください。', 'error')
      messages.value.push({ role: 'AI', text: 'エラー: APIキーが設定されていないか無効です。' })
    } else if (errorMessage.includes('安全性フィルター')) {
      showToast('安全性フィルターによりコンテンツが拒否されました。別の表現で試してください。', 'warning')
      messages.value.push({ role: 'AI', text: 'エラー: 安全性フィルターによりコンテンツが拒否されました。別の表現で試してください。' })
    } else if (errorMessage.includes('fetch') || errorMessage.includes('network')) {
      showToast('ネットワークエラーが発生しました。接続を確認してください。', 'error')
      messages.value.push({ role: 'AI', text: 'エラー: ネットワーク接続を確認してください。' })
    } else if (errorMessage.includes('500') || errorMessage.includes('サーバーでエラー')) {
      showToast('Gemini APIサーバーでエラーが発生しました。しばらく待ってから再試行してください。', 'error')
      messages.value.push({ role: 'AI', text: 'エラー: APIサーバーでエラーが発生しました。しばらく待ってから再試行してください。' })
    } else {
      showToast(`エラー: ${errorMessage}`, 'error')
      messages.value.push({ role: 'AI', text: `エラー: ${errorMessage}` })
    }
  } finally {
    isLoading.value = false
  }
}

async function extractTextFromFile(file: File): Promise<string> {
  if (file.type === 'text/plain') {
    return await file.text()
  } else if (file.type === 'application/pdf') {
    // PDFからテキスト抽出
    const pdfjsLib = await import('pdfjs-dist')
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    let text = ''
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const content = await page.getTextContent()
      text += content.items.map((item: any) => item.str).join(' ') + '\n'
    }
    return text
  }
  return ''
}

function handleDragOver(event: DragEvent) {
  isDragOver.value = true
}

function handleDragLeave(event: DragEvent) {
  // 子要素から離れた場合のみdrag-overを解除
  if (!event.currentTarget.contains(event.relatedTarget as Node)) {
    isDragOver.value = false
  }
}

async function handleDrop(event: DragEvent) {
  isDragOver.value = false
  
  const files = Array.from(event.dataTransfer?.files || [])
  if (files.length === 0) return
  
  // サポートされているファイルタイプのみをフィルタリング
  const supportedFiles = files.filter(file => {
    const extension = file.name.toLowerCase().split('.').pop()
    return extension === 'pdf' || extension === 'txt'
  })
  
  if (supportedFiles.length === 0) {
    showToast('PDFまたはTXTファイルのみ対応しています', 'warning')
    return
  }
  
  // 添付ファイルリストに追加（処理中状態）
  const newAttachedFiles = supportedFiles.map(file => ({
    file,
    status: 'processing' as const
  }))
  attachedFiles.value = [...attachedFiles.value, ...newAttachedFiles]
  
  // ファイルをuploadedFilesに追加
  uploadedFiles.value = [...uploadedFiles.value, ...supportedFiles]
  
  // 自動的に処理を開始
  await handleFileUpload()
}

async function handleFileUpload() {
  if (!uploadedFiles.value.length) return

  try {
    showToast('ドキュメントを処理中...', 'info')
    
    const docs = []
    for (const file of uploadedFiles.value) {
      // 対応するattachedFilesのエントリを見つけて処理中状態に更新
      const attachedFileIndex = attachedFiles.value.findIndex(attached => attached.file === file)
      if (attachedFileIndex !== -1) {
        attachedFiles.value[attachedFileIndex].status = 'processing'
      }
      
      try {
        const text = await extractTextFromFile(file)
        if (!text) {
          // テキスト抽出失敗
          if (attachedFileIndex !== -1) {
            attachedFiles.value[attachedFileIndex].status = 'error'
            attachedFiles.value[attachedFileIndex].message = 'テキストを抽出できませんでした'
          }
          showToast(`${file.name} からテキストを抽出できませんでした`, 'warning')
          continue
        }
        docs.push({ id: file.name, text })
        
        // 成功状態に更新
        if (attachedFileIndex !== -1) {
          attachedFiles.value[attachedFileIndex].status = 'success'
          attachedFiles.value[attachedFileIndex].message = 'インデックス完了'
        }
      } catch (error) {
        // 処理エラー
        if (attachedFileIndex !== -1) {
          attachedFiles.value[attachedFileIndex].status = 'error'
          attachedFiles.value[attachedFileIndex].message = '処理エラー'
        }
        console.error(`Error processing ${file.name}:`, error)
      }
    }

    if (docs.length === 0) {
      showToast('処理可能なドキュメントがありませんでした', 'warning')
      return
    }

    await indexDocuments(docs)
    showToast(`${docs.length}件のドキュメントをインデックスしました`, 'success')
    await updateIndexedDocCount()
    
    // 処理完了後にuploadedFilesをクリア
    uploadedFiles.value = []
  } catch (error) {
    console.error('Indexing error:', error)
    const errorMessage = error instanceof Error ? error.message : '不明なエラー'
    showToast(`インデックスエラー: ${errorMessage}`, 'error')
    
    // エラー時もuploadedFilesをクリア
    uploadedFiles.value = []
  }
}

async function send() {
  if (!input.value || isLoading.value) return
  if (!currentConversationId.value) {
    await createNewConversation()
  }

  const userInput = input.value
  input.value = '' // すぐにクリア
  isLoading.value = true

  // GitHub URLが含まれている場合、自動でフェッチしてインデックス化
  const githubUrlMatch = userInput.match(/https?:\/\/github\.com\/[^\/]+\/[^\/\s]+/)
  if (githubUrlMatch) {
    try {
      showToast('GitHubリポジトリを処理中...', 'info')
      await fetchAndIndexGithubRepo(githubUrlMatch[0])
      showToast('GitHubリポジトリをインデックス化しました', 'success')
    } catch (error) {
      console.error('GitHub fetch error:', error)
      const errorMessage = error instanceof Error ? error.message : '不明なエラー'
      showToast(`GitHubリポジトリの処理に失敗しました: ${errorMessage}`, 'error')
      isLoading.value = false
      return
    }
  }

  // ユーザーメッセージをDBに保存
  const userMsg: Message = { 
    conversationId: currentConversationId.value!,
    role: 'user', 
    text: userInput, 
    createdAt: Date.now() 
  }
  await db.messages.add(userMsg)
  messages.value.push({ role: 'User', text: userInput })

  // 最初のメッセージ時は一旦タイトル生成をスキップ（応答後に生成）
  const isFirstMessage = messages.value.length === 1

  try {
    // RAG検索
    console.log('Starting RAG search...')
    const topK = props.settings?.advanced?.ragTopK || 3
    const relevantDocs = await search(userInput, topK)
    console.log('RAG results:', relevantDocs.length, 'documents')
    const context = relevantDocs.map(doc => doc.text).join('\n\n')

    // パーソナルコンテクストを構築
    let systemPrompt = ''
    if (props.settings?.personalContext) {
      const pc = props.settings.personalContext
      const parts = []
      if (pc.name) parts.push(`ユーザー名: ${pc.name}`)
      if (pc.role) parts.push(`役割: ${pc.role}`)
      if (pc.background) parts.push(`背景: ${pc.background}`)
      if (pc.goals) parts.push(`目標: ${pc.goals}`)
      if (pc.learningStyle) parts.push(`希望する学習スタイル: ${pc.learningStyle}`)
      if (pc.preferences) parts.push(`その他の要望: ${pc.preferences}`)
      
      if (parts.length > 0) {
        systemPrompt = `[ユーザー情報]\n${parts.join('\n')}\n\n上記の情報を考慮して、ユーザーに適した形で応答してください。\n\n`
      }
    }

    // Gemini API を呼び出し（コンテキスト付き、ストリーミング）
    let prompt = systemPrompt
    if (context) {
      prompt += `以下の文脈を参考にして質問に答えてください:\n\n${context}\n\n`
    }
    prompt += `質問: ${userInput}`
    
    const geminiMessages: GeminiMessage[] = [
      { role: 'user', parts: [{ text: prompt }] }
    ]

    console.log('Calling Gemini API with streaming...')
    
    // AI応答用のメッセージを追加（空のテキストで開始）
    const aiMessageIndex = messages.value.length
    const sources = relevantDocs.length > 0 ? relevantDocs.map(doc => ({
      documentId: doc.documentId || doc.metadata?.id || '不明',
      similarity: doc.similarity || 0
    })) : undefined
    
    messages.value.push({ role: 'AI', text: '', sources })
    
    let fullText = ''
    
    // ストリーミングでAIを呼び出し
    await callGeminiAPI('', geminiMessages, true, (chunk) => {
      fullText += chunk
      messages.value[aiMessageIndex].text = fullText
    })
    
    console.log('API call completed, total text length:', fullText.length)

    // AIメッセージをDBに保存
    const aiMsg: Message = { 
      conversationId: currentConversationId.value!,
      role: 'ai', 
      text: fullText, 
      createdAt: Date.now() 
    }
    await db.messages.add(aiMsg)
    
    // 最初のメッセージ時、応答完了後にタイトルを生成
    if (isFirstMessage) {
      const title = await generateTitle(userInput, fullText)
      conversationTitle.value = title
      await db.conversations.update(currentConversationId.value!, {
        title,
        updatedAt: Date.now()
      })
      emit('titleGenerated', title)
    } else {
      // 会話の更新日時を更新
      await db.conversations.update(currentConversationId.value!, {
        updatedAt: Date.now()
      })
    }
  } catch (error) {
    console.error('Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'エラーが発生しました'
    
    // エラーの種類に応じて分類
    if (errorMessage.includes('GEMINI_API_KEY')) {
      showToast('APIキーが設定されていません。管理者に連絡してください。', 'error')
      messages.value.push({ role: 'AI', text: 'エラー: APIキーが設定されていません。' })
    } else if (errorMessage.includes('fetch') || errorMessage.includes('network')) {
      showToast('ネットワークエラーが発生しました。接続を確認してください。', 'error')
      messages.value.push({ role: 'AI', text: 'エラー: ネットワーク接続を確認してください。' })
    } else if (errorMessage.includes('500') || errorMessage.includes('API Error')) {
      showToast('サーバーエラーが発生しました。しばらくしてから再試行してください。', 'error')
      messages.value.push({ role: 'AI', text: 'エラー: サーバーエラーが発生しました。再試行してください。' })
    } else {
      showToast(`エラー: ${errorMessage}`, 'error')
      messages.value.push({ role: 'AI', text: `エラー: ${errorMessage}` })
    }
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
.chat-container {
  max-width: 900px;
  margin: 0 auto;
  padding: 24px 16px;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* モバイルではパディングを小さく */
@media (max-width: 599px) {
  .chat-container {
    padding: 16px 8px;
  }
}

.chat-header {
  margin-bottom: 32px;
}

.chat-title {
  font-size: 32px;
  font-weight: 400;
  margin-bottom: 16px;
  color: #e8eaed;
}

.file-upload {
  max-width: 400px;
}

.indexed-doc-info {
  margin-top: 8px;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  margin-bottom: 24px;
}

.message {
  margin-bottom: 32px;
  animation: fadeIn 0.3s ease-in;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message-content {
  display: flex;
  gap: 16px;
}

/* モバイルではメッセージのギャップを小さく */
@media (max-width: 599px) {
  .message-content {
    gap: 8px;
  }
}

.message-avatar {
  flex-shrink: 0;
}

.message-text {
  flex: 1;
}

.message-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.message-role {
  font-size: 14px;
  font-weight: 500;
  opacity: 0.7;
}

.edit-btn {
  opacity: 0;
  transition: opacity 0.2s;
}

.message:hover .edit-btn {
  opacity: 1;
}

.edit-mode {
  margin-top: 8px;
}

.edit-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.user-text {
  font-size: 16px;
  line-height: 1.6;
  color: #e8eaed;
}

.markdown-content {
  font-size: 16px;
  line-height: 1.6;
  color: #e8eaed;
}

.markdown-content :deep(pre) {
  background: #1e1e1e;
  border-radius: 8px;
  padding: 16px;
  overflow-x: auto;
  margin: 16px 0;
}

.markdown-content :deep(code) {
  background: #1e1e1e;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Roboto Mono', monospace;
}

.markdown-content :deep(pre code) {
  background: transparent;
  padding: 0;
}

.sources-section {
  margin-top: 12px;
}

.sources-header {
  font-size: 12px;
  color: #9aa0a6;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  font-weight: 500;
}

.sources-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.source-chip {
  font-size: 11px;
  height: 24px;
  background: rgba(138, 180, 248, 0.1);
  border-color: rgba(138, 180, 248, 0.3);
}

.source-preview-content {
  max-height: 70vh;
  overflow-y: auto;
  background: #1e1e1e;
  color: #e8eaed;
  padding: 24px;
  border-top: 1px solid #3e3e3e;
}

.source-preview-content pre {
  margin: 0;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
  color: #e8eaed;
  background: transparent;
}

.pdf-preview {
  padding: 16px;
}

.pdf-info {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
  padding: 12px;
  background: rgba(255, 107, 107, 0.1);
  border-radius: 4px;
  border-left: 4px solid #ff6b6b;
}

.pdf-notice {
  margin: 16px 0;
}

.pdf-metadata {
  margin: 16px 0;
}

.pdf-metadata h4 {
  color: #e8eaed;
  font-size: 16px;
  font-weight: 500;
}

.metadata-content {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 4px;
  padding: 16px;
  margin-top: 8px;
}

.pdf-actions {
  padding: 16px;
  border-top: 1px solid #3e3e3e;
}

.action-buttons {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.info-chips {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pdf-viewer {
  max-height: 60vh;
  overflow-y: auto;
  border: 1px solid #3e3e3e;
  border-radius: 4px;
  margin: 16px 0;
}

.pdf-pages {
  padding: 16px;
}

.pdf-page {
  margin-bottom: 24px;
  text-align: center;
}

.pdf-page:last-child {
  margin-bottom: 0;
}

.page-number {
  color: #8ab4f8;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 8px;
}

.pdf-page-image {
  max-width: 100%;
  height: auto;
  border: 1px solid #3e3e3e;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.pdf-loading {
  text-align: center;
  padding: 32px;
  color: #e8eaed;
}

.loading-text {
  font-size: 16px;
  color: #e8eaed;
  display: flex;
  align-items: center;
  gap: 4px;
}

.loading-dots {
  opacity: 0.7;
}

.loading-animation {
  display: inline-block;
  animation: loadingDots 1.5s infinite;
}

@keyframes loadingDots {
  0%, 20% {
    content: '.';
    opacity: 0.2;
  }
  40% {
    content: '..';
    opacity: 0.5;
  }
  60%, 100% {
    content: '...';
    opacity: 1;
  }
}

.input-container {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  background: #1e1e1e;
  padding: 16px 0;
  transition: background-color 0.2s ease;
}

/* デスクトップではサイドバーの幅を考慮 */
@media (min-width: 960px) {
  .input-container {
    left: 280px;
  }
}

.input-container.drag-over {
  background: #2d2d2d;
  border-top: 2px solid #1976d2;
}

.drag-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(25, 118, 210, 0.1);
  backdrop-filter: blur(2px);
  z-index: 10;
  pointer-events: none;
}

.drag-text {
  font-size: 18px;
  font-weight: 500;
  color: #1976d2;
  margin: 0;
}

.drag-subtext {
  font-size: 14px;
  color: #b0b0b0;
  margin: 4px 0 0 0;
}

.input-wrapper {
  margin-bottom: 0;
  position: relative;
}

.attached-files-list {
  margin: 0 16px 8px 16px;
  background: #2a2a2a;
  border-radius: 8px;
  padding: 8px 12px;
  max-height: 200px;
  overflow-y: auto;
}

/* モバイルでは添付ファイルリストをコンパクトに */
@media (max-width: 599px) {
  .attached-files-list {
    margin: 0 8px 8px 8px;
    padding: 6px 8px;
    max-height: 150px;
  }
}

.attached-files-header {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
  padding-bottom: 4px;
  border-bottom: 1px solid #3e3e3e;
}

.attached-files-title {
  font-size: 12px;
  color: #b0b0b0;
  font-weight: 500;
}

.attached-files-items {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.attached-file-item {
  display: flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.05);
  transition: background-color 0.2s ease;
}

.attached-file-item.status-processing {
  background: rgba(255, 152, 0, 0.1);
  border-left: 3px solid #ff9800;
}

.attached-file-item.status-success {
  background: rgba(76, 175, 80, 0.1);
  border-left: 3px solid #4caf50;
}

.attached-file-item.status-error {
  background: rgba(244, 67, 54, 0.1);
  border-left: 3px solid #f44336;
}

.file-name {
  font-size: 13px;
  color: #e8eaed;
  font-weight: 500;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-size {
  font-size: 11px;
  color: #b0b0b0;
  margin-left: 4px;
}

.file-message {
  font-size: 11px;
  font-weight: 500;
}

.search-mode-selector {
  margin: 0 16px 8px 16px;
}

.search-mode-select {
  max-width: 200px;
}

/* モバイルでは検索モード選択をコンパクトに */
@media (max-width: 599px) {
  .search-mode-selector {
    margin: 0 8px 8px 8px;
  }
  
  .search-mode-select {
    max-width: 160px;
  }
}

.search-mode-selection {
  display: flex;
  align-items: center;
  font-size: 13px;
}

.search-mode-title {
  font-weight: 500;
  color: #e8eaed;
}
</style>
