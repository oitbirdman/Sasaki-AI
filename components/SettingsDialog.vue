<template>
  <v-dialog v-model="dialog" max-width="800" scrollable>
    <template v-slot:activator="{ props }">
      <v-btn icon v-bind="props" variant="text">
        <v-icon>mdi-cog</v-icon>
      </v-btn>
    </template>

    <v-card>
      <v-card-title class="settings-header">
        <v-icon class="mr-2">mdi-cog</v-icon>
        設定
      </v-card-title>

      <v-divider />

      <v-card-text class="settings-content">
        <v-tabs v-model="tab" color="primary">
          <v-tab value="api">API設定</v-tab>
          <v-tab value="personal">パーソナルコンテクスト</v-tab>
          <v-tab value="appearance">外観</v-tab>
          <v-tab value="advanced">詳細設定</v-tab>
        </v-tabs>

        <v-window v-model="tab" class="mt-4">
          <!-- API設定 -->
          <v-window-item value="api">
            <div class="settings-section">
              <h3 class="section-title">Gemini API設定</h3>
              <p class="section-description">
                Google AI StudioでAPIキーを取得してください。
                <a href="https://aistudio.google.com/app/apikey" target="_blank" class="api-link">
                  APIキーを取得 →
                </a>
              </p>

              <v-text-field
                v-model="settings.api.geminiApiKey"
                label="Gemini API キー"
                placeholder="AIza..."
                variant="outlined"
                density="comfortable"
                :type="showApiKey ? 'text' : 'password'"
                class="mb-3"
              >
                <template v-slot:append-inner>
                  <v-btn
                    icon
                    size="small"
                    variant="text"
                    @click="showApiKey = !showApiKey"
                  >
                    <v-icon>{{ showApiKey ? 'mdi-eye-off' : 'mdi-eye' }}</v-icon>
                  </v-btn>
                </template>
              </v-text-field>

              <v-select
                v-model="settings.api.geminiModel"
                label="Gemini モデル"
                :items="geminiModels"
                variant="outlined"
                density="comfortable"
                class="mb-3"
              ></v-select>

              <v-alert type="info" variant="tonal" class="mb-3">
                <strong>セキュリティについて:</strong><br>
                APIキーはブラウザのlocalStorageに保存されます。
                共有PCでは使用後にクリアしてください。
              </v-alert>

              <v-alert type="warning" variant="tonal" v-if="!settings.api.geminiApiKey">
                <strong>APIキーが未設定です</strong><br>
                AIチャット機能を使用するにはAPIキーが必要です。
              </v-alert>
            </div>
          </v-window-item>
          
          <!-- パーソナルコンテクスト -->
          <v-window-item value="personal">
            <div class="settings-section">
              <h3 class="section-title">基本情報</h3>
              <p class="section-description">
                AIがあなたをより理解するための情報を入力してください。
              </p>

              <v-text-field
                v-model="settings.personalContext.name"
                label="名前"
                placeholder="例: 山田太郎"
                variant="outlined"
                density="comfortable"
                class="mb-3"
              />

              <v-text-field
                v-model="settings.personalContext.role"
                label="役割・所属"
                placeholder="例: 鳥人間チーム パイロット"
                variant="outlined"
                density="comfortable"
                class="mb-3"
              />

              <v-textarea
                v-model="settings.personalContext.background"
                label="背景・経験"
                placeholder="例: 3年目のパイロット。昨年は予選敗退。今年こそ本選出場を目指している。"
                variant="outlined"
                rows="3"
                class="mb-3"
              />

              <v-divider class="my-4" />

              <h3 class="section-title">目標</h3>
              <v-textarea
                v-model="settings.personalContext.goals"
                label="現在の目標"
                placeholder="例: 鳥人間コンテスト本選出場、安定した操縦技術の習得"
                variant="outlined"
                rows="3"
                class="mb-3"
              />

              <v-divider class="my-4" />

              <h3 class="section-title">好みの設定</h3>
              <v-select
                v-model="settings.personalContext.learningStyle"
                label="学習スタイル"
                :items="learningStyles"
                variant="outlined"
                density="comfortable"
                class="mb-3"
              />

              <v-textarea
                v-model="settings.personalContext.preferences"
                label="その他の好み・要望"
                placeholder="例: 具体的な数値やデータを示してほしい、図解があると理解しやすい"
                variant="outlined"
                rows="3"
              />
            </div>
          </v-window-item>

          <!-- 外観 -->
          <v-window-item value="appearance">
            <div class="settings-section">
              <h3 class="section-title">テーマ</h3>
              <v-radio-group v-model="settings.appearance.theme">
                <v-radio label="ダークモード" value="dark" />
                <v-radio label="ライトモード" value="light" />
                <v-radio label="システム設定に従う" value="auto" />
              </v-radio-group>

              <v-divider class="my-4" />

              <h3 class="section-title">フォント</h3>
              <v-slider
                v-model="settings.appearance.fontSize"
                label="フォントサイズ"
                :min="12"
                :max="20"
                :step="1"
                show-ticks="always"
                thumb-label
                class="mb-4"
              />

              <v-divider class="my-4" />

              <h3 class="section-title">メッセージ表示</h3>
              <v-switch
                v-model="settings.appearance.showTimestamps"
                label="タイムスタンプを表示"
                color="primary"
              />
              <v-switch
                v-model="settings.appearance.compactMode"
                label="コンパクト表示"
                color="primary"
              />
            </div>
          </v-window-item>

          <!-- 詳細設定 -->
          <v-window-item value="advanced">
            <div class="settings-section">
              <h3 class="section-title">AI応答設定</h3>
              
              <v-slider
                v-model="settings.advanced.temperature"
                label="創造性（Temperature）"
                :min="0"
                :max="2"
                :step="0.1"
                show-ticks="always"
                thumb-label
                class="mb-2"
              />
              <p class="setting-hint">
                低い値: より一貫性のある応答、高い値: より創造的な応答
              </p>

              <v-slider
                v-model="settings.advanced.maxTokens"
                label="最大トークン数"
                :min="512"
                :max="4096"
                :step="256"
                show-ticks="always"
                thumb-label
                class="mb-2 mt-4"
              />
              <p class="setting-hint">
                応答の最大長を制限します
              </p>

              <v-divider class="my-4" />

              <h3 class="section-title">RAG設定</h3>
              
              <v-text-field
                v-model="settings.advanced.githubSourceRepoUrl"
                label="ソースリポジトリ URL"
                placeholder="https://github.com/username/source-repo"
                variant="outlined"
                density="comfortable"
                class="mb-3"
                hint="このアプリのソースコードがあるGitHubリポジトリのURL"
                persistent-hint
              />
              
              <v-text-field
                v-model="settings.advanced.githubRepoUrl"
                label="GitHub リポジトリ URL"
                placeholder="https://github.com/username/repo"
                variant="outlined"
                density="comfortable"
                class="mb-3"
                hint="学習したいGitHubリポジトリのURL（入力後自動的にインデックス化されます）"
                persistent-hint
              />
              
              <v-text-field
                v-model="settings.advanced.githubPat"
                label="GitHub Personal Access Token (PAT)"
                placeholder="ghp_..."
                variant="outlined"
                density="comfortable"
                :type="showPat ? 'text' : 'password'"
                class="mb-3"
                hint="非公開リポジトリの場合に必要です"
                persistent-hint
              >
                <template v-slot:append-inner>
                  <v-btn
                    icon
                    size="small"
                    variant="text"
                    @click="showPat = !showPat"
                  >
                    <v-icon>{{ showPat ? 'mdi-eye-off' : 'mdi-eye' }}</v-icon>
                  </v-btn>
                </template>
              </v-text-field>
              
              <v-alert type="warning" variant="tonal" class="mb-3" v-if="settings.advanced.githubPat">
                <strong>セキュリティ注意:</strong><br>
                PATはブラウザのlocalStorageに保存されます。
                共有PCでは使用後に設定をクリアしてください。
                本番環境ではGitHub Actions Secretsを使用することを推奨します。
              </v-alert>
              
              <v-alert type="info" variant="tonal" class="mb-3">
                <strong>自動インデックス化:</strong><br>
                URLを入力または変更すると自動的にリポジトリをインデックス化します。設定画面を開いた時に未インデックスの場合も自動取得されます。
              </v-alert>
              
              <v-btn
                color="primary"
                variant="text"
                prepend-icon="mdi-refresh"
                @click="fetchGithubRepo"
                :loading="isLoadingGithub"
                :disabled="!settings.advanced.githubRepoUrl || isLoadingGithub"
                class="mb-3"
                size="small"
              >
                最新の状態に更新
              </v-btn>
              
              <v-alert v-if="githubStatus.message" :type="githubStatus.type" variant="tonal" class="mb-3">
                {{ githubStatus.message }}
              </v-alert>
              
              <v-alert v-if="indexStatus.message" :type="indexStatus.type" variant="tonal" class="mb-3">
                {{ indexStatus.message }}
                <template v-if="indexStatus.type === 'warning'">
                  <v-btn
                    color="primary"
                    variant="outlined"
                    size="small"
                    class="mt-2"
                    @click="triggerWorkflow"
                    :loading="isTriggeringWorkflow"
                    :disabled="!settings.advanced.githubPat"
                  >
                    インデックス生成を開始
                  </v-btn>
                  <p class="text-caption mt-1">
                    ※ PATが必要です。生成には数分かかります。
                  </p>
                </template>
              </v-alert>
              
              <v-divider class="my-3" />
              
              <v-slider
                v-model="settings.advanced.ragTopK"
                label="検索結果数（Top-K）"
                :min="1"
                :max="10"
                :step="1"
                show-ticks="always"
                thumb-label
                class="mb-2"
              />
              <p class="setting-hint">
                関連情報として取得するチャンク数
              </p>

              <v-divider class="my-4" />

              <h3 class="section-title">データ管理</h3>
              
              <div class="mb-3">
                <h4 class="subsection-title">バックアップ</h4>
                <v-btn
                  color="primary"
                  variant="outlined"
                  prepend-icon="mdi-download"
                  @click="exportData"
                  class="mr-2 mb-2"
                >
                  データをエクスポート
                </v-btn>
                <v-btn
                  color="primary"
                  variant="outlined"
                  prepend-icon="mdi-upload"
                  @click="$refs.importInput.click()"
                  class="mb-2"
                >
                  データをインポート
                </v-btn>
                <input
                  ref="importInput"
                  type="file"
                  accept=".json"
                  style="display: none"
                  @change="importData"
                />
              </div>
              
              <v-divider class="my-3" />
              
              <h4 class="subsection-title">削除</h4>
              <v-btn
                color="warning"
                variant="outlined"
                prepend-icon="mdi-delete-sweep"
                @click="clearConversations"
                class="mb-3"
              >
                全ての会話を削除
              </v-btn>
              <br />
              <v-btn
                color="error"
                variant="outlined"
                prepend-icon="mdi-database-remove"
                @click="clearAllData"
              >
                全てのデータを削除（RAG含む）
              </v-btn>
            </div>
            
            <v-divider class="my-4" />
            
            <h3 class="section-title">設定管理</h3>
            
            <div class="mb-3">
              <h4 class="subsection-title">バックアップ</h4>
              <v-btn
                color="primary"
                variant="outlined"
                prepend-icon="mdi-download"
                @click="exportSettings"
                class="mb-2"
              >
                設定をエクスポート
              </v-btn>
              <p class="setting-hint">
                現在の設定のみをJSONファイルとして保存します
              </p>
              
              <v-divider class="my-3" />
              
              <h4 class="subsection-title">リストア</h4>
              <v-btn
                color="primary"
                variant="outlined"
                prepend-icon="mdi-upload"
                @click="$refs.settingsImportInput.click()"
                class="mb-2"
              >
                設定をインポート
              </v-btn>
              <input
                ref="settingsImportInput"
                type="file"
                accept=".json"
                style="display: none"
                @change="importSettings"
              />
              <p class="setting-hint">
                エクスポートした設定ファイルを読み込んで適用します
              </p>
              
              <v-divider class="my-3" />
              
              <h4 class="subsection-title">リセット</h4>
              <v-btn
                color="warning"
                variant="outlined"
                prepend-icon="mdi-restore"
                @click="resetSettings"
                class="mb-2"
              >
                設定を初期化
              </v-btn>
              <p class="setting-hint">
                全ての設定をデフォルト値に戻します
              </p>
            </div>
          </v-window-item>
        </v-window>
      </v-card-text>

      <v-divider />

      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="dialog = false">
          キャンセル
        </v-btn>
        <v-btn color="primary" variant="flat" @click="saveSettings">
          保存
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, onUnmounted } from 'vue'
import { db } from '@/src/db'
import { clearAllDocuments } from '@/src/rag/rag'
import { useSettings } from '@/src/utils/settingsManager'

