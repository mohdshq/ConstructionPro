import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WifiOff } from 'lucide-react-native';
import { useNetworkStatus } from '@/lib/useNetworkStatus';

export function OfflineBanner() {
    const { isOffline } = useNetworkStatus();
    const insets = useSafeAreaInsets();

    if (!isOffline) return null;

    return (
        <View style={[styles.container, { paddingTop: Math.max(insets.top, 10) }]}>
            <View style={styles.banner}>
                <WifiOff size={14} color="#FFFFFF" />
                <Text style={styles.text}>Offline — changes will sync when reconnected</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#EF4444',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
    },
    banner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 6,
        gap: 6,
    },
    text: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '600',
    },
});
