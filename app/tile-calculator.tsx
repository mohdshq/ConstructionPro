import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useState, useMemo } from 'react';
import { ArrowLeft, Ruler, Grid3X3, Info } from "lucide-react-native";
import BackButton from "../components/BackButton";
import Animated, { FadeInDown } from 'react-native-reanimated';
import { router } from 'expo-router';
import { useStore } from '../store/useStore';
import { useThemeColors } from '../store/useThemeColors';

export default function TileCalculatorScreen() {
    const { units } = useStore();
    const { colors } = useThemeColors();
    const [roomLength, setRoomLength] = useState('12');
    const [roomWidth, setRoomWidth] = useState('10');
    const [tileLength, setTileLength] = useState(units === 'metric' ? '30' : '12'); // cm or inches
    const [tileWidth, setTileWidth] = useState(units === 'metric' ? '30' : '12');

    const isMetric = units === 'metric';
    const rmLabel = isMetric ? 'meters' : 'feet';
    const tileLabel = isMetric ? 'cm' : 'inches';

    const result = useMemo(() => {
        const rl = parseFloat(roomLength);
        const rw = parseFloat(roomWidth);
        const tl = parseFloat(tileLength);
        const tw = parseFloat(tileWidth);

        if (isNaN(rl) || isNaN(rw) || isNaN(tl) || isNaN(tw) || tl === 0 || tw === 0) {
            return { boxes: '0', area: '0.00' };
        }

        let totalArea = rl * rw; // sq m or sq ft

        // convert tile dims to room dims to find exact area
        let tileArea = 0;
        if (isMetric) {
            tileArea = (tl / 100) * (tw / 100); // sq m
        } else {
            tileArea = (tl / 12) * (tw / 12); // sq ft
        }

        const count = totalArea / tileArea;
        const countWaste = count * 1.10; // always recommend 10% waste for cutoffs

        return {
            raw: Math.ceil(count).toString(),
            waste: Math.ceil(countWaste).toString(),
            area: totalArea.toFixed(2)
        };
    }, [roomLength, roomWidth, tileLength, tileWidth, isMetric]);

    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor: colors.background }]}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <View style={[styles.headerBar, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
                <BackButton style={{ position: "absolute", left: 20, zIndex: 20, bottom: 8 }} />
                <Text style={[styles.headerBarTitle, { color: colors.text }]}>Tile Estimator</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {/* Instant Result Header */}
                <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.resultContainer}>
                    <Text style={styles.resultLabel}>Required Tiles (Inc 10% Waste)</Text>
                    <View style={styles.resultValueWrapper}>
                        <Text style={styles.resultValue}>{result.waste || '0'}</Text>
                        <Text style={styles.resultUnit}> tiles</Text>
                    </View>
                    <View style={styles.wastePill}>
                        <Text style={styles.wastePillText}>Total Area: {result.area} {isMetric ? 'm²' : 'ft²'}</Text>
                    </View>
                </Animated.View>

                {/* Inputs */}
                <View style={styles.inputSection}>
                    <Text style={[styles.sectionHeader, { color: colors.text }]}>Surface Area</Text>
                    <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.row}>
                        <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                            <Text style={[styles.label, { color: colors.text }]}>Length ({rmLabel})</Text>
                            <View style={[styles.inputWrapper, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                                <TextInput
                                    style={[styles.input, { color: colors.text }]}
                                    keyboardType="decimal-pad"
                                    value={roomLength}
                                    onChangeText={setRoomLength}
                                />
                            </View>
                        </View>
                        <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                            <Text style={[styles.label, { color: colors.text }]}>Width ({rmLabel})</Text>
                            <View style={[styles.inputWrapper, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                                <TextInput
                                    style={[styles.input, { color: colors.text }]}
                                    keyboardType="decimal-pad"
                                    value={roomWidth}
                                    onChangeText={setRoomWidth}
                                />
                            </View>
                        </View>
                    </Animated.View>

                    <Text style={[styles.sectionHeader, { marginTop: 16 }]}>Tile Dimensions</Text>
                    <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.row}>
                        <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                            <Text style={[styles.label, { color: colors.text }]}>Length ({tileLabel})</Text>
                            <View style={[styles.inputWrapper, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                                <TextInput
                                    style={[styles.input, { color: colors.text }]}
                                    keyboardType="decimal-pad"
                                    value={tileLength}
                                    onChangeText={setTileLength}
                                />
                            </View>
                        </View>
                        <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                            <Text style={[styles.label, { color: colors.text }]}>Width ({tileLabel})</Text>
                            <View style={[styles.inputWrapper, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                                <TextInput
                                    style={[styles.input, { color: colors.text }]}
                                    keyboardType="decimal-pad"
                                    value={tileWidth}
                                    onChangeText={setTileWidth}
                                />
                            </View>
                        </View>
                    </Animated.View>
                </View>

                {/* References */}
                <Animated.View entering={FadeInDown.delay(400).springify()} style={styles.referenceCard}>
                    <View style={styles.refHeader}>
                        <Info color="#059669" size={20} />
                        <Text style={styles.refTitle}>Waste & Layout</Text>
                    </View>

                    <Text style={styles.refDesc}>
                        This calculator automatically adds a 10% waste buffer.
                        {"\n\n"}If you are planning to lay the tiles diagonally or in a herringbone pattern, it is highly recommended to increase waste factors to 15-20% due to the high volume of cut edges.
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
        backgroundColor: '#10B981',
        borderRadius: 24,
        padding: 32,
        alignItems: 'center',
        marginBottom: 32,
        shadowColor: '#10B981',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 24,
        elevation: 8,
    },
    resultLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#D1FAE5',
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
        color: '#D1FAE5',
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
        backgroundColor: '#ECFDF5',
        borderRadius: 16,
        padding: 24,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#A7F3D0',
    },
    refHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    refTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#065F46',
        marginLeft: 8,
    },
    refDesc: {
        fontSize: 14,
        color: '#065F46',
        lineHeight: 22,
    }
});
