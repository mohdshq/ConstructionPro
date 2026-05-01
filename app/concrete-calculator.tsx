import BackButton from "../components/BackButton";
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useState, useMemo } from 'react';
import { Calculator, ArrowLeft, Ruler, Info, Image as ImageIcon } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { router } from 'expo-router';
import { useStore } from '../store/useStore';
import { useThemeColors } from '../store/useThemeColors';

export default function ConcreteCalculatorScreen() {
    const { units } = useStore();
    const { colors } = useThemeColors();
    const [length, setLength] = useState('10');
    const [width, setWidth] = useState('5');
    const [depth, setDepth] = useState('0.15');

    const isMetric = units === 'metric';
    const unitLabel = isMetric ? 'meters' : 'feet';
    const resultUnit = isMetric ? 'm³' : 'yd³';

    // Instant Calculation
    const result = useMemo(() => {
        const l = parseFloat(length);
        const w = parseFloat(width);
        const d = parseFloat(depth);

        if (isNaN(l) || isNaN(w) || isNaN(d)) return '0.00';

        const volume = l * w * d;

        // If imperial, length/width/depth is in feet. Volume is in cubic feet. Convert to Cubic Yards (/ 27)
        if (!isMetric) {
            return (volume / 27).toFixed(2);
        }

        return volume.toFixed(2);
    }, [length, width, depth, isMetric]);

    const wasteResult = useMemo(() => {
        return (parseFloat(result) * 1.10).toFixed(2); // 10% waste
    }, [result]);

    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor: colors.background }]}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <View style={[styles.headerBar, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
                <BackButton style={{ position: "absolute", left: 20, zIndex: 20, bottom: 8 }} />
                <Text style={[styles.headerBarTitle, { color: colors.text }]}>Concrete Estimator</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {/* Instant Result Header */}
                <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.resultContainer}>
                    <Text style={styles.resultLabel}>Required Volume</Text>
                    <View style={styles.resultValueWrapper}>
                        <Text style={styles.resultValue}>{result}</Text>
                        <Text style={styles.resultUnit}> {resultUnit}</Text>
                    </View>
                    <View style={styles.wastePill}>
                        <Text style={styles.wastePillText}>{wasteResult} {resultUnit} with 10% waste</Text>
                    </View>
                </Animated.View>

                {/* Inputs */}
                <View style={styles.inputSection}>
                    <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.formGroup}>
                        <Text style={[styles.label, { color: colors.text }]}>Length ({unitLabel})</Text>
                        <View style={[styles.inputWrapper, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                            <TextInput
                                style={[styles.input, { color: colors.text }]}
                                keyboardType="decimal-pad"
                                value={length}
                                onChangeText={setLength}
                            />
                            <Ruler color="#94A3B8" size={20} />
                        </View>
                    </Animated.View>

                    <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.formGroup}>
                        <Text style={[styles.label, { color: colors.text }]}>Width ({unitLabel})</Text>
                        <View style={[styles.inputWrapper, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                            <TextInput
                                style={[styles.input, { color: colors.text }]}
                                keyboardType="decimal-pad"
                                value={width}
                                onChangeText={setWidth}
                            />
                            <Ruler color="#94A3B8" size={20} />
                        </View>
                    </Animated.View>

                    <Animated.View entering={FadeInDown.delay(400).springify()} style={styles.formGroup}>
                        <Text style={[styles.label, { color: colors.text }]}>Thickness ({unitLabel})</Text>
                        <View style={[styles.inputWrapper, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                            <TextInput
                                style={[styles.input, { color: colors.text }]}
                                keyboardType="decimal-pad"
                                value={depth}
                                onChangeText={setDepth}
                            />
                            <Ruler color="#94A3B8" size={20} />
                        </View>
                    </Animated.View>
                </View>

                {/* References */}
                <Animated.View entering={FadeInDown.delay(500).springify()} style={styles.referenceCard}>
                    <View style={styles.refHeader}>
                        <Info color="#3B82F6" size={20} />
                        <Text style={styles.refTitle}>Formula & References</Text>
                    </View>

                    <View style={styles.formulaBox}>
                        <Text style={styles.formulaText}>
                            {isMetric ? 'V = L × W × D' : 'V = (L × W × D) / 27'}
                        </Text>
                    </View>
                    <Text style={styles.refDesc}>
                        {isMetric
                            ? 'Results are calculated in cubic meters (m³).'
                            : 'Results are calculated in cubic yards (yd³) by dividing total cubic feet by 27.'}
                        {"\n\n"}*Always order 5-10% extra to account for spillage, over-excavation, and uneven subgrades.
                    </Text>
                </Animated.View>

                {/* Diagram Placeholder */}
                <Animated.View entering={FadeInDown.delay(600).springify()} style={styles.diagramCard}>
                    <ImageIcon color="#94A3B8" size={48} />
                    <Text style={styles.diagramText}>Slab Diagram Visualization</Text>
                </Animated.View>

            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    headerBar: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingTop: Platform.OS === "ios" ? 60 : 30,
        paddingBottom: 16,
        paddingHorizontal: 20,
        backgroundColor: "#FFFFFF",
        borderBottomWidth: 1,
        borderBottomColor: "#E2E8F0",
        zIndex: 10,
    },
    backButton: {
        position: 'absolute',
        left: 0,
        bottom: 12,
        zIndex: 20,
    },
    headerBarTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#0F172A",
        textAlign: "center",
        paddingHorizontal: 40,
    },
    content: {
        padding: 24,
        paddingBottom: 60,
    },
    resultContainer: {
        backgroundColor: '#2563EB',
        borderRadius: 24,
        padding: 32,
        alignItems: 'center',
        marginBottom: 32,
        shadowColor: '#2563EB',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 24,
        elevation: 8,
    },
    resultLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#BFDBFE',
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    resultValueWrapper: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        marginBottom: 16,
    },
    resultValue: {
        fontSize: 56,
        fontWeight: '800',
        color: '#FFFFFF',
        letterSpacing: -1,
        lineHeight: 60,
    },
    resultUnit: {
        fontSize: 24,
        fontWeight: '600',
        color: '#BFDBFE',
        marginBottom: 8,
        marginLeft: 4,
    },
    wastePill: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    wastePillText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
    inputSection: {
        marginBottom: 32,
    },
    formGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#334155',
        marginBottom: 8,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        paddingHorizontal: 16,
    },
    input: {
        flex: 1,
        paddingVertical: 14,
        fontSize: 18,
        fontWeight: '600',
        color: '#0F172A',
    },
    referenceCard: {
        backgroundColor: '#EFF6FF',
        borderRadius: 16,
        padding: 24,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#DBEAFE',
    },
    refHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    refTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1E3A8A',
        marginLeft: 8,
    },
    formulaBox: {
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#BFDBFE',
        marginBottom: 16,
        alignItems: 'center',
    },
    formulaText: {
        fontSize: 18,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        color: '#1E40AF',
        fontWeight: '700',
    },
    refDesc: {
        fontSize: 14,
        color: '#3B82F6',
        lineHeight: 22,
    },
    diagramCard: {
        height: 160,
        backgroundColor: '#F1F5F9',
        borderRadius: 16,
        borderWidth: 2,
        borderColor: '#E2E8F0',
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
    },
    diagramText: {
        marginTop: 12,
        fontSize: 14,
        color: '#64748B',
        fontWeight: '500',
    }
});
