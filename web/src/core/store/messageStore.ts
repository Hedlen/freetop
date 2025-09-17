import { create } from 'zustand';
import { Message } from '../messaging';

interface MessageStore {
  messages: Message[];
  addMessage: (message: Message) => void;
  updateMessage: (id: string, updates: Partial<Message>) => void;
  deleteMessage: (id: string) => void;
  clearMessages: () => void;
  getMessageById: (id: string) => Message | undefined;
}

export const useMessageStore = create<MessageStore>((set, get) => ({
  messages: [],
  
  addMessage: (message: Message) => {
    set((state) => ({
      messages: [...state.messages, message]
    }));
  },
  
  updateMessage: (id: string, updates: Partial<Message>) => {
    set((state) => ({
      messages: state.messages.map((msg) => {
        if (msg.id === id) {
          // 确保类型安全的更新
          if (msg.type === 'text' && updates.type !== 'multimodal') {
            return { ...msg, ...updates } as Message;
          } else if (msg.type === 'multimodal' && updates.type !== 'text') {
            return { ...msg, ...updates } as Message;
          } else {
            // 如果类型不匹配，只更新非类型相关的字段
            const { type, content, ...safeUpdates } = updates;
            return { ...msg, ...safeUpdates } as Message;
          }
        }
        return msg;
      })
    }));
  },
  
  deleteMessage: (id: string) => {
    set((state) => ({
      messages: state.messages.filter((msg) => msg.id !== id)
    }));
  },
  
  clearMessages: () => {
    set({ messages: [] });
  },
  
  getMessageById: (id: string) => {
    return get().messages.find((msg) => msg.id === id);
  }
}));