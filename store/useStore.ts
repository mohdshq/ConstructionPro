import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeType = 'light' | 'dark' | 'system';
export type UnitSystem = 'metric' | 'imperial';

interface AppState {
    theme: ThemeType;
    units: UnitSystem;
    userName: string;
    userPhoto: string | null;
    isPremium: boolean;
    setTheme: (theme: ThemeType) => void;
    setUnits: (units: UnitSystem) => void;
    setUserName: (name: string) => void;
    setUserPhoto: (photo: string | null) => void;
    setIsPremium: (isPremium: boolean) => void;
}

export const useStore = create<AppState>()(
    persist(
        (set): AppState => ({
            theme: 'system',
            units: 'metric',
            userName: '',
            userPhoto: null,
            isPremium: false,
            setTheme: (theme) => set({ theme }),
            setUnits: (units) => set({ units }),
            setUserName: (userName) => set({ userName }),
            setUserPhoto: (userPhoto) => set({ userPhoto }),
            setIsPremium: (isPremium) => set({ isPremium }),
        }),
        {
            name: 'app-storage',
            storage: createJSONStorage(() => AsyncStorage),
            partialize: (state) => ({
                theme: state.theme,
                units: state.units,
                userName: state.userName,
                userPhoto: state.userPhoto,
                isPremium: state.isPremium, // Now persisted — fix for premium users losing status
            }),
        }
    )
);
