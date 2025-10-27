<template>
  <v-card class="api-key-card" elevation="0" color="transparent">
    <v-text-field
      v-model="apiKey"
      label="Gemini API Key"
      type="password"
      variant="outlined"
      density="comfortable"
      hide-details
      @keyup.enter="save"
    >
      <template v-slot:append>
        <v-btn
          color="primary"
          variant="flat"
          size="small"
          @click="save"
        >
          保存
        </v-btn>
      </template>
    </v-text-field>
  </v-card>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useSettings } from '@/src/utils/settingsManager'

const apiKey = ref('')
const { settings, updateSettings } = useSettings()

onMounted(() => {
  apiKey.value = settings.value.api.geminiApiKey || ''
})

function save() {
  updateSettings({
    api: {
      ...settings.value.api,
      geminiApiKey: apiKey.value
    }
  })
  alert('APIキーを保存しました')
}
</script>

<style scoped>
.api-key-card {
  max-width: 800px;
  margin: 0 auto;
}
</style>
