import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useState, useMemo } from 'react';
import { ArrowLeft, Users, Clock, DollarSign, Info, Save } from "lucide-react-native";
import BackButton from "../components/BackButton";
import Animated, { FadeInDown } from 'react-native-reanimated';
import { router, useLocalSearchParams } from 'expo-router';
import { useThemeColors } from '../store/useThemeColors';
import { useProjectsStore } from '../store/projectsStore';
import { useAuthStore } from '../store/useAuthStore';
import SaveCalculationModal from '../components/SaveCalculationModal';
import { useEffect } from 'react';

export default function LaborCalculatorScreen() {
    const { calcId } = useLocalSearchParams<{ calcId: string }>();
    const { colors, isDark } = useThemeColors();
    const { calculations } = useProjectsStore();

    const [totalQuantity, setTotalQuantity] = useState('1000');
    const [productivityRate, setProductivityRate] = useState('10'); // units per hour per worker
    const [crewSize, setCrewSize] = useState('4');
    const [hourlyRate, setHourlyRate] = useState('45'); // average cost per worker per hour
    const [hoursPerDay, setHoursPerDay] = useState('8');
    const [projectModalVisible, setProjectModalVisible] = useState(false);

    useEffect(() => {
        if (calcId) {
            const calc = calculations.find(c => c.id === calcId);
            if (calc && calc.data) {
                if (calc.data.totalQuantity) setTotalQuantity(calc.data.totalQuantity.toString());
                if (calc.data.productivityRate) setProductivityRate(calc.data.productivityRate.toString());
                if (calc.data.crewSize) setCrewSize(calc.data.crewSize.toString());
                if (calc.data.hourlyRate) setHourlyRate(calc.data.hourlyRate.toString());
                if (calc.data.hoursPerDay) setHoursPerDay(calc.data.hoursPerDay.toString());
            }
        }
    }, [calcId, calculations]);

    const result = useMemo(() => {
        const qty = parseFloat(totalQuantity);
        const prodRate = parseFloat(productivityRate);
        const crew = parseFloat(crewSize);
        const rate = parseFloat(hourlyRate);
        const hrsPerDay = parseFloat(hoursPerDay);

        if (isNaN(qty) || isNaN(prodRate) || isNaN(crew) || isNaN(rate) || isNaN(hrsPerDay) || prodRate === 0 || crew === 0) {
            return { totalHours: '0.00', totalDays: '0.00', totalCost: '0.00' };
        }

        // Total hours for 1 worker to do the whole job
        const totalManHours = qty / prodRate;

        // Total hours for the crew
        const durationHours = totalManHours / crew;

        // Total Days
        const durationDays = hrsPerDay > 0 ? durationHours / hrsPerDay : 0;

        // Total Cost
        const totalCost = totalManHours * rate;

        return {
            totalHours: Math.ceil(durationHours).toString(),
            totalDays: durationDays.toFixed(1),
            totalCost: totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        };
    }, [totalQuantity, productivityRate, crewSize, hourlyRate, hoursPerDay]);

    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor: colors.background }]}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <View style={[styles.headerBar, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
                <BackButton style={{ position: "absolute", left: 20, zIndex: 20, bottom: 8 }} />
                <Text style={[styles.headerBarTitle, { color: colors.text }]}>Labor Estimator</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {/* Instant Result Header */}
                <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.resultContainer}>
                    <Text style={styles.resultLabel}>Estimated Labor Cost</Text>
                    <View style={styles.resultValueWrapper}>
                        <Text style={styles.resultUnitSymbol}>$</Text>
                        <Text style={styles.resultValue}>{result.totalCost}</Text>
                    </View>
                    <View style={styles.wastePill}>
                        <Text style={styles.wastePillText}>Duration: {result.totalDays} Days ({result.totalHours} hrs)</Text>
                    </View>
                </Animated.View>

                {/* Scope Inputs */}
                <View style={styles.inputSection}>
                    <Text style={[styles.sectionHeader, { color: colors.text }]}>Project Scope</Text>
                    <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.formGroup}>
                        <Text style={[styles.label, { color: colors.text }]}>Total Quantity (units, m², ft², etc.)</Text>
                        <View style={[styles.inputWrapper, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                            <TextInput
                                style={[styles.input, { color: colors.text }]}
                                keyboardType="decimal-pad"
                                value={totalQuantity}
                                onChangeText={setTotalQuantity}
                            />
                        </View>
                    </Animated.View>

                    <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.formGroup}>
                        <Text style={[styles.label, { color: colors.text }]}>Productivity Rate (units / hr / worker)</Text>
                        <View style={[styles.inputWrapper, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                            <TextInput
                                style={[styles.input, { color: colors.text }]}
                                keyboardType="decimal-pad"
                                value={productivityRate}
                                onChangeText={setProductivityRate}
                            />
                            <Clock color="#94A3B8" size={20} />
                        </View>
                    </Animated.View>
                </View>

                {/* Crew Inputs */}
                <View style={styles.inputSection}>
                    <Text style={[styles.sectionHeader, { color: colors.text }]}>Crew & Cost</Text>

                    <Animated.View entering={FadeInDown.delay(400).springify()} style={styles.row}>
                        <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                            <Text style={[styles.label, { color: colors.text }]}>Crew Size</Text>
                            <View style={[styles.inputWrapper, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                                <TextInput
                                    style={[styles.input, { color: colors.text }]}
                                    keyboardType="number-pad"
                                    value={crewSize}
                                    onChangeText={setCrewSize}
                                />
                                <Users color="#94A3B8" size={20} />
                            </View>
                        </View>
                        <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                            <Text style={[styles.label, { color: colors.text }]}>Work Hrs/Day</Text>
                            <View style={[styles.inputWrapper, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                                <TextInput
                                    style={[styles.input, { color: colors.text }]}
                                    keyboardType="decimal-pad"
                                    value={hoursPerDay}
                                    onChangeText={setHoursPerDay}
                                />
                            </View>
                        </View>
                    </Animated.View>

                    <Animated.View entering={FadeInDown.delay(500).springify()} style={styles.formGroup}>
                        <Text style={[styles.label, { color: colors.text }]}>Average Hourly Rate ($ / hr)</Text>
                        <View style={[styles.inputWrapper, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                            <TextInput
                                style={[styles.input, { color: colors.text }]}
                                keyboardType="decimal-pad"
                                value={hourlyRate}
                                onChangeText={setHourlyRate}
                            />
                            <DollarSign color="#94A3B8" size={20} />
                        </View>
                    </Animated.View>

                </View>

                {/* References */}
                <Animated.View entering={FadeInDown.delay(600).springify()} style={styles.referenceCard}>
                    <View style={styles.refHeader}>
                        <Info color="#4338CA" size={20} />
                        <Text style={styles.refTitle}>Estimating Guide</Text>
                    </View>

                    <Text style={styles.refDesc}>
                        Productivity rates vary significantly by trade, weather conditions, and site accessibility.
                        {"\n\n"}This calculator assumes 100% efficiency. In reality, consider factoring in a 10-20% inefficiency buffer for material handling, breaks, and setup/cleanup time.
                    </Text>
                </Animated.View>

                {/* Save to Project Button */}
                <Animated.View entering={FadeInDown.delay(700).springify()} style={{ marginBottom: 40 }}>
                    <TouchableOpacity 
                        style={[styles.saveBtn, { backgroundColor: colors.primary }]}
                        onPress={() => setProjectModalVisible(true)}
                    >
                        <Save size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                        <Text style={styles.saveBtnText}>Save to Project</Text>
                    </TouchableOpacity>
                </Animated.View>

            </ScrollView>

            <SaveCalculationModal 
                visible={projectModalVisible}
                onClose={() => setProjectModalVisible(false)}
                calculationType="labor"
                calculationData={{
                    totalQuantity,
                    productivityRate,
                    crewSize,
                    hourlyRate,
                    hoursPerDay,
                    totalHours: result.totalHours,
                    totalDays: result.totalDays,
                    totalCost: result.totalCost
                }}
            />
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
        backgroundColor: '#4F46E5',
        borderRadius: 24,
        padding: 32,
        alignItems: 'center',
        marginBottom: 32,
        shadowColor: '#4F46E5',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 24,
        elevation: 8,
    },
    resultLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#E0E7FF',
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    resultValueWrapper: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    resultUnitSymbol: {
        fontSize: 32,
        fontWeight: '700',
        color: '#A5B4FC',
        marginTop: 4,
        marginRight: 4,
    },
    resultValue: {
        fontSize: 56,
        fontWeight: '800',
        color: '#FFFFFF',
        letterSpacing: -1,
        lineHeight: 60,
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
        backgroundColor: '#FFFFFF',
        padding: 20,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    sectionHeader: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1E293B',
        marginBottom: 16,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    formGroup: {
        marginBottom: 16,
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        color: '#64748B',
        marginBottom: 8,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 10,
        paddingHorizontal: 12,
    },
    input: {
        flex: 1,
        paddingVertical: 12,
        fontSize: 16,
        fontWeight: '600',
        color: '#0F172A',
    },
    referenceCard: {
        backgroundColor: '#EEF2FF',
        borderRadius: 16,
        padding: 24,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#C7D2FE',
    },
    refHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    refTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#3730A3',
        marginLeft: 8,
    },
    refDesc: {
        fontSize: 14,
        color: '#3730A3',
        lineHeight: 22,
    },
    saveBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 12,
        shadowColor: '#2563EB',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    saveBtnText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    }
});
