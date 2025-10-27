import { defineStore } from 'pinia'

export const useConversationStore = defineStore('conversation', {
  state: () => ({
    conversations: [] as Array<any>
  }),
  actions: {
    add(conv: any) {
      this.conversations.push(conv)
    }
  }
})
