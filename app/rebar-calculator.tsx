import BackButton from "../components/BackButton";
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useState, useMemo } from 'react';
import { Scale, ArrowLeft, Ruler, Hash, Info, Table as TableIcon, ChevronDown, ChevronUp } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { router } from 'expo-router';
import { useStore } from '../store/useStore';
import { useThemeColors } from '../store/useThemeColors';

const metricSchedule = [
    { size: '6mm', weight: '0.222 kg/m' },
    { size: '8mm', weight: '0.395 kg/m' },
    { size: '10mm', weight: '0.617 kg/m' },
    { size: '12mm', weight: '0.888 kg/m' },
    { size: '14mm', weight: '1.208 kg/m' },
    { size: '16mm', weight: '1.578 kg/m' },
    { size: '20mm', weight: '2.466 kg/m' },
    { size: '25mm', weight: '3.853 kg/m' },
];

const imperialSchedule = [
    { size: '#3 (3/8")', weight: '0.376 lbs/ft' },
    { size: '#4 (1/2")', weight: '0.668 lbs/ft' },
    { size: '#5 (5/8")', weight: '1.043 lbs/ft' },
    { size: '#6 (3/4")', weight: '1.502 lbs/ft' },
    { size: '#7 (7/8")', weight: '2.044 lbs/ft' },
    { size: '#8 (1")', weight: '2.670 lbs/ft' },
    { size: '#9 (1-1/8")', weight: '3.400 lbs/ft' },
    { size: '#10 (1-1/4")', weight: '4.303 lbs/ft' },
];