const dialog = ref(false)
const tab = ref('api')
const showApiKey = ref(false)
const showPat = ref(false)

// 新しい設定マネージャーを使用
const { settings, updateSettings, saveSettings: saveToManager, cleanup } = useSettings()

const isLoadingGithub = ref(false)
const githubStatus = ref<{ message: string; type: 'success' | 'error' | 'info' | 'warning' }>({
  message: '',
  type: 'info'
})
const indexStatus = ref<{ message: string; type: 'success' | 'error' | 'info' | 'warning' }>({
  message: '',
  type: 'info'
})
const isTriggeringWorkflow = ref(false)

// 設定インポート用のref
const settingsImportInput = ref<HTMLInputElement | null>(null)
const importInput = ref<HTMLInputElement | null>(null)

const learningStyles = [
  '簡潔な要点のみ',
  '詳細な説明',
  'ステップバイステップ',
  '例示中心',
  '図解・視覚的説明'
]

const geminiModels = [
  { title: 'Gemini 2.5 Pro (Experimental)', value: 'gemini-2.5-pro-exp' },
  { title: 'Gemini 2.5 Flash (Experimental)', value: 'gemini-2.5-flash-exp' },
  { title: 'Gemini 2.0 Flash (Experimental)', value: 'gemini-2.0-flash-exp' },
  { title: 'Gemini 2.0 Flash Thinking (Experimental)', value: 'gemini-2.0-flash-thinking-exp' },
  { title: 'Gemini 1.5 Pro', value: 'gemini-1.5-pro' },
  { title: 'Gemini 1.5 Flash', value: 'gemini-1.5-flash' }
]

