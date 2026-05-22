import { useEffect, useRef, useState } from 'react';
import { supabase } from './supabase';
import { useProjectsStore } from '../store/projectsStore';
import { useAuthStore } from '../store/useAuthStore';
import type { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Custom hook that subscribes to Supabase Realtime channels
 * for `projects` and `reports` tables, applying remote changes
 * to the local Zustand store without triggering re-syncs to Supabase.
 *
 * Call this hook once in the root layout when the user is authenticated.
 */
export function useRealtimeSync() {
    const session = useAuthStore((s) => s.session);
    const userId = session?.user?.id;

    const {
        _applyRemoteProjectUpsert,
        _applyRemoteProjectDelete,
        _applyRemoteReportUpsert,
        _applyRemoteReportDelete,
    } = useProjectsStore();

    const [isConnected, setIsConnected] = useState(false);
    const channelRef = useRef<RealtimeChannel | null>(null);

    useEffect(() => {
        if (!userId) {
            // Clean up if user logs out
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
                channelRef.current = null;
                setIsConnected(false);
            }
            return;
        }

        // Create a single channel for all table subscriptions
        const channel = supabase
            .channel('db-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'projects',
                    filter: `user_id=eq.${userId}`,
                },
                (payload) => {
                    switch (payload.eventType) {
                        case 'INSERT':
                        case 'UPDATE':
                            _applyRemoteProjectUpsert(payload.new);
                            break;
                        case 'DELETE':
                            if (payload.old && (payload.old as any).id) {
                                _applyRemoteProjectDelete((payload.old as any).id);
                            }
                            break;
                    }
                }
            )
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'reports',
                    filter: `user_id=eq.${userId}`,
                },
                (payload) => {
                    switch (payload.eventType) {
                        case 'INSERT':
                        case 'UPDATE':
                            _applyRemoteReportUpsert(payload.new);
                            break;
                        case 'DELETE':
                            if (payload.old && (payload.old as any).id) {
                                _applyRemoteReportDelete((payload.old as any).id);
                            }
                            break;
                    }
                }
            )
            .subscribe((status) => {
                setIsConnected(status === 'SUBSCRIBED');
                if (status === 'SUBSCRIBED') {
                    console.log('[Realtime] Connected to projects & reports channels');
                } else if (status === 'CHANNEL_ERROR') {
                    console.error('[Realtime] Channel error — will retry automatically');
                }
            });

        channelRef.current = channel;

        return () => {
            supabase.removeChannel(channel);
            channelRef.current = null;
            setIsConnected(false);
        };
    }, [userId]);

    return { isConnected };
}
