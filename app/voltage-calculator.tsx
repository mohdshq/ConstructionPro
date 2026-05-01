import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useState, useMemo } from 'react';
import { ArrowLeft, Zap, Ruler, Info } from "lucide-react-native";
import BackButton from "../components/BackButton";
import Animated, { FadeInDown } from 'react-native-reanimated';
import { router } from 'expo-router';
import { useStore } from '../store/useStore';
import { useThemeColors } from '../store/useThemeColors';

export default function VoltageCalculatorScreen() {
    const { units } = useStore();
    const { colors } = useThemeColors();
    const [distance, setDistance] = useState('100');
    const [amps, setAmps] = useState('20');
    const [voltage, setVoltage] = useState('120');

    const isMetric = units === 'metric';
    const unitLabel = isMetric ? 'meters' : 'feet';

    const result = useMemo(() => {
        const d = parseFloat(distance);
        const a = parseFloat(amps);
        const v = parseFloat(voltage);

        if (isNaN(d) || isNaN(a) || isNaN(v) || v === 0) {
            return { drop: '0.00', percent: '0.0' };
        }

        // Simplified educational formula for copper wire (approx 12 AWG equivalent)
        // K = 12.9 ohms-cmil/ft for copper
        // Let's just use a straightforward generic rule for the UI demonstration:
        let distFeet = isMetric ? d * 3.28084 : d;

        // Voltage Drop = (2 * K * I * D) / CM
        // Assuming 12 AWG (CM = 6530)
        const vDrop = (2 * 12.9 * a * distFeet) / 6530;
        const vPercent = (vDrop / v) * 100;

        return {
            drop: vDrop.toFixed(2),
            percent: vPercent.toFixed(2)
        };
    }, [distance, amps, voltage, isMetric]);

    const isWarning = parseFloat(result.percent) > 3.0;

    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor: colors.background }]}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <View style={[styles.headerBar, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
                <BackButton style={{ position: "absolute", left: 20, zIndex: 20, bottom: 8 }} />
                <Text style={[styles.headerBarTitle, { color: colors.text }]}>Voltage Drop</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {/* Instant Result Header */}
                <Animated.View entering={FadeInDown.delay(100).springify()} style={[styles.resultContainer, isWarning && styles.resultContainerWarning]}>
                    <Text style={[styles.resultLabel, isWarning && styles.resultLabelWarning]}>Estimated Voltage Drop</Text>
                    <View style={styles.resultValueWrapper}>
                        <Text style={[styles.resultValue, isWarning && styles.resultValueWarning]}>{result.drop}</Text>
                        <Text style={[styles.resultUnit, isWarning && styles.resultUnitWarning]}> Volts</Text>
                    </View>
                    <View style={[styles.wastePill, isWarning && styles.wastePillWarning]}>
                        <Text style={[styles.wastePillText, isWarning && styles.wastePillTextWarning]}>
                            {result.percent}% Drop {isWarning ? '(Exceeds 3% Code Limit)' : '(Within 3% Safe Limit)'}
                        </Text>
                    </View>
                </Animated.View>

                {/* Inputs */}
                <View style={styles.inputSection}>
                    <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.formGroup}>
                        <Text style={[styles.label, { color: colors.text }]}>Run Distance ({unitLabel})</Text>
                        <View style={[styles.inputWrapper, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                            <TextInput
                                style={[styles.input, { color: colors.text }]}
                                keyboardType="decimal-pad"
                                value={distance}
                                onChangeText={setDistance}
                            />
                            <Ruler color="#94A3B8" size={20} />
                        </View>
                    </Animated.View>

                    <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.formGroup}>
                        <Text style={[styles.label, { color: colors.text }]}>Load Current (Amps)</Text>
                        <View style={[styles.inputWrapper, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                            <TextInput
                                style={[styles.input, { color: colors.text }]}
                                keyboardType="decimal-pad"
                                value={amps}
                                onChangeText={setAmps}
                            />
                            <Zap color="#94A3B8" size={20} />
                        </View>
                    </Animated.View>

                    <Animated.View entering={FadeInDown.delay(400).springify()} style={styles.formGroup}>
                        <Text style={[styles.label, { color: colors.text }]}>Source Voltage (V)</Text>
                        <View style={[styles.inputWrapper, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                            <TextInput
                                style={[styles.input, { color: colors.text }]}
                                keyboardType="decimal-pad"
                                value={voltage}
                                onChangeText={setVoltage}
                            />
                            <Text style={{ color: '#94A3B8', fontWeight: 'bold' }}>V</Text>
                        </View>
                    </Animated.View>
                </View>

                {/* References */}
                <Animated.View entering={FadeInDown.delay(500).springify()} style={styles.referenceCard}>
                    <View style={styles.refHeader}>
                        <Info color="#EAB308" size={20} />
                        <Text style={styles.refTitle}>NEC Standards</Text>
                    </View>

                    <Text style={styles.refDesc}>
                        * This calculator assumes 12 AWG Copper wire single-phase.
                        {"\n\n"}The National Electrical Code (NEC) recommends a maximum voltage drop of 3% for branch circuits, and 5% for feeder circuits combined, to ensure equipment operates safely and efficiently.
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
        backgroundColor: '#1E293B',
        borderRadius: 24,
        padding: 32,
        alignItems: 'center',
        marginBottom: 32,
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 24,
        elevation: 8,
    },
    resultContainerWarning: {
        backgroundColor: '#FEF2F2',
        borderWidth: 1,
        borderColor: '#FCA5A5',
    },
    resultLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#94A3B8',
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    resultLabelWarning: {
        color: '#EF4444',
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
    resultValueWarning: {
        color: '#DC2626',
    },
    resultUnit: {
        fontSize: 24,
        fontWeight: '600',
        color: '#94A3B8',
        marginBottom: 8,
        marginLeft: 4,
    },
    resultUnitWarning: {
        color: '#EF4444',
    },
    wastePill: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    wastePillWarning: {
        backgroundColor: '#FEE2E2',
    },
    wastePillText: {
        color: '#CBD5E1',
        fontSize: 14,
        fontWeight: '600',
    },
    wastePillTextWarning: {
        color: '#B91C1C',
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
        backgroundColor: '#FEFCE8',
        borderRadius: 16,
        padding: 24,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#FEF08A',
    },
    refHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    refTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#A16207',
        marginLeft: 8,
    },
    refDesc: {
        fontSize: 14,
        color: '#A16207',
        lineHeight: 22,
    }
});