const emit = defineEmits<{
  settingsChanged: [settings: Settings]
}>()

onMounted(async () => {
  // 設定読み込み後、リポジトリURLが設定されている場合は自動取得を試みる
  await new Promise(resolve => setTimeout(resolve, 500))
  if (settings.value.advanced.githubRepoUrl && settings.value.advanced.githubRepoUrl.trim()) {
    // インデックス済みドキュメント数を確認
    const { getIndexedDocumentCount } = await import('@/src/rag/rag')
    const docCount = await getIndexedDocumentCount()
    
    // インデックスが空、または非常に少ない場合は自動取得
    if (docCount === 0) {
      githubStatus.value = { message: 'リポジトリを自動取得中...', type: 'info' }
      await fetchGithubRepo()
    }
  }
})

onUnmounted(() => {
  cleanup()
})

// 設定の変更を監視して自動保存
watch(settings, (newSettings) => {
  updateSettings(newSettings)
  emit('settingsChanged', newSettings)
}, { deep: true })

// GitHubリポジトリURLの変更を監視して自動インデックス化
watch(() => settings.value.advanced.githubRepoUrl, async (newUrl, oldUrl) => {
  if (newUrl && newUrl !== oldUrl && newUrl.trim()) {
    // URLが変更されて空でない場合、自動的にインデックス化
    await new Promise(resolve => setTimeout(resolve, 1000)) // 1秒待機（入力完了を待つ）
    if (settings.value.advanced.githubRepoUrl === newUrl) {
      // 入力が安定したら自動取得
      await fetchGithubRepo()
    }
  }
})



