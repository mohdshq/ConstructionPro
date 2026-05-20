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

const welcomeMessage = (text: string): ChatMessage => ({
    id: 'welcome_1',
    text,
    sender: 'ai',
    timestamp: Date.now(),
});

export const useAIStore = create<AIState>()(
    persist(
        (set) => ({
            messages: [
                welcomeMessage(
                    'Good morning. I am your AI Assistant. How can I help you with construction standards, codes, or site management today?'
                ),
            ],
            addMessage: (msg) =>
                set((state) => ({ messages: [...state.messages, msg] })),
            clearHistory: () =>
                set({
                    messages: [
                        welcomeMessage('Chat history cleared. How can I assist you today?'),
                    ],
                }),
        }),
        {
            name: 'ai-storage',
            storage: createJSONStorage(() => AsyncStorage),
            version: 1,
        }
    )
);
