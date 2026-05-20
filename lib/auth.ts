/**
 * Authentication helpers — thin facade over supabase.auth.
 *
 * Why a wrapper:
 *  - Centralise error normalisation (Supabase errors → consistent `{ error }`).
 *  - Plumb sign-in / sign-out events into Sentry user identity for free.
 *  - Give product code a stable surface even if we swap providers.
 *
 * Callers should treat the return shape as `{ data, error }` always — never
 * throws. UI screens only need to check `error` to decide what to render.
 */

import { telemetry } from './telemetry';
import { supabase, isSupabaseConfigured } from './supabase';
import type { Session, User } from '@supabase/supabase-js';

export type AuthResult = {
    data: { user: User | null; session: Session | null };
    error: { message: string } | null;
};

function fail(message: string): AuthResult {
    return { data: { user: null, session: null }, error: { message } };
}

export const auth = {
    /** Is the auth backend reachable? Screens can short-circuit when false. */
    get isConfigured() {
        return isSupabaseConfigured;
    },

    /** Get the cached current session synchronously-ish (still async). */
    async getSession(): Promise<Session | null> {
        if (!isSupabaseConfigured) return null;
        const { data } = await supabase.auth.getSession();
        return data.session;
    },

    /** Subscribe to auth state changes. Returns unsubscribe. */
    onChange(cb: (session: Session | null) => void): () => void {
        if (!isSupabaseConfigured) return () => {};
        const { data } = supabase.auth.onAuthStateChange((_event, session) => {
            cb(session);
            telemetry.setUser(
                session?.user
                    ? { id: session.user.id, email: session.user.email ?? undefined }
                    : null
            );
        });
        return () => data.subscription.unsubscribe();
    },

    async signUpWithEmail(
        email: string,
        password: string,
        displayName?: string
    ): Promise<AuthResult> {
        if (!isSupabaseConfigured) return fail('Cloud sync is not configured for this build.');
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { display_name: displayName ?? '' } },
        });
        if (error) {
            telemetry.captureException(error, { where: 'auth.signUpWithEmail' });
            return fail(error.message);
        }
        return { data, error: null };
    },

    async signInWithEmail(email: string, password: string): Promise<AuthResult> {
        if (!isSupabaseConfigured) return fail('Cloud sync is not configured for this build.');
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        if (error) {
            // Don't capture password-typo failures — Sentry would get spammed.
            return fail(error.message);
        }
        return { data, error: null };
    },

    async signOut(): Promise<{ error: { message: string } | null }> {
        if (!isSupabaseConfigured) return { error: null };
        const { error } = await supabase.auth.signOut();
        telemetry.setUser(null);
        return error ? { error: { message: error.message } } : { error: null };
    },

    /** Request a password-reset email. The redirect URL is configured in the dashboard. */
    async sendPasswordReset(email: string): Promise<{ error: { message: string } | null }> {
        if (!isSupabaseConfigured) return { error: { message: 'Cloud sync not configured.' } };
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        return error ? { error: { message: error.message } } : { error: null };
    },
};