function saveSettings() {
  saveToManager(settings.value)
  emit('settingsChanged', settings.value)
  dialog.value = false
  
  // Show success message
  alert('設定を保存しました')
}

async function exportData() {
  try {
    // Get all data from IndexedDB
    const conversations = await db.conversations.toArray()
    const messages = await db.messages.toArray()
    const documentChunks = await db.documentChunks.toArray()
    
    const exportData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      conversations,
      messages,
      documentChunks,
      settings: settings.value
    }
    
    // Create download link
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `custardweb-backup-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
    
    alert('データをエクスポートしました')
  } catch (error) {
    console.error('Export error:', error)
    alert('エクスポートに失敗しました')
  }
}

async function importData(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  
  try {
    const text = await file.text()
    const importData = JSON.parse(text)
    
    // Validate data structure
    if (!importData.conversations || !importData.messages) {
      throw new Error('Invalid backup file format')
    }
    
    if (!confirm(`${importData.conversations.length}件の会話をインポートしますか？既存のデータは保持されます。`)) {
      return
    }
    
    // Import conversations
    for (const conv of importData.conversations) {
      const { id, ...convData } = conv
      await db.conversations.add(convData)
    }
    
    // Import messages
    for (const msg of importData.messages) {
      const { id, ...msgData } = msg
      await db.messages.add(msgData)
    }
    
    // Import document chunks if available
    if (importData.documentChunks) {
      for (const chunk of importData.documentChunks) {
        const { id, ...chunkData } = chunk
        await db.documentChunks.add(chunkData)
      }
    }
    
    // Import settings if available
    if (importData.settings) {
      settings.value = { ...settings.value, ...importData.settings }
      localStorage.setItem('custardweb_settings', JSON.stringify(settings.value))
    }
    
    alert('データをインポートしました。ページをリロードします。')
    window.location.reload()
  } catch (error) {
    console.error('Import error:', error)
    alert('インポートに失敗しました: ' + (error instanceof Error ? error.message : '不明なエラー'))
  } finally {
    // Reset file input
    (event.target as HTMLInputElement).value = ''
  }
}

async function clearConversations() {
  if (!confirm('全ての会話履歴を削除しますか？この操作は取り消せません。')) {
    return
  }
  
  try {
    await db.messages.clear()
    await db.conversations.clear()
    alert('会話履歴を削除しました')
    window.location.reload()
  } catch (e) {
    console.error('Failed to clear conversations:', e)
    alert('削除に失敗しました')
  }
}

async function clearAllData() {
  if (!confirm('全てのデータ（会話履歴、RAGインデックス）を削除しますか？この操作は取り消せません。')) {
    return
  }
  
  try {
    await db.messages.clear()
    await db.conversations.clear()
    await clearAllDocuments()
    localStorage.removeItem('custardweb_settings')
    alert('全てのデータを削除しました')
    window.location.reload()
  } catch (e) {
    console.error('Failed to clear all data:', e)
    alert('削除に失敗しました')
  }
}

// 設定のみのバックアップ
async function exportSettings() {
  try {
    const exportData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      type: 'settings-only',
      settings: settings.value
    }
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `custardweb-settings-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
    
    alert('設定をエクスポートしました')
  } catch (error) {
    console.error('Settings export error:', error)
    alert('設定のエクスポートに失敗しました')
  }
}

