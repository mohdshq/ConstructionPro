import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { ArrowLeft, CheckCircle, Share2 } from "lucide-react-native";
import BackButton from "../../../../components/BackButton";
import { useMemo, useState, useEffect } from 'react';
import { ActionSheetIOS, ActivityIndicator, Alert, Modal, Platform, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';
import * as XLSX from 'xlsx';
import { useProjectsStore } from '../../../../store/projectsStore';
import { useThemeColors } from '../../../../store/useThemeColors';
import { generateDailyReportHTML } from '../../../../lib/report/templates/DailyReportHTML';
import { generateSnaggingHTML } from '../../../../lib/report/templates/SnaggingReportHTML';
import { generateHSEHTML } from '../../../../lib/report/templates/HSEReportHTML';
import { generateQuickLogHTML } from '../../../../lib/report/templates/QuickLogHTML';
import { getSignedUrl } from '../../../../lib/supabaseSync';

export default function ReportViewerScreen() {
    const { colors } = useThemeColors();
    const { reportId } = useLocalSearchParams<{ reportId: string }>();
    const router = useRouter();
    const { getReport, getProject, updateReport } = useProjectsStore();

    const [isGenerating, setIsGenerating] = useState(false);
    const [shareModalVisible, setShareModalVisible] = useState(false);

    const report = useMemo(() => reportId ? getReport(reportId) : null, [reportId, getReport]);
    const project = useMemo(() => report ? getProject(report.projectId) : null, [report, getProject]);
    const rawData = useMemo(() => report ? JSON.parse(report.templateData) : null, [report]);
    const [data, setData] = useState<any>(null);
    const [htmlContent, setHtmlContent] = useState<string>('');

    if (!report || !project || !rawData) {
        return (
            <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
                <Stack.Screen options={{ headerShown: false }} />
                <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
                    <BackButton style={{ position: "absolute", left: 20, zIndex: 20, bottom: 8 }} />
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Report Not Found</Text>
                </View>
            </SafeAreaView>
        );
    }

    // ─── Data Preparation (Base64 media embedding) ────────────────────
    useEffect(() => {
        let isMounted = true;
        const prepareData = async () => {
            if (!rawData) return;
            const mappedData = JSON.parse(JSON.stringify(rawData));
            
            // Process photos concurrently for ALL report types
            if (mappedData.photos && mappedData.photos.length > 0) {
                mappedData.photos = await Promise.all(
                    mappedData.photos.map(async (photo: any) => {
                        let uri = typeof photo === 'string' ? photo : photo.uri;
                        let caption = typeof photo === 'string' ? '' : photo.caption || '';

                        // Resolve Supabase storage paths to signed URLs
                        if (uri && !uri.startsWith('data:') && !uri.startsWith('file://') && !uri.startsWith('content://') && !uri.startsWith('/') && !uri.startsWith('http')) {
                            try {
                                const signedUrl = await getSignedUrl('report-photos', uri);
                                if (signedUrl) uri = signedUrl;
                            } catch (e) { console.error('Error getting signed URL:', e); }
                        }

                        if (!uri.startsWith('data:') && Platform.OS !== 'web') {
                            try {
                                if (uri.startsWith('http')) {
                                    const res = await fetch(uri);
                                    const blob = await res.blob();
                                    const reader = new FileReader();
                                    const base64 = await new Promise((resolve) => {
                                        reader.onloadend = () => resolve(reader.result);
                                        reader.readAsDataURL(blob);
                                    });
                                    uri = base64 as string;
                                } else {
                                    const b64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
                                    uri = `data:image/jpeg;base64,${b64}`;
                                }
                            } catch (e) { console.error("Error embedding photo base64", e); }
                        }
                        
                        return typeof photo === 'string' ? uri : { ...photo, uri, caption };
                    })
                );
            }

            // Process audio concurrently for ALL report types
            const rawAudio = mappedData.audioUris || (mappedData.audioUri ? [mappedData.audioUri] : []);
            if (rawAudio.length > 0) {
                mappedData.audioUris = await Promise.all(
                    rawAudio.map(async (uri: string) => {
                        if (!uri.startsWith('data:') && Platform.OS !== 'web') {
                            try {
                                if (uri.startsWith('http')) {
                                    const res = await fetch(uri);
                                    const blob = await res.blob();
                                    const reader = new FileReader();
                                    const base64 = await new Promise((resolve) => {
                                        reader.onloadend = () => resolve(reader.result);
                                        reader.readAsDataURL(blob);
                                    });
                                    return base64 as string;
                                } else {
                                    const b64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
                                    return `data:audio/m4a;base64,${b64}`;
                                }
                            } catch (e) {
                                console.error("Error embedding audio base64", e);
                                return uri;
                            }
                        }
                        return uri;
                    })
                );
            }
            if (isMounted) setData(mappedData);
        };
        prepareData();
        return () => { isMounted = false; };
    }, [rawData, report?.type]);

    useEffect(() => {
        if (data) {
            setHtmlContent(generateHTML());
        }
    }, [data]);

    // ─── HTML Generation (dispatches to extracted templates) ──────────
    const generateHTML = (options?: { hideMeta?: boolean }) => {
        if (!data) return '';
        if (report.type === 'snagging') {
            return generateSnaggingHTML(data, report, project, options);
        }
        if (report.type === 'hse') {
            return generateHSEHTML(data, report, project);
        }
        if (report.type === 'quick-log') {
            return generateQuickLogHTML(data, report, project);
        }
        if (report.type === 'daily') {
            return generateDailyReportHTML(data, report, project);
        }
        // Fallback for unknown types
        return `<html><body style="font-family: sans-serif; padding: 40px;"><h2>Standard Report</h2><pre>${JSON.stringify(data, null, 2)}</pre></body></html>`;
    };

    // ─── PDF Export ──────────────────────────────────────────────────
    const handleSharePDF = async (hideMeta?: boolean) => {
        try {
            setIsGenerating(true);
            const html = generateHTML({ hideMeta });

            if (Platform.OS === 'web') {
                const iframe = document.getElementById('report-iframe') as HTMLIFrameElement;
                if (iframe && iframe.contentWindow) {
                    iframe.contentWindow.print();
                } else {
                    window.print();
                }
            } else {
                const { uri } = await Print.printToFileAsync({
                    html,
                    base64: false,
                    margins: { top: 30, right: 30, bottom: 30, left: 30 }
                });

                const canShare = await Sharing.isAvailableAsync();
                if (canShare) {
                    await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf', dialogTitle: 'Share Daily Report PDF' });
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

    const handleShareCloudLink = async () => {
        try {
            setIsGenerating(true);
            const html = generateHTML();

            if (Platform.OS === 'web') {
                window.alert('Cloud link generation is currently supported on mobile devices.');
                return;
            }

            const { uri } = await Print.printToFileAsync({
                html,
                base64: false,
                margins: { top: 30, right: 30, bottom: 30, left: 30 }
            });

            // Convert local file to blob
            const response = await fetch(uri);
            const blob = await response.blob();
            const fileName = `${project.id}/report_${report.id}_${Date.now()}.pdf`;

            // Upload to Supabase Storage
            const { data, error } = await supabase.storage.from('pdfs').upload(fileName, blob, {
                contentType: 'application/pdf',
                upsert: true
            });

            if (error) throw error;

            // Get public URL
            const { data: { publicUrl } } = supabase.storage.from('pdfs').getPublicUrl(fileName);

            const canShare = await Sharing.isAvailableAsync();
            if (canShare) {
                await Sharing.shareAsync(publicUrl, { dialogTitle: 'Share Daily Report Link' });
            } else {
                Alert.alert('Success', `Cloud Link generated: ${publicUrl}`);
            }

        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to generate Cloud Link.');
        } finally {
            setIsGenerating(false);
        }
    };

    // ─── Excel Export ────────────────────────────────────────────────
    const handleShareExcel = async () => {
        try {
            setIsGenerating(true);
            const dateStr = new Date(report.date).toLocaleDateString('en-GB');

            const wb = XLSX.utils.book_new();

            if (report.type === 'snagging') {
                const wsGeneralData = [
                    ['PROPERTY CONDITION AUDIT (PCA) REPORT'],
                    ['Project', project.name, 'Date', dateStr],
                    ['Location', project.location],
                    [],
                    ['Property Details'],
                    ['Property Name', data.propertyName || '-'],
                    ['Property Address', data.propertyAddress || '-'],
                    ['City', data.city || '-'],
                    ['Property Type', data.propertyType || '-'],
                    ['Inspector', data.inspectorName || '-'],
                ];
                const wsGeneral = XLSX.utils.aoa_to_sheet(wsGeneralData);
                XLSX.utils.book_append_sheet(wb, wsGeneral, "General Details");

                if (data.snags && data.snags.length > 0) {
                    const wsSnags = XLSX.utils.json_to_sheet(data.snags.map((s: any) => ({
                        'System': s.system || '-',
                        'Asset Name': s.assetName || '-',
                        'Location': s.location || '-',
                        'Level': s.level || '-',
                        'Room': s.room || '-',
                        'Severity': s.severity || '-',
                        'Issue': s.issue || '-',
                        'Recommendation': s.recommendation || '-',
                        'Status': s.status || '-',
                        'Contractor': s.contractor || '-',
                        'Target Date': s.targetDate || '-',
                        'Cost Estimate': s.costEstimate || '-'
                    })));
                    XLSX.utils.book_append_sheet(wb, wsSnags, "Observed Issues");
                }
            } else if (report.type === 'hse') {
                const wsGeneralData = [
                    ['HSE REPORT'],
                    ['Project', project.name, 'Date', dateStr],
                    ['Location', project.location],
                    ['Author', report.author],
                ];
                const wsGeneral = XLSX.utils.aoa_to_sheet(wsGeneralData);
                XLSX.utils.book_append_sheet(wb, wsGeneral, "General Details");
                
                if (data.incidents && data.incidents.length > 0) {
                    const wsIncidents = XLSX.utils.json_to_sheet(data.incidents.map((s: any) => ({
                        'Type': s.type || '-',
                        'Location': s.location || '-',
                        'Description': s.description || '-',
                        'Action Taken': s.actionTaken || '-'
                    })));
                    XLSX.utils.book_append_sheet(wb, wsIncidents, "Incidents");
                }
            } else if (report.type === 'quick-log') {
                const wsGeneralData = [
                    ['QUICK SITE LOG'],
                    ['Project', project.name, 'Date', dateStr],
                    ['Location', data.location || project.location],
                    ['Author', report.author],
                    [],
                    ['Notes', data.notes || 'No notes provided.']
                ];
                const wsGeneral = XLSX.utils.aoa_to_sheet(wsGeneralData);
                XLSX.utils.book_append_sheet(wb, wsGeneral, "Quick Log Details");
            } else {
                // Daily Report Excel
                const wsGeneralData = [
                    ['DAILY PROGRESS REPORT'],
                    ['Project', project.name, 'Date', dateStr],
                    ['Location', project.location],
                    [],
                    ['Dates & Weather'],
                    ['Commencement Date', data.commencementDate || '-'],
                    ['Completion Date', data.completionDate || '-'],
                    ['Anticipated Completion', data.anticipatedCompletionDate || '-'],
                    ['Humidity', data.climateHumidity || '-'],
                    ['Temperature', data.climateTemp || '-'],
                    ['Visibility', data.climateVisibility || '-'],
                    ['Wind Speed', data.climateWindSpeed || '-'],
                    [],
                    ['Manpower Summary'],
                    ['Main Contractor', data.manpowerMainContractor || '0'],
                    ['Subcontractors', data.manpowerSubcontractors || '0'],
                    ['Night Shift / Others', data.manpowerOthers || '0'],
                    ['Total Manpower', data.manpowerTotal || '0'],
                ];
                const wsGeneral = XLSX.utils.aoa_to_sheet(wsGeneralData);
                XLSX.utils.book_append_sheet(wb, wsGeneral, "General Details");

                if (data.mainContractorStaff && data.mainContractorStaff.length > 0) {
                    const wsMCStaff = XLSX.utils.json_to_sheet(data.mainContractorStaff.map((s: any) => ({
                        'Role / Description': s.description,
                        'Count': s.count
                    })));
                    XLSX.utils.book_append_sheet(wb, wsMCStaff, "Main Contractor Staff");
                }

                if (data.subcontractorStaff && data.subcontractorStaff.length > 0) {
                    const wsSubStaff = XLSX.utils.json_to_sheet(data.subcontractorStaff.map((s: any) => ({
                        'Company / Name': s.name,
                        'Count': s.count
                    })));
                    XLSX.utils.book_append_sheet(wb, wsSubStaff, "Subcontractor Staff");
                }

                if (data.equipment && data.equipment.length > 0) {
                    const wsEquip = XLSX.utils.json_to_sheet(data.equipment.map((e: any) => ({
                        'Equipment Description': e.description,
                        'Count': e.count
                    })));
                    XLSX.utils.book_append_sheet(wb, wsEquip, "Equipment");
                }

                if (data.mainContractorLabor && data.mainContractorLabor.length > 0) {
                    const wsLabor = XLSX.utils.json_to_sheet(data.mainContractorLabor.map((l: any) => ({
                        'Trade': l.trade,
                        'In House': l.inHouse,
                        'Supply': l.supply,
                        'Total': l.total
                    })));
                    XLSX.utils.book_append_sheet(wb, wsLabor, "MC Labor");
                }

                if (data.activitiesProgress && data.activitiesProgress.length > 0) {
                    const wsActivities = XLSX.utils.json_to_sheet(data.activitiesProgress.map((a: any) => ({
                        'Activity Name': a.activityName,
                        'UOM': a.uom,
                        'Total Qty': a.totalQty,
                        'Prev Qty': a.prevQty,
                        'Today Qty': a.todayQty,
                        'Balance Qty': a.balanceQty
                    })));
                    XLSX.utils.book_append_sheet(wb, wsActivities, "Progress Activities");
                }

                if (data.areasOfConcern && data.areasOfConcern.length > 0) {
                    const wsConcerns = XLSX.utils.json_to_sheet(data.areasOfConcern.map((c: any) => ({
                        'Location': c.location,
                        'Issue / Concern': c.concern,
                        'Corrective Action': c.action
                    })));
                    XLSX.utils.book_append_sheet(wb, wsConcerns, "Areas of Concern");
                }
            }

            // Write File
            const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });

            const safeName = project.name.split(' ').join('_');
            const safeDate = dateStr.split('/').join('-');
            const filename = `${report.type.toUpperCase()}_Report_${safeName}_${safeDate}.xlsx`;

            if (Platform.OS === 'web') {
                const byteCharacters = atob(wbout);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            } else {
                // @ts-ignore - Expo types occasionally mismatch locally
                const uri = FileSystem.cacheDirectory + filename;
                // @ts-ignore
                await FileSystem.writeAsStringAsync(uri, wbout, { encoding: FileSystem.EncodingType.Base64 });

                const canShare = await Sharing.isAvailableAsync();
                if (canShare) {
                    await Sharing.shareAsync(uri, { UTI: 'com.microsoft.excel.xls', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', dialogTitle: 'Share Excel Report' });
                }
            }
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to generate Excel document.');
        } finally {
            setIsGenerating(false);
        }
    };

    // ─── Share Modal Actions ─────────────────────────────────────────
    const handleSharePress = () => {
        setShareModalVisible(true);
    };

    const runShareAction = async (type: 'pdf' | 'pdf-nometa' | 'excel' | 'cloud-link') => {
        setShareModalVisible(false);
        // Add a small delay so the modal closing animation finishes before intense processing
        setTimeout(() => {
            if (type === 'pdf') handleSharePDF(false);
            else if (type === 'pdf-nometa') handleSharePDF(true);
            else if (type === 'excel') handleShareExcel();
            else if (type === 'cloud-link') handleShareCloudLink();
        }, 100);
    };

    const handleStatusUpdate = () => {
        if (!report) return;

        const nextStatus = report.status === 'draft' ? 'submitted' : report.status === 'submitted' ? 'approved' : 'draft';

        if (Platform.OS === 'web') {
            if (window.confirm(`Change report status to ${nextStatus.toUpperCase()}?`)) {
                updateReport(report.id, { status: nextStatus });
            }
        } else {
            Alert.alert(
                'Update Status',
                `Change report status to ${nextStatus.toUpperCase()}?`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Confirm', onPress: () => updateReport(report.id, { status: nextStatus }) }
                ]
            );
        }
    };

    // ─── Render ──────────────────────────────────────────────────────
    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
            <Stack.Screen options={{ headerShown: false }} />
            <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
                <BackButton style={{ position: "absolute", left: 20, zIndex: 20, bottom: 8 }} />
                <Text style={styles.headerTitle} numberOfLines={1}>{
                    report.type === 'daily' ? 'Daily Report Preview' : 'Document Viewer'
                }</Text>
                <View style={styles.headerActions}>
                    <TouchableOpacity style={styles.actionIcon} onPress={handleStatusUpdate} disabled={isGenerating}>
                        <CheckCircle size={22} color={report.status === 'approved' ? '#22C55E' : report.status === 'submitted' ? '#F59E0B' : '#64748B'} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionIcon} onPress={handleSharePress} disabled={isGenerating}>
                        {isGenerating ? <ActivityIndicator size="small" color="#2563EB" /> : <Share2 size={22} color={colors.text} />}
                    </TouchableOpacity>
                </View>
            </View>

            <Modal visible={shareModalVisible} transparent={true} animationType="fade" onRequestClose={() => setShareModalVisible(false)}>
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShareModalVisible(false)}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Share Report</Text>
                        <Text style={styles.modalSubtitle}>How would you like to share this daily report?</Text>
                        
                        <TouchableOpacity style={styles.modalOption} onPress={() => runShareAction('pdf')}>
                            <Text style={styles.modalOptionText}>View / Print PDF</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity style={styles.modalOption} onPress={() => runShareAction('cloud-link')}>
                            <Text style={styles.modalOptionText}>Share Cloud Link</Text>
                        </TouchableOpacity>
                        
                        {report.type === 'snagging' && (
                            <TouchableOpacity style={styles.modalOption} onPress={() => runShareAction('pdf-nometa')}>
                                <Text style={styles.modalOptionText}>Share PDF (Issues Only / No Meta)</Text>
                            </TouchableOpacity>
                        )}
                        
                        <TouchableOpacity style={[styles.modalOption, styles.modalOptionExcel]} onPress={() => runShareAction('excel')}>
                            <Text style={[styles.modalOptionText, styles.modalOptionExcelText]}>Download Excel (Data only)</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity style={styles.modalCancel} onPress={() => setShareModalVisible(false)}>
                            <Text style={styles.modalCancelText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

            <View style={[styles.container, { backgroundColor: colors.background }]}>
                {!htmlContent ? (
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        <ActivityIndicator size="large" color={colors.primary} />
                        <Text style={{ marginTop: 12, color: colors.textMuted }}>Loading media...</Text>
                    </View>
                ) : Platform.OS === 'web' ? (
                    <iframe
                        id="report-iframe"
                        srcDoc={htmlContent}
                        style={{ width: '100%', height: '100%', border: 'none', backgroundColor: 'transparent' }}
                        title="Report Preview"
                    />
                ) : (
                    <WebView
                        // @ts-ignore
                        source={{ html: htmlContent }}
                        style={styles.webview}
                        javaScriptEnabled={true}
                        domStorageEnabled={true}
                        setBuiltInZoomControls={true}
                        scrollEnabled={true}
                        showsVerticalScrollIndicator={true}
                        originWhitelist={['*']}
                        allowFileAccess={true}
                        allowFileAccessFromFileURLs={true}
                        allowUniversalAccessFromFileURLs={true}
                        mediaPlaybackRequiresUserAction={false}
                    />
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
    container: { flex: 1, backgroundColor: '#F1F5F9' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: "center",
        paddingHorizontal: 16, height: 60, backgroundColor: '#FFFFFF',
        borderBottomWidth: 1, borderBottomColor: '#E2E8F0', zIndex: 10,
    },
    backButton: { padding: 8 },
    headerTitle: {  fontSize: 17, fontWeight: '700', color: '#0F172A', textAlign: 'center', marginHorizontal: 8 },
    headerActions: {
        position: "absolute",
        right: 20,
        bottom: 12,
        zIndex: 20, flexDirection: 'row', alignItems: 'center', gap: 16 },
    actionIcon: { padding: 4 },
    webview: { flex: 1, backgroundColor: 'transparent' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    modalContent: { backgroundColor: '#FFFFFF', width: '100%', maxWidth: 340, borderRadius: 16, padding: 24, alignItems: 'stretch' },
    modalTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A', textAlign: 'center', marginBottom: 8 },
    modalSubtitle: { fontSize: 14, color: '#64748B', textAlign: 'center', marginBottom: 24 },
    modalOption: { backgroundColor: '#F1F5F9', paddingVertical: 14, borderRadius: 8, alignItems: 'center', marginBottom: 12 },
    modalOptionText: { fontSize: 16, fontWeight: '600', color: '#0F172A' },
    modalOptionExcel: { backgroundColor: '#ECFDF5' },
    modalOptionExcelText: { color: '#047857' },
    modalCancel: { paddingVertical: 14, alignItems: 'center', marginTop: 8 },
    modalCancelText: { fontSize: 16, fontWeight: '600', color: '#64748B' },
});
