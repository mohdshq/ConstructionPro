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
    setTheme: (theme: ThemeType) => void;
    setUnits: (units: UnitSystem) => void;
    setUserName: (name: string) => void;
    setUserPhoto: (photo: string | null) => void;
    setAiApiKey: (key: string) => void;
}

export const useStore = create<AppState>(
    persist(
        (set: any): AppState => ({
            theme: 'system',
            units: 'metric',
            userName: 'Alex Sterling',
            userPhoto: null,
            aiApiKey: '',
            setTheme: (theme) => set({ theme }),
            setUnits: (units) => set({ units }),
            setUserName: (userName) => set({ userName }),
            setUserPhoto: (userPhoto) => set({ userPhoto }),
            setAiApiKey: (aiApiKey) => set({ aiApiKey }),
        }),
        {
            name: 'app-storage',
            getStorage: () => AsyncStorage,
        }
    )
);