// 設定のみのリストア
async function importSettings(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  
  try {
    const text = await file.text()
    const importData = JSON.parse(text)
    
    if (importData.type !== 'settings-only' || !importData.settings) {
      throw new Error('無効な設定ファイルです')
    }
    
    // 設定を更新（APIキーは上書きしない）
    const newSettings = { ...importData.settings }
    if (settings.value.api?.geminiApiKey) {
      newSettings.api = { ...newSettings.api, geminiApiKey: settings.value.api.geminiApiKey }
    }
    
    updateSettings(newSettings)
    await saveToManager(newSettings)
    
    alert('設定をインポートしました')
  } catch (error) {
    console.error('Settings import error:', error)
    alert('設定のインポートに失敗しました: ' + (error instanceof Error ? error.message : '不明なエラー'))
  } finally {
    (event.target as HTMLInputElement).value = ''
  }
}

// 設定をリセット
async function resetSettings() {
  if (!confirm('全ての設定をデフォルトに戻しますか？APIキーを除く全ての設定がリセットされます。')) {
    return
  }
  
  try {
    const defaultSettings = {
      api: {
        geminiApiKey: settings.value.api?.geminiApiKey || '', // APIキーは保持
        geminiModel: 'gemini-2.0-flash-exp',
        temperature: 0.7,
        maxTokens: 2048
      },
      personalContext: {
        name: '',
        role: '鳥人間チームメンバー',
        expertise: '航空力学、機体設計',
        goals: '安全で効率的な飛行の実現'
      },
      appearance: {
        theme: 'dark',
        fontSize: 'medium',
        language: 'ja'
      },
      advanced: {
        enableRAG: true,
        ragSimilarityThreshold: 0.7,
        maxContextLength: 4000,
        autoSave: true,
        enableTypingEffect: true
      }
    }
    
    updateSettings(defaultSettings)
    await saveToManager(defaultSettings)
    
    alert('設定をリセットしました')
  } catch (error) {
    console.error('Settings reset error:', error)
    alert('設定のリセットに失敗しました')
  }
}

