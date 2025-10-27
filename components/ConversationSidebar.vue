<template>
  <v-navigation-drawer
    v-model="drawer"
    :permanent="$vuetify.display.mdAndUp"
    :temporary="!$vuetify.display.mdAndUp"
    width="280"
    overlay-color="rgba(0,0,0,0.5)"
  >
    <v-list density="compact" nav>
      <v-list-item>
        <v-list-item-title class="text-h6">
          {{ showTrash ? 'ゴミ箱' : '会話履歴' }}
        </v-list-item-title>
        <template v-slot:append>
          <v-btn
            v-if="!selectionMode && !showTrash"
            icon="mdi-plus"
            size="small"
            variant="text"
            @click="createNewConversation"
          />
          <v-btn
            v-if="!selectionMode && !showTrash"
            icon="mdi-checkbox-multiple-marked"
            size="small"
            variant="text"
            @click="enterSelectionMode"
          />
          <v-btn
            v-if="!selectionMode"
            :icon="showTrash ? 'mdi-arrow-left' : 'mdi-delete'"
            size="small"
            variant="text"
            @click="toggleTrash"
          />
          <v-btn
            v-if="selectionMode"
            icon="mdi-close"
            size="small"
            variant="text"
            @click="exitSelectionMode"
          />
        </template>
      </v-list-item>
      
      <v-divider />
      
      <!-- Selection mode toolbar -->
      <v-list-item v-if="selectionMode" class="selection-toolbar">
        <v-btn
          size="small"
          variant="text"
          @click="selectAll"
          :disabled="selectedConversations.length === conversations.length"
        >
          全て選択
        </v-btn>
        <v-btn
          size="small"
          variant="text"
          @click="deselectAll"
          :disabled="selectedConversations.length === 0"
        >
          選択解除
        </v-btn>
        <v-spacer />
        <v-btn
          size="small"
          color="error"
          variant="flat"
          @click="deleteSelected"
          :disabled="selectedConversations.length === 0"
        >
          削除 ({{ selectedConversations.length }})
        </v-btn>
      </v-list-item>
      
      <v-divider v-if="selectionMode" />
      
      <v-list-item
        v-for="conv in conversations"
        :key="conv.id"
        :active="!selectionMode && conv.id === currentConversationId"
        @click="handleConversationClick(conv.id!)"
      >
        <template v-slot:prepend v-if="selectionMode">
          <v-checkbox-btn
            :model-value="selectedConversations.includes(conv.id!)"
            @click.stop="toggleSelection(conv.id!)"
            hide-details
            density="compact"
          />
        </template>
        
        <v-list-item-title>{{ conv.title }}</v-list-item-title>
        <v-list-item-subtitle>
          {{ formatDate(conv.updatedAt) }}
        </v-list-item-subtitle>
        
        <template v-slot:append v-if="!selectionMode">
          <v-menu>
            <template v-slot:activator="{ props }">
              <v-btn
                icon="mdi-dots-vertical"
                size="x-small"
                variant="text"
                v-bind="props"
                @click.stop
              />
            </template>
            <v-list density="compact">
              <v-list-item v-if="!showTrash" @click="renameConversation(conv)">
                <v-list-item-title>名前変更</v-list-item-title>
              </v-list-item>
              <v-list-item v-if="showTrash" @click="restoreConversation(conv.id!)">
                <v-list-item-title>復元</v-list-item-title>
              </v-list-item>
              <v-list-item v-if="showTrash" @click="permanentlyDeleteConversation(conv.id!)">
                <v-list-item-title>完全に削除</v-list-item-title>
              </v-list-item>
              <v-list-item v-if="!showTrash" @click="deleteConversation(conv.id!)">
                <v-list-item-title>削除</v-list-item-title>
              </v-list-item>
            </v-list>
          </v-menu>
        </template>
      </v-list-item>
    </v-list>
    
    <!-- Settings section -->
    <template v-slot:append>
      <v-divider />
      <v-list density="compact" nav>
        <v-list-item @click="openSettings">
          <template v-slot:prepend>
            <v-icon>mdi-cog</v-icon>
          </template>
          <v-list-item-title>設定</v-list-item-title>
        </v-list-item>
      </v-list>
    </template>
  </v-navigation-drawer>
    <v-dialog v-model="renameDialog" :max-width="$vuetify.display.xs ? '100vw' : '400'">
      <v-card>
        <v-card-title>会話名を変更</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="newTitle"
            label="新しい名前"
            autofocus
            @keyup.enter="saveRename"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="renameDialog = false">キャンセル</v-btn>
          <v-btn color="primary" @click="saveRename">保存</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  
  <!-- Settings Dialog -->
  <SettingsDialog ref="settingsDialog" @settings-changed="$emit('settings-changed', $event)" />
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { db, Conversation } from '@/src/db'
import SettingsDialog from '@/components/SettingsDialog.vue'

const drawer = defineModel<boolean>('drawer', { 
  default: () => {
    if (typeof window === 'undefined') return true
    return window.innerWidth >= 960 // PCでは常時表示
  }
})
const conversations = ref<Conversation[]>([])
const currentConversationId = defineModel<number>('currentConversationId')
const renameDialog = ref(false)
const selectedConversation = ref<Conversation | null>(null)
const newTitle = ref('')
const selectionMode = ref(false)
const selectedConversations = ref<number[]>([])
const settingsDialog = ref<InstanceType<typeof SettingsDialog>>()
const showTrash = ref(false)

