import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useState, useMemo } from 'react';
import { ArrowLeft, Zap, Info, Activity } from "lucide-react-native";
import BackButton from "../components/BackButton";
import Animated, { FadeInDown } from 'react-native-reanimated';
import { router } from 'expo-router';
import { useThemeColors } from '../store/useThemeColors';

export default function OhmsCalculatorScreen() {
    const { colors, isDark } = useThemeColors();
    const [voltage, setVoltage] = useState('');
    const [current, setCurrent] = useState('');
    const [resistance, setResistance] = useState('');
    const [power, setPower] = useState('');

    // Calculate missing values based on two provided inputs
    const result = useMemo(() => {
        let v = parseFloat(voltage);
        let i = parseFloat(current);
        let r = parseFloat(resistance);
        let p = parseFloat(power);

        let finalV = isNaN(v) ? null : v;
        let finalI = isNaN(i) ? null : i;
        let finalR = isNaN(r) ? null : r;
        let finalP = isNaN(p) ? null : p;

        // Count how many valid inputs we have
        const inputsCount = [finalV, finalI, finalR, finalP].filter(val => val !== null).length;

        if (inputsCount < 2) {
            return {
                v: finalV || 0,
                i: finalI || 0,
                r: finalR || 0,
                p: finalP || 0,
                message: 'Enter exactly 2 values'
            };
        }

        if (inputsCount > 2) {
            return {
                v: finalV || 0,
                i: finalI || 0,
                r: finalR || 0,
                p: finalP || 0,
                message: 'Clear inputs, keep only 2'
            };
        }

        // Calculation Logic
        if (finalV !== null && finalI !== null) {
            finalR = finalV / finalI;
            finalP = finalV * finalI;
        } else if (finalV !== null && finalR !== null) {
            finalI = finalV / finalR;
            finalP = (finalV * finalV) / finalR;
        } else if (finalV !== null && finalP !== null) {
            finalI = finalP / finalV;
            finalR = (finalV * finalV) / finalP;
        } else if (finalI !== null && finalR !== null) {
            finalV = finalI * finalR;
            finalP = finalI * finalI * finalR;
        } else if (finalI !== null && finalP !== null) {
            finalV = finalP / finalI;
            finalR = finalP / (finalI * finalI);
        } else if (finalR !== null && finalP !== null) {
            finalV = Math.sqrt(finalP * finalR);
            finalI = Math.sqrt(finalP / finalR);
        }

        return {
            v: finalV,
            i: finalI,
            r: finalR,
            p: finalP,
            message: 'Calculated successfully'
        };

    }, [voltage, current, resistance, power]);

    const clearInputs = () => {
        setVoltage('');
        setCurrent('');
        setResistance('');
        setPower('');
    };

    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor: colors.background }]}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <View style={[styles.headerBar, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
                <BackButton style={{ position: "absolute", left: 20, zIndex: 20, bottom: 8 }} />
                <Text style={[styles.headerBarTitle, { color: colors.text }]}>Ohm&apos;s Law</Text>
                <TouchableOpacity onPress={clearInputs} style={styles.clearBtn}>
                    <Text style={styles.clearBtnText}>Clear</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {/* Instant Result Header */}
                <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.resultContainer}>
                    <Text style={styles.resultMessage}>{result.message}</Text>

                    <View style={styles.resultGrid}>
                        <View style={styles.resultItem}>
                            <Text style={styles.resultLabel}>Voltage (V)</Text>
                            <Text style={styles.resultValue}>{result.v !== null ? result.v.toFixed(2) : '0.00'}</Text>
                        </View>
                        <View style={styles.resultItem}>
                            <Text style={styles.resultLabel}>Current (I)</Text>
                            <Text style={styles.resultValue}>{result.i !== null ? result.i.toFixed(2) : '0.00'}</Text>
                        </View>
                        <View style={styles.resultItem}>
                            <Text style={styles.resultLabel}>Resistance (R)</Text>
                            <Text style={styles.resultValue}>{result.r !== null ? result.r.toFixed(2) : '0.00'}</Text>
                        </View>
                        <View style={styles.resultItem}>
                            <Text style={styles.resultLabel}>Power (P)</Text>
                            <Text style={styles.resultValue}>{result.p !== null ? result.p.toFixed(2) : '0.00'}</Text>
                        </View>
                    </View>
                </Animated.View>

                {/* Inputs */}
                <View style={styles.inputSection}>
                    <Text style={styles.sectionDesc}>Enter any TWO values to calculate the others.</Text>

                    <Animated.View entering={FadeInDown.delay(150).springify()} style={styles.formGroup}>
                        <Text style={[styles.label, { color: colors.text }]}>Voltage (Volts)</Text>
                        <View style={[styles.inputWrapper, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                            <TextInput
                                style={[styles.input, { color: colors.text }]}
                                keyboardType="decimal-pad"
                                value={voltage}
                                onChangeText={setVoltage}
                                placeholder="V"
                            />
                            <Zap color="#94A3B8" size={20} />
                        </View>
                    </Animated.View>

                    <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.formGroup}>
                        <Text style={[styles.label, { color: colors.text }]}>Current (Amps)</Text>
                        <View style={[styles.inputWrapper, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                            <TextInput
                                style={[styles.input, { color: colors.text }]}
                                keyboardType="decimal-pad"
                                value={current}
                                onChangeText={setCurrent}
                                placeholder="I"
                            />
                            <Activity color="#94A3B8" size={20} />
                        </View>
                    </Animated.View>

                    <Animated.View entering={FadeInDown.delay(250).springify()} style={styles.formGroup}>
                        <Text style={[styles.label, { color: colors.text }]}>Resistance (Ohms)</Text>
                        <View style={[styles.inputWrapper, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                            <TextInput
                                style={[styles.input, { color: colors.text }]}
                                keyboardType="decimal-pad"
                                value={resistance}
                                onChangeText={setResistance}
                                placeholder="R / Ω"
                            />
                            <Text style={{ color: '#94A3B8', fontWeight: 'bold', fontSize: 16 }}>Ω</Text>
                        </View>
                    </Animated.View>

                    <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.formGroup}>
                        <Text style={[styles.label, { color: colors.text }]}>Power (Watts)</Text>
                        <View style={[styles.inputWrapper, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                            <TextInput
                                style={[styles.input, { color: colors.text }]}
                                keyboardType="decimal-pad"
                                value={power}
                                onChangeText={setPower}
                                placeholder="P"
                            />
                            <Text style={{ color: '#94A3B8', fontWeight: 'bold', fontSize: 16 }}>W</Text>
                        </View>
                    </Animated.View>
                </View>

                {/* References */}
                <Animated.View entering={FadeInDown.delay(400).springify()} style={styles.referenceCard}>
                    <View style={styles.refHeader}>
                        <Info color="#DB2777" size={20} />
                        <Text style={styles.refTitle}>Ohm&apos;s Wheel</Text>
                    </View>

                    <Text style={styles.refDesc}>
                        V = Voltage in Volts (E or V)
                        {"\n"}I = Current in Amperes (I)
                        {"\n"}R = Resistance in Ohms (Ω or R)
                        {"\n"}P = Power in Watts (P or W)
                        {"\n\n"}Standard AC/DC theory is applied. Does not account for phase angles in complex AC inductive/capacitive circuits.
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
    clearBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: '#F1F5F9',
        borderRadius: 8,
    },
    clearBtnText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#64748B',
    },
    content: {
        padding: 24,
        paddingBottom: 60,
    },
    resultContainer: {
        backgroundColor: '#BE185D',
        borderRadius: 24,
        padding: 24,
        marginBottom: 32,
        shadowColor: '#BE185D',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 24,
        elevation: 8,
    },
    resultMessage: {
        color: '#FBCFE8',
        fontSize: 14,
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: 20,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    resultGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    resultItem: {
        width: '48%',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
    },
    resultLabel: {
        fontSize: 12,
        color: '#FBCFE8',
        marginBottom: 4,
        fontWeight: '500',
    },
    resultValue: {
        fontSize: 24,
        color: '#FFFFFF',
        fontWeight: '800',
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
        backgroundColor: '#FDF2F8',
        borderRadius: 16,
        padding: 24,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#FBCFE8',
    },
    refHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    refTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#9D174D',
        marginLeft: 8,
    },
    refDesc: {
        fontSize: 14,
        color: '#9D174D',
        lineHeight: 22,
    }
});