async function fetchGithubRepo() {
  const repoUrl = settings.value.advanced.githubRepoUrl.trim()
  if (!repoUrl) {
    githubStatus.value = { message: 'GitHub URLを入力してください', type: 'warning' }
    return
  }

  // Parse GitHub URL
  const urlMatch = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/)
  if (!urlMatch) {
    githubStatus.value = { message: '無効なGitHub URLです。形式: https://github.com/username/repo', type: 'error' }
    return
  }

  const [, owner, repo] = urlMatch
  const cleanRepo = repo.replace(/\.git$/, '')

  isLoadingGithub.value = true
  githubStatus.value = { message: 'GitHubリポジトリを取得中...', type: 'info' }

  try {
    // GitHub API経由でリポジトリの内容を取得
    const apiUrl = `https://api.github.com/repos/${owner}/${cleanRepo}/git/trees/main?recursive=1`
    
    const headers: Record<string, string> = {
      'User-Agent': 'CustardWeb/1.0'
    }
    
    if (settings.value.advanced.githubPat) {
      headers['Authorization'] = `token ${settings.value.advanced.githubPat}`
    }
    
    const response = await fetch(apiUrl, { headers })
    if (!response.ok) {
      // mainブランチが存在しない場合、masterを試す
      const masterUrl = `https://api.github.com/repos/${owner}/${cleanRepo}/git/trees/master?recursive=1`
      const masterResponse = await fetch(masterUrl, { headers })
      if (!masterResponse.ok) {
        const errorText = await response.text()
        let errorMessage = 'リポジトリの取得に失敗しました。'
        if (response.status === 404) {
          errorMessage += 'リポジトリが存在しないか、アクセス権限がありません。'
        } else if (response.status === 401) {
          errorMessage += 'PATが無効か、権限が不足しています。'
        } else if (response.status === 403) {
          errorMessage += 'アクセスが拒否されました。PATの権限を確認してください。'
        } else {
          errorMessage += `HTTP ${response.status}: ${errorText}`
        }
        throw new Error(errorMessage)
      }
      const data = await masterResponse.json()
      await processGithubTree(data, owner, cleanRepo, 'master', headers)
    } else {
      const data = await response.json()
      await processGithubTree(data, owner, cleanRepo, 'main', headers)
    }

    githubStatus.value = { message: 'GitHubから資料を取得してインデックス化しました', type: 'success' }
  } catch (error) {
    console.error('GitHub fetch error:', error)
    const errorMessage = error instanceof Error ? error.message : '不明なエラー'
    githubStatus.value = { message: `エラー: ${errorMessage}`, type: 'error' }
  } finally {
    isLoadingGithub.value = false
  }
}

