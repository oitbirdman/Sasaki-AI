<template>
  <v-app>
    <ConversationSidebar
      ref="sidebarRef"
      v-model:drawer="sidebarOpen"
      v-model:currentConversationId="currentConversationId"
      @conversation-changed="handleConversationChanged"
      @new-conversation="handleNewConversation"
      @settings-changed="handleSettingsChanged"
    />
    
    <v-main class="main-container">
      <div class="page-wrapper">
        <div class="header-section">
          <!-- モバイル用ハンバーガーメニュー -->
          <v-btn
            v-if="!$vuetify.display.mdAndUp"
            icon
            variant="text"
            @click="sidebarOpen = !sidebarOpen"
            class="hamburger-menu"
          >
            <v-icon>mdi-menu</v-icon>
          </v-btn>
          <h1 class="app-title">鳥人間チーム 指導AI</h1>
        </div>
        <ChatView
          ref="chatViewRef"
          :conversation-id="currentConversationId"
          :settings="appSettings"
          @title-generated="handleTitleGenerated"
        />
      </div>
    </v-main>

    <!-- 初回セットアップダイアログ -->
    <v-dialog v-model="showSetupDialog" max-width="600" persistent>
      <v-card>
        <v-card-title class="setup-header">
          <v-icon class="mr-2">mdi-rocket-launch</v-icon>
          ようこそ！セットアップを開始しましょう
        </v-card-title>

        <v-card-text class="setup-content">
          <div class="setup-step">
            <v-icon color="primary" class="step-icon">mdi-numeric-1-circle</v-icon>
            <div class="step-content">
              <h3>Google Gemini APIキーを取得</h3>
              <p>AIチャット機能を使用するにはAPIキーが必要です。</p>
              <v-btn
                color="primary"
                variant="outlined"
                prepend-icon="mdi-open-in-new"
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                class="mt-2"
              >
                APIキーを取得 →
              </v-btn>
            </div>
          </div>

          <v-divider class="my-4" />

          <div class="setup-step">
            <v-icon color="primary" class="step-icon">mdi-numeric-2-circle</v-icon>
            <div class="step-content">
              <h3>APIキーを入力</h3>
              <p>取得したAPIキーを以下に入力してください。</p>
              <v-text-field
                v-model="setupApiKey"
                label="Gemini API Key"
                placeholder="AIza..."
                variant="outlined"
                density="comfortable"
                :type="showSetupApiKey ? 'text' : 'password'"
                class="mt-2"
              >
                <template v-slot:append-inner>
                  <v-btn
                    icon
                    size="small"
                    variant="text"
                    @click="showSetupApiKey = !showSetupApiKey"
                  >
                    <v-icon>{{ showSetupApiKey ? 'mdi-eye-off' : 'mdi-eye' }}</v-icon>
                  </v-btn>
                </template>
              </v-text-field>
            </div>
          </div>

          <v-alert type="info" variant="tonal" class="mt-4">
            <strong>セキュリティについて:</strong><br>
            APIキーはブラウザのIndexedDBに安全に保存されます。サーバーに送信されることはありません。
          </v-alert>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn
            color="primary"
            variant="flat"
            :disabled="!setupApiKey.trim()"
            @click="completeSetup"
          >
            セットアップ完了
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-app>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import ConversationSidebar from '@/components/ConversationSidebar.vue'
import ChatView from '@/components/ChatView.vue'
import { useSettings } from '@/src/utils/settingsManager'

const currentConversationId = ref<number>()
const sidebarRef = ref<InstanceType<typeof ConversationSidebar>>()
const chatViewRef = ref<InstanceType<typeof ChatView>>()

// 新しい設定マネージャーを使用
const { settings: appSettings, updateSettings, saveSettings: saveToManager, cleanup } = useSettings()

// PCではサイドバーを常時表示、モバイルでは閉じた状態から開始
const sidebarOpen = ref(false)

// 初回セットアップ関連
const showSetupDialog = ref(false)
const setupApiKey = ref('')
const showSetupApiKey = ref(false)

onMounted(() => {
  // PCでは常時表示
  if (typeof window !== 'undefined' && window.innerWidth >= 960) {
    sidebarOpen.value = true
  }

  // APIキーが未設定の場合、初回セットアップを表示
  nextTick(() => {
    if (!appSettings.value.api?.geminiApiKey) {
      showSetupDialog.value = true
    }
  })
})

onUnmounted(() => {
  cleanup()
})

async function handleConversationChanged(id: number) {
  currentConversationId.value = id
  await chatViewRef.value?.loadConversation()
}

async function handleNewConversation() {
  await chatViewRef.value?.createNewConversation()
  await sidebarRef.value?.loadConversations()
}

async function handleTitleGenerated() {
  await sidebarRef.value?.loadConversations()
}

function handleSettingsChanged(settings: any) {
  // 新しい設定マネージャーを使用して自動保存
  updateSettings(settings)
}

function completeSetup() {
  if (!setupApiKey.value.trim()) return

  // APIキーを設定マネージャーに保存
  updateSettings({
    api: {
      ...appSettings.value.api,
      geminiApiKey: setupApiKey.value.trim()
    }
  })

  showSetupDialog.value = false
  setupApiKey.value = ''

  // セットアップ完了メッセージ
  alert('セットアップが完了しました！AIチャットをお楽しみください。')
}
</script>

<style scoped>
.main-container {
  background: #1e1e1e;
  min-height: 100vh;
}

.page-wrapper {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px 16px;
}

.header-section {
  margin-bottom: 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.hamburger-menu {
  margin-right: 16px;
  color: #e8eaed;
}

.app-title {
  font-size: 28px;
  font-weight: 500;
  margin-bottom: 24px;
  color: #e8eaed;
  text-align: center;
  flex: 1;
}

/* モバイル対応 */
@media (max-width: 599px) {
  .header-section {
    margin-bottom: 16px;
  }
  
  .app-title {
    font-size: 20px;
    margin-bottom: 16px;
  }
}

/* 初回セットアップダイアログのスタイル */
.setup-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 24px;
}

.setup-header .v-icon {
  font-size: 2rem;
}

.setup-content {
  padding: 24px;
}

.setup-step {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 16px;
}

.step-icon {
  font-size: 2rem;
  margin-top: 4px;
}

.step-content h3 {
  margin: 0 0 8px 0;
  font-size: 1.1rem;
  font-weight: 600;
}

.step-content p {
  margin: 0 0 8px 0;
  color: rgba(0, 0, 0, 0.7);
}
</style>
