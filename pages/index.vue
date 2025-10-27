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
  </v-app>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import ConversationSidebar from '@/components/ConversationSidebar.vue'
import ChatView from '@/components/ChatView.vue'

const currentConversationId = ref<number>()
const sidebarRef = ref<InstanceType<typeof ConversationSidebar>>()
const chatViewRef = ref<InstanceType<typeof ChatView>>()
const appSettings = ref<any>(null)

// PCではサイドバーを常時表示、モバイルでは閉じた状態から開始
const sidebarOpen = ref(false)

onMounted(() => {
  // PCでは常時表示
  if (typeof window !== 'undefined' && window.innerWidth >= 960) {
    sidebarOpen.value = true
  }
  const saved = localStorage.getItem('custardweb_settings')
  if (saved) {
    try {
      appSettings.value = JSON.parse(saved)
    } catch (e) {
      console.error('Failed to parse settings:', e)
    }
  }
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
  appSettings.value = settings
  // 設定をlocalStorageに保存
  try {
    localStorage.setItem('custardweb_settings', JSON.stringify(settings))
  } catch (e) {
    console.error('Failed to save settings:', e)
  }
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
</style>