async function triggerWorkflow() {
  const sourceRepoUrl = settings.value.advanced.githubSourceRepoUrl.trim()
  const docsRepoUrl = settings.value.advanced.githubRepoUrl.trim()
  const pat = settings.value.advanced.githubPat.trim()

  if (!sourceRepoUrl || !docsRepoUrl || !pat) {
    indexStatus.value = { message: 'ソースリポジトリURL、資料リポジトリURL、PATが必要です', type: 'error' }
    return
  }

  const sourceMatch = sourceRepoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/)
  if (!sourceMatch) {
    indexStatus.value = { message: 'ソースリポジトリURLの形式が無効です', type: 'error' }
    return
  }

  const [, sourceOwner, sourceRepo] = sourceMatch

  isTriggeringWorkflow.value = true
  indexStatus.value = { message: 'ワークフローを起動中...', type: 'info' }

  try {
    const apiUrl = `https://api.github.com/repos/${sourceOwner}/${sourceRepo}/actions/workflows/fetch-and-deploy.yml/dispatches`
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `token ${pat}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ref: 'main', // または適切なブランチ
        inputs: {
          repo_url: docsRepoUrl
        }
      })
    })

    if (response.ok) {
      indexStatus.value = { message: 'ワークフローを起動しました。数分後にインデックスが生成されます。', type: 'success' }
    } else {
      let errorMessage = 'ワークフロー起動失敗: '
      if (response.status === 404) {
        errorMessage += 'ワークフローファイルが見つからないか、リポジトリが存在しません。'
      } else if (response.status === 401) {
        errorMessage += 'PATが無効です。'
      } else if (response.status === 403) {
        errorMessage += 'ワークフロー実行権限がありません。PATの権限を確認してください。'
      } else {
        try {
          const errorData = await response.json()
          errorMessage += `${response.status} ${errorData.message || '不明なエラー'}`
        } catch {
          errorMessage += `HTTP ${response.status}`
        }
      }
      throw new Error(errorMessage)
    }
  } catch (error) {
    console.error('Workflow trigger error:', error)
    const errorMessage = error instanceof Error ? error.message : '不明なエラー'
    indexStatus.value = { message: `エラー: ${errorMessage}`, type: 'error' }
  } finally {
    isTriggeringWorkflow.value = false
  }
}

async function checkIndexExists(repoUrl: string): Promise<boolean> {
  const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/)
  if (!match) {
    indexStatus.value = { message: 'URL形式が無効です', type: 'error' }
    return false
  }

  const [, owner, repo] = match
  const cleanRepo = repo.replace(/\.git$/, '')
  const indexUrl = `/indexes/${owner}_${cleanRepo}.json`

  try {
    const response = await fetch(indexUrl, { method: 'HEAD' })
    if (response.ok) {
      indexStatus.value = { message: 'このリポジトリのインデックスが既に存在します', type: 'success' }
      return true
    } else if (response.status === 404) {
      indexStatus.value = { message: 'インデックスが見つかりません。生成する必要があります。', type: 'warning' }
      return false
    } else {
      indexStatus.value = { message: `インデックス確認エラー: HTTP ${response.status}`, type: 'error' }
      return false
    }
  } catch (error) {
    console.warn('Index check error:', error)
    indexStatus.value = { message: 'インデックス確認中にネットワークエラーが発生しました', type: 'error' }
    return false
  }
}

async function processGithubTree(treeData: any, owner: string, repo: string, branch: string, headers: Record<string, string> = {}) {
  const { indexDocuments } = await import('@/src/rag/rag')
  
  // テキストファイルとPDFファイルを取得（READMEは除外）
  const allowedExtensions = ['.md', '.txt', '.py', '.js', '.ts', '.vue', '.json', '.yaml', '.yml', '.toml', '.ini', '.cfg', '.conf', '.pdf']
  const textFiles = treeData.tree.filter((item: any) => {
    const isBlob = item.type === 'blob'
    const hasAllowedExt = allowedExtensions.some(ext => item.path.toLowerCase().endsWith(ext))
    const isNotReadme = !item.path.toLowerCase().includes('readme')
    return isBlob && hasAllowedExt && isNotReadme
  })

  if (textFiles.length === 0) {
    throw new Error('テキストファイルが見つかりませんでした')
  }

  githubStatus.value = { message: `${textFiles.length}件のファイルを処理中...`, type: 'info' }

  const docs = []
  let processedCount = 0
  
  // 最大50ファイルまで処理（制限）
  const filesToProcess = textFiles.slice(0, 50)
  
  for (const file of filesToProcess) {
    try {
      // GitHub API Content API を使用（CORSに対応）
      const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${file.path}?ref=${branch}`
      
      const apiHeaders: Record<string, string> = {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'CustardWeb/1.0'
      }
      
      // PAT が設定されている場合のみ Authorization ヘッダーを追加
      if (settings.value.advanced.githubPat) {
        apiHeaders['Authorization'] = `token ${settings.value.advanced.githubPat}`
      }
      
      const fileResponse = await fetch(apiUrl, { headers: apiHeaders })
      
      if (fileResponse.ok) {
        const fileData = await fileResponse.json()
        
        // Base64でエンコードされたコンテンツをデコード
        if (fileData.content && fileData.encoding === 'base64') {
          let text = ''
          
          if (file.path.toLowerCase().endsWith('.pdf')) {
            // PDFファイルの場合、テキスト検索用とプレビュー用を分離して保存
            const base64Content = fileData.content.replace(/\n/g, '')

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

              console.log(`Extracted ${pdfText.length} characters from PDF: ${file.path}`)

              // テキストが抽出できた場合はembeddingを計算
              if (pdfText.trim().length > 50) {
                const { getEmbedding } = await import('@/src/rag/rag')
                embedding = await getEmbedding(pdfText.substring(0, 2000)) // 最初の2000文字でembedding計算
                console.log('PDF embedding calculated successfully for:', file.path)
              } else {
                console.warn('PDF text extraction yielded insufficient content, using dummy embedding for:', file.path)
                embedding = new Array(768).fill(0)
              }
            } catch (error) {
              console.error('Failed to extract text from PDF:', file.path, error)
              console.warn('Using dummy embedding for PDF:', file.path)
              embedding = new Array(768).fill(0)
            }

            // テキスト検索用のチャンクを保存（抽出テキストのみ）
            const documentId = `github:${owner}/${repo}:${file.path}`
            const { db } = await import('@/src/db')

            // 既存のチャンクを削除
            await db.documentChunks.where('documentId').equals(documentId).delete()

            // テキスト検索用のチャンクを追加
            const textChunk = {
              documentId: documentId,
              chunkIndex: 0,
              text: pdfText.trim() || `PDF Document: ${file.path} (テキスト抽出に失敗しました)`,
              embedding: embedding,
              createdAt: Date.now()
            }

            await db.documentChunks.add(textChunk)

            // プレビュー用のPDFデータを別途保存
            const previewData = {
              type: 'pdf',
              path: file.path,
              size: fileData.size,
              base64Data: base64Content,
              metadata: `PDF Document: ${file.path}\nSize: ${fileData.size} bytes\nPages: ${pdfText.split('\n').length - 1}\nExtracted text length: ${pdfText.length} characters`
            }

            const previewChunk = {
              documentId: `${documentId}:preview`,
              chunkIndex: 0,
              text: JSON.stringify(previewData),
              embedding: new Array(768).fill(0), // プレビューデータは検索対象外
              createdAt: Date.now()
            }

            await db.documentChunks.add(previewChunk)

            processedCount++

            // PDFの場合はdocs配列に追加しない（既に保存済み）
            continue
          } else {
            // テキストファイルの場合、UTF-8デコード
            const base64Content = fileData.content.replace(/\n/g, '')
            const binaryString = atob(base64Content)
            const bytes = new Uint8Array(binaryString.length)
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i)
            }
            text = new TextDecoder('utf-8').decode(bytes)
          }
          
          // 空のファイルや非常に短いファイルはスキップ
          if (text.trim().length > 10) {
            docs.push({
              id: `github:${owner}/${repo}:${file.path}`,
              text: `# ${file.path}\n\n${text}`
            })
            processedCount++
          }
        }
      } else {
        console.warn(`Failed to fetch ${file.path}: HTTP ${fileResponse.status}`)
      }
      
      // レート制限対策（少し待機）
      await new Promise(resolve => setTimeout(resolve, 100))
    } catch (error) {
      console.warn(`Failed to fetch ${file.path}:`, error)
    }
  }

  if (docs.length === 0) {
    throw new Error('ファイルの取得に失敗しました。PATの権限やネットワーク接続を確認してください。')
  }

  // RAGにインデックス
  await indexDocuments(docs)
  
  githubStatus.value = { message: `${processedCount}件のファイルをインデックス化しました`, type: 'success' }
}

// Export settings for external use
defineExpose({
  settings,
  openDialog: () => dialog.value = true
})
</script>

<style scoped>
.settings-header {
  padding: 20px 24px;
  font-size: 1.25rem;
  font-weight: 500;
}

.settings-content {
  padding: 24px;
  min-height: 400px;
}

.settings-section {
  padding: 8px 0;
}

.section-title {
  font-size: 1.1rem;
  font-weight: 500;
  margin-bottom: 8px;
  color: rgb(var(--v-theme-primary));
}

.subsection-title {
  font-size: 0.95rem;
  font-weight: 500;
  margin-bottom: 12px;
  color: rgba(255, 255, 255, 0.9);
}

.section-description {
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.9rem;
  margin-bottom: 16px;
}

.api-link {
  color: rgb(var(--v-theme-primary));
  text-decoration: none;
  font-weight: 500;
}

.api-link:hover {
  text-decoration: underline;
}

.setting-hint {
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.85rem;
  margin-top: -8px;
  margin-bottom: 8px;
}
</style>
