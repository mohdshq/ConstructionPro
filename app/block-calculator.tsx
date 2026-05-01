import BackButton from "../components/BackButton";
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useState, useMemo } from 'react';
import { Calculator, ArrowLeft, Ruler, LayoutGrid, Info } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { router } from 'expo-router';
import { useStore } from '../store/useStore';
import { useThemeColors } from '../store/useThemeColors';

export default function BlockCalculatorScreen() {
    const { units } = useStore();
    const { colors } = useThemeColors();

    // Default values based on units
    const isMetric = units === 'metric';
    const defaultWallL = isMetric ? '10' : '30';
    const defaultWallH = isMetric ? '3' : '10';
    const defaultBlockL = isMetric ? '400' : '16'; // 400mm or 16in
    const defaultBlockH = isMetric ? '200' : '8'; // 200mm or 8in
    const defaultMortar = isMetric ? '10' : '0.375'; // 10mm or 3/8in

    const [wallLength, setWallLength] = useState(defaultWallL);
    const [wallHeight, setWallHeight] = useState(defaultWallH);
    const [blockLength, setBlockLength] = useState(defaultBlockL);
    const [blockHeight, setBlockHeight] = useState(defaultBlockH);
    const [mortarJoint, setMortarJoint] = useState(defaultMortar);

    const wallLabel = isMetric ? 'meters' : 'feet';
    const blockLabel = isMetric ? 'mm' : 'inches';

    const result = useMemo(() => {
        const wl = parseFloat(wallLength);
        const wh = parseFloat(wallHeight);
        const bl = parseFloat(blockLength);
        const bh = parseFloat(blockHeight);
        const mj = parseFloat(mortarJoint);

        if (isNaN(wl) || isNaN(wh) || isNaN(bl) || isNaN(bh) || isNaN(mj)) return '0';

        // Convert everything to meters (Metric) or feet (Imperial) for area calc
        let convFactor = isMetric ? 1000 : 12; // block is in mm/inch, wall in m/ft

        const wallArea = wl * wh;

        const blockL_conv = (bl + mj) / convFactor;
        const blockH_conv = (bh + mj) / convFactor;

        const blockArea = blockL_conv * blockH_conv;

        if (blockArea === 0) return '0';

        const count = wallArea / blockArea;
        return Math.ceil(count).toString();
    }, [wallLength, wallHeight, blockLength, blockHeight, mortarJoint, isMetric]);

    const wasteResult = useMemo(() => {
        return Math.ceil(parseFloat(result) * 1.05).toString(); // 5% waste for blocks
    }, [result]);

    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor: colors.background }]}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <View style={[styles.headerBar, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
                <BackButton style={{ position: "absolute", left: 20, zIndex: 20, bottom: 8 }} />
                <Text style={[styles.headerBarTitle, { color: colors.text }]}>Wall Estimator</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {/* Instant Result Header */}
                <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.resultContainer}>
                    <Text style={styles.resultLabel}>Estimated Blocks</Text>
                    <View style={styles.resultValueWrapper}>
                        <Text style={styles.resultValue}>{result}</Text>
                        <Text style={styles.resultUnit}> pcs</Text>
                    </View>
                    <View style={styles.wastePill}>
                        <Text style={styles.wastePillText}>{wasteResult} pcs with 5% waste</Text>
                    </View>
                </Animated.View>

                {/* Wall Inputs */}
                <View style={styles.inputSection}>
                    <Text style={[styles.sectionHeader, { color: colors.text }]}>Wall Dimensions</Text>
                    <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.row}>
                        <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                            <Text style={[styles.label, { color: colors.text }]}>Length ({wallLabel})</Text>
                            <View style={[styles.inputWrapper, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                                <TextInput
                                    style={[styles.input, { color: colors.text }]}
                                    keyboardType="decimal-pad"
                                    value={wallLength}
                                    onChangeText={setWallLength}
                                />
                            </View>
                        </View>
                        <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                            <Text style={[styles.label, { color: colors.text }]}>Height ({wallLabel})</Text>
                            <View style={[styles.inputWrapper, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                                <TextInput
                                    style={[styles.input, { color: colors.text }]}
                                    keyboardType="decimal-pad"
                                    value={wallHeight}
                                    onChangeText={setWallHeight}
                                />
                            </View>
                        </View>
                    </Animated.View>
                </View>

                {/* Block Inputs */}
                <View style={styles.inputSection}>
                    <Text style={[styles.sectionHeader, { color: colors.text }]}>Block & Mortar Size</Text>
                    <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.row}>
                        <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                            <Text style={[styles.label, { color: colors.text }]}>Block L ({blockLabel})</Text>
                            <View style={[styles.inputWrapper, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                                <TextInput
                                    style={[styles.input, { color: colors.text }]}
                                    keyboardType="decimal-pad"
                                    value={blockLength}
                                    onChangeText={setBlockLength}
                                />
                            </View>
                        </View>
                        <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                            <Text style={[styles.label, { color: colors.text }]}>Block H ({blockLabel})</Text>
                            <View style={[styles.inputWrapper, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                                <TextInput
                                    style={[styles.input, { color: colors.text }]}
                                    keyboardType="decimal-pad"
                                    value={blockHeight}
                                    onChangeText={setBlockHeight}
                                />
                            </View>
                        </View>
                    </Animated.View>

                    <Animated.View entering={FadeInDown.delay(400).springify()} style={styles.formGroup}>
                        <Text style={[styles.label, { color: colors.text }]}>Mortar Joint Thickness ({blockLabel})</Text>
                        <View style={[styles.inputWrapper, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                            <TextInput
                                style={[styles.input, { color: colors.text }]}
                                keyboardType="decimal-pad"
                                value={mortarJoint}
                                onChangeText={setMortarJoint}
                            />
                            <LayoutGrid color="#94A3B8" size={20} />
                        </View>
                    </Animated.View>
                </View>

                {/* References */}
                <Animated.View entering={FadeInDown.delay(500).springify()} style={styles.referenceCard}>
                    <View style={styles.refHeader}>
                        <Info color="#F59E0B" size={20} />
                        <Text style={styles.refTitle}>Calculation Method</Text>
                    </View>

                    <View style={styles.formulaBox}>
                        <Text style={styles.formulaText}>
                            Count = (Wall Area) / (Block + Mortar Area)
                        </Text>
                    </View>
                    <Text style={styles.refDesc}>
                        Calculates exactly how many blocks fit in the wall surface area, accounting for the mortar joints separating every block. Values are rounded UP.
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
    sectionHeader: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1E293B',
        marginBottom: 16,
    },
    inputSection: {
        marginBottom: 24,
        backgroundColor: '#FFFFFF',
        padding: 20,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
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
    formulaBox: {
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#FDE68A',
        marginBottom: 16,
        alignItems: 'center',
    },
    formulaText: {
        fontSize: 14,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        color: '#D97706',
        fontWeight: '700',
    },
    refDesc: {
        fontSize: 14,
        color: '#B45309',
        lineHeight: 22,
    }
});
