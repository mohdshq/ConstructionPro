import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ChatMessage {
    id: string;
    text: string;
    sender: 'ai' | 'user';
    timestamp: number;
}

interface AIState {
    messages: ChatMessage[];
    addMessage: (msg: ChatMessage) => void;
    clearHistory: () => void;
}

export const useAIStore = create<AIState>()(
    persist(
        (set): AIState => ({
            messages: [
                {
                    id: 'welcome_1',
                    text: 'Good morning. I am your AI Assistant. How can I help you with construction standards, codes, or site management today?',
                    sender: 'ai',
                    timestamp: Date.now()
                }
            ],
            addMessage: (msg) => set((state) => ({ messages: [...state.messages, msg] })),
            clearHistory: () => set({ 
                messages: [{
                    id: 'welcome_1',
                    text: 'Chat history cleared. How can I assist you today?',
                    sender: 'ai',
                    timestamp: Date.now()
                }]
            }),
        }),
        {
            name: 'ai-storage',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);
