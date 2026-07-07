import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useProjectsStore, ProjectSnag } from '../../../../store/projectsStore';
import { useThemeColors } from '../../../../store/useThemeColors';
import BackButton from '../../../../components/BackButton';
import ProjectImage from '../../../../components/ProjectImage';
import { Plus, Camera } from 'lucide-react-native';
import { makeUnitCode } from '../../../../lib/units/unitCode';
import { makeSnagRef } from '../../../../lib/units/snagRef';
import { usePowerSyncSnags } from '../../../../lib/powersync/useSnags';
import { getSnagStatusBg, getSnagStatusColor, getSnagStatusLabel } from '../../../../lib/units/snagStatus';

export default function SnagsListScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const { getProject } = useProjectsStore();
    const { colors } = useThemeColors();
    
    const project = getProject(id);
    const snags = usePowerSyncSnags(id);

    if (!project) {
        return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><Text>Project not found</Text></View>;
    }

    const renderSnag = ({ item }: { item: ProjectSnag }) => {
        const building = project.buildings?.find(b => b.id === item.buildingId);
        const unitCode = makeUnitCode(item.floor, item.flat, project, building);
        const ref = makeSnagRef(unitCode, item.seq);
        
        return (
            <TouchableOpacity 
                style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => router.push(`/project/${id}/snags/${item.id}` as any)}
            >
                <View style={[styles.thumbnailContainer, { borderColor: colors.border }]}>
                    {item.photos?.[0] ? (
                        <ProjectImage photoUri={item.photos[0]} style={styles.thumbnail} resizeMode="cover" />
                    ) : (
                        <Camera size={24} color={colors.textMuted} />
                    )}
                </View>
                <View style={styles.contentContainer}>
                    <View style={styles.titleRow}>
                        <Text style={[styles.refText, { color: colors.text }]}>{ref}</Text>
                        <View style={styles.badges}>
                            <View style={[styles.badge, { backgroundColor: item.severity === 'critical' ? '#FEE2E2' : '#F3F4F6' }]}>
                                <Text style={[styles.badgeText, { color: item.severity === 'critical' ? '#EF4444' : '#4B5563' }]}>{item.severity.toUpperCase()}</Text>
                            </View>
                            <View style={[styles.badge, { backgroundColor: getSnagStatusBg(item.status) }]}>
                                <Text style={[styles.badgeText, { color: getSnagStatusColor(item.status) }]}>{getSnagStatusLabel(item.status)}</Text>
                            </View>
                        </View>
                    </View>
                    <Text style={[styles.descText, { color: colors.text }]} numberOfLines={1}>
                        {item.description || 'No description'}
                    </Text>
                    <Text style={[styles.subText, { color: colors.textMuted }]}>
                        {item.areaType.toUpperCase()} {item.trade ? `• ${item.trade}` : ''}
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]} >
                <BackButton />
                <Text style={[styles.headerTitle, { color: colors.text }]}>Snags</Text>
                <TouchableOpacity onPress={() => router.push(`/project/${id}/snags/create` as any)}>
                    <Plus size={24} color={colors.primary} />
                </TouchableOpacity>
            </View>

            {snags.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Text style={[styles.emptyText, { color: colors.textMuted }]}>No snags yet — tap + to add one.</Text>
                </View>
            ) : (
                <FlatList
                    data={snags}
                    keyExtractor={item => item.id}
                    renderItem={renderSnag}
                    contentContainerStyle={styles.listContent}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 60,
        paddingBottom: 16,
        borderBottomWidth: 1,
    },
    headerTitle: { fontSize: 18, fontWeight: '600' },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyText: { fontSize: 16 },
    listContent: { padding: 16, gap: 12 },
    row: {
        flexDirection: 'row',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        gap: 12,
        alignItems: 'center',
    },
    thumbnailContainer: {
        width: 60,
        height: 60,
        borderRadius: 8,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        backgroundColor: '#F3F4F6'
    },
    thumbnail: { width: '100%', height: '100%' },
    contentContainer: { flex: 1, gap: 4 },
    titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    refText: { fontSize: 16, fontWeight: '700' },
    badges: { flexDirection: 'row', gap: 6 },
    badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    badgeText: { fontSize: 10, fontWeight: '700' },
    descText: { fontSize: 14 },
    subText: { fontSize: 12 }
});
