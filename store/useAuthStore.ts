import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { fetchProfile, updateProfile as updateProfileRemote } from '../lib/supabaseSync';
import {
    saveLastSession,
    readLastSession,
    clearLastSession,
    isWithinGrace,
    saveLastProfile,
    readLastProfile,
    isAuthServerRejection,
} from '../lib/auth/offlineSession';

export interface Profile {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    company: string | null;
    role: string | null;
    created_at: string | null;
    updated_at: string | null;
}

export interface OfflineUser {
    id: string;
    email?: string | null;
    fullName?: string | null;
}

export type AuthMode = 'online' | 'offline-grace' | 'signed-out';

interface AuthState {
    session: Session | null;
    user: User | null;
    offlineUser: OfflineUser | null;
    authMode: AuthMode;
    profile: Profile | null;
    isInitialized: boolean;
    isLoadingProfile: boolean;
    isExplicitSignOut: boolean;
    setSession: (session: Session | null) => void;
    setProfile: (profile: Profile | null) => void;
    setAuthMode: (authMode: AuthMode) => void;
    initialize: () => Promise<void>;
    _initializeOnce: () => Promise<void>;
    signOut: () => Promise<void>;
    refreshProfile: () => Promise<void>;
    updateProfile: (updates: Partial<Pick<Profile, 'full_name' | 'avatar_url' | 'company' | 'role'>>) => Promise<void>;
}

let authSubscription: { unsubscribe: () => void } | null = null;
let initializePromise: Promise<void> | null = null;

export function __resetAuthInitForTests() {
    initializePromise = null;
    if (authSubscription) {
        authSubscription.unsubscribe();
        authSubscription = null;
    }
}

