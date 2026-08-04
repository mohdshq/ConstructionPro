import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useThemeColors } from '../store/useThemeColors';
import { getSnagAiStatusDescriptor } from '../lib/units/snagAiStatus';

export interface SnagAiStatusBadgeProps {
    aiStatus?: string;
    aiAttempts?: number;
    aiError?: string;
    compact?: boolean;
}

export { getSnagAiStatusDescriptor, isSnagUnanalysed, countUnanalysedSnags } from '../lib/units/snagAiStatus';

export default function SnagAiStatusBadge({
    aiStatus,
    aiAttempts,
    aiError,
    compact = false,
}: SnagAiStatusBadgeProps) {
    const { isDark } = useThemeColors();
    const info = getSnagAiStatusDescriptor(aiStatus, aiAttempts, compact);

    if (!info) {
        return null;
    }

    if (compact) {
        return (
            <View 
                style={[
                    styles.compactBadge,
                    {
                        backgroundColor: isDark ? `${info.color}25` : `${info.color}15`,
                        borderColor: `${info.color}40`,
                    }
                ]}
            >
                <View style={[styles.compactDot, { backgroundColor: info.color }]} />
            </View>
        );
    }

    return (
        <View
            style={[
                styles.badge,
                {
                    backgroundColor: isDark ? `${info.color}20` : `${info.color}15`,
                    borderColor: `${info.color}40`,
                }
            ]}
        >
            {info.icon === 'spinner' ? (
                <ActivityIndicator size={10} color={info.color} style={styles.spinner} />
            ) : (
                <View style={[styles.dot, { backgroundColor: info.color }]} />
            )}
            {info.label ? (
                <Text style={[styles.label, { color: info.color }]}>{info.label}</Text>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 12,
        borderWidth: 1,
        gap: 5,
        alignSelf: 'flex-start',
    },
    compactBadge: {
        width: 14,
        height: 14,
        borderRadius: 7,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    compactDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    spinner: {
        width: 10,
        height: 10,
    },
    label: {
        fontSize: 11,
        fontWeight: '600',
    },
});
