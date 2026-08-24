import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Platform, Alert, RefreshControl, ActivityIndicator } from 'react-native';
import { ArrowLeft, MapPin, Calendar, Clock, FileText, CheckSquare, ShieldAlert, Plus, FolderOpen, DollarSign, Briefcase, Pencil, Trash2, Zap, Users, Activity, Calculator, Eye, EyeOff } from "lucide-react-native";
import BackButton from "../../components/BackButton";
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Image } from 'react-native';
import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useProjectsStore, Project, Report } from '../../store/projectsStore';
import { usePowerSyncReports } from '../../lib/powersync/useReports';
import { usePowerSyncProject } from '../../lib/powersync/useProjects';
import { usePowerSyncMembers } from '../../lib/powersync/useMembers';
import { useStatus } from '@powersync/react';
import { useAuthStore } from '../../store/useAuthStore';
import { useThemeColors } from '../../store/useThemeColors';
import { useStore } from '../../store/useStore';
import ProjectImage from '../../components/ProjectImage';
import { Swipeable } from 'react-native-gesture-handler';

const REPORT_CATEGORIES = [
    { id: 'daily', title: 'Daily Reports', desc: 'Progress, Weather & Workforce', icon: <FileText size={28} color="#2563EB" />, bg: '#EFF6FF', route: 'daily' },
    { id: 'snagging', title: 'Snagging', desc: 'Defects & Punch Lists', icon: <CheckSquare size={28} color="#F59E0B" />, bg: '#FEF3C7', route: 'snags/create' },
    { id: 'hse', title: 'HSE Audits', desc: 'Safety & Incidents', icon: <ShieldAlert size={28} color="#E11D48" />, bg: '#FFE4E6', route: 'hse' },
    { id: 'quick-log', title: 'Quick Logs', desc: 'Notes, Voice & Photos', icon: <Zap size={28} color="#10B981" />, bg: '#D1FAE5', route: 'quick-log' },
];

interface ReportCardItemProps {
    item: Report;
    index: number;
    project: Project;
    colors: any;
    updateReport: (id: string, updates: any) => Promise<void>;
    checkReportLimit: () => boolean;
    handleDeleteReport: (id: string) => void;
    router: any;
}

