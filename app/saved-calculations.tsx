import { formatDistanceToNow } from 'date-fns';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Activity, Box, Calculator } from "lucide-react-native";
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import BackButton from "../components/BackButton";
import { usePowerSyncCalculations } from '../lib/powersync/useCalculations';
import { useProjectsStore } from '../store/projectsStore';
import { useThemeColors } from '../store/useThemeColors';

export default function SavedCalculationsScreen() {
    const { getProject } = useProjectsStore();
    const { colors } = useThemeColors();
    const router = useRouter();
    const { projectId } = useLocalSearchParams<{ projectId?: string }>();

    const calculations = usePowerSyncCalculations(projectId);

    const getIcon = (type: string) => {
        switch (type) {
            case 'concrete': return <Box size={20} color="#2563EB" />;
            default: return <Calculator size={20} color="#64748B" />;
        }
    };

    const formatData = (type: string, data: any) => {
        if (type === 'concrete') {
            return `Volume: ${data.result} ${data.resultUnit} (Waste: ${data.wasteResult} ${data.resultUnit})`;
        }
        if (type === 'rebar') {
            return `Total Weight: ${data.weight} ${data.weightUnit} | Length: ${data.total} ${data.totalUnit}`;
        }
        if (type === 'block') {
            return `Total Blocks: ${data.result} pcs | With Waste: ${data.wasteResult} pcs`;
        }
        if (type === 'labor') {
            return `Total Cost: $${data.totalCost} | Duration: ${data.duration} ${data.durationUnit}`;
        }
        return JSON.stringify(data);
    };

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
            <Stack.Screen options={{ headerShown: false }} />
            <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
                <BackButton style={{ position: "absolute", left: 20, zIndex: 20, bottom: 8 }} />
                <Text style={[styles.headerTitle, { color: colors.text }]}>Calculation History</Text>
            </View>

            <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
                <View style={styles.list}>
                    {calculations.map((calc, index) => {
                        const project = getProject(calc.projectId);
                        return (
                            <Animated.View entering={FadeInDown.delay(index * 50).springify()} key={calc.id}>
                                <TouchableOpacity
                                    style={[styles.calcCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                                    activeOpacity={0.7}
                                    onPress={() => router.push({ pathname: `/${calc.type}-calculator`, params: { calcId: calc.id } } as any)}
                                >
                                    <View style={[styles.iconBox, { backgroundColor: colors.background }]}>
                                        {getIcon(calc.type)}
                                    </View>
                                    <View style={styles.calcContent}>
                                        <Text style={[styles.calcType, { color: colors.text }]}>
                                            {calc.type.charAt(0).toUpperCase() + calc.type.slice(1)} Calculation
                                        </Text>
                                        <Text style={[styles.calcProject, { color: colors.primary }]}>
                                            Project: {project?.name || 'Unknown Project'}
                                        </Text>
                                        <Text style={[styles.calcData, { color: colors.text }]}>
                                            {formatData(calc.type, calc.data)}
                                        </Text>
                                        <Text style={[styles.timeText, { color: colors.textMuted }]}>
                                            {formatDistanceToNow(new Date(calc.createdAt), { addSuffix: true })}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            </Animated.View>
                        );
                    })}

                    {calculations.length === 0 && (
                        <View style={styles.emptyState}>
                            <Activity size={48} color={colors.textMuted} style={{ marginBottom: 16 }} />
                            <Text style={[styles.emptyStateTitle, { color: colors.text }]}>No Saved Calculations</Text>
                            <Text style={[styles.emptyStateDesc, { color: colors.textMuted }]}>
                                Use the calculators to estimate materials and save them to your projects.
                            </Text>
                        </View>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: "center",
        paddingHorizontal: 20,
        height: 60,
        borderBottomWidth: 1,
        zIndex: 10,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    container: { flex: 1 },
    list: {
        padding: 20,
        gap: 12,
    },
    calcCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
    },
    iconBox: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 4,
    },
    calcContent: {
        flex: 1,
        marginLeft: 16,
    },
    calcType: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    calcProject: {
        fontSize: 13,
        fontWeight: '500',
        marginBottom: 8,
    },
    calcData: {
        fontSize: 14,
        marginBottom: 8,
        lineHeight: 20,
    },
    timeText: {
        fontSize: 12,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 60,
    },
    emptyStateTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 8,
    },
    emptyStateDesc: {
        fontSize: 15,
        textAlign: 'center',
        paddingHorizontal: 40,
    },
});
