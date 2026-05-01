import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Platform } from 'react-native';
import { useState, useMemo } from 'react';
import { ArrowLeft, Box, Info } from "lucide-react-native";
import BackButton from "../components/BackButton";
import Animated, { FadeInDown } from 'react-native-reanimated';
import { router } from 'expo-router';
import { useThemeColors } from '../store/useThemeColors';

// Simplified lookup dictionary for Area in square inches
const conduitArea40Percent: Record<string, number> = {
    '1/2"': 0.122,
    '3/4"': 0.213,
    '1"': 0.346,
    '1-1/4"': 0.598,
    '1-1/2"': 0.814,
    '2"': 1.342,
    '2-1/2"': 1.924,
    '3"': 2.973,
};

const wireAreaSqIn: Record<string, number> = {
    '14 AWG': 0.0097,
    '12 AWG': 0.0133,
    '10 AWG': 0.0211,
    '8 AWG': 0.0366,
    '6 AWG': 0.0507,
    '4 AWG': 0.0824,
    '2 AWG': 0.1158,
    '1/0 AWG': 0.1855,
};

const conduits = Object.keys(conduitArea40Percent);
const wires = Object.keys(wireAreaSqIn);

export default function PipeCalculatorScreen() {
    const { colors, isDark } = useThemeColors();
    const [activeConduit, setActiveConduit] = useState('3/4"');
    const [activeWire, setActiveWire] = useState('12 AWG');

    const result = useMemo(() => {
        const pipe40 = conduitArea40Percent[activeConduit];
        const wireA = wireAreaSqIn[activeWire];

        if (!pipe40 || !wireA) return '0';

        const count = Math.floor(pipe40 / wireA);
        return count.toString();
    }, [activeConduit, activeWire]);

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={[styles.headerBar, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
                <BackButton style={{ position: "absolute", left: 20, zIndex: 20, bottom: 8 }} />
                <Text style={[styles.headerBarTitle, { color: colors.text }]}>Conduit Fill</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {/* Instant Result Header */}
                <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.resultContainer}>
                    <Text style={styles.resultLabel}>Maximum Allowed Wires</Text>
                    <View style={styles.resultValueWrapper}>
                        <Text style={styles.resultValue}>{result}</Text>
                        <Text style={styles.resultUnit}> wires</Text>
                    </View>
                    <View style={styles.wastePill}>
                        <Text style={styles.wastePillText}>At 40% Fill Limit (Standard)</Text>
                    </View>
                </Animated.View>

                {/* Conduit Picker */}
                <View style={styles.inputSection}>
                    <Text style={[styles.sectionHeader, { color: colors.text }]}>EMT Conduit Trade Size</Text>
                    <View style={styles.pickerGrid}>
                        {conduits.map((size, index) => (
                            <Animated.View key={size} entering={FadeInDown.delay(150 + index * 30).springify()} style={styles.gridItemWrapper}>
                                <TouchableOpacity
                                    style={[styles.pickerPill, activeConduit === size && styles.pickerPillActiveConduit]}
                                    onPress={() => setActiveConduit(size)}
                                >
                                    <Text style={[styles.pickerPillText, activeConduit === size && styles.pickerPillTextActiveConduit]}>
                                        {size}
                                    </Text>
                                </TouchableOpacity>
                            </Animated.View>
                        ))}
                    </View>
                </View>

                {/* Wire Picker */}
                <View style={styles.inputSection}>
                    <Text style={[styles.sectionHeader, { color: colors.text }]}>THHN Wire Gauge</Text>
                    <View style={styles.pickerGrid}>
                        {wires.map((wire, index) => (
                            <Animated.View key={wire} entering={FadeInDown.delay(300 + index * 30).springify()} style={styles.gridItemWrapper}>
                                <TouchableOpacity
                                    style={[styles.pickerPill, activeWire === wire && styles.pickerPillActiveWire]}
                                    onPress={() => setActiveWire(wire)}
                                >
                                    <Text style={[styles.pickerPillText, activeWire === wire && styles.pickerPillTextActiveWire]}>
                                        {wire}
                                    </Text>
                                </TouchableOpacity>
                            </Animated.View>
                        ))}
                    </View>
                </View>

                {/* References */}
                <Animated.View entering={FadeInDown.delay(500).springify()} style={styles.referenceCard}>
                    <View style={styles.refHeader}>
                        <Info color="#0284C7" size={20} />
                        <Text style={styles.refTitle}>NEC Chapter 9, Table 1</Text>
                    </View>

                    <Text style={styles.refDesc}>
                        According to the National Electrical Code, a conduit with 3 or more conductors must not exceed a 40% cross-sectional fill rate to prevent heat buildup and wire damage.
                        {"\n\n"}* This simplified calculator assumes THHN solid/stranded copper wire and Electrical Metallic Tubing (EMT).
                    </Text>
                </Animated.View>

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#FFFFFF',
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
        backgroundColor: '#F8FAFC',
        minHeight: '100%'
    },
    resultContainer: {
        backgroundColor: '#0369A1',
        borderRadius: 24,
        padding: 32,
        alignItems: 'center',
        marginBottom: 32,
        shadowColor: '#0369A1',
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
        marginBottom: 24,
    },
    sectionHeader: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1E293B',
        marginBottom: 16,
    },
    pickerGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -4,
    },
    gridItemWrapper: {
        width: '25%',
        padding: 4,
    },
    pickerPill: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    pickerPillActiveConduit: {
        backgroundColor: '#0F172A',
        borderColor: '#0F172A',
    },
    pickerPillActiveWire: {
        backgroundColor: '#2563EB',
        borderColor: '#2563EB',
    },
    pickerPillText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#64748B',
    },
    pickerPillTextActiveConduit: {
        color: '#FFFFFF',
    },
    pickerPillTextActiveWire: {
        color: '#FFFFFF',
    },
    referenceCard: {
        backgroundColor: '#F0F9FF',
        borderRadius: 16,
        padding: 24,
        marginTop: 8,
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