const emit = defineEmits<{
  conversationChanged: [id: number]
  newConversation: []
  settingsChanged: [settings: any]
}>()

onMounted(async () => {
  await loadConversations()
})

async function loadConversations() {
  if (showTrash.value) {
    // Load deleted conversations
    conversations.value = await db.conversations
      .where('isDeleted').equals(1)
      .reverse()
      .sortBy('deletedAt')
  } else {
    // Load active conversations (not deleted)
    conversations.value = await db.conversations
      .filter(c => !c.isDeleted)
      .toArray()
    conversations.value.sort((a, b) => b.updatedAt - a.updatedAt)
  }
}

function toggleTrash() {
  showTrash.value = !showTrash.value
  loadConversations()
}

function handleConversationClick(id: number) {
  if (selectionMode.value) {
    toggleSelection(id)
  } else {
    selectConversation(id)
  }
}

function selectConversation(id: number) {
  currentConversationId.value = id
  emit('conversationChanged', id)
  // モバイルでは会話選択後にdrawerを閉じる
  if (!$vuetify.display.mdAndUp) {
    drawer.value = false
  }
}

function enterSelectionMode() {
  selectionMode.value = true
  selectedConversations.value = []
}

function exitSelectionMode() {
  selectionMode.value = false
  selectedConversations.value = []
}

function toggleSelection(id: number) {
  const index = selectedConversations.value.indexOf(id)
  if (index > -1) {
    selectedConversations.value.splice(index, 1)
  } else {
    selectedConversations.value.push(id)
  }
}

function selectAll() {
  selectedConversations.value = conversations.value.map(c => c.id!).filter(id => id !== undefined)
}

function openSettings() {
  settingsDialog.value?.openDialog()
  // モバイルでは設定ダイアログを開く際にdrawerを閉じる
  if (!$vuetify.display.mdAndUp) {
    drawer.value = false
  }
}

function deselectAll() {
  selectedConversations.value = []
}

async function deleteSelected() {
  if (selectedConversations.value.length === 0) return
  
  const count = selectedConversations.value.length
  if (!confirm(`${count}件の会話をゴミ箱に移動しますか？`)) {
    return
  }
  
  try {
    // 論理削除
    for (const id of selectedConversations.value) {
      await db.conversations.update(id, {
        isDeleted: true,
        deletedAt: Date.now()
      })
    }
    
    // If current conversation was deleted, create new one
    if (selectedConversations.value.includes(currentConversationId.value!)) {
      emit('newConversation')
    }
    
    await loadConversations()
    exitSelectionMode()
  } catch (error) {
    console.error('Failed to delete conversations:', error)
    alert('削除に失敗しました')
  }
}

async function createNewConversation() {
  emit('newConversation')
  await loadConversations()
  // モバイルでは新規会話作成後にdrawerを閉じる
  if (!$vuetify.display.mdAndUp) {
    drawer.value = false
  }
}

function renameConversation(conv: Conversation) {
  selectedConversation.value = conv
  newTitle.value = conv.title
  renameDialog.value = true
}

async function saveRename() {
  if (!selectedConversation.value?.id || !newTitle.value) return
  
  await db.conversations.update(selectedConversation.value.id, {
    title: newTitle.value,
    updatedAt: Date.now()
  })
  
  await loadConversations()
  renameDialog.value = false
}

async function deleteConversation(id: number) {
  if (!confirm('この会話をゴミ箱に移動しますか？')) return
  
  // 論理削除（ゴミ箱に移動）
  await db.conversations.update(id, {
    isDeleted: true,
    deletedAt: Date.now()
  })
  
  await loadConversations()
  
  // 削除した会話が現在の会話なら、新しい会話を作成
  if (currentConversationId.value === id) {
    emit('newConversation')
  }
}

async function restoreConversation(id: number) {
  if (!confirm('この会話を復元しますか？')) return
  
  await db.conversations.update(id, {
    isDeleted: false,
    deletedAt: undefined
  })
  
  await loadConversations()
}

async function permanentlyDeleteConversation(id: number) {
  if (!confirm('この会話を完全に削除しますか？この操作は取り消せません。')) return
  
  // 会話とそのメッセージを物理削除
  await db.messages.where('conversationId').equals(id).delete()
  await db.conversations.delete(id)
  
  await loadConversations()
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  
  if (diffMins < 1) return 'たった今'
  if (diffMins < 60) return `${diffMins}分前`
  if (diffHours < 24) return `${diffHours}時間前`
  if (diffDays < 7) return `${diffDays}日前`
  
  return date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })
}

function handleSettingsChanged(settings: any) {
  emit('settingsChanged', settings)
}

defineExpose({
  loadConversations
})
</script>

<style scoped>
.selection-toolbar {
  background-color: rgba(var(--v-theme-primary), 0.1);
  padding: 8px 12px;
}

.selection-toolbar .v-btn {
  margin: 0 4px;
}
</style>