export const useAuthStore = create<AuthState>((set, get) => ({
    session: null,
    user: null,
    offlineUser: null,
    authMode: 'signed-out',
    profile: null,
    isInitialized: false,
    isLoadingProfile: false,
    isExplicitSignOut: false,

    setSession: (session) => {
        set({
            session,
            user: session?.user || null,
            offlineUser: session?.user ? null : get().offlineUser,
            authMode: session?.user ? 'online' : (get().offlineUser ? 'offline-grace' : 'signed-out'),
        });
        if (session?.user) {
            saveLastSession(session);
            get().refreshProfile();
        } else if (!get().offlineUser) {
            set({ profile: null });
        }
    },

    setProfile: (profile) => {
        set({ profile });
        if (profile) {
            saveLastProfile(profile);
        }
    },

    setAuthMode: (authMode) => set({ authMode }),

    refreshProfile: async () => {
        const currentUser = get().user;
        const currentOfflineUser = get().offlineUser;
        const userId = currentUser?.id ?? currentOfflineUser?.id;
        if (!userId) return;

        set({ isLoadingProfile: true });
        try {
            const profile = await fetchProfile(userId);
            if (profile) {
                set({ profile });
                await saveLastProfile(profile);
            } else {
                // Profile might not exist yet (trigger hasn't fired or race condition)
                const fallbackProfile: Profile = get().profile || {
                    id: userId,
                    full_name: currentUser?.user_metadata?.full_name || currentOfflineUser?.fullName || null,
                    avatar_url: currentUser?.user_metadata?.avatar_url || null,
                    company: null,
                    role: null,
                    created_at: null,
                    updated_at: null,
                };
                set({ profile: fallbackProfile });
                await saveLastProfile(fallbackProfile);
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
            // On error, leave existing profile in place — do NOT null out
        } finally {
            set({ isLoadingProfile: false });
        }
    },

    updateProfile: async (updates) => {
        const user = get().user || get().offlineUser;
        if (!user) throw new Error('Not authenticated');

        try {
            const updatedProfile = await updateProfileRemote(user.id, updates);
            set({ profile: updatedProfile });
            await saveLastProfile(updatedProfile);
        } catch (error) {
            console.error('Error updating profile:', error);
            throw error;
        }
    },

    initialize: async () => {
        if (initializePromise) return initializePromise;
        initializePromise = get()._initializeOnce().catch((e) => {
            initializePromise = null;
            throw e;
        });
        return initializePromise;
    },

    _initializeOnce: async () => {
        let timeoutId: ReturnType<typeof setTimeout> | null = null;
        try {
            // Race getSession() against a 4000ms timeout
            let winner: 'getSession' | 'timeout' = 'getSession';
            const sessionPromise = supabase.auth.getSession().then(({ data }) => {
                winner = 'getSession';
                return data?.session ?? null;
            }).catch((err) => {
                console.warn('[Auth] getSession failed:', err);
                return null;
            });
            const timeoutPromise = new Promise<null>((resolve) => {
                timeoutId = setTimeout(() => {
                    winner = 'timeout';
                    resolve(null);
                }, 4000);
            });

            const session = await Promise.race([sessionPromise, timeoutPromise]);
            if (timeoutId) clearTimeout(timeoutId);
            console.log(`[AUTH-TRACE] initialize() race won by: ${winner} at ${new Date().toISOString()}`);

            if (session?.user) {
                set({
                    session,
                    user: session.user,
                    offlineUser: null,
                    authMode: 'online',
                });
                await saveLastSession(session);
                get().refreshProfile();
            } else {
                // Check offline session mirror
                const lastSession = await readLastSession();
                if (lastSession && isWithinGrace(lastSession)) {
                    const cachedProfile = await readLastProfile();
                    set({
                        session: null,
                        user: null,
                        offlineUser: {
                            id: lastSession.userId,
                            email: lastSession.email,
                            fullName: lastSession.fullName,
                        },
                        authMode: 'offline-grace',
                        profile: cachedProfile || {
                            id: lastSession.userId,
                            full_name: lastSession.fullName,
                            avatar_url: null,
                            company: null,
                            role: null,
                            created_at: null,
                            updated_at: null,
                        },
                    });
                } else {
                    set({
                        session: null,
                        user: null,
                        offlineUser: null,
                        authMode: 'signed-out',
                        profile: null,
                    });
                }
            }

            // Listen for auth changes
            if (authSubscription) {
                authSubscription.unsubscribe();
                authSubscription = null;
            }
            const { data: { subscription } } = supabase.auth.onAuthStateChange(
                async (event, session) => {
                    const { isExplicitSignOut } = get();
                    console.log(`[AUTH-TRACE] onAuthStateChange event=${event} isExplicitSignOut=${isExplicitSignOut} at ${new Date().toISOString()}`);
                    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                        if (session?.user) {
                            set({
                                session,
                                user: session.user,
                                offlineUser: null,
                                authMode: 'online',
                            });
                            await saveLastSession(session);
                            get().refreshProfile();
                        }
                    } else if (event === 'SIGNED_OUT') {
                        if (isExplicitSignOut) {
                            set({
                                session: null,
                                user: null,
                                offlineUser: null,
                                profile: null,
                                authMode: 'signed-out',
                            });
                            await clearLastSession();
                        }
                    } else if (event === 'USER_UPDATED') {
                        if (session?.user) {
                            set({ session, user: session.user });
                            await saveLastSession(session);
                        }
                    }
                }
            );
            authSubscription = subscription;
        } catch (error) {
            console.error('Error initializing auth:', error);
            const lastSession = await readLastSession();
            if (lastSession && isWithinGrace(lastSession)) {
                const cachedProfile = await readLastProfile();
                set({
                    session: null,
                    user: null,
                    offlineUser: {
                        id: lastSession.userId,
                        email: lastSession.email,
                        fullName: lastSession.fullName,
                    },
                    authMode: 'offline-grace',
                    profile: cachedProfile || {
                        id: lastSession.userId,
                        full_name: lastSession.fullName,
                        avatar_url: null,
                        company: null,
                        role: null,
                        created_at: null,
                        updated_at: null,
                    },
                });
            } else {
                set({
                    session: null,
                    user: null,
                    offlineUser: null,
                    authMode: 'signed-out',
                    profile: null,
                });
            }
        } finally {
            set({ isInitialized: true });
        }
    },

    signOut: async () => {
        set({ isExplicitSignOut: true });
        try {
            console.log(`[AUTH-TRACE] signOut() starting before state update at ${new Date().toISOString()}`);
            await clearLastSession();
            set({
                session: null,
                user: null,
                offlineUser: null,
                profile: null,
                authMode: 'signed-out',
            });
            console.log(`[AUTH-TRACE] signOut() state set to signed-out at ${new Date().toISOString()}`);
            await supabase.auth.signOut();
            console.log(`[AUTH-TRACE] signOut() supabase.auth.signOut() resolved at ${new Date().toISOString()}`);
        } catch (error) {
            console.error('Error signing out:', error);
        } finally {
            set({ isExplicitSignOut: false });
        }
    },
}));
