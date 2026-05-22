import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { fetchProfile, updateProfile as updateProfileRemote } from '../lib/supabaseSync';

export interface Profile {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    company: string | null;
    role: string | null;
    created_at: string | null;
    updated_at: string | null;
}

interface AuthState {
    session: Session | null;
    user: User | null;
    profile: Profile | null;
    isInitialized: boolean;
    isLoadingProfile: boolean;
    setSession: (session: Session | null) => void;
    setProfile: (profile: Profile | null) => void;
    initialize: () => Promise<void>;
    signOut: () => Promise<void>;
    refreshProfile: () => Promise<void>;
    updateProfile: (updates: Partial<Pick<Profile, 'full_name' | 'avatar_url' | 'company' | 'role'>>) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
    session: null,
    user: null,
    profile: null,
    isInitialized: false,
    isLoadingProfile: false,

    setSession: (session) => {
        set({ session, user: session?.user || null });
        if (session?.user) {
            // Fetch real profile from Supabase
            get().refreshProfile();
        } else {
            set({ profile: null });
        }
    },

    setProfile: (profile) => set({ profile }),

    refreshProfile: async () => {
        const user = get().user;
        if (!user) return;

        set({ isLoadingProfile: true });
        try {
            const profile = await fetchProfile(user.id);
            if (profile) {
                set({ profile });
            } else {
                // Profile might not exist yet (trigger hasn't fired or race condition)
                // Use user_metadata as fallback
                set({
                    profile: {
                        id: user.id,
                        full_name: user.user_metadata?.full_name || null,
                        avatar_url: user.user_metadata?.avatar_url || null,
                        company: null,
                        role: null,
                        created_at: null,
                        updated_at: null,
                    }
                });
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
        } finally {
            set({ isLoadingProfile: false });
        }
    },

    updateProfile: async (updates) => {
        const user = get().user;
        if (!user) throw new Error('Not authenticated');

        try {
            const updatedProfile = await updateProfileRemote(user.id, updates);
            set({ profile: updatedProfile });
        } catch (error) {
            console.error('Error updating profile:', error);
            throw error;
        }
    },

    initialize: async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            get().setSession(session);

            // Listen for auth changes
            supabase.auth.onAuthStateChange((_event, session) => {
                get().setSession(session);
            });
        } catch (error) {
            console.error('Error initializing auth:', error);
        } finally {
            set({ isInitialized: true });
        }
    },

    signOut: async () => {
        try {
            await supabase.auth.signOut();
        } catch (error) {
            console.error('Error signing out:', error);
        }
    },
}));
