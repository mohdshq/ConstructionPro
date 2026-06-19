import { View, Text, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import { Activity as ActivityIcon, FileText, FolderOpen, UserPlus, Info } from "lucide-react-native";
import BackButton from "../../../components/BackButton";
import { useLocalSearchParams, Stack } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useThemeColors } from '../../../store/useThemeColors';
import { usePowerSyncActivities } from '../../../lib/powersync/useActivities';
import { formatDistanceToNow } from 'date-fns';

export default function ActivityScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { colors } = useThemeColors();

    const activities = usePowerSyncActivities(id);

    const getActionIcon = (action: string) => {
        if (action.includes('report')) return <FileText size={20} color="#F59E0B" />;
        if (action.includes('drawing')) return <FolderOpen size={20} color="#0EA5E9" />;
        if (action.includes('join')) return <UserPlus size={20} color="#2563EB" />;
        return <Info size={20} color="#64748B" />;
    };

    const getActionText = (activity: any) => {
        const name = activity.profile?.full_name || 'A team member';
        switch (activity.action) {
            case 'created_report': return `${name} created a new ${activity.entityType}.`;
            case 'updated_report': return `${name} updated a ${activity.entityType}.`;
            case 'added_drawing': return `${name} uploaded a new drawing.`;
            case 'joined_project': return `${name} joined the project.`;
            default: return `${name} performed an action.`;
        }
    };

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
            <Stack.Screen options={{ headerShown: false }} />
            <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
                <BackButton style={{ position: "absolute", left: 20, zIndex: 20, bottom: 8 }} />
                <Text style={[styles.headerTitle, { color: colors.text }]}>Project Activity</Text>
            </View>

            <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
                <View style={styles.list}>
                    {activities.map((activity, index) => (
                        <Animated.View entering={FadeInDown.delay(index * 50).springify()} key={activity.id}>
                            <View style={[styles.activityCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                <View style={[styles.iconBox, { backgroundColor: colors.background }]}>
                                    {getActionIcon(activity.action)}
                                </View>
                                <View style={styles.activityContent}>
                                    <Text style={[styles.activityText, { color: colors.text }]}>
                                        {getActionText(activity)}
                                    </Text>
                                    <Text style={[styles.timeText, { color: colors.textMuted }]}>
                                        {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                                    </Text>
                                </View>
                            </View>
                        </Animated.View>
                    ))}

                    {activities.length === 0 && (
                        <View style={styles.emptyState}>
                            <ActivityIcon size={48} color={colors.textMuted} style={{ marginBottom: 16 }} />
                            <Text style={[styles.emptyStateTitle, { color: colors.text }]}>No Activity Yet</Text>
                            <Text style={[styles.emptyStateDesc, { color: colors.textMuted }]}>
                                Actions performed by you and your team will appear here.
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
    activityCard: {
        flexDirection: 'row',
        alignItems: 'center',
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
    },
    activityContent: {
        flex: 1,
        marginLeft: 16,
    },
    activityText: {
        fontSize: 15,
        fontWeight: '500',
        marginBottom: 4,
    },
    timeText: {
        fontSize: 13,
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
    },
});
