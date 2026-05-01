import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useState, useMemo } from 'react';
import { ArrowLeft, Clock, Truck, Activity, Info } from "lucide-react-native";
import BackButton from "../components/BackButton";
import Animated, { FadeInDown } from 'react-native-reanimated';
import { router } from 'expo-router';
import { useStore } from '../store/useStore';
import { useThemeColors } from '../store/useThemeColors';

export default function ConcretePourCalculatorScreen() {
    const { units } = useStore();
    const { colors } = useThemeColors();

    const isMetric = units === 'metric';
    const volLabel = isMetric ? 'm³' : 'yd³';

    const [totalVolume, setTotalVolume] = useState('100');
    const [truckCapacity, setTruckCapacity] = useState(isMetric ? '9' : '10');
    const [pourRate, setPourRate] = useState(isMetric ? '30' : '40'); // volume per hour

    const result = useMemo(() => {
        const vol = parseFloat(totalVolume);
        const capacity = parseFloat(truckCapacity);
        const rate = parseFloat(pourRate);

        if (isNaN(vol) || isNaN(capacity) || isNaN(rate) || capacity === 0 || rate === 0) {
            return {
                totalTrucks: '0',
                durationHours: '0.0',
                spacingMinutes: '0',
                ratePerMinute: '0.00'
            };
        }

        // Number of trucks required (rounded up)
        const trucks = Math.ceil(vol / capacity);

        // Total duration of pour
        const durationHrs = vol / rate;

        // Truck spacing (How often a truck needs to arrive to keep up with the pour rate)
        // Time per truck = Truck Capacity / Pour Rate
        const spacingHrs = capacity / rate;
        const spacingMins = Math.round(spacingHrs * 60);

        // Placement rate per minute
        const ratePerMin = rate / 60;

        return {
            totalTrucks: trucks.toString(),
            durationHours: durationHrs.toFixed(1),
            spacingMinutes: spacingMins.toString(),
            ratePerMinute: ratePerMin.toFixed(2)
        };
    }, [totalVolume, truckCapacity, pourRate]);

    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor: colors.background }]}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <View style={[styles.headerBar, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
                <BackButton style={{ position: "absolute", left: 20, zIndex: 20, bottom: 8 }} />
                <Text style={[styles.headerBarTitle, { color: colors.text }]}>Concrete Pour Rate</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {/* Instant Result Header */}
                <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.resultContainer}>
                    <Text style={styles.resultLabel}>Required Truck Spacing</Text>
                    <View style={styles.resultValueWrapper}>
                        <Text style={styles.resultValue}>{result.spacingMinutes}</Text>
                        <Text style={styles.resultUnit}> mins</Text>
                    </View>
                    <View style={styles.wastePill}>
                        <Text style={styles.wastePillText}>Total Pour Duration: {result.durationHours} hrs</Text>
                    </View>
                </Animated.View>

                {/* Core Stats Row */}
                <Animated.View entering={FadeInDown.delay(150).springify()} style={styles.statsRow}>
                    <View style={styles.statBox}>
                        <Truck color="#6366F1" size={24} style={styles.statIcon} />
                        <Text style={styles.statValue}>{result.totalTrucks}</Text>
                        <Text style={styles.statLabel}>Total Trucks</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Activity color="#6366F1" size={24} style={styles.statIcon} />
                        <Text style={styles.statValue}>{result.ratePerMinute}</Text>
                        <Text style={styles.statLabel}>Place {volLabel}/min</Text>
                    </View>
                </Animated.View>

                {/* Inputs */}
                <View style={styles.inputSection}>
                    <Text style={[styles.sectionHeader, { color: colors.text }]}>Pour Parameters</Text>

                    <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.formGroup}>
                        <Text style={[styles.label, { color: colors.text }]}>Total Volume ({volLabel})</Text>
                        <View style={[styles.inputWrapper, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                            <TextInput
                                style={[styles.input, { color: colors.text }]}
                                keyboardType="decimal-pad"
                                value={totalVolume}
                                onChangeText={setTotalVolume}
                            />
                        </View>
                    </Animated.View>

                    <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.formGroup}>
                        <Text style={[styles.label, { color: colors.text }]}>Truck Capacity ({volLabel} / truck)</Text>
                        <View style={[styles.inputWrapper, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                            <TextInput
                                style={[styles.input, { color: colors.text }]}
                                keyboardType="decimal-pad"
                                value={truckCapacity}
                                onChangeText={setTruckCapacity}
                            />
                            <Truck color="#94A3B8" size={20} />
                        </View>
                    </Animated.View>

                    <Animated.View entering={FadeInDown.delay(400).springify()} style={styles.formGroup}>
                        <Text style={[styles.label, { color: colors.text }]}>Target Placement Rate ({volLabel} / hour)</Text>
                        <View style={[styles.inputWrapper, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                            <TextInput
                                style={[styles.input, { color: colors.text }]}
                                keyboardType="decimal-pad"
                                value={pourRate}
                                onChangeText={setPourRate}
                            />
                            <Clock color="#94A3B8" size={20} />
                        </View>
                    </Animated.View>

                </View>

                {/* References */}
                <Animated.View entering={FadeInDown.delay(500).springify()} style={styles.referenceCard}>
                    <View style={styles.refHeader}>
                        <Info color="#4F46E5" size={20} />
                        <Text style={styles.refTitle}>Logistics Planning</Text>
                    </View>

                    <Text style={styles.refDesc}>
                        Continuous placement is critical to prevent cold joints.
                        {"\n\n"}Standard concrete pump trucks can typically output 30-100 {volLabel}/hour depending on the boom size, line constraints, and crew finishing speed. Tailgate placement is significantly slower.
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
        backgroundColor: '#6366F1',
        borderRadius: 24,
        padding: 32,
        alignItems: 'center',
        marginBottom: 20,
        shadowColor: '#6366F1',
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
        fontSize: 28,
        fontWeight: '600',
        color: '#E0E7FF',
        marginBottom: 8,
        marginLeft: 6,
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
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    statBox: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        marginHorizontal: 4,
    },
    statIcon: {
        marginBottom: 8,
    },
    statValue: {
        fontSize: 24,
        fontWeight: '700',
        color: '#1E293B',
    },
    statLabel: {
        fontSize: 12,
        color: '#64748B',
        fontWeight: '600',
        textTransform: 'uppercase',
        marginTop: 4,
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
    formGroup: {
        marginBottom: 16,
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
    }
});
