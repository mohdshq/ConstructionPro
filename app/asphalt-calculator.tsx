import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useState, useMemo } from 'react';
import { ArrowLeft, Ruler, Truck, Info, Compass } from "lucide-react-native";
import BackButton from "../components/BackButton";
import Animated, { FadeInDown } from 'react-native-reanimated';
import { router } from 'expo-router';
import { useStore } from '../store/useStore';
import { useThemeColors } from '../store/useThemeColors';

export default function AsphaltCalculatorScreen() {
    const { units } = useStore();
    const { colors } = useThemeColors();
    const [length, setLength] = useState('100');
    const [width, setWidth] = useState('20');
    const [thickness, setThickness] = useState('3');

    const isMetric = units === 'metric';
    const unitLabel = isMetric ? 'meters' : 'feet';
    const thickLabel = isMetric ? 'cm' : 'inches';

    const result = useMemo(() => {
        const l = parseFloat(length);
        const w = parseFloat(width);
        const t = parseFloat(thickness);

        if (isNaN(l) || isNaN(w) || isNaN(t)) return { tons: '0.00', volume: '0.00' };

        let totalTons = 0;
        let volume = 0;

        if (isMetric) {
            // Metric: Area (m2) * Thickness (m) * Density (usually ~2.4t/m3)
            const area = l * w;
            const thicknessM = t / 100;
            volume = area * thicknessM;
            totalTons = volume * 2.4; // 2.4 metric tons per cubic meter
        } else {
            // Imperial: (Length (ft) * Width (ft) * Thickness (in)) / 12 = Cubic Feet
            // Cubic Feet / 27 = Cubic Yards
            // Tons = Area(sqft) * Thickness(in) * 0.006 (Standard Hot Mix Asphalt rule to US short tons)
            const area = l * w;
            volume = (area * t) / 12 / 27; // cubic yards
            totalTons = area * t * 0.006;
        }

        return {
            tons: totalTons.toFixed(2),
            volume: volume.toFixed(2)
        };
    }, [length, width, thickness, isMetric]);

    const wasteResult = useMemo(() => {
        return (parseFloat(result.tons) * 1.05).toFixed(2); // 5% waste
    }, [result.tons]);

    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor: colors.background }]}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <View style={[styles.headerBar, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
                <BackButton style={{ position: "absolute", left: 20, zIndex: 20, bottom: 8 }} />
                <Text style={[styles.headerBarTitle, { color: colors.text }]}>Asphalt Estimator</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {/* Instant Result Header */}
                <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.resultContainer}>
                    <Text style={styles.resultLabel}>Required Asphalt Weight</Text>
                    <View style={styles.resultValueWrapper}>
                        <Text style={styles.resultValue}>{result.tons}</Text>
                        <Text style={styles.resultUnit}> {isMetric ? 'tons' : 'short tons'}</Text>
                    </View>
                    <View style={styles.wastePill}>
                        <Text style={styles.wastePillText}>{wasteResult} tons with 5% waste allowance</Text>
                    </View>
                </Animated.View>

                {/* Inputs */}
                <View style={styles.inputSection}>
                    <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.formGroup}>
                        <Text style={[styles.label, { color: colors.text }]}>Paving Length ({unitLabel})</Text>
                        <View style={[styles.inputWrapper, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                            <TextInput
                                style={[styles.input, { color: colors.text }]}
                                keyboardType="decimal-pad"
                                value={length}
                                onChangeText={setLength}
                            />
                            <Compass color="#94A3B8" size={20} />
                        </View>
                    </Animated.View>

                    <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.formGroup}>
                        <Text style={[styles.label, { color: colors.text }]}>Paving Width ({unitLabel})</Text>
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
                        <Text style={[styles.label, { color: colors.text }]}>Asphalt Thickness ({thickLabel})</Text>
                        <View style={[styles.inputWrapper, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                            <TextInput
                                style={[styles.input, { color: colors.text }]}
                                keyboardType="decimal-pad"
                                value={thickness}
                                onChangeText={setThickness}
                            />
                            <Ruler color="#94A3B8" size={20} />
                        </View>
                    </Animated.View>
                </View>

                {/* References */}
                <Animated.View entering={FadeInDown.delay(500).springify()} style={styles.referenceCard}>
                    <View style={styles.refHeader}>
                        <Info color="#1D4ED8" size={20} />
                        <Text style={styles.refTitle}>Standard Densities</Text>
                    </View>

                    <View style={styles.formulaBox}>
                        <Text style={styles.formulaText}>
                            {isMetric ? '2.4 metric tons per m³' : 'Tons = Area (ft²) × Depth (in) × 0.006'}
                        </Text>
                    </View>
                    <Text style={styles.refDesc}>
                        Calculations are based on Hot Mix Asphalt (HMA) compacted to typical densities (approx 145 lbs/ft³ or 2.4 t/m³).
                        {"\n\n"}Always consult your local asphalt plant for specific mix design yields.
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
        backgroundColor: '#0F172A',
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
    resultLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#94A3B8',
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
        fontSize: 20,
        fontWeight: '600',
        color: '#94A3B8',
        marginBottom: 10,
        marginLeft: 6,
    },
    wastePill: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    wastePillText: {
        color: '#E2E8F0',
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
        backgroundColor: '#F1F5F9',
        borderRadius: 16,
        padding: 24,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    refHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    refTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0F172A',
        marginLeft: 8,
    },
    formulaBox: {
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#CBD5E1',
        marginBottom: 16,
        alignItems: 'center',
    },
    formulaText: {
        fontSize: 16,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        color: '#334155',
        fontWeight: '700',
    },
    refDesc: {
        fontSize: 14,
        color: '#475569',
        lineHeight: 22,
    }
});
