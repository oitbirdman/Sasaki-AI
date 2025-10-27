import { ref, readonly } from 'vue'
import { db } from '@/src/db'

export interface AppSettings {
  api: {
    geminiApiKey?: string
    geminiModel: string
    temperature: number
    maxTokens: number
  }
  personalContext: {
    name: string
    role: string
    expertise: string
    goals: string
  }
  appearance: {
    theme: string
    fontSize: string
    language: string
  }
  advanced: {
    enableRAG: boolean
    ragSimilarityThreshold: number
    maxContextLength: number
    autoSave: boolean
    enableTypingEffect: boolean
  }
}

const DEFAULT_SETTINGS: AppSettings = {
  api: {
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

class SettingsManager {
  private settings: AppSettings = { ...DEFAULT_SETTINGS }
  private listeners: ((settings: AppSettings) => void)[] = []
  private autoSaveTimer: number | null = null

  constructor() {
    this.loadSettings()
  }

  // 設定を読み込む
  async loadSettings(): Promise<AppSettings> {
    try {
      // IndexedDBから設定を読み込み
      const savedSettings = await db.settings.get('user_settings')
      if (savedSettings?.data) {
        this.settings = { ...DEFAULT_SETTINGS, ...savedSettings.data }
      }

      // localStorageからの後方互換性（古いデータを移行）
      this.migrateFromLocalStorage()

      // APIキーは別途読み込み（セキュリティのため）
      const apiKey = localStorage.getItem('GEMINI_API_KEY')
      if (apiKey) {
        this.settings.api.geminiApiKey = apiKey
      }

      this.notifyListeners()
      return this.settings
    } catch (error) {
      console.error('Failed to load settings:', error)
      return this.settings
    }
  }

  // 設定を保存
  async saveSettings(settings?: Partial<AppSettings>): Promise<void> {
    if (settings) {
      this.settings = { ...this.settings, ...settings }
    }

    try {
      // APIキーはlocalStorageに保存（セキュリティのため分離）
      if (this.settings.api.geminiApiKey) {
        localStorage.setItem('GEMINI_API_KEY', this.settings.api.geminiApiKey)
      }

      // その他の設定はIndexedDBに保存
      const settingsToSave = { ...this.settings }
      delete settingsToSave.api.geminiApiKey // APIキーは保存しない

      await db.settings.put({
        id: 'user_settings',
        data: settingsToSave,
        updatedAt: Date.now()
      })

      this.notifyListeners()
    } catch (error) {
      console.error('Failed to save settings:', error)
      throw error
    }
  }

  // 自動保存（デバウンス）
  autoSave(settings?: Partial<AppSettings>): void {
    if (!this.settings.advanced.autoSave) return

    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer)
    }

    this.autoSaveTimer = window.setTimeout(() => {
      this.saveSettings(settings)
    }, 1000) // 1秒後に保存
  }

  // 設定を取得
  getSettings(): AppSettings {
    return { ...this.settings }
  }

  // 設定を更新（自動保存）
  updateSettings(updates: Partial<AppSettings>): void {
    this.settings = { ...this.settings, ...updates }
    this.autoSave(updates)
    this.notifyListeners()
  }

  // リスナーを登録
  onSettingsChange(listener: (settings: AppSettings) => void): () => void {
    this.listeners.push(listener)
    return () => {
      const index = this.listeners.indexOf(listener)
      if (index > -1) {
        this.listeners.splice(index, 1)
      }
    }
  }

  // 設定をリセット
  async resetSettings(): Promise<void> {
    this.settings = { ...DEFAULT_SETTINGS }
    await this.saveSettings()
    // localStorageもクリア
    localStorage.removeItem('GEMINI_API_KEY')
    localStorage.removeItem('custardweb_settings')
  }

  // localStorageからの移行（後方互換性）
  private migrateFromLocalStorage(): void {
    try {
      const oldSettings = localStorage.getItem('custardweb_settings')
      if (oldSettings) {
        const parsed = JSON.parse(oldSettings)
        this.settings = { ...this.settings, ...parsed }
        // 移行後は古いデータを削除
        localStorage.removeItem('custardweb_settings')
        this.saveSettings()
      }
    } catch (error) {
      console.error('Failed to migrate settings:', error)
    }
  }

  // リスナーに通知
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener({ ...this.settings })
      } catch (error) {
        console.error('Settings listener error:', error)
      }
    })
  }
}

// シングルトンインスタンス
export const settingsManager = new SettingsManager()

// 便利なフック
export function useSettings() {
  const settings = ref<AppSettings>({ ...DEFAULT_SETTINGS })

  // 初期読み込み
  settingsManager.loadSettings().then(loadedSettings => {
    settings.value = loadedSettings
  })

  // 設定変更の監視
  const unsubscribe = settingsManager.onSettingsChange((newSettings) => {
    settings.value = { ...newSettings }
  })

  // コンポーネントのアンマウント時にリスナーを解除
  const cleanup = () => {
    unsubscribe()
  }

  return {
    settings: readonly(settings),
    updateSettings: settingsManager.updateSettings.bind(settingsManager),
    saveSettings: settingsManager.saveSettings.bind(settingsManager),
    resetSettings: settingsManager.resetSettings.bind(settingsManager),
    cleanup
  }
}