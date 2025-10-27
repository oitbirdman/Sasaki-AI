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

const apiKey = ref('')

onMounted(() => {
  const savedKey = localStorage.getItem('GEMINI_API_KEY')
  if (savedKey) {
    apiKey.value = savedKey
  }
})

function save() {
  localStorage.setItem('GEMINI_API_KEY', apiKey.value)
  alert('APIキーを保存しました')
}
</script>

<style scoped>
.api-key-card {
  max-width: 800px;
  margin: 0 auto;
}
</style>