export default function RebarCalculatorScreen() {
    const { units } = useStore();
    const { colors } = useThemeColors();
    const [diameter, setDiameter] = useState('12');
    const [length, setLength] = useState('12');
    const [quantity, setQuantity] = useState('100');
    const [showSchedule, setShowSchedule] = useState(false);

    const isMetric = units === 'metric';
    const diamLabel = isMetric ? 'mm' : 'inches';
    const lenLabel = isMetric ? 'meters' : 'feet';
    const weightUnit = isMetric ? 'kg' : 'lbs';
    const totalUnit = isMetric ? 'Tons' : 'Short Tons';

    const result = useMemo(() => {
        const d = parseFloat(diameter);
        const l = parseFloat(length);
        const q = parseFloat(quantity);

        if (isNaN(d) || isNaN(l) || isNaN(q)) return { weight: '0.0', total: '0.00' };

        let weightPerLength = 0;

        if (isMetric) {
            // D^2 / 162 = kg per meter
            weightPerLength = (d * d) / 162;
        } else {
            // D is in inches. To convert to "bar size" (eighths of an inch), barSize = d * 8
            // Approx rule in lbs/ft: (barSize^2) / 24, or exact constants.
            // D^2 * 2.67 = lbs per foot approx. Let's use standard formula: D(inch)^2 * 2.6702
            weightPerLength = d * d * 2.6702;
        }

        const totalWeight = weightPerLength * l * q;
        const tons = isMetric ? (totalWeight / 1000) : (totalWeight / 2000);

        return {
            weight: totalWeight.toFixed(2),
            total: tons.toFixed(2)
        };
    }, [diameter, length, quantity, isMetric]);

    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor: colors.background }]}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <View style={[styles.headerBar, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
                <BackButton style={{ position: "absolute", left: 20, zIndex: 20, bottom: 8 }} />
                <Text style={[styles.headerBarTitle, { color: colors.text }]}>Rebar Estimator</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {/* Instant Result Header */}
                <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.resultContainer}>
                    <Text style={styles.resultLabel}>Total Steel Weight</Text>
                    <View style={styles.resultValueWrapper}>
                        <Text style={styles.resultValue}>{result.weight}</Text>
                        <Text style={styles.resultUnit}> {weightUnit}</Text>
                    </View>
                    <View style={styles.wastePill}>
                        <Text style={styles.wastePillText}>{result.total} {totalUnit}</Text>
                    </View>
                </Animated.View>

                {/* Inputs */}
                <View style={styles.inputSection}>
                    <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.formGroup}>
                        <Text style={[styles.label, { color: colors.text }]}>Bar Diameter ({diamLabel})</Text>
                        <View style={[styles.inputWrapper, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                            <TextInput
                                style={[styles.input, { color: colors.text }]}
                                keyboardType="decimal-pad"
                                value={diameter}
                                onChangeText={setDiameter}
                            />
                            <Scale color="#94A3B8" size={20} />
                        </View>
                    </Animated.View>

                    <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.formGroup}>
                        <Text style={[styles.label, { color: colors.text }]}>Bar Length ({lenLabel})</Text>
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

                    <Animated.View entering={FadeInDown.delay(400).springify()} style={styles.formGroup}>
                        <Text style={[styles.label, { color: colors.text }]}>Quantity (pieces)</Text>
                        <View style={[styles.inputWrapper, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                            <TextInput
                                style={[styles.input, { color: colors.text }]}
                                keyboardType="number-pad"
                                value={quantity}
                                onChangeText={setQuantity}
                            />
                            <Hash color="#94A3B8" size={20} />
                        </View>
                    </Animated.View>
                </View>

                {/* References */}
                <Animated.View entering={FadeInDown.delay(500).springify()} style={styles.referenceCard}>
                    <View style={styles.refHeader}>
                        <Info color="#3B82F6" size={20} />
                        <Text style={styles.refTitle}>Formula used</Text>
                    </View>

                    <View style={styles.formulaBox}>
                        <Text style={styles.formulaText}>
                            {isMetric ? 'W = (D² / 162) × L × Q' : 'W = (D² × 2.67) × L × Q'}
                        </Text>
                    </View>
                    <Text style={styles.refDesc}>
                        {isMetric
                            ? 'W = Weight (kg), D = Diameter (mm), L = Length (m), Q = Quantity.'
                            : 'W = Weight (lbs), D = Diameter (in), L = Length (ft), Q = Quantity.'}
                        {"\n\n"}Standard nominal weights may vary slightly by country, grade, and mill tolerances.
                    </Text>
                </Animated.View>

                {/* Standard Schedule Toggle */}
                <TouchableOpacity
                    style={styles.scheduleToggle}
                    onPress={() => setShowSchedule(!showSchedule)}
                    activeOpacity={0.7}
                >
                    <View style={styles.scheduleToggleLeft}>
                        <TableIcon color="#475569" size={20} />
                        <Text style={styles.scheduleToggleText}>Standard Rebar Schedule</Text>
                    </View>
                    {showSchedule ? <ChevronUp color="#475569" size={20} /> : <ChevronDown color="#475569" size={20} />}
                </TouchableOpacity>

                {showSchedule && (
                    <Animated.View entering={FadeInDown.springify()} style={styles.scheduleTable}>
                        <View style={styles.tableHeader}>
                            <Text style={styles.tableHeaderText}>Bar Size</Text>
                            <Text style={styles.tableHeaderText}>Nominal Weight</Text>
                        </View>
                        {(isMetric ? metricSchedule : imperialSchedule).map((row, index) => (
                            <View key={index} style={[styles.tableRow, index % 2 === 1 && styles.tableRowAlt]}>
                                <Text style={styles.tableRowText}>{row.size}</Text>
                                <Text style={styles.tableRowText}>{row.weight}</Text>
                            </View>
                        ))}
                    </Animated.View>
                )}

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
        backgroundColor: '#0EA5E9',
        borderRadius: 24,
        padding: 32,
        alignItems: 'center',
        marginBottom: 32,
        shadowColor: '#0EA5E9',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 24,
        elevation: 8,
    },
    resultLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#E0F2FE',
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
        color: '#E0F2FE',
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
    formulaBox: {
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#BAE6FD',
        marginBottom: 16,
        alignItems: 'center',
    },
    formulaText: {
        fontSize: 18,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        color: '#0284C7',
        fontWeight: '700',
    },
    refDesc: {
        fontSize: 14,
        color: '#0284C7',
        lineHeight: 22,
    },
    scheduleToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        marginBottom: 8,
    },
    scheduleToggleLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    scheduleToggleText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#334155',
        marginLeft: 12,
    },
    scheduleTable: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        overflow: 'hidden',
        marginBottom: 24,
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#F1F5F9',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
    },
    tableHeaderText: {
        flex: 1,
        fontSize: 14,
        fontWeight: '700',
        color: '#475569',
    },
    tableRow: {
        flexDirection: 'row',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    tableRowAlt: {
        backgroundColor: '#F8FAFC',
    },
    tableRowText: {
        flex: 1,
        fontSize: 14,
        color: '#334155',
        fontWeight: '500',
    },
});
