import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ChevronDown, Eye, EyeOff } from 'lucide-react-native';

interface AccordionSectionProps {
    title: string;
    id: string;
    allowHide?: boolean;
    isActive: boolean;
    isHidden?: boolean;
    onToggle: (id: string) => void;
    onToggleVisibility?: (id: string) => void;
    colors: any;
    children: React.ReactNode;
}

export default function AccordionSection({
    title,
    id,
    allowHide = false,
    isActive,
    isHidden = false,
    onToggle,
    onToggleVisibility,
    colors,
    children,
}: AccordionSectionProps) {
    return (
        <>
            <TouchableOpacity
                style={[styles.accordionHeader, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => onToggle(id)}
                activeOpacity={0.7}
            >
                <View style={{ flex: 1 }}>
                    <Text style={[styles.accordionTitle, isHidden && { color: '#94A3B8' }]}>
                        {title}
                        {isHidden && <Text style={{ fontSize: 13, fontWeight: '500', color: '#EF4444' }}> (Hidden from report)</Text>}
                    </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    {allowHide && onToggleVisibility && (
                        <TouchableOpacity
                            onPress={(e) => { e.stopPropagation(); onToggleVisibility(id); }}
                            style={{ padding: 4 }}
                        >
                            {isHidden ? <EyeOff size={20} color="#EF4444" /> : <Eye size={20} color="#64748B" />}
                        </TouchableOpacity>
                    )}
                    <ChevronDown size={20} color="#64748B" style={{ transform: [{ rotate: isActive ? '180deg' : '0deg' }] }} />
                </View>
            </TouchableOpacity>
            {isActive && children}
        </>
    );
}

const styles = StyleSheet.create({
    accordionHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        backgroundColor: '#FFFFFF', padding: 16, borderRadius: 12, marginBottom: 8,
        borderWidth: 1, borderColor: '#E2E8F0',
    },
    accordionTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
});
