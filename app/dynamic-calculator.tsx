import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useState, useMemo } from 'react';
import { ArrowLeft, Info, Settings, Ruler } from "lucide-react-native";
import BackButton from "../components/BackButton";
import Animated, { FadeInDown } from 'react-native-reanimated';
import { router, useLocalSearchParams } from 'expo-router';
import { useStore } from '../store/useStore';
import { useThemeColors } from '../store/useThemeColors';
import { calculatorsData, CalculatorDefinition } from '../data/calculatorsData';

export default function DynamicCalculatorScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { units } = useStore();
    const { colors } = useThemeColors();
    const isMetric = units === 'metric';

    // Find the current calculator definition from the master database
    const calcDef: CalculatorDefinition | undefined = calculatorsData.find(c => c.id === id);

    // Dynamic state for inputs map
    const [inputValues, setInputValues] = useState<Record<string, string>>({});

    // Compute results based on the dynamic calc logic
    const results = useMemo(() => {
        if (!calcDef) return {};

        // Convert string inputs to numbers for calculation
        const numInputs: Record<string, number> = {};
        calcDef.inputs.forEach(inp => {
            const val = parseFloat(inputValues[inp.id]);
            numInputs[inp.id] = isNaN(val) ? 0 : val;
        });

        // Try-catch wrapped for safety executing dynamic logic
        try {
            return calcDef.calculate(numInputs, isMetric);
        } catch (e) {
            console.warn("Calculation Error in Dynamic Engine:", e);
            return {};
        }
    }, [inputValues, isMetric, calcDef]);

    if (!calcDef) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={[styles.headerBarTitle, { color: colors.text }]}>Calculator Not Found</Text>
                <BackButton style={{ position: "absolute", left: 20, zIndex: 20, bottom: 8 }} />
            </View>
        );
    }

    const primaryOutput = calcDef.outputs.find(o => o.isPrimary);
    const secondaryOutputs = calcDef.outputs.filter(o => !o.isPrimary);

    return (
        <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={[styles.container, { backgroundColor: colors.background }]}
        >
            <View style={[styles.headerBar, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
                <BackButton style={{ position: "absolute", left: 20, zIndex: 20, bottom: 8 }} />
                <Text style={[styles.headerBarTitle, { color: colors.text }]} numberOfLines={1}>{calcDef.name}</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {/* Instant Dynamic Result Header */}
                <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.resultContainer}>
                    <Text style={styles.resultLabel}>{primaryOutput?.label || 'Result'}</Text>
                    <View style={styles.resultValueWrapper}>
                        <Text style={styles.resultValue}>{results[primaryOutput?.id || ''] || '0.00'}</Text>
                        <Text style={styles.resultUnit}>
                            {' '}{isMetric ? primaryOutput?.unitMetric : primaryOutput?.unitImperial}
                        </Text>
                    </View>

                    {/* Render extra pills for secondary outputs */}
                    {secondaryOutputs.length > 0 && (
                        <View style={styles.secondaryPillsContainer}>
                            {secondaryOutputs.map(out => (
                                <View key={out.id} style={styles.wastePill}>
                                    <Text style={styles.wastePillText}>
                                        {out.label}: {results[out.id] || '0'} {isMetric ? out.unitMetric : out.unitImperial}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    )}
                </Animated.View>

                {/* Dynamic Inputs Builder */}
                <View style={styles.inputSection}>
                    <Text style={styles.sectionDesc}>{calcDef.description}</Text>

                    {calcDef.inputs.map((inp, index) => (
                        <Animated.View key={inp.id} entering={FadeInDown.delay((index + 2) * 100).springify()} style={styles.formGroup}>
                            <Text style={[styles.label, { color: colors.text }]}>
                                {inp.label}
                                {(inp.unitMetric || inp.unitImperial) &&
                                    ` (${isMetric ? inp.unitMetric : inp.unitImperial})`
                                }
                            </Text>
                            <View style={[styles.inputWrapper, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                                {inp.type === 'select' && inp.options ? (
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selectScroller}>
                                        {inp.options.map((opt) => {
                                            const isSelected = inputValues[inp.id] === opt.value;
                                            return (
                                                <TouchableOpacity
                                                    key={opt.value}
                                                    style={[styles.selectOption, isSelected && styles.selectOptionActive]}
                                                    onPress={() => setInputValues(prev => ({ ...prev, [inp.id]: opt.value }))}
                                                >
                                                    <Text style={[styles.selectOptionText, isSelected && styles.selectOptionTextActive]}>
                                                        {opt.label}
                                                    </Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </ScrollView>
                                ) : (
                                    <TextInput
                                        style={[styles.input, { color: colors.text }]}
                                        keyboardType={inp.type === 'number' ? 'decimal-pad' : 'default'}
                                        placeholder={inp.placeholder || `Enter ${inp.label.toLowerCase()}`}
                                        placeholderTextColor="#CBD5E1"
                                        value={inputValues[inp.id] || ''}
                                        onChangeText={(text) => setInputValues(prev => ({ ...prev, [inp.id]: text }))}
                                    />
                                )}
                            </View>
                        </Animated.View>
                    ))}
                </View>

                {/* Configured References */}
                {calcDef.referenceText && (
                    <Animated.View entering={FadeInDown.delay(500).springify()} style={styles.referenceCard}>
                        <View style={styles.refHeader}>
                            <Info color="#0F172A" size={20} />
                            <Text style={styles.refTitle}>Formula & Notes</Text>
                        </View>
                        <Text style={styles.refDesc}>{calcDef.referenceText}</Text>
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
        flexWrap: 'wrap',
        justifyContent: 'center',
    },
    resultValue: {
        fontSize: 56,
        fontWeight: '800',
        color: '#FFFFFF',
        letterSpacing: -1,
        lineHeight: 60,
        textAlign: 'center',
    },
    resultUnit: {
        fontSize: 20,
        fontWeight: '600',
        color: '#94A3B8',
        marginBottom: 10,
        marginLeft: 6,
    },
    secondaryPillsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 8,
    },
    wastePill: {
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginTop: 4,
    },
    wastePillText: {
        color: '#E2E8F0',
        fontSize: 14,
        fontWeight: '600',
    },
    inputSection: {
        marginBottom: 32,
    },
    sectionDesc: {
        fontSize: 15,
        color: '#475569',
        marginBottom: 24,
        lineHeight: 22,
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
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        overflow: 'hidden', // to keep select options within bounds
    },
    input: {
        width: '100%',
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 18,
        fontWeight: '600',
        color: '#0F172A',
    },
    selectScroller: {
        flexDirection: 'row',
        padding: 8,
    },
    selectOption: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8,
        backgroundColor: '#F1F5F9',
        marginRight: 8,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    selectOptionActive: {
        backgroundColor: '#EFF6FF',
        borderColor: '#3B82F6',
    },
    selectOptionText: {
        fontSize: 15,
        fontWeight: '500',
        color: '#475569',
    },
    selectOptionTextActive: {
        color: '#2563EB',
        fontWeight: '600',
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
    refDesc: {
        fontSize: 14,
        color: '#475569',
        lineHeight: 22,
    }
});
