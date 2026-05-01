import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useState, useMemo } from 'react';
import { ArrowLeft, Wind, Ruler, Info } from "lucide-react-native";
import BackButton from "../components/BackButton";
import Animated, { FadeInDown } from 'react-native-reanimated';
import { router } from 'expo-router';
import { useStore } from '../store/useStore';
import { useThemeColors } from '../store/useThemeColors';

export default function HvacCalculatorScreen() {
    const { units } = useStore();
    const { colors } = useThemeColors();
    const [length, setLength] = useState('20');
    const [width, setWidth] = useState('15');

    const isMetric = units === 'metric';
    const unitLabel = isMetric ? 'meters' : 'feet';

    const result = useMemo(() => {
        const l = parseFloat(length);
        const w = parseFloat(width);

        if (isNaN(l) || isNaN(w)) {
            return { btu: '0', tons: '0.0' };
        }

        let areaSqFt = l * w;
        if (isMetric) {
            // convert sq meters to sq ft
            areaSqFt = areaSqFt * 10.7639;
        }

        // Rule of thumb: ~30 BTU per sq ft
        const totalBtu = areaSqFt * 30;
        const tons = totalBtu / 12000;

        return {
            btu: Math.round(totalBtu).toLocaleString(),
            tons: tons.toFixed(2)
        };
    }, [length, width, isMetric]);

    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor: colors.background }]}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <View style={[styles.headerBar, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
                <BackButton style={{ position: "absolute", left: 20, zIndex: 20, bottom: 8 }} />
                <Text style={[styles.headerBarTitle, { color: colors.text }]}>HVAC Estimator</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {/* Instant Result Header */}
                <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.resultContainer}>
                    <Text style={styles.resultLabel}>Required Cooling Capacity</Text>
                    <View style={styles.resultValueWrapper}>
                        <Text style={styles.resultValue}>{result.tons}</Text>
                        <Text style={styles.resultUnit}> Tons</Text>
                    </View>
                    <View style={styles.wastePill}>
                        <Text style={styles.wastePillText}>{result.btu} BTU/hr</Text>
                    </View>
                </Animated.View>

                {/* Inputs */}
                <View style={styles.inputSection}>
                    <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.formGroup}>
                        <Text style={[styles.label, { color: colors.text }]}>Room Length ({unitLabel})</Text>
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
                        <Text style={[styles.label, { color: colors.text }]}>Room Width ({unitLabel})</Text>
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
                </View>

                {/* References */}
                <Animated.View entering={FadeInDown.delay(400).springify()} style={styles.referenceCard}>
                    <View style={styles.refHeader}>
                        <Info color="#0D9488" size={20} />
                        <Text style={styles.refTitle}>Rules of Thumb</Text>
                    </View>

                    <Text style={styles.refDesc}>
                        This calculator uses the standard residential rule of thumb: 30 BTU per square foot of living space.
                        {"\n\n"}Results should be adjusted for:
                        {"\n"}• Ceiling heights above 8 feet
                        {"\n"}• Significant sun exposure or heavy shading
                        {"\n"}• Kitchen areas (add 4,000 BTU)
                        {"\n"}• High occupancy rooms (add 600 BTU/person)
                        {"\n\n"}* 1 Ton of cooling capacity = 12,000 BTU/hr.
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
        backgroundColor: '#14B8A6',
        borderRadius: 24,
        padding: 32,
        alignItems: 'center',
        marginBottom: 32,
        shadowColor: '#14B8A6',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 24,
        elevation: 8,
    },
    resultLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#CCFBF1',
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
        color: '#CCFBF1',
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
        backgroundColor: '#F0FDFA',
        borderRadius: 16,
        padding: 24,
        borderWidth: 1,
        borderColor: '#CCFBF1',
    },
    refHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    refTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0F766E',
        marginLeft: 8,
    },
    refDesc: {
        fontSize: 14,
        color: '#0F766E',
        lineHeight: 22,
    }
});
