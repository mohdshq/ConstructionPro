import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, Platform, Dimensions, Alert, RefreshControl } from 'react-native';
import { MapPin, Calendar, FolderOpen, Plus, User, FileText, Pencil, Trash2 } from 'lucide-react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import ProjectImage from '../../components/ProjectImage';
import { useProjectsStore, Project } from '../../store/projectsStore';
import { useThemeColors } from '../../store/useThemeColors';
import { useStore } from '../../store/useStore';
import { useMemo, useCallback, useState } from 'react';
import ConnectionBadge from '../../components/ConnectionBadge';

const { width } = Dimensions.get('window');

export default function ProjectsScreen() {
    const router = useRouter();
    const { projects, reports, deleteProject, initialSync, isSyncing } = useProjectsStore();
    const { isPremium } = useStore();
    const { colors, isDark } = useThemeColors();
    const [refreshing, setRefreshing] = useState(false);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            await initialSync();
        } finally {
            setRefreshing(false);
        }
    }, [initialSync]);

    const sortedProjects = useMemo(() => {
        return [...projects].map(p => {
            let displayStatus = p.status;
            if (p.startDate && p.endDate) {
                const now = new Date();
                const start = new Date(p.startDate);
                const end = new Date(p.endDate);
                if (now < start) displayStatus = 'planning';
                else if (now > end) displayStatus = 'completed';
                else displayStatus = 'active';
            }
            return { ...p, displayStatus };
        }).sort((a, b) => {
            if (a.displayStatus === 'active' && b.displayStatus !== 'active') return -1;
            if (a.displayStatus !== 'active' && b.displayStatus === 'active') return 1;
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
    }, [projects]);

    const getStatusColor = (status: string) => {
        if (isDark) {
            switch (status) {
                case 'active': return '#86EFAC'; // Light Green
                case 'on-hold': return '#FCD34D'; // Light Amber
                case 'completed': return '#93C5FD'; // Light Blue
                case 'planning': return '#C4B5FD'; // Light Purple
                default: return '#CBD5E1';
            }
        }
        switch (status) {
            case 'active': return '#22C55E'; // Green
            case 'on-hold': return '#F59E0B'; // Amber
            case 'completed': return '#3B82F6'; // Blue
            case 'planning': return '#8B5CF6'; // Purple
            default: return '#64748B';
        }
    };

    const getStatusBg = (status: string) => {
        if (isDark) {
            switch (status) {
                case 'active': return '#14532D'; // Dark Green
                case 'on-hold': return '#78350F'; // Dark Amber
                case 'completed': return '#1E3A8A'; // Dark Blue
                case 'planning': return '#4C1D95'; // Dark Purple
                default: return '#1E293B'; // Dark Slate
            }
        }
        switch (status) {
            case 'active': return '#DCFCE7';
            case 'on-hold': return '#FEF3C7';
            case 'completed': return '#DBEAFE';
            case 'planning': return '#EDE9FE';
            default: return '#F1F5F9';
        }
    };

    const handleDeleteProject = (id: string, name: string) => {
        if (Platform.OS === 'web') {
            if (window.confirm(`Are you sure you want to delete "${name}"? This will also delete all associated reports. This action cannot be undone.`)) {
                deleteProject(id);
            }
        } else {
            Alert.alert(
                'Delete Project',
                `Are you sure you want to delete "${name}"? This will also delete all associated reports. This action cannot be undone.`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', style: 'destructive', onPress: () => deleteProject(id) },
                ]
            );
        }
    };

    const handleCreateProject = () => {
        if (!isPremium && projects.length >= 1) {
            if (Platform.OS === 'web') {
                const wantsUpgrade = window.confirm(
                    "Free users can only create 1 project. Would you like to upgrade to Construction Pro Premium for unlimited projects?"
                );
                if (wantsUpgrade) {
                    router.push('/settings' as any);
                }
            } else {
                Alert.alert(
                    "Premium Required",
                    "Free users can only create 1 project. Upgrade to Construction Pro Premium to create unlimited projects.",
                    [
                        { text: "Cancel", style: "cancel" },
                        { text: "Upgrade", style: "default", onPress: () => router.push('/settings' as any) }
                    ]
                );
            }
            return;
        }
        router.push('/project/create');
    };

    const renderProjectCard = ({ item, index }: { item: Project & { displayStatus: string }, index: number }) => {
        const projectReports = reports.filter(r => r.projectId === item.id);

        return (
            <Animated.View entering={FadeInDown.delay(index * 100).springify()}>
                <TouchableOpacity
                    activeOpacity={0.8}
                    style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => router.push(`/project/${item.id}` as any)}
                >
                    {/* Project Image Banner */}
                    {item.photoUri ? (
                        <ProjectImage photoUri={item.photoUri} style={styles.cardImage} />
                    ) : (
                        <View style={[styles.cardImagePlaceholder, { backgroundColor: isDark ? colors.background : '#F8FAFC' }]}>
                            <FolderOpen size={32} color={colors.textMuted} />
                        </View>
                    )}

                    <View style={styles.cardContent}>
                        <View style={styles.cardHeader}>
                            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                                <Text style={[styles.projectName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
                            </View>
                            <View style={styles.cardActions}>
                                <View style={[styles.statusBadge, { backgroundColor: getStatusBg(item.displayStatus), marginRight: 8 }]}>
                                    <Text style={[styles.statusText, { color: getStatusColor(item.displayStatus) }]}>
                                        {item.displayStatus.toUpperCase()}
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    onPress={() => router.push(`/project/create?id=${item.id}` as any)}
                                    style={[styles.actionIconButton, { backgroundColor: colors.inputBackground }]}
                                >
                                    <Pencil size={18} color={colors.textMuted} />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => handleDeleteProject(item.id, item.name)}
                                    style={[styles.actionIconButton, { backgroundColor: isDark ? '#7F1D1D' : '#FEE2E2' }]}
                                >
                                    <Trash2 size={18} color={isDark ? '#FCA5A5' : "#EF4444"} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.cardBody}>
                            <View style={styles.detailRow}>
                                <MapPin size={14} color={colors.textMuted} />
                                <Text style={[styles.detailText, { color: colors.textMuted }]} numberOfLines={1}>{item.location}</Text>
                            </View>

                            {item.projectManager && (
                                <View style={styles.detailRow}>
                                    <User size={14} color={colors.textMuted} />
                                    <Text style={[styles.detailText, { color: colors.textMuted }]} numberOfLines={1}>PM: {item.projectManager}</Text>
                                </View>
                            )}

                            <View style={styles.detailRow}>
                                <Calendar size={14} color={colors.textMuted} />
                                <Text style={[styles.detailText, { color: colors.textMuted }]}>
                                    {item.startDate ? `${item.startDate} to ${item.endDate || 'Ongoing'}` : `Added ${new Date(item.createdAt).toLocaleDateString()}`}
                                </Text>
                            </View>

                            <View style={styles.detailRow}>
                                <FileText size={14} color={colors.textMuted} />
                                <Text style={[styles.detailText, { color: colors.textMuted }]}>{projectReports.length} {projectReports.length === 1 ? 'Report' : 'Reports'} generated</Text>
                            </View>
                        </View>
                    </View>
                </TouchableOpacity>
            </Animated.View>
        )
    };

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.card }]}>
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Projects</Text>
                    <TouchableOpacity
                        style={[styles.addButton, { position: 'absolute', right: 24, bottom: 12 }]}
                        onPress={handleCreateProject}
                    >
                        <Plus size={20} color="#FFFFFF" />
                        <Text style={styles.addButtonText}>New</Text>
                    </TouchableOpacity>
                </View>

                <View style={{ alignItems: 'center', paddingVertical: 6 }}>
                    <ConnectionBadge />
                </View>

                {sortedProjects.length === 0 ? (
                    <Animated.View entering={FadeIn.duration(500)} style={styles.emptyState}>
                        <View style={[styles.emptyIconCircle, { backgroundColor: colors.inputBackground }]}>
                            <FolderOpen size={48} color={colors.textMuted} />
                        </View>
                        <Text style={[styles.emptyTitle, { color: colors.text }]}>No Projects Yet</Text>
                        <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>Create a new project workspace to manage site reports and photos.</Text>

                        <TouchableOpacity
                            style={styles.emptyButton}
                            onPress={handleCreateProject}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.emptyButtonText}>Create First Project</Text>
                        </TouchableOpacity>
                    </Animated.View>
                ) : (
                    <FlatList
                        data={sortedProjects}
                        keyExtractor={(item) => item.id}
                        renderItem={renderProjectCard}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        numColumns={1}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={onRefresh}
                                tintColor={colors.primary || '#2563EB'}
                                colors={['#2563EB']}
                            />
                        }
                    />
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: Platform.OS === 'android' ? 24 : 10,
        height: 60,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0F172A',
        textAlign: 'center',
    },
    addButton: {
        backgroundColor: '#EFF6FF',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    addButtonText: {
        color: '#2563EB',
        fontWeight: '600',
        fontSize: 14,
    },
    listContent: {
        padding: 24,
        paddingBottom: 120, // Space for bottom tab bar
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        marginBottom: 16,
        ...Platform.select({
            web: { boxShadow: '0px 2px 10px rgba(0,0,0,0.05)' as any },
            default: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 }
        }),
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    cardImage: {
        width: '100%',
        height: 140,
        backgroundColor: '#E2E8F0',
    },
    cardImagePlaceholder: {
        width: '100%',
        height: 140,
        backgroundColor: '#F8FAFC',
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardContent: {
        padding: 16,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    projectName: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0F172A',
        flex: 1,
        marginRight: 8,
    },
    cardActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    actionIconButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#F1F5F9',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 6,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '700',
    },
    cardBody: {
        rowGap: 8,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    detailText: {
        fontSize: 14,
        color: '#64748B',
        marginLeft: 8,
        flex: 1,
    },
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 40,
        marginTop: 60,
    },
    emptyIconCircle: {
        width: 96,
        height: 96,
        borderRadius: 48,
        backgroundColor: '#F1F5F9',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    emptyTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#0F172A',
        marginBottom: 12,
    },
    emptySubtitle: {
        fontSize: 15,
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 32,
    },
    emptyButton: {
        backgroundColor: '#2563EB',
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 12,
        shadowColor: '#2563EB',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    emptyButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
});
