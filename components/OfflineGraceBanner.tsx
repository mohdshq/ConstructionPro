import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WifiOff, X } from 'lucide-react-native';
import { useAuthStore } from '@/store/useAuthStore';

export function OfflineGraceBanner() {
    const { authMode, offlineUser, user } = useAuthStore();
    const insets = useSafeAreaInsets();
    const [isDismissed, setIsDismissed] = useState(false);

    if (authMode !== 'offline-grace' || isDismissed) return null;

    const email = user?.email || offlineUser?.email || 'User';

    return (
        <View style={[styles.container, { paddingTop: Math.max(insets.top, 10) }]}>
            <View style={styles.banner}>
                <WifiOff size={14} color="#FFFFFF" />
                <Text style={styles.text} numberOfLines={1}>
                    Offline — signed in as {email}. Changes will sync when you reconnect.
                </Text>
                <TouchableOpacity
                    onPress={() => setIsDismissed(true)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    style={styles.closeButton}
                >
                    <X size={14} color="#FFFFFF" />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#D97706', // amber-600 for offline session indication
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10000,
    },
    banner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 6,
        paddingHorizontal: 12,
        gap: 6,
    },
    text: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '600',
        flexShrink: 1,
    },
    closeButton: {
        padding: 2,
        marginLeft: 4,
    },
});