const ReportCardItem = ({ item, index, project, colors, updateReport, checkReportLimit, handleDeleteReport, router }: ReportCardItemProps) => {
    const cat = REPORT_CATEGORIES.find(c => c.id === item.type);
    const swipeableRef = useRef<Swipeable>(null);
    if (!cat) return null;

    const isDaily = item.type === 'daily';
    
    let hiddenSections: string[] = [];
    if (isDaily && item.templateData) {
        try {
            const data = JSON.parse(item.templateData);
            hiddenSections = data.hiddenSections || [];
        } catch (e) {}
    }

    const toggleReportVisibility = async (key: string) => {
        try {
            const data = item.templateData ? JSON.parse(item.templateData) : {};
            const hidden = data.hiddenSections || [];
            let newHidden;
            if (hidden.includes(key)) {
                newHidden = hidden.filter((k: string) => k !== key);
            } else {
                newHidden = [...hidden, key];
            }
            const newData = { ...data, hiddenSections: newHidden };
            await updateReport(item.id, { templateData: JSON.stringify(newData) });
            swipeableRef.current?.close();
        } catch (e) {
            console.error('Failed to toggle visibility', e);
        }
    };

    const renderRightActions = () => {
        if (!isDaily) return null;
        return (
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, paddingRight: 10, paddingLeft: 10 }}>
                <TouchableOpacity onPress={() => toggleReportVisibility('manpowerDetail')} style={{ padding: 10, alignItems: 'center' }}>
                    {hiddenSections.includes('manpowerDetail') ? <EyeOff size={20} color={colors.textMuted} /> : <Eye size={20} color="#3B82F6" />}
                    <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 4 }}>Detail</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => toggleReportVisibility('manpowerByCompany')} style={{ padding: 10, alignItems: 'center' }}>
                    {hiddenSections.includes('manpowerByCompany') ? <EyeOff size={20} color={colors.textMuted} /> : <Eye size={20} color="#3B82F6" />}
                    <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 4 }}>Company</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => toggleReportVisibility('manpowerByTrade')} style={{ padding: 10, alignItems: 'center' }}>
                    {hiddenSections.includes('manpowerByTrade') ? <EyeOff size={20} color={colors.textMuted} /> : <Eye size={20} color="#3B82F6" />}
                    <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 4 }}>Trade</Text>
                </TouchableOpacity>
            </View>
        );
    };

    const cardContent = (
        <TouchableOpacity
            style={[styles.recentReportCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push(`/project/${item.projectId}/report/${item.id}` as any)}
        >
            <View style={[styles.recentReportIcon, { backgroundColor: cat.bg }]}>
                {cat.icon}
            </View>
            <View style={styles.recentReportContent}>
                <Text style={[styles.recentReportTitle, { color: colors.text }]}>{cat.title}</Text>
                <Text style={[styles.recentReportDate, { color: colors.textMuted }]}>
                    {new Date(item.date).toLocaleDateString()} - {item.author}
                </Text>
            </View>
            <View style={styles.recentReportStatus}>
                <Text style={[styles.recentReportStatusText, { color: item.status === 'approved' ? '#22C55E' : colors.textMuted }]}>
                    {item.status.toUpperCase()}
                </Text>
            </View>
            <TouchableOpacity
                style={[styles.actionIconSm, { backgroundColor: colors.background }]}
                onPress={(e) => { 
                    e.stopPropagation(); 
                    if (checkReportLimit()) {
                        router.push(`/project/${project.id}/report/create?type=${item.type}&duplicateId=${item.id}` as any); 
                    }
                }}
            >
                <Plus size={16} color="#2563EB" />
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.actionIconSm, { backgroundColor: colors.background }]}
                onPress={(e) => { e.stopPropagation(); router.push(`/project/${project.id}/report/create?type=${item.type}&editId=${item.id}` as any); }}
            >
                <Pencil size={16} color={colors.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity
                style={styles.deleteReportIcon}
                onPress={(e) => { e.stopPropagation(); handleDeleteReport(item.id); }}
            >
                <Trash2 size={16} color="#EF4444" />
            </TouchableOpacity>
        </TouchableOpacity>
    );

    return (
        <Animated.View entering={FadeInDown.delay(index * 100).springify()}>
            {isDaily ? (
                <Swipeable ref={swipeableRef} renderRightActions={renderRightActions}>
                    {cardContent}
                </Swipeable>
            ) : (
                cardContent
            )}
        </Animated.View>
    );
};

