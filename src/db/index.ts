import Dexie from 'dexie'

export interface Message {
  id?: number
  conversationId: number
  role: 'user' | 'ai'
  text: string
  createdAt: number
}

export interface Conversation {
  id?: number
  title: string
  createdAt: number
  updatedAt: number
  isDeleted?: boolean
  deletedAt?: number
}

export interface DocumentChunk {
  id?: number
  documentId: string
  chunkIndex: number
  text: string
  embedding: number[]
  createdAt: number
}

export interface Settings {
  id: string
  data: any
  updatedAt: number
}

export class AppDB extends Dexie {
  messages!: Dexie.Table<Message, number>
  conversations!: Dexie.Table<Conversation, number>
  documentChunks!: Dexie.Table<DocumentChunk, number>
  settings!: Dexie.Table<Settings, string>
  
  constructor() {
    super('custardweb_db')
    this.version(1).stores({ 
      messages: '++id,role,createdAt' 
    })
    // バージョン2: conversationsテーブル追加、messagesにconversationId追加
    this.version(2).stores({
      messages: '++id,conversationId,role,createdAt',
      conversations: '++id,createdAt,updatedAt'
    })
    // バージョン3: documentChunksテーブル追加
    this.version(3).stores({
      messages: '++id,conversationId,role,createdAt',
      conversations: '++id,createdAt,updatedAt',
      documentChunks: '++id,documentId,chunkIndex,createdAt'
    })
    // バージョン4: conversationsにisDeleted, deletedAt追加
    this.version(4).stores({
      messages: '++id,conversationId,role,createdAt',
      conversations: '++id,createdAt,updatedAt,isDeleted,deletedAt',
      documentChunks: '++id,documentId,chunkIndex,createdAt'
    })
    // バージョン5: settingsテーブル追加
    this.version(5).stores({
      messages: '++id,conversationId,role,createdAt',
      conversations: '++id,createdAt,updatedAt,isDeleted,deletedAt',
      documentChunks: '++id,documentId,chunkIndex,createdAt',
      settings: 'id,data,updatedAt'
    })
  }
}

export const db = new AppDB()
