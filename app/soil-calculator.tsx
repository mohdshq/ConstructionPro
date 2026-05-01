import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useState, useMemo } from 'react';
import { ArrowLeft, Ruler, Mountain, Info } from "lucide-react-native";
import BackButton from "../components/BackButton";
import Animated, { FadeInDown } from 'react-native-reanimated';
import { router } from 'expo-router';
import { useStore } from '../store/useStore';
import { useThemeColors } from '../store/useThemeColors';

export default function SoilCalculatorScreen() {
    const { units } = useStore();
    const { colors } = useThemeColors();
    const [length, setLength] = useState('15');
    const [width, setWidth] = useState('10');
    const [depth, setDepth] = useState('2');
    const [swellFactor, setSwellFactor] = useState('20'); // Typical soil swell

    const isMetric = units === 'metric';
    const unitLabel = isMetric ? 'meters' : 'feet';
    const resultUnit = isMetric ? 'm³' : 'yd³';

    const result = useMemo(() => {
        const l = parseFloat(length);
        const w = parseFloat(width);
        const d = parseFloat(depth);
        const swell = parseFloat(swellFactor);

        if (isNaN(l) || isNaN(w) || isNaN(d) || isNaN(swell)) {
            return { bank: '0.00', loose: '0.00' };
        }

        let bankVol = l * w * d;

        // Convert to Cubic Yards if imperial
        if (!isMetric) {
            bankVol = bankVol / 27;
        }

        const looseVol = bankVol * (1 + (swell / 100));

        return {
            bank: bankVol.toFixed(2),
            loose: looseVol.toFixed(2)
        };
    }, [length, width, depth, swellFactor, isMetric]);

    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor: colors.background }]}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <View style={[styles.headerBar, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
                <BackButton style={{ position: "absolute", left: 20, zIndex: 20, bottom: 8 }} />
                <Text style={[styles.headerBarTitle, { color: colors.text }]}>Soil Excavation</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {/* Instant Result Header */}
                <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.resultContainer}>
                    <Text style={styles.resultLabel}>Loose Volume (To be hauled)</Text>
                    <View style={styles.resultValueWrapper}>
                        <Text style={styles.resultValue}>{result.loose}</Text>
                        <Text style={styles.resultUnit}> {resultUnit}</Text>
                    </View>
                    <View style={styles.wastePill}>
                        <Text style={styles.wastePillText}>In-Ground Bank Volume: {result.bank} {resultUnit}</Text>
                    </View>
                </Animated.View>

                {/* Inputs */}
                <View style={styles.inputSection}>
                    <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.formGroup}>
                        <Text style={[styles.label, { color: colors.text }]}>Excavation Length ({unitLabel})</Text>
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
                        <Text style={[styles.label, { color: colors.text }]}>Excavation Width ({unitLabel})</Text>
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
                        <Text style={[styles.label, { color: colors.text }]}>Excavation Depth ({unitLabel})</Text>
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

                    <Animated.View entering={FadeInDown.delay(450).springify()} style={styles.formGroup}>
                        <Text style={[styles.label, { color: colors.text }]}>Swell Factor (%)</Text>
                        <View style={[styles.inputWrapper, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                            <TextInput
                                style={[styles.input, { color: colors.text }]}
                                keyboardType="decimal-pad"
                                value={swellFactor}
                                onChangeText={setSwellFactor}
                            />
                            <Mountain color="#94A3B8" size={20} />
                        </View>
                    </Animated.View>
                </View>

                {/* References */}
                <Animated.View entering={FadeInDown.delay(500).springify()} style={styles.referenceCard}>
                    <View style={styles.refHeader}>
                        <Info color="#8B5CF6" size={20} />
                        <Text style={styles.refTitle}>Soil Swell Basics</Text>
                    </View>

                    <View style={styles.formulaBox}>
                        <Text style={styles.formulaText}>
                            Loose Vol = Bank Vol × (1 + Swell/100)
                        </Text>
                    </View>
                    <Text style={styles.refDesc}>
                        When soil is excavated, it expands. "Bank Volume" is the undisturbed dirt in the ground. "Loose Volume" is the amount you actually have to haul away in trucks.
                        {"\n\n"}Standard Swell Factors:{"\n"}• Sand/Gravel: 10-15%{"\n"}• Topsoil: 20-25%{"\n"}• Clay: 30-40%
                    </Text>
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
        backgroundColor: '#8B5CF6',
        borderRadius: 24,
        padding: 32,
        alignItems: 'center',
        marginBottom: 32,
        shadowColor: '#8B5CF6',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 24,
        elevation: 8,
    },
    resultLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#DDD6FE',
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
        color: '#DDD6FE',
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
        backgroundColor: '#F5F3FF',
        borderRadius: 16,
        padding: 24,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#EDE9FE',
    },
    refHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    refTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#6D28D9',
        marginLeft: 8,
    },
    formulaBox: {
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#EDE9FE',
        marginBottom: 16,
        alignItems: 'center',
    },
    formulaText: {
        fontSize: 15,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        color: '#7C3AED',
        fontWeight: '700',
    },
    refDesc: {
        fontSize: 14,
        color: '#6D28D9',
        lineHeight: 22,
    }
});
