import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Alert, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { WebView } from 'react-native-webview';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Share } from 'lucide-react-native';

import { useProjectsStore, ProjectSnag } from '../../../../store/projectsStore';
import { useThemeColors } from '../../../../store/useThemeColors';
import BackButton from '../../../../components/BackButton';
import PickerDropdown from '../report/components/PickerDropdown';
import { usePowerSyncSnags } from '../../../../lib/powersync/useSnags';
import { usePowerSyncProject } from '../../../../lib/powersync/useProjects';
import { getSnagStatusLabel } from '../../../../lib/units/snagStatus';
import { generateSnagReportHTML } from '../../../../lib/report/templates/SnagReportHTML';
import { countUnanalysedSnags } from '../../../../lib/units/snagAiStatus';

export default function SnagReportScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ id: string, building?: string, floor?: string, severity?: string, status?: string, trade?: string }>();
    const { id } = params;
    
    const { getProject } = useProjectsStore();
    const { colors } = useThemeColors();
    
    const { data: powerSyncProject } = usePowerSyncProject(id);
    const project = powerSyncProject || getProject(id);
    const snags = usePowerSyncSnags(id);

    type ReportStyle = 'detailed' | 'compact' | 'summary';
    const [reportStyle, setReportStyle] = useState<ReportStyle>('detailed');
    const [filterBuilding, setFilterBuilding] = useState<string>(params.building || 'All');
    const [filterFloor, setFilterFloor] = useState<string>(params.floor || 'All');
    const [filterSeverity, setFilterSeverity] = useState<string>(params.severity || 'All');
    const [filterStatus, setFilterStatus] = useState<string>(params.status || 'All');
    const [filterTrade, setFilterTrade] = useState<string>(params.trade || 'All');
    const [isGenerating, setIsGenerating] = useState(false);

    const filterOptions = useMemo(() => {
        const buildings = new Set<string>();
        const floors = new Set<string>();
        const trades = new Set<string>();

        snags.forEach(s => {
            if (s.buildingId) {
                const b = Array.isArray(project?.buildings) ? project.buildings.find(b => b.id === s.buildingId) : undefined;
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
                const b = Array.isArray(project?.buildings) ? project.buildings.find(b => b.id === s.buildingId) : undefined;
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

    const activeFilters = [];
    if (filterBuilding !== 'All') activeFilters.push(filterBuilding);
    if (filterFloor !== 'All') activeFilters.push(`Floor ${filterFloor}`);
    if (filterSeverity !== 'All') activeFilters.push(filterSeverity);
    if (filterStatus !== 'All') activeFilters.push(filterStatus);
    if (filterTrade !== 'All') activeFilters.push(filterTrade);
    const filterSummaryString = activeFilters.length > 0 ? activeFilters.join(' • ') : undefined;

    const html = useMemo(() => {
        if (!project) return '';
        const format = reportStyle === 'summary' ? 'summary' : 'detailed';
        const snagsPerPage = reportStyle === 'compact' ? 4 : 1;
        return generateSnagReportHTML(filteredSnags, project, { 
            format, 
            filterSummary: filterSummaryString,
            snagsPerPage
        });
    }, [filteredSnags, project, reportStyle, filterSummaryString]);

    if (!project) {
        return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><Text>Project not found</Text></View>;
    }

    const executeExport = async () => {
        try {
            setIsGenerating(true);

            if (Platform.OS === 'web') {
                let iframe = document.getElementById('report-iframe') as HTMLIFrameElement;
                if (!iframe) {
                    iframe = document.createElement('iframe');
                    iframe.id = 'report-iframe';
                    iframe.style.display = 'none';
                    document.body.appendChild(iframe);
                }
                iframe.srcdoc = html;
                iframe.onload = () => {
                    if (iframe.contentWindow) iframe.contentWindow.print();
                };
            } else {
                const { uri } = await Print.printToFileAsync({
                    html,
                    base64: false,
                    margins: { top: 30, right: 30, bottom: 30, left: 30 }
                });

                const canShare = await Sharing.isAvailableAsync();
                if (canShare) {
                    await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf', dialogTitle: 'Share Snag Report PDF' });
                } else {
                    await Print.printAsync({ uri });
                }
            }
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to generate PDF document.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSharePDF = () => {
        if (filteredSnags.length === 0) {
            Alert.alert('Empty', 'No snags to export.');
            return;
        }

        const unanalysedCount = countUnanalysedSnags(filteredSnags);
        if (unanalysedCount > 0) {
            const countText = unanalysedCount === 1 ? '1 snag is' : `${unanalysedCount} snags are`;

            if (Platform.OS === 'web') {
                const proceed = window.confirm(
                    `${countText} still being analysed by AI.\n\nPlaceholder descriptions will appear in the report if exported now.\n\nProceed anyway?`
                );
                if (proceed) {
                    executeExport();
                }
                return;
            }

            Alert.alert(
                'Unanalysed Snags',
                `${countText} still being analysed. Placeholder descriptions will appear in the report if you export now.`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    { 
                        text: 'Proceed Anyway', 
                        onPress: () => { executeExport(); } 
                    }
                ],
                { cancelable: true }
            );
            return;
        }

        executeExport();
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
                <BackButton />
                <Text style={[styles.headerTitle, { color: colors.text }]}>Snag Report</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Config Bar */}
            <View style={[styles.configBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
                <View style={[styles.segmentControl, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    {(['detailed', 'compact', 'summary'] as const).map((s) => (
                        <TouchableOpacity
                            key={s}
                            style={[styles.segmentBtn, reportStyle === s && { backgroundColor: colors.primary }]}
                            onPress={() => setReportStyle(s)}
                        >
                            <Text style={[styles.segmentText, { color: reportStyle === s ? '#FFF' : colors.text }]}>
                                {s === 'detailed' ? 'Detailed' : s === 'compact' ? 'Compact' : 'Summary'}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

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
                            options={['All', 'Open', 'In Progress', 'Closed']}
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
            </View>

            {/* Preview */}
            <WebView 
                source={{ html }} 
                style={{ flex: 1, backgroundColor: '#FFF' }}
                originWhitelist={['*']}
            />

            {/* Action Bar */}
            <View style={[styles.actionBar, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
                <TouchableOpacity 
                    style={[
                        styles.shareButton, 
                        { backgroundColor: colors.primary },
                        (isGenerating || filteredSnags.length === 0) && { opacity: 0.5 }
                    ]}
                    onPress={handleSharePDF}
                    disabled={isGenerating || filteredSnags.length === 0}
                >
                    {isGenerating ? (
                        <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                        <Share size={20} color="#FFF" />
                    )}
                    <Text style={styles.shareText}>Share PDF ({filteredSnags.length})</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'ios' ? 50 : 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    configBar: {
        borderBottomWidth: 1,
        paddingBottom: 12,
    },
    segmentControl: {
        flexDirection: 'row',
        margin: 16,
        borderRadius: 8,
        borderWidth: 1,
        overflow: 'hidden',
    },
    segmentBtn: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
    },
    segmentText: {
        fontWeight: '600',
        fontSize: 14,
    },
    filterScroll: {
        paddingHorizontal: 16,
        gap: 12,
    },
    filterItem: {
        width: 130,
    },
    actionBar: {
        padding: 16,
        borderTopWidth: 1,
        paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    },
    shareButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 8,
        gap: 8,
    },
    shareText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
    }
});
