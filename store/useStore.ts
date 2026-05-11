import create from 'zustand';
import { persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeType = 'light' | 'dark' | 'system';
export type UnitSystem = 'metric' | 'imperial';

interface AppState {
    theme: ThemeType;
    units: UnitSystem;
    userName: string;
    userPhoto: string | null;
    aiApiKey: string;
    isPremium: boolean;
    setTheme: (theme: ThemeType) => void;
    setUnits: (units: UnitSystem) => void;
    setUserName: (name: string) => void;
    setUserPhoto: (photo: string | null) => void;
    setAiApiKey: (key: string) => void;
    setIsPremium: (isPremium: boolean) => void;
}

export const useStore = create<AppState>(
    persist(
        (set: any): AppState => ({
            theme: 'system',
            units: 'metric',
            userName: '',
            userPhoto: null,
            aiApiKey: '',
            isPremium: false,
            setTheme: (theme) => set({ theme }),
            setUnits: (units) => set({ units }),
            setUserName: (userName) => set({ userName }),
            setUserPhoto: (userPhoto) => set({ userPhoto }),
            setAiApiKey: (aiApiKey) => set({ aiApiKey }),
            setIsPremium: (isPremium) => set({ isPremium }),
        }),
        {
            name: 'app-storage',
            getStorage: () => AsyncStorage,
            partialize: (state) => ({
                theme: state.theme,
                units: state.units,
                userName: state.userName,
                userPhoto: state.userPhoto,
                aiApiKey: state.aiApiKey,
            }),
            merge: (persistedState: any, currentState: any) => ({
                ...currentState,
                ...persistedState,
                isPremium: false, // Force gatewall close on rehydrate
            }),
        }
    )
);
