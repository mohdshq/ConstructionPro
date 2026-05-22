import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react-native';
import { useProjectsStore } from '../store/projectsStore';
import { useThemeColors } from '../store/useThemeColors';

interface ConnectionBadgeProps {
    isRealtimeConnected?: boolean;
}

export default function ConnectionBadge({ isRealtimeConnected = true }: ConnectionBadgeProps) {
    const { isSyncing, lastSyncAt, syncError } = useProjectsStore();
    const { colors, isDark } = useThemeColors();
    const [fadeAnim] = useState(new Animated.Value(0));

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
        }).start();
    }, [isSyncing, syncError, isRealtimeConnected]);

    const getStatus = () => {
        if (isSyncing) return { label: 'Syncing...', color: '#F59E0B', icon: 'syncing' };
        if (syncError) return { label: 'Sync Error', color: '#EF4444', icon: 'offline' };
        if (!isRealtimeConnected) return { label: 'Offline', color: '#94A3B8', icon: 'offline' };
        return { label: 'Connected', color: '#22C55E', icon: 'online' };
    };

    const status = getStatus();

    const getTimeAgo = () => {
        if (!lastSyncAt) return '';
        const diff = Date.now() - new Date(lastSyncAt).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'Just now';
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        return `${Math.floor(hrs / 24)}d ago`;
    };

    const timeAgo = getTimeAgo();

    return (
        <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
            <View style={[
                styles.badge,
                {
                    backgroundColor: isDark ? `${status.color}20` : `${status.color}15`,
                    borderColor: `${status.color}40`,
                }
            ]}>
                <View style={[styles.dot, { backgroundColor: status.color }]} />
                {status.icon === 'syncing' ? (
                    <RefreshCw size={12} color={status.color} />
                ) : status.icon === 'online' ? (
                    <Wifi size={12} color={status.color} />
                ) : (
                    <WifiOff size={12} color={status.color} />
                )}
                <Text style={[styles.label, { color: status.color }]}>{status.label}</Text>
                {Boolean(timeAgo) && status.icon === 'online' ? (
                    <Text style={[styles.time, { color: colors.textMuted }]}>• {timeAgo}</Text>
                ) : null}
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
        borderWidth: 1,
        gap: 5,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    label: {
        fontSize: 11,
        fontWeight: '600',
    },
    time: {
        fontSize: 11,
        fontWeight: '400',
    },
});
