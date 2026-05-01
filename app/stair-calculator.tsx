import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useState, useMemo } from 'react';
import { ArrowLeft, Baseline, ArrowUpRight, Info } from "lucide-react-native";
import BackButton from "../components/BackButton";
import Animated, { FadeInDown } from 'react-native-reanimated';
import { router } from 'expo-router';
import { useStore } from '../store/useStore';
import { useThemeColors } from '../store/useThemeColors';

export default function StairCalculatorScreen() {
    const { units } = useStore();
    const { colors } = useThemeColors();
    const [totalRise, setTotalRise] = useState('108'); // Total height in inches
    const [targetRiserHeight, setTargetRiserHeight] = useState('7.5'); // Ideal riser height
    const [treadDepth, setTreadDepth] = useState('11'); // Ideal tread depth

    const isMetric = units === 'metric';
    const unitLabel = isMetric ? 'cm' : 'inches';

    const result = useMemo(() => {
        let rise = parseFloat(totalRise);
        let targetHs = parseFloat(targetRiserHeight);
        let treadD = parseFloat(treadDepth);

        if (isNaN(rise) || isNaN(targetHs) || isNaN(treadD) || targetHs === 0) {
            return { numRisers: '0', actualRiser: '0.00', numTreads: '0', totalRun: '0.00' };
        }

        // Number of steps (risers) = Total Rise / Target Riser Height
        let numRisersRaw = rise / targetHs;
        let numRisers = Math.round(numRisersRaw);

        if (numRisers === 0) numRisers = 1;

        // Actual Height of each riser to fit perfectly
        let actualRiser = rise / numRisers;

        // Treads are always 1 less than the number of risers
        let numTreads = numRisers - 1;

        // Total Run = Number of Treads * Tread Depth
        let totalRun = numTreads * treadD;

        return {
            numRisers: numRisers.toString(),
            actualRiser: actualRiser.toFixed(2),
            numTreads: numTreads.toString(),
            totalRun: totalRun.toFixed(2)
        };
    }, [totalRise, targetRiserHeight, treadDepth]);

    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor: colors.background }]}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <View style={[styles.headerBar, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
                <BackButton style={{ position: "absolute", left: 20, zIndex: 20, bottom: 8 }} />
                <Text style={[styles.headerBarTitle, { color: colors.text }]}>Stairs Estimator</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {/* Instant Result Header */}
                <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.resultContainer}>
                    <Text style={styles.resultLabel}>Actual Riser Height</Text>
                    <View style={styles.resultValueWrapper}>
                        <Text style={styles.resultValue}>{result.actualRiser}</Text>
                        <Text style={styles.resultUnit}> {unitLabel}</Text>
                    </View>
                    <View style={styles.wastePill}>
                        <Text style={styles.wastePillText}>{result.numRisers} Risers • {result.numTreads} Treads</Text>
                    </View>
                </Animated.View>

                {/* Inputs */}
                <View style={styles.inputSection}>
                    <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.formGroup}>
                        <Text style={[styles.label, { color: colors.text }]}>Total Floor-to-Floor Rise ({unitLabel})</Text>
                        <View style={[styles.inputWrapper, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                            <TextInput
                                style={[styles.input, { color: colors.text }]}
                                keyboardType="decimal-pad"
                                value={totalRise}
                                onChangeText={setTotalRise}
                            />
                            <ArrowUpRight color="#94A3B8" size={20} />
                        </View>
                    </Animated.View>

                    <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.formGroup}>
                        <Text style={[styles.label, { color: colors.text }]}>Target Step Riser Height ({unitLabel})</Text>
                        <View style={[styles.inputWrapper, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                            <TextInput
                                style={[styles.input, { color: colors.text }]}
                                keyboardType="decimal-pad"
                                value={targetRiserHeight}
                                onChangeText={setTargetRiserHeight}
                            />
                            <Baseline color="#94A3B8" size={20} />
                        </View>
                    </Animated.View>

                    <Animated.View entering={FadeInDown.delay(400).springify()} style={styles.formGroup}>
                        <Text style={[styles.label, { color: colors.text }]}>Desired Tread Depth ({unitLabel})</Text>
                        <View style={[styles.inputWrapper, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                            <TextInput
                                style={[styles.input, { color: colors.text }]}
                                keyboardType="decimal-pad"
                                value={treadDepth}
                                onChangeText={setTreadDepth}
                            />
                            <Baseline color="#94A3B8" size={20} />
                        </View>
                    </Animated.View>
                </View>

                {/* Secondary Results */}
                <Animated.View entering={FadeInDown.delay(450).springify()} style={styles.secondaryResultCard}>
                    <Text style={styles.secondaryLabel}>Total Stair Stringer Run</Text>
                    <Text style={styles.secondaryValue}>{result.totalRun} {unitLabel}</Text>
                </Animated.View>

                {/* References */}
                <Animated.View entering={FadeInDown.delay(500).springify()} style={styles.referenceCard}>
                    <View style={styles.refHeader}>
                        <Info color="#D97706" size={20} />
                        <Text style={styles.refTitle}>Building Code Reminders</Text>
                    </View>

                    <Text style={styles.refDesc}>
                        IBC (International Building Code) Requirements typically dictate:
                        {"\n"}• Maximum Riser Height: 7.75" (19.7 cm)
                        {"\n"}• Minimum Tread Depth: 10.0" (25.4 cm)
                        {"\n"}• Riser variation within a flight cannot exceed 3/8" (9.5mm)
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
        backgroundColor: '#F59E0B',
        borderRadius: 24,
        padding: 32,
        alignItems: 'center',
        marginBottom: 32,
        shadowColor: '#F59E0B',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 24,
        elevation: 8,
    },
    resultLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FEF3C7',
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
        color: '#FEF3C7',
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
        marginBottom: 24,
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
    secondaryResultCard: {
        backgroundColor: '#FFFFFF',
        padding: 20,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        marginBottom: 24,
        alignItems: 'center',
    },
    secondaryLabel: {
        fontSize: 14,
        color: '#64748B',
        fontWeight: '600',
        textTransform: 'uppercase',
        marginBottom: 8,
    },
    secondaryValue: {
        fontSize: 28,
        color: '#0F172A',
        fontWeight: '800',
    },
    referenceCard: {
        backgroundColor: '#FFFBEB',
        borderRadius: 16,
        padding: 24,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#FDE68A',
    },
    refHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    refTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#B45309',
        marginLeft: 8,
    },
    refDesc: {
        fontSize: 14,
        color: '#B45309',
        lineHeight: 22,
    }
});
