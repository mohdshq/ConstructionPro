import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useProjectsStore, ProjectSnag } from '../../../../store/projectsStore';
import { useThemeColors } from '../../../../store/useThemeColors';
import BackButton from '../../../../components/BackButton';
import ProjectImage from '../../../../components/ProjectImage';
import { Plus, Camera, FileText } from 'lucide-react-native';
import { makeUnitCode } from '../../../../lib/units/unitCode';
import { makeSnagRef } from '../../../../lib/units/snagRef';
import { usePowerSyncSnags } from '../../../../lib/powersync/useSnags';
import { getSnagStatusBg, getSnagStatusColor, getSnagStatusLabel } from '../../../../lib/units/snagStatus';
import PickerDropdown from '../report/components/PickerDropdown';

export default function SnagsListScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const { getProject } = useProjectsStore();
    const { colors } = useThemeColors();
    
    const project = getProject(id);
    const snags = usePowerSyncSnags(id);

    const [filterBuilding, setFilterBuilding] = useState<string>('All');
    const [filterFloor, setFilterFloor] = useState<string>('All');
    const [filterSeverity, setFilterSeverity] = useState<string>('All');
    const [filterStatus, setFilterStatus] = useState<string>('All');
    const [filterTrade, setFilterTrade] = useState<string>('All');

    const filterOptions = useMemo(() => {
        const buildings = new Set<string>();
        const floors = new Set<string>();
        const trades = new Set<string>();

        snags.forEach(s => {
            if (s.buildingId) {
                const b = project?.buildings?.find(b => b.id === s.buildingId);
                if (b && b.code) buildings.add(b.code);
            }
            if (s.floor !== undefined && s.floor !== null) floors.add(String(s.floor));
            if (s.trade) trades.add(s.trade);
        });

        return {
            buildings: ['All', ...Array.from(buildings).sort()],
            floors: ['All', ...Array.from(floors).sort((a, b) => Number(a) - Number(b))],
            trades: ['All', ...Array.from(trades).sort()]
        };
    }, [snags, project]);

    const filteredSnags = useMemo(() => {
        return snags.filter(s => {
            if (filterBuilding !== 'All') {
                const b = project?.buildings?.find(b => b.id === s.buildingId);
                if (!b || b.code !== filterBuilding) return false;
            }
            if (filterFloor !== 'All' && String(s.floor) !== filterFloor) return false;
            if (filterSeverity !== 'All') {
                const prettySev = s.severity.charAt(0).toUpperCase() + s.severity.slice(1);
                if (prettySev !== filterSeverity) return false;
            }
            if (filterStatus !== 'All' && getSnagStatusLabel(s.status) !== filterStatus) return false;
            if (filterTrade !== 'All' && s.trade !== filterTrade) return false;
            return true;
        });
    }, [snags, project, filterBuilding, filterFloor, filterSeverity, filterStatus, filterTrade]);

    const hasFilters = filterBuilding !== 'All' || filterFloor !== 'All' || filterSeverity !== 'All' || filterStatus !== 'All' || filterTrade !== 'All';

    const clearFilters = () => {
        setFilterBuilding('All');
        setFilterFloor('All');
        setFilterSeverity('All');
        setFilterStatus('All');
        setFilterTrade('All');
    };

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
                <View style={{ flexDirection: 'row', gap: 16 }}>
                    <TouchableOpacity onPress={() => router.push({ pathname: `/project/${id}/snags/report`, params: { building: filterBuilding, floor: filterFloor, severity: filterSeverity, status: filterStatus, trade: filterTrade } } as any)}>
                        <FileText size={24} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => router.push(`/project/${id}/snags/create` as any)}>
                        <Plus size={24} color={colors.primary} />
                    </TouchableOpacity>
                </View>
            </View>

            {snags.length > 0 && (
                <View style={[styles.filterContainer, { borderBottomColor: colors.border }]}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
                        <View style={styles.filterItem}>
                            <PickerDropdown
                                value={filterBuilding === 'All' ? '' : filterBuilding}
                                placeholder="Building"
                                options={filterOptions.buildings}
                                onSelect={setFilterBuilding}
                                colors={colors}
                            />
                        </View>
                        <View style={styles.filterItem}>
                            <PickerDropdown
                                value={filterFloor === 'All' ? '' : filterFloor}
                                placeholder="Floor"
                                options={filterOptions.floors}
                                onSelect={setFilterFloor}
                                colors={colors}
                            />
                        </View>
                        <View style={styles.filterItem}>
                            <PickerDropdown
                                value={filterSeverity === 'All' ? '' : filterSeverity}
                                placeholder="Severity"
                                options={['All', 'Critical', 'Major', 'Minor', 'Cosmetic']}
                                onSelect={setFilterSeverity}
                                colors={colors}
                            />
                        </View>
                        <View style={styles.filterItem}>
                            <PickerDropdown
                                value={filterStatus === 'All' ? '' : filterStatus}
                                placeholder="Status"
                                options={['All', getSnagStatusLabel('open'), getSnagStatusLabel('in_progress'), getSnagStatusLabel('closed')]}
                                onSelect={setFilterStatus}
                                colors={colors}
                            />
                        </View>
                        <View style={styles.filterItem}>
                            <PickerDropdown
                                value={filterTrade === 'All' ? '' : filterTrade}
                                placeholder="Trade"
                                options={filterOptions.trades}
                                onSelect={setFilterTrade}
                                colors={colors}
                            />
                        </View>
                    </ScrollView>
                    {hasFilters && (
                        <TouchableOpacity onPress={clearFilters} style={styles.clearFiltersBtn}>
                            <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '600' }}>Clear filters</Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}

            {snags.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Text style={[styles.emptyText, { color: colors.textMuted }]}>No snags yet — tap + to add one.</Text>
                </View>
            ) : filteredSnags.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Text style={[styles.emptyText, { color: colors.textMuted }]}>No snags match your filters.</Text>
                </View>
            ) : (
                <FlatList
                    data={filteredSnags}
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
    filterContainer: {
        borderBottomWidth: 1,
        paddingVertical: 8,
    },
    filterScroll: {
        paddingHorizontal: 16,
        gap: 8,
        alignItems: 'center',
    },
    filterItem: { width: 130 },
    clearFiltersBtn: {
        alignSelf: 'flex-start',
        marginLeft: 16,
        marginTop: 8,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
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