export default function ProjectDashboardScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { getProject, deleteProject, getReportsForProject, deleteReport, updateReport, initialSync } = useProjectsStore();
    const { colors } = useThemeColors();
    const currentUserId = useAuthStore(state => state.user?.id);
    const status = useStatus();
    const hasSynced = status?.hasSynced ?? false;

    // Live PowerSync query for the project
    const { data: powerSyncProject, isLoading: isProjectLoading } = usePowerSyncProject(id as string);
    const members = usePowerSyncMembers(id as string);

    // Make reports reactive to instantly show newly created ones
    const reports = usePowerSyncReports(id as string);
    const { isPremium } = useStore();

    // Prefer live PowerSync data, falling back to zustand store if available
    const project = powerSyncProject || getProject(id);

    const currentMember = members.find(m => m.userId === currentUserId);
    const isOwnerOrManager = useMemo(() => {
        if (!currentUserId || !project) return false;
        const isDirectOwner = Boolean(project.userId && project.userId === currentUserId);
        const hasManagerMemberRole = project.memberRole === 'owner' || project.memberRole === 'manager';
        const hasManagerCurrentMember = currentMember?.role === 'owner' || currentMember?.role === 'manager';
        return isDirectOwner || hasManagerMemberRole || hasManagerCurrentMember;
    }, [project, currentUserId, currentMember]);

    const [refreshing, setRefreshing] = useState(false);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        if (initialSync) {
            await initialSync();
        }
        setRefreshing(false);
    }, [initialSync]);

    useEffect(() => {
        // Only redirect back after initial sync has completed and the query has settled (not loading) and project is definitely missing
        if (hasSynced && !isProjectLoading && !project && id) {
            router.back();
        }
    }, [hasSynced, isProjectLoading, project, id, router]);

    if ((!hasSynced || isProjectLoading) && !project) {
        return (
            <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
                <Stack.Screen options={{ headerShown: false }} />
                <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
                    <BackButton style={{ position: "absolute", left: 20, zIndex: 20, bottom: 8 }} />
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Project</Text>
                </View>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={colors.primary || '#2563EB'} />
                    <Text style={{ marginTop: 12, fontSize: 15, color: colors.textMuted }}>Loading project...</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (!project) {
        return (
            <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
                <Stack.Screen options={{ headerShown: false }} />
                <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
                    <BackButton style={{ position: "absolute", left: 20, zIndex: 20, bottom: 8 }} />
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Project Not Found</Text>
                </View>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }}>
                    <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: 8 }}>Project Not Found</Text>
                    <Text style={{ fontSize: 14, color: colors.textMuted, textAlign: 'center', marginBottom: 24 }}>The requested project could not be found or you do not have access.</Text>
                    <TouchableOpacity
                        style={{ backgroundColor: colors.primary || '#2563EB', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 }}
                        onPress={() => router.back()}
                    >
                        <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 15 }}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    const handleDelete = () => {
        if (Platform.OS === 'web') {
            if (window.confirm(`Are you sure you want to delete "${project.name}"? This action cannot be undone.`)) {
                deleteProject(project.id);
                router.back();
            }
        } else {
            Alert.alert(
                'Delete Project',
                `Are you sure you want to delete "${project.name}"? This action cannot be undone.`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Delete', style: 'destructive', onPress: () => {
                            deleteProject(project.id);
                            router.back();
                        }
                    },
                ]
            );
        }
    };

    const handleDeleteReport = (reportId: string) => {
        if (Platform.OS === 'web') {
            if (window.confirm('Are you sure you want to delete this report?')) {
                deleteReport(reportId);
            }
        } else {
            Alert.alert(
                'Delete Report',
                'Are you sure you want to delete this report?',
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', style: 'destructive', onPress: () => deleteReport(reportId) },
                ]
            );
        }
    };

    const checkReportLimit = (): boolean => {
        if (!isPremium && reports.length >= 3) {
            Alert.alert(
                "Premium Required",
                "Free users can only create up to 3 reports. Upgrade to Construction Pro Premium to create unlimited reports.",
                [
                    { text: "Cancel", style: "cancel" },
                    { text: "Upgrade", style: "default", onPress: () => router.push('/settings' as any) }
                ]
            );
            return false;
        }
        return true;
    };

    // Dynamically calculate status if dates exist
    let displayStatus = project.status;
    if (project.startDate && project.endDate) {
        const now = new Date();
        const start = new Date(project.startDate);
        const end = new Date(project.endDate);
        if (now < start) displayStatus = 'planning';
        else if (now > end) displayStatus = 'completed';
        else displayStatus = 'active';
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return '#22C55E';
            case 'on-hold': return '#F59E0B';
            case 'completed': return '#3B82F6';
            case 'planning': return '#8B5CF6';
            default: return '#64748B';
        }
    };

    const getStatusBg = (status: string) => {
        switch (status) {
            case 'active': return '#DCFCE7';
            case 'on-hold': return '#FEF3C7';
            case 'completed': return '#DBEAFE';
            case 'planning': return '#EDE9FE';
            default: return '#F1F5F9';
        }
    };

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
            <Stack.Screen options={{ headerShown: false }} />
            <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
                <BackButton style={{ position: "absolute", left: 20, zIndex: 20, bottom: 8 }} />
                <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>{project.name}</Text>
                {isOwnerOrManager && (
                    <View style={styles.headerActions}>
                        <TouchableOpacity onPress={() => router.push(`/project/create?id=${project.id}` as any)} style={[styles.actionIcon, { backgroundColor: colors.card }]}>
                            <Pencil size={20} color={colors.textMuted} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleDelete} style={[styles.actionIcon, styles.actionIconDelete]}>
                            <Trash2 size={20} color="#EF4444" />
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            <ScrollView 
                style={[styles.container, { backgroundColor: colors.background }]} 
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
            >
                {/* Hero Section */}
                <View style={[styles.heroSection, { backgroundColor: colors.card }]}>
                    {project.photoUri ? (
                        <ProjectImage photoUri={project.photoUri} projectId={id} style={styles.heroImage} resizeMode="cover" />
                    ) : (
                        <View style={[styles.heroPlaceholder, { backgroundColor: colors.card }]}>
                            <FolderOpen size={48} color={colors.textMuted} />
                        </View>
                    )}
                    <View style={styles.heroOverlay}>
                        <View style={[styles.statusBadge, { backgroundColor: getStatusBg(displayStatus) }]}>
                            <Text style={[styles.statusText, { color: getStatusColor(displayStatus) }]}>
                                {displayStatus.toUpperCase()}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Project Info */}
                <View style={[styles.infoSection, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
                    <Text style={[styles.projectName, { color: colors.text }]}>{project.name}</Text>

                    {project.client ? (
                        <Text style={[styles.clientName, { color: colors.textMuted }]}>Client: {project.client}</Text>
                    ) : null}

                    {project.description ? (
                        <Text style={[styles.descriptionText, { color: colors.text }]}>{project.description}</Text>
                    ) : null}

                    <View style={[styles.divider, { backgroundColor: colors.border }]} />

                    <View style={styles.infoGrid}>
                        <View style={styles.infoRow}>
                            <MapPin size={16} color={colors.textMuted} />
                            <Text style={[styles.infoText, { color: colors.textMuted }]}>{project.location || 'Location tbc'}</Text>
                        </View>
                        {project.projectManager ? (
                            <View style={styles.infoRow}>
                                <Briefcase size={16} color={colors.textMuted} />
                                <Text style={[styles.infoText, { color: colors.textMuted }]}>PM: {project.projectManager}</Text>
                            </View>
                        ) : null}
                        {project.contractValue && !isNaN(Number(project.contractValue.replace(/[^0-9.-]+/g, ""))) ? (
                            <View style={styles.infoRow}>
                                <DollarSign size={16} color={colors.textMuted} />
                                <Text style={[styles.infoText, { color: colors.textMuted }]}>Value: ${Number(project.contractValue.replace(/[^0-9.-]+/g, "")).toLocaleString()}</Text>
                            </View>
                        ) : null}
                        {(project.startDate || project.endDate) ? (
                            <View style={styles.infoRow}>
                                <Calendar size={16} color={colors.textMuted} />
                                <Text style={[styles.infoText, { color: colors.textMuted }]}>
                                    Timeline: {project.startDate ? project.startDate : 'TBD'} to {project.endDate ? project.endDate : 'TBD'}
                                </Text>
                            </View>
                        ) : null}
                    </View>
                </View>

                {/* Project Features */}
                <View style={[styles.sectionHeader, { marginTop: 8 }]}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Project Features</Text>
                </View>

                <View style={{ paddingHorizontal: 20, marginBottom: 24, gap: 12 }}>
                    <Animated.View entering={FadeInDown.delay(100).springify()}>
                        <TouchableOpacity 
                            style={[styles.categoryCard, { backgroundColor: colors.card, borderColor: '#E0F2FE', flexDirection: 'row', alignItems: 'center', minHeight: 'auto', padding: 20 }]}
                            onPress={() => router.push(`/project/${project.id}/drawings` as any)}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.categoryIconCircle, { backgroundColor: '#E0F2FE', marginRight: 16, width: 56, height: 56, borderRadius: 28 }]}>
                                <FolderOpen size={32} color="#0EA5E9" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.categoryTitle, { color: colors.text, fontSize: 18 }]}>Drawings & Documents</Text>
                                <Text style={[styles.categoryDesc, { color: colors.textMuted }]}>Manage blueprints, plans, and site files</Text>
                            </View>
                        </TouchableOpacity>
                    </Animated.View>

                    <Animated.View entering={FadeInDown.delay(150).springify()}>
                        <TouchableOpacity 
                            style={[styles.categoryCard, { backgroundColor: colors.card, borderColor: '#F3E8FF', flexDirection: 'row', alignItems: 'center', minHeight: 'auto', padding: 20 }]}
                            onPress={() => router.push(`/project/${project.id}/team` as any)}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.categoryIconCircle, { backgroundColor: '#F3E8FF', marginRight: 16, width: 56, height: 56, borderRadius: 28 }]}>
                                <Users size={32} color="#9333EA" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.categoryTitle, { color: colors.text, fontSize: 18 }]}>Team Members</Text>
                                <Text style={[styles.categoryDesc, { color: colors.textMuted }]}>Manage project access and roles</Text>
                            </View>
                        </TouchableOpacity>
                    </Animated.View>

                    <Animated.View entering={FadeInDown.delay(200).springify()}>
                        <TouchableOpacity 
                            style={[styles.categoryCard, { backgroundColor: colors.card, borderColor: '#FEF9C3', flexDirection: 'row', alignItems: 'center', minHeight: 'auto', padding: 20 }]}
                            onPress={() => router.push(`/project/${project.id}/activity` as any)}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.categoryIconCircle, { backgroundColor: '#FEF9C3', marginRight: 16, width: 56, height: 56, borderRadius: 28 }]}>
                                <Activity size={32} color="#CA8A04" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.categoryTitle, { color: colors.text, fontSize: 18 }]}>Project Activity</Text>
                                <Text style={[styles.categoryDesc, { color: colors.textMuted }]}>View recent updates from the team</Text>
                            </View>
                        </TouchableOpacity>
                    </Animated.View>

                    <Animated.View entering={FadeInDown.delay(250).springify()}>
                        <TouchableOpacity 
                            style={[styles.categoryCard, { backgroundColor: colors.card, borderColor: '#DCFCE7', flexDirection: 'row', alignItems: 'center', minHeight: 'auto', padding: 20 }]}
                            onPress={() => router.push(`/saved-calculations?projectId=${project.id}` as any)}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.categoryIconCircle, { backgroundColor: '#DCFCE7', marginRight: 16, width: 56, height: 56, borderRadius: 28 }]}>
                                <Calculator size={32} color="#16A34A" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.categoryTitle, { color: colors.text, fontSize: 18 }]}>Calculations History</Text>
                                <Text style={[styles.categoryDesc, { color: colors.textMuted }]}>View saved calculations for this project</Text>
                            </View>
                        </TouchableOpacity>
                    </Animated.View>
                </View>

                {/* Report Categories Grid */}
                <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Reports & Audits</Text>
                </View>

                <View style={styles.categoriesGrid}>
                    {REPORT_CATEGORIES.map((cat, index) => (
                        <Animated.View key={cat.id} entering={FadeIn.delay(index * 100)} style={{ width: '48%', marginBottom: 16 }}>
                            <TouchableOpacity
                                style={[styles.categoryCard, { backgroundColor: colors.card, borderColor: cat.bg }]}
                                onPress={() => {
                                    if (checkReportLimit()) {
                                        if (cat.route === 'quick-log') {
                                            router.push({ pathname: '/quick-log', params: { projectId: project.id } } as any);
                                        } else if (cat.route === 'snags/create') {
                                            router.push(`/project/${project.id}/snags` as any);
                                        } else {
                                            router.push(`/project/${project.id}/report/create?type=${cat.route}` as any);
                                        }
                                    }
                                }}
                                activeOpacity={0.7}
                            >
                                <View style={styles.categoryHeader}>
                                    <View style={[styles.categoryIconCircle, { backgroundColor: cat.bg }]}>
                                        {cat.icon}
                                    </View>
                                    <View style={styles.addReportButton}>
                                        <Plus size={16} color="#2563EB" />
                                    </View>
                                </View>
                                <Text style={[styles.categoryTitle, { color: colors.text }]}>{cat.title}</Text>
                                <Text style={[styles.categoryDesc, { color: colors.textMuted }]}>{cat.desc}</Text>
                            </TouchableOpacity>
                        </Animated.View>
                    ))}
                </View>

                {/* Recent Reports List */}
                <View style={[styles.sectionHeader, { marginTop: 12 }]}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Reports</Text>
                </View>

                {reports.length === 0 ? (
                    <View style={[styles.emptyReports, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <FileText size={32} color={colors.textMuted} />
                        <Text style={[styles.emptyReportsText, { color: colors.textMuted }]}>No reports created yet.</Text>
                    </View>
                ) : (
                    <View style={styles.recentReportsList}>
                        {[...reports].sort(
                            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                        ).map((report, idx) => (
                            <ReportCardItem 
                                key={report.id} 
                                item={report} 
                                index={idx} 
                                project={project} 
                                colors={colors} 
                                updateReport={updateReport} 
                                checkReportLimit={checkReportLimit} 
                                handleDeleteReport={handleDeleteReport} 
                                router={router} 
                            />
                        ))}
                    </View>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: "center",
        paddingHorizontal: 20,
        height: 60,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
        zIndex: 10,
    },
    backButton: {
        padding: 8,
        marginLeft: -8,
    },
    headerTitle: {
        
        fontSize: 18,
        fontWeight: '700',
        color: '#0F172A',
        textAlign: 'center',
    },
    headerActions: {
        position: "absolute",
        right: 20,
        bottom: 12,
        zIndex: 20,
        flexDirection: 'row',
        alignItems: 'center',
    },
    actionIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#F1F5F9',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 8,
    },
    actionIconDelete: {
        backgroundColor: '#FEE2E2',
    },
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    heroSection: {
        width: '100%',
        height: 200,
        backgroundColor: '#E2E8F0',
        position: 'relative',
    },
    heroImage: {
        width: '100%',
        height: '100%',
    },
    heroPlaceholder: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F1F5F9',
    },
    heroOverlay: {
        position: 'absolute',
        bottom: 16,
        right: 16,
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        ...Platform.select({
            web: { boxShadow: '0px 2px 4px rgba(0,0,0,0.1)' as any },
            default: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 }
        }),
    },
    statusText: {
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    infoSection: {
        padding: 24,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
        marginBottom: 16,
    },
    projectName: {
        fontSize: 26,
        fontWeight: '800',
        color: '#0F172A',
        marginBottom: 4,
    },
    clientName: {
        fontSize: 16,
        color: '#475569',
        fontWeight: '500',
        marginBottom: 8,
    },
    descriptionText: {
        fontSize: 15,
        color: '#475569',
        lineHeight: 22,
        marginBottom: 16,
    },
    divider: {
        height: 1,
        backgroundColor: '#E2E8F0',
        marginBottom: 16,
    },
    infoGrid: {
        gap: 12,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    infoText: {
        fontSize: 15,
        color: '#64748B',
        marginLeft: 8,
    },
    sectionHeader: {
        paddingHorizontal: 24,
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#0F172A',
    },
    categoriesGrid: {
        paddingHorizontal: 20,
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    categoryCard: {
        width: '100%',
        minHeight: 160,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        borderWidth: 2,
        ...Platform.select({
            web: { boxShadow: '0px 2px 8px rgba(0,0,0,0.05)' as any },
            default: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }
        }),
    },
    categoryHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    categoryIconCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    addReportButton: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#EFF6FF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    categoryTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0F172A',
        marginBottom: 4,
    },
    categoryDesc: {
        fontSize: 13,
        color: '#64748B',
        lineHeight: 18,
    },
    emptyReports: {
        padding: 32,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
        marginHorizontal: 20,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderStyle: 'dashed',
    },
    emptyReportsText: {
        marginTop: 12,
        fontSize: 15,
        color: '#94A3B8',
        fontWeight: '500',
    },
    recentReportsList: {
        paddingHorizontal: 20,
        gap: 12,
    },
    recentReportCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        ...Platform.select({
            web: { boxShadow: '0px 1px 4px rgba(0,0,0,0.05)' as any },
            default: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 }
        }),
    },
    recentReportIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    recentReportContent: {
        flex: 1,
    },
    recentReportTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#0F172A',
        marginBottom: 4,
    },
    recentReportDate: {
        fontSize: 13,
        color: '#64748B',
    },
    recentReportStatus: {
        paddingLeft: 12,
    },
    recentReportStatusText: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    actionIconSm: {
        width: 30, height: 30, borderRadius: 15,
        backgroundColor: '#F1F5F9',
        alignItems: 'center', justifyContent: 'center',
        marginLeft: 6,
    },
    deleteReportIcon: {
        width: 30, height: 30, borderRadius: 15,
        alignItems: 'center', justifyContent: 'center',
        marginLeft: 6,
        backgroundColor: '#FEF2F2',
    },
});
