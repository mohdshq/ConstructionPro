import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useState, useMemo } from 'react';
import { ArrowLeft, Wind, MoveRight, Info } from "lucide-react-native";
import BackButton from "../components/BackButton";
import Animated, { FadeInDown } from 'react-native-reanimated';
import { router } from 'expo-router';
import { useStore } from '../store/useStore';
import { useThemeColors } from '../store/useThemeColors';

export default function DuctCalculatorScreen() {
    const { units } = useStore();
    const { colors } = useThemeColors();
    const [cfm, setCfm] = useState('1000');
    const [velocity, setVelocity] = useState('800');

    const isMetric = units === 'metric';

    // Standard calculation: Q = V * A
    // Q = Flow Rate (CFM)
    // V = Velocity (FPM)
    // A = Area (Sq Ft)
    const result = useMemo(() => {
        const q = parseFloat(cfm); // Note: keeping internal logic imperial since HVAC industry heavily relies on CFM
        const v = parseFloat(velocity);

        if (isNaN(q) || isNaN(v) || v === 0) {
            return { sqInches: '0.00', roundDiameter: '0.00' };
        }

        const areaSqFt = q / v;
        let areaSqInches = areaSqFt * 144;

        // Convert to CM if metric
        if (isMetric) {
            areaSqInches = areaSqInches * 6.4516; // sq inches to sq cm
        }

        // Diameter for round duct: A = pi * r^2 -> d = 2 * sqrt(A/pi)
        const diameter = 2 * Math.sqrt(areaSqInches / Math.PI);

        return {
            area: areaSqInches.toFixed(2),
            roundDiameter: diameter.toFixed(2)
        };
    }, [cfm, velocity, isMetric]);

    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor: colors.background }]}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <View style={[styles.headerBar, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
                <BackButton style={{ position: "absolute", left: 20, zIndex: 20, bottom: 8 }} />
                <Text style={[styles.headerBarTitle, { color: colors.text }]}>Duct Sizer</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {/* Instant Result Header */}
                <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.resultContainer}>
                    <Text style={styles.resultLabel}>Required Duct Area</Text>
                    <View style={styles.resultValueWrapper}>
                        <Text style={styles.resultValue}>{result.area}</Text>
                        <Text style={styles.resultUnit}> {isMetric ? 'cm²' : 'sq.in'}</Text>
                    </View>
                    <View style={styles.wastePill}>
                        <Text style={styles.wastePillText}>Round Duct Dia: {result.roundDiameter} {isMetric ? 'cm' : 'in'}</Text>
                    </View>
                </Animated.View>

                {/* Inputs */}
                <View style={styles.inputSection}>
                    <Text style={styles.sectionDesc}>Calculates duct area based on target airflow and velocity.</Text>

                    <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.formGroup}>
                        <Text style={[styles.label, { color: colors.text }]}>Airflow Volume ({isMetric ? 'L/s (Use CFM internally)' : 'CFM'})</Text>
                        <View style={[styles.inputWrapper, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                            <TextInput
                                style={[styles.input, { color: colors.text }]}
                                keyboardType="decimal-pad"
                                value={cfm}
                                onChangeText={setCfm}
                            />
                            <Wind color="#94A3B8" size={20} />
                        </View>
                    </Animated.View>

                    <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.formGroup}>
                        <Text style={[styles.label, { color: colors.text }]}>Target Velocity ({isMetric ? 'm/s (Use FPM)' : 'FPM'})</Text>
                        <View style={[styles.inputWrapper, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                            <TextInput
                                style={[styles.input, { color: colors.text }]}
                                keyboardType="decimal-pad"
                                value={velocity}
                                onChangeText={setVelocity}
                            />
                            <MoveRight color="#94A3B8" size={20} />
                        </View>
                    </Animated.View>
                </View>

                {/* References */}
                <Animated.View entering={FadeInDown.delay(400).springify()} style={styles.referenceCard}>
                    <View style={styles.refHeader}>
                        <Info color="#0EA5E9" size={20} />
                        <Text style={styles.refTitle}>Velocity Guidelines</Text>
                    </View>

                    <Text style={styles.refDesc}>
                        Maximum Recommended Velocities (FPM):
                        {"\n"}• Residential Main Ducts: 700 - 900
                        {"\n"}• Residential Branch: 500 - 600
                        {"\n"}• Commercial Main: 1000 - 1300
                        {"\n"}• Commercial Branch: 600 - 900
                        {"\n\n"}*Exceeding velocity limits causes noise and high friction loss. Formatted heavily in imperial as standard HVAC terminology.
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
        backgroundColor: '#0284C7',
        borderRadius: 24,
        padding: 32,
        alignItems: 'center',
        marginBottom: 32,
        shadowColor: '#0284C7',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 24,
        elevation: 8,
    },
    resultLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#BAE6FD',
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
        color: '#BAE6FD',
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
    sectionDesc: {
        fontSize: 14,
        color: '#64748B',
        marginBottom: 20,
        fontWeight: '500',
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
        backgroundColor: '#F0F9FF',
        borderRadius: 16,
        padding: 24,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#BAE6FD',
    },
    refHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    refTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0369A1',
        marginLeft: 8,
    },
    refDesc: {
        fontSize: 14,
        color: '#0369A1',
        lineHeight: 22,
    }
});
