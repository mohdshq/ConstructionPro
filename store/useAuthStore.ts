import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface Profile {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    company: string | null;
    role: string | null;
}

interface AuthState {
    session: Session | null;
    user: User | null;
    profile: Profile | null;
    isInitialized: boolean;
    setSession: (session: Session | null) => void;
    setProfile: (profile: Profile | null) => void;
    initialize: () => Promise<void>;
    signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
    session: null,
    user: null,
    profile: null,
    isInitialized: false,

    setSession: (session) => {
        set({ session, user: session?.user || null });
        if (session?.user) {
            // Fetch profile data here if needed later
            // We use dummy profile until Supabase is active
            set({
                profile: {
                    id: session.user.id,
                    full_name: session.user.user_metadata?.full_name || null,
                    avatar_url: session.user.user_metadata?.avatar_url || null,
                    company: null,
                    role: null,
                }
            });
        } else {
            set({ profile: null });
        }
    },

    setProfile: (profile) => set({ profile }),

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
