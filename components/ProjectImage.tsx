import React, { useEffect, useState, useCallback } from 'react';
import {
    Image,
    ImageProps,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
} from 'react-native';
import { resolveMediaUri } from '@/lib/attachments/resolveMediaUri';
import { Image as ImageIcon, WifiOff, RefreshCw } from 'lucide-react-native';

interface ProjectImageProps extends Omit<ImageProps, 'source'> {
    photoUri?: string | null;
    projectId?: string;
}

type ImageState = 'loading' | 'success' | 'missing' | 'offline';

export default function ProjectImage({ photoUri, projectId, style, ...props }: ProjectImageProps) {
    const [signedUrl, setSignedUrl] = useState<string | null>(null);
    const [state, setState] = useState<ImageState>('loading');
    const [retryCount, setRetryCount] = useState(0);

    const handleRetry = useCallback(() => {
        setState('loading');
        setRetryCount((c) => c + 1);
    }, []);

    useEffect(() => {
        let isMounted = true;

        async function fetchUrl() {
            if (!photoUri || photoUri.trim() === '') {
                if (isMounted) {
                    setSignedUrl(null);
                    setState('missing');
                }
                return;
            }

            if (isMounted) setState('loading');
            try {
                const resolved = await resolveMediaUri(photoUri, {
                    bucket: 'report-photos',
                    projectId,
                });

                if (!isMounted) return;

                if (resolved) {
                    setSignedUrl(resolved);
                    setState('success');
                } else {
                    setSignedUrl(null);
                    setState('missing');
                }
            } catch (error) {
                if (isMounted) {
                    setSignedUrl(null);
                    setState('missing');
                }
            }
        }

        fetchUrl();

        return () => {
            isMounted = false;
        };
    }, [photoUri, projectId, retryCount]);

    if (state === 'offline') {
        return (
            <TouchableOpacity
                onPress={handleRetry}
                activeOpacity={0.7}
                style={[styles.placeholder, style, styles.offlineContainer]}
                accessibilityLabel="Image offline. Tap to retry."
                accessibilityRole="button"
            >
                <WifiOff size={20} color="#94A3B8" />
                <View style={styles.retryRow}>
                    <RefreshCw size={12} color="#64748B" />
                    <Text style={styles.offlineText}>Retry</Text>
                </View>
            </TouchableOpacity>
        );
    }

    if (state === 'missing') {
        return (
            <View style={[styles.placeholder, style]}>
                <ImageIcon size={22} color="#CBD5E1" />
            </View>
        );
    }

    if (state === 'loading' && !signedUrl) {
        return (
            <View style={[styles.placeholder, style]}>
                <ActivityIndicator size="small" color="#94A3B8" />
            </View>
        );
    }

    if (!signedUrl) {
        return (
            <View style={[styles.placeholder, style]}>
                <ImageIcon size={22} color="#CBD5E1" />
            </View>
        );
    }

    return (
        <Image
            source={{ uri: signedUrl }}
            style={style}
            onError={() => setState('offline')}
            {...props}
        />
    );
}

const styles = StyleSheet.create({
    placeholder: {
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    offlineContainer: {
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderStyle: 'dashed',
    },
    retryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
        gap: 4,
    },
    offlineText: {
        fontSize: 11,
        color: '#64748B',
        fontWeight: '500',
    },
});
