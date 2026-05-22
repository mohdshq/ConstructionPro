import DateTimePicker from '@react-native-community/datetimepicker';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Camera, ChevronDown, Eye, EyeOff, Plus, Save, Trash2, Sparkles } from "lucide-react-native";
import BackButton from "../../../../components/BackButton";
import { createElement, useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { DailyReportData, ReportType, useProjectsStore } from '../../../../store/projectsStore';
import { useThemeColors } from '../../../../store/useThemeColors';
import { useStore } from '../../../../store/useStore';
import { useAuthStore } from '../../../../store/useAuthStore';
import { uploadPhoto } from '../../../../lib/supabaseSync';
import { supabase } from '../../../../lib/supabase';
import { ActivityIndicator } from 'react-native';

export default function CreateReportScreen() {
    const { colors } = useThemeColors();
    const { id, type, editId, duplicateId } = useLocalSearchParams<{ id: string, type: ReportType, editId?: string, duplicateId?: string }>();
    const router = useRouter();
    const { addReport, updateReport, getProject, getReportsForProject, getReport } = useProjectsStore();
    const { units } = useStore();
    const isMetric = units === 'metric';

    const [author, setAuthor] = useState('');
    const [formData, setFormData] = useState<any>({});
    const [activeSection, setActiveSection] = useState<string | null>('generalDaily');
    const [snagFilterSystem, setSnagFilterSystem] = useState<string>('All');
    const [snagFilterSeverity, setSnagFilterSeverity] = useState<string>('All');
    const [snagFilterStatus, setSnagFilterStatus] = useState<string>('All');
    const [snagFilterContractor, setSnagFilterContractor] = useState<string>('All');
    const [snagFilterLevel, setSnagFilterLevel] = useState<string>('All');
    const [activeDatePicker, setActiveDatePicker] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isAutoSnagging, setIsAutoSnagging] = useState(false);
    const userId = useAuthStore((s) => s.user?.id);

    useEffect(() => {
        const project = getProject(id);

        // Handle Edit or Duplicate Pre-fill
        if (editId || duplicateId) {
            const targetId = editId || duplicateId;
            const existing = getReport(targetId as string);
            if (existing && existing.templateData) {
                try {
                    const parsed = JSON.parse(existing.templateData);
                    setFormData(parsed);
                    if (editId) {
                        setAuthor(existing.author);
                    }
                    return; // Skip default init
                } catch (e) { }
            }
        }

        if (type === 'daily') {
            const existingReports = getReportsForProject(id);
            const lastDaily = existingReports.find(r => r.type === 'daily');

            let preload: {
                logos: string[];
                mainContractorStaff: any[];
                subcontractorStaff: any[];
                equipment: any[];
                mainContractorLabor: any[];
                subcontractorLabor: any[];
                nightShift: any[];
                activitiesProgress: any[];
                areasOfConcern: any[];
            } = {
                logos: [], mainContractorStaff: [], subcontractorStaff: [], equipment: [],
                mainContractorLabor: [], subcontractorLabor: [], nightShift: [], activitiesProgress: [], areasOfConcern: []
            };

            if (lastDaily && lastDaily.templateData) {
                try {
                    const old = JSON.parse(lastDaily.templateData) as DailyReportData;
                    preload.logos = old.logos || [];
                    preload.mainContractorStaff = old.mainContractorStaff || [];
                    preload.subcontractorStaff = old.subcontractorStaff || [];
                    preload.equipment = old.equipment || [];
                    preload.mainContractorLabor = old.mainContractorLabor || [];
                    preload.subcontractorLabor = old.subcontractorLabor || [];
                    preload.nightShift = old.nightShift || [];
                    preload.areasOfConcern = old.areasOfConcern || [];

                    if (old.activitiesProgress) {
                        preload.activitiesProgress = old.activitiesProgress.map((act: any) => {
                            const p = Number(act.prevQty) || 0;
                            const t = Number(act.todayQty) || 0;
                            const newPrev = p + t;
                            const total = Number(act.totalQty) || 0;
                            const balance = total > 0 ? Math.max(0, total - newPrev) : 0;

                            return {
                                ...act,
                                prevQty: newPrev.toString(),
                                todayQty: '',
                                balanceQty: balance.toString()
                            };
                        });
                    }
                } catch (e) { }
            }

            setFormData({
                // Meta pre-filled from project
                commencementDate: project?.startDate || '',
                completionDate: project?.endDate || '',
                anticipatedCompletionDate: '',
                climateHumidity: '', climateVisibility: '', climateTemp: '', climateWindSpeed: '',
                manpowerMainContractor: '', manpowerSubcontractors: '', manpowerOthers: '', manpowerTotal: '',

                // Arrays
                ...preload,
                photos: []
            });
        } else if (type === 'snagging') {
            const existingReports = getReportsForProject(id);
            const lastSnag = existingReports.find(r => r.type === 'snagging');

            let preloadSnag: any = {};
            if (lastSnag && lastSnag.templateData) {
                try {
                    const oldSnag = JSON.parse(lastSnag.templateData);
                    preloadSnag = {
                        inspectionCompany: oldSnag.inspectionCompany || '',
                        inspectorName: oldSnag.inspectorName || '',
                        officeDetails: oldSnag.officeDetails || '',
                        contactDetails: oldSnag.contactDetails || '',
                        email: oldSnag.email || '',
                        propertyType: oldSnag.propertyType || 'Apartment',
                        propertyName: oldSnag.propertyName || '',
                        propertyAddress: oldSnag.propertyAddress || '',
                        city: oldSnag.city || '',
                        zoning: oldSnag.zoning || '',
                        constructionType: oldSnag.constructionType || '',
                        propertySize: oldSnag.propertySize || '',
                        buildingName: oldSnag.buildingName || '',
                        floorLevel: oldSnag.floorLevel || '',
                        apartmentNumber: oldSnag.apartmentNumber || '',
                        waterProvider: oldSnag.waterProvider || '',
                        sanitaryProvider: oldSnag.sanitaryProvider || '',
                        electricityProvider: oldSnag.electricityProvider || ''
                    };
                } catch (e) { }
            }

            setFormData({
                inspectionDate: new Date().toISOString().split('T')[0],
                inspectionCompany: preloadSnag.inspectionCompany || '',
                inspectorName: preloadSnag.inspectorName || '',
                officeDetails: preloadSnag.officeDetails || '',
                contactDetails: preloadSnag.contactDetails || '',
                email: preloadSnag.email || '',
                
                propertyType: preloadSnag.propertyType || 'Apartment',
                propertyName: preloadSnag.propertyName || project?.name || '',
                propertyAddress: preloadSnag.propertyAddress || project?.location || '',
                city: preloadSnag.city || '',
                zoning: preloadSnag.zoning || '',
                constructionType: preloadSnag.constructionType || '',
                propertySize: preloadSnag.propertySize || '',
                buildingName: preloadSnag.buildingName || '',
                floorLevel: preloadSnag.floorLevel || '',
                apartmentNumber: preloadSnag.apartmentNumber || '',

                waterProvider: preloadSnag.waterProvider || '',
                sanitaryProvider: preloadSnag.sanitaryProvider || '',
                electricityProvider: preloadSnag.electricityProvider || '',
                
                pcaMainPhotoUri: '',
                snags: []
            });
        } else if (type === 'hse') {
            const defaultHSEChecklist = [
                { id: '1', category: 'Site Access & Security', item: 'Site perimeter secure and signage displayed', status: 'N/A', notes: '' },
                { id: '2', category: 'Site Access & Security', item: 'All personnel inducted and signed in', status: 'N/A', notes: '' },
                { id: '3', category: 'PPE Compliance', item: 'Hard hats worn in designated areas', status: 'N/A', notes: '' },
                { id: '4', category: 'PPE Compliance', item: 'High-visibility clothing worn by all staff', status: 'N/A', notes: '' },
                { id: '5', category: 'PPE Compliance', item: 'Appropriate safety footwear worn', status: 'N/A', notes: '' },
                { id: '6', category: 'Working at Heights', item: 'Scaffolding tagged and inspected within 7 days', status: 'N/A', notes: '' },
                { id: '7', category: 'Working at Heights', item: 'Harnesses worn and tied off above 2 meters', status: 'N/A', notes: '' },
                { id: '8', category: 'Working at Heights', item: 'Edge protection in place and secure', status: 'N/A', notes: '' },
                { id: '9', category: 'Electrical Safety', item: 'All cables elevated off the ground / safely routed', status: 'N/A', notes: '' },
                { id: '10', category: 'Electrical Safety', item: 'Temporary boards secured, covered, and inspected', status: 'N/A', notes: '' },
                { id: '11', category: 'Plant & Equipment', item: 'Daily pre-start checks completed by operators', status: 'N/A', notes: '' },
                { id: '12', category: 'Excavations', item: 'Excavations battered, shored, or properly fenced', status: 'N/A', notes: '' },
                { id: '13', category: 'Fire Safety', item: 'Extinguishers available, inspected, and unobstructed', status: 'N/A', notes: '' },
                { id: '14', category: 'Housekeeping', item: 'Walkways clear of trip hazards and debris', status: 'N/A', notes: '' },
                { id: '15', category: 'Hazardous Materials', item: 'Chemicals stored correctly (COSHH compliance)', status: 'N/A', notes: '' },
                { id: '16', category: 'First Aid & Welfare', item: 'First aid kits fully stocked and accessible', status: 'N/A', notes: '' },
            ];
            
            setFormData({
                inspectionDate: new Date().toISOString().split('T')[0],
                inspectorName: '',
                weatherConditions: '',
                totalManHours: '',
                checklists: defaultHSEChecklist,
                incidents: [],
                trainings: [],
                generalObservations: '',
                correctiveActions: '',
                photos: []
            });
        }
    }, [type, id, editId, duplicateId]);

    // Auto Calculate Main Contractor Manpower (Reactive to array changes, allowing manual override)
    useEffect(() => {
        if (type === 'daily' && formData.mainContractorStaff && formData.mainContractorLabor) {
            const staffCount = formData.mainContractorStaff.reduce((acc: number, curr: any) => acc + (Number(curr.count) || 0), 0);
            const laborCount = formData.mainContractorLabor.reduce((acc: number, curr: any) => acc + (Number(curr.total) || 0), 0);
            const sum = staffCount + laborCount;
            if (sum > 0) setFormData((prev: any) => ({ ...prev, manpowerMainContractor: sum.toString() }));
        }
    }, [JSON.stringify(formData.mainContractorStaff), JSON.stringify(formData.mainContractorLabor), type]);

    // Auto Calculate Subcontractors Manpower
    useEffect(() => {
        if (type === 'daily' && formData.subcontractorStaff && formData.subcontractorLabor) {
            const staffCount = formData.subcontractorStaff.reduce((acc: number, curr: any) => acc + (Number(curr.count) || 0), 0);
            const laborCount = formData.subcontractorLabor.reduce((acc: number, curr: any) => acc + (Number(curr.count) || 0), 0);
            const sum = staffCount + laborCount;
            if (sum > 0) setFormData((prev: any) => ({ ...prev, manpowerSubcontractors: sum.toString() }));
        }
    }, [JSON.stringify(formData.subcontractorStaff), JSON.stringify(formData.subcontractorLabor), type]);

    // Auto Calculate Others Manpower (Night Shift)
    useEffect(() => {
        if (type === 'daily' && formData.nightShift) {
            const nightCount = formData.nightShift.reduce((acc: number, curr: any) => acc + (Number(curr.count) || 0), 0);
            if (nightCount > 0) setFormData((prev: any) => ({ ...prev, manpowerOthers: nightCount.toString() }));
        }
    }, [JSON.stringify(formData.nightShift), type]);

    // Auto-calculate Grand Total for Manpower
    useEffect(() => {
        if (type === 'daily' && formData) {
            const g = Number(formData.manpowerMainContractor) || 0;
            const f = Number(formData.manpowerSubcontractors) || 0;
            const o = Number(formData.manpowerOthers) || 0;
            const sum = g + f + o;

            if (sum > 0 && formData.manpowerTotal !== sum.toString()) {
                setFormData((prev: any) => ({ ...prev, manpowerTotal: sum.toString() }));
            }
        }
    }, [formData.manpowerMainContractor, formData.manpowerSubcontractors, formData.manpowerOthers, type]);

    // Auto-calculate Totals for Main Contractor Labor
    useEffect(() => {
        if (type === 'daily' && formData.mainContractorLabor) {
            const updatedLabor = formData.mainContractorLabor.map((item: any) => {
                const inHouse = Number(item.inHouse) || 0;
                const supply = Number(item.supply) || 0;
                const newTotal = (inHouse + supply).toString();
                if (item.total !== newTotal) {
                    return { ...item, total: newTotal };
                }
                return item;
            });
            // Only update if there are actual changes to avoid infinite loop
            if (JSON.stringify(updatedLabor) !== JSON.stringify(formData.mainContractorLabor)) {
                setFormData((prev: any) => ({ ...prev, mainContractorLabor: updatedLabor }));
            }
        }
    }, [formData.mainContractorLabor, type]);

    if (!type || !id || !formData) return null;

    const pickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsMultipleSelection: true,
            aspect: [4, 3],
            quality: 0.7,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            const newUris = result.assets.map(a => a.uri);
            setFormData({ ...formData, photos: [...(formData.photos || []), ...newUris] });
        }
    };

    const handleSave = async () => {
        console.log('[handleSave] called, author:', JSON.stringify(author), 'isSaving:', isSaving);
        if (!author.trim() || isSaving) {
            console.log('[handleSave] blocked: author empty or already saving');
            return;
        }

        setIsSaving(true);
        try {
            // Upload photos to Supabase Storage (replace local URIs with storage paths)
            let finalFormData = { ...formData };

            if (userId && finalFormData.photos && finalFormData.photos.length > 0) {
                const uploadedPhotos: any[] = [];
                for (const photoItem of finalFormData.photos) {
                    // Photos can be strings or {uri, caption} objects
                    const photoUri = typeof photoItem === 'string' ? photoItem : photoItem?.uri;
                    const caption = typeof photoItem === 'string' ? '' : (photoItem?.caption || '');

                    if (!photoUri) {
                        uploadedPhotos.push(photoItem);
                        continue;
                    }

                    // Skip already-uploaded paths (storage paths don't start with file:// or content://)
                    if (!photoUri.startsWith('file://') && !photoUri.startsWith('content://') && !photoUri.startsWith('data:') && !photoUri.startsWith('/')) {
                        uploadedPhotos.push(caption ? { uri: photoUri, caption } : photoUri);
                        continue;
                    }
                    try {
                        const storagePath = await uploadPhoto(
                            'report-photos',
                            userId,
                            photoUri,
                            { projectId: id, prefix: type }
                        );
                        uploadedPhotos.push(caption ? { uri: storagePath, caption } : storagePath);
                    } catch (uploadError) {
                        console.error('Failed to upload photo:', uploadError);
                        // Keep original as fallback
                        uploadedPhotos.push(photoItem);
                    }
                }
                finalFormData = { ...finalFormData, photos: uploadedPhotos };
            }

            console.log('[handleSave] projectId:', id, 'type:', type, 'editId:', editId);

            if (editId) {
                await updateReport(editId, {
                    author: author.trim(),
                    templateData: JSON.stringify(finalFormData),
                });
                console.log('[handleSave] report updated:', editId);
            } else {
                await addReport({
                    projectId: id,
                    type: type,
                    date: new Date().toISOString(),
                    author: author.trim(),
                    templateData: JSON.stringify(finalFormData),
                    status: 'draft'
                });
                console.log('[handleSave] report added successfully');
            }
            
            // Haptic feedback on success
            if (Platform.OS !== 'web') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }

            router.back();
        } catch (error: any) {
            console.error('Error saving report:', error);
            if (Platform.OS === 'web') {
                window.alert(`Failed to save report: ${error?.message || 'Unknown error'}`);
            }
        } finally {
            setIsSaving(false);
        }
    };

    const getHeaderTitle = () => {
        const prefix = editId ? 'Edit' : 'New';
        switch (type) {
            case 'daily': return editId ? 'Edit Daily Report' : 'Daily Progress Report';
            case 'snagging': return `${prefix} Snagging List Item`;
            case 'hse': return `${prefix} HSE Safety Audit`;
            default: return `${prefix} Report`;
        }
    };

    const toggleSectionVisibility = (sectionId: string) => {
        const hidden = formData.hiddenSections || [];
        if (hidden.includes(sectionId)) {
            setFormData({ ...formData, hiddenSections: hidden.filter((h: string) => h !== sectionId) });
        } else {
            setFormData({ ...formData, hiddenSections: [...hidden, sectionId] });
        }
    };

    const AccordionHeader = ({ title, id, allowHide = false }: { title: string, id: string, allowHide?: boolean }) => {
        const isHidden = formData.hiddenSections?.includes(id);
        return (
            <TouchableOpacity
                style={[styles.accordionHeader, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => setActiveSection(activeSection === id ? null : id)}
                activeOpacity={0.7}
            >
                <View style={{ flex: 1 }}>
                    <Text style={[styles.accordionTitle, isHidden && { color: '#94A3B8' }]}>
                        {title}
                        {isHidden && <Text style={{ fontSize: 13, fontWeight: '500', color: '#EF4444' }}> (Hidden from report)</Text>}
                    </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    {allowHide && (
                        <TouchableOpacity
                            onPress={(e) => { e.stopPropagation(); toggleSectionVisibility(id); }}
                            style={{ padding: 4 }}
                        >
                            {isHidden ? <EyeOff size={20} color="#EF4444" /> : <Eye size={20} color="#64748B" />}
                        </TouchableOpacity>
                    )}
                    <ChevronDown size={20} color="#64748B" style={{ transform: [{ rotate: activeSection === id ? '180deg' : '0deg' }] }} />
                </View>
            </TouchableOpacity>
        );
    };

    const handleAutoSnag = async () => {
        try {
            let result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'], quality: 0.6, base64: true, allowsMultipleSelection: false,
            });
            
            if (result.canceled || !result.assets || result.assets.length === 0) return;
            
            setIsAutoSnagging(true);
            const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
            
            const { data, error } = await supabase.functions.invoke('ai-snag-from-photo', {
                body: { base64Image, context: formData.propertyType || project?.name }
            });
            
            if (error) throw error;
            if (data?.error) throw new Error(data.error);
            
            const snagResult = data?.snag || {};
            
            // Add new snag to form
            setFormData({
                ...formData,
                snags: [...(formData.snags || []), {
                    id: Date.now().toString(),
                    system: snagResult.system || '',
                    assetName: snagResult.assetName || '',
                    location: '', level: '', room: '',
                    issue: snagResult.issue || '',
                    recommendation: snagResult.recommendation || '',
                    severity: snagResult.severity || 'Moderate',
                    contractor: '', targetDate: '', status: 'Pending', reinspectionNotes: '',
                    photoUri: base64Image
                }]
            });
            
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error: any) {
            console.error('Auto-Snag Error:', error);
            alert(`AI Snagging Failed: ${error.message || 'Unknown error'}`);
        } finally {
            setIsAutoSnagging(false);
        }
    };

    const renderDailyFields = () => (
        <>
            {/* 1. Meta Dates & Weather */}
            <AccordionHeader title="General Data & Weather" id="generalDaily" />
            {activeSection === 'generalDaily' && (
                <Animated.View entering={FadeIn} style={[styles.accordionContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.label, { color: colors.text }, { color: colors.text }]}>Commencement Date</Text>
                    {Platform.OS === 'web' ? createElement('input', {
                        type: 'date', value: formData.commencementDate, onChange: (e: any) => setFormData({ ...formData, commencementDate: e.target.value }),
                        style: { padding: 14, borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 15, fontFamily: 'inherit', color: '#0F172A', backgroundColor: '#F8FAFC', width: '100%', boxSizing: 'border-box' }
                    }) : 
<><TouchableOpacity onPress={() => setActiveDatePicker('commencementDate')} style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border }, { justifyContent: 'center' }]}>
    <Text style={{ color: formData.commencementDate ? colors.text : (colors.text + '80') }}>{formData.commencementDate || 'YYYY-MM-DD'}</Text>
</TouchableOpacity>
{activeDatePicker === 'commencementDate' && (
    <View style={{ backgroundColor: Platform.OS === 'ios' ? '#F8FAFC' : 'transparent', borderRadius: 12, overflow: 'hidden', marginTop: 12 }}>
        <DateTimePicker
            value={formData.commencementDate ? new Date(formData.commencementDate) : new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            onChange={(event: any, selectedDate?: Date) => {
                if (Platform.OS === 'android') setActiveDatePicker(null);
                if (selectedDate) setFormData({ ...formData, commencementDate: selectedDate.toISOString().split('T')[0] });
            }}
        />
        {Platform.OS === 'ios' && (
            <TouchableOpacity style={{ backgroundColor: '#2563EB', padding: 12, alignItems: 'center' }} onPress={() => setActiveDatePicker(null)}>
                <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>Done</Text>
            </TouchableOpacity>
        )}
    </View>
)}
</>}

                    <Text style={[styles.label, { color: colors.text }, { marginTop: 12 }]}>Completion Date</Text>
                    {Platform.OS === 'web' ? createElement('input', {
                        type: 'date', value: formData.completionDate, onChange: (e: any) => setFormData({ ...formData, completionDate: e.target.value }),
                        style: { padding: 14, borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 15, fontFamily: 'inherit', color: '#0F172A', backgroundColor: '#F8FAFC', width: '100%', boxSizing: 'border-box' }
                    }) : 
<><TouchableOpacity onPress={() => setActiveDatePicker('completionDate')} style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border }, { justifyContent: 'center' }]}>
    <Text style={{ color: formData.completionDate ? colors.text : (colors.text + '80') }}>{formData.completionDate || 'YYYY-MM-DD'}</Text>
</TouchableOpacity>
{activeDatePicker === 'completionDate' && (
    <View style={{ backgroundColor: Platform.OS === 'ios' ? '#F8FAFC' : 'transparent', borderRadius: 12, overflow: 'hidden', marginTop: 12 }}>
        <DateTimePicker
            value={formData.completionDate ? new Date(formData.completionDate) : new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            onChange={(event: any, selectedDate?: Date) => {
                if (Platform.OS === 'android') setActiveDatePicker(null);
                if (selectedDate) setFormData({ ...formData, completionDate: selectedDate.toISOString().split('T')[0] });
            }}
        />
        {Platform.OS === 'ios' && (
            <TouchableOpacity style={{ backgroundColor: '#2563EB', padding: 12, alignItems: 'center' }} onPress={() => setActiveDatePicker(null)}>
                <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>Done</Text>
            </TouchableOpacity>
        )}
    </View>
)}
</>}

                    <Text style={[styles.label, { color: colors.text }, { marginTop: 12 }]}>Anticipated Completion</Text>
                    {Platform.OS === 'web' ? createElement('input', {
                        type: 'date', value: formData.anticipatedCompletionDate, onChange: (e: any) => setFormData({ ...formData, anticipatedCompletionDate: e.target.value }),
                        style: { padding: 14, borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 15, fontFamily: 'inherit', color: '#0F172A', backgroundColor: '#F8FAFC', width: '100%', boxSizing: 'border-box' }
                    }) : 
<><TouchableOpacity onPress={() => setActiveDatePicker('anticipatedCompletionDate')} style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border }, { justifyContent: 'center' }]}>
    <Text style={{ color: formData.anticipatedCompletionDate ? colors.text : (colors.text + '80') }}>{formData.anticipatedCompletionDate || 'YYYY-MM-DD'}</Text>
</TouchableOpacity>
{activeDatePicker === 'anticipatedCompletionDate' && (
    <View style={{ backgroundColor: Platform.OS === 'ios' ? '#F8FAFC' : 'transparent', borderRadius: 12, overflow: 'hidden', marginTop: 12 }}>
        <DateTimePicker
            value={formData.anticipatedCompletionDate ? new Date(formData.anticipatedCompletionDate) : new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            onChange={(event: any, selectedDate?: Date) => {
                if (Platform.OS === 'android') setActiveDatePicker(null);
                if (selectedDate) setFormData({ ...formData, anticipatedCompletionDate: selectedDate.toISOString().split('T')[0] });
            }}
        />
        {Platform.OS === 'ios' && (
            <TouchableOpacity style={{ backgroundColor: '#2563EB', padding: 12, alignItems: 'center' }} onPress={() => setActiveDatePicker(null)}>
                <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>Done</Text>
            </TouchableOpacity>
        )}
    </View>
)}
</>}

                    <View style={[styles.divider, { backgroundColor: colors.border }]} />
                    <Text style={[styles.sectionHeading, { color: colors.text }]}>Weather Profile</Text>

                    <View style={styles.metricsRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.label, { color: colors.text }, { color: colors.text }]}>Humidity (%)</Text>
                            <TextInput placeholderTextColor={colors.text + '80'} style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]} placeholder="47%" value={formData.climateHumidity} onChangeText={t => setFormData({ ...formData, climateHumidity: t })} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.label, { color: colors.text }, { color: colors.text }]}>Temp ({isMetric ? '°C' : '°F'})</Text>
                            <TextInput placeholderTextColor={colors.text + '80'} style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]} placeholder={isMetric ? "36" : "96"} value={formData.climateTemp} onChangeText={t => setFormData({ ...formData, climateTemp: t })} />
                        </View>
                    </View>
                    <View style={[styles.metricsRow, { marginTop: 12 }]}>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.label, { color: colors.text }, { color: colors.text }]}>Visibility ({isMetric ? 'KM' : 'Miles'})</Text>
                            <TextInput placeholderTextColor={colors.text + '80'} style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]} placeholder={isMetric ? "8" : "5"} value={formData.climateVisibility} onChangeText={t => setFormData({ ...formData, climateVisibility: t })} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.label, { color: colors.text }, { color: colors.text }]}>Wind ({isMetric ? 'KM/H' : 'MPH'})</Text>
                            <TextInput placeholderTextColor={colors.text + '80'} style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]} placeholder={isMetric ? "22" : "14"} value={formData.climateWindSpeed} onChangeText={t => setFormData({ ...formData, climateWindSpeed: t })} />
                        </View>
                    </View>
                </Animated.View>
            )}

            {/* 2. Manpower Summary */}
            <AccordionHeader title="Manpower Summary" id="manpowerMeta" />
            {activeSection === 'manpowerMeta' && (
                <Animated.View entering={FadeIn} style={[styles.accordionContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.label, { color: colors.text }, { color: colors.text }]}>Main Contractor Manpower</Text>
                    <TextInput placeholderTextColor={colors.text + '80'} style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]} keyboardType="numeric" placeholder="e.g. 489" value={formData.manpowerMainContractor} onChangeText={t => setFormData({ ...formData, manpowerMainContractor: t })} />
                    <Text style={[styles.label, { color: colors.text }, { marginTop: 12 }]}>Subcontractors Manpower</Text>
                    <TextInput placeholderTextColor={colors.text + '80'} style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]} keyboardType="numeric" placeholder="e.g. 175" value={formData.manpowerSubcontractors} onChangeText={t => setFormData({ ...formData, manpowerSubcontractors: t })} />
                    <Text style={[styles.label, { color: colors.text }, { marginTop: 12 }]}>Others</Text>
                    <TextInput placeholderTextColor={colors.text + '80'} style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]} keyboardType="numeric" placeholder="e.g. 68" value={formData.manpowerOthers} onChangeText={t => setFormData({ ...formData, manpowerOthers: t })} />
                    <Text style={[styles.label, { color: colors.text }, { marginTop: 12 }]}>Grand Total</Text>
                    <TextInput placeholderTextColor={colors.text + '80'} style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE', fontWeight: 'bold' }]} keyboardType="numeric" placeholder="e.g. 732" value={formData.manpowerTotal} onChangeText={t => setFormData({ ...formData, manpowerTotal: t })} />
                </Animated.View>
            )}

            {/* Project Logos */}
            <AccordionHeader title="Project Logos / Header Images" id="logos" />
            {activeSection === 'logos' && (
                <Animated.View entering={FadeIn} style={[styles.accordionContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.label, { color: colors.text }, { color: colors.text }]}>Select up to 4 logos to display in the header</Text>
                    <View style={styles.photoGrid}>
                        {formData.logos && formData.logos.map((uri: string, index: number) => (
                            <View key={`logo-${index}`} style={styles.photoWrapper}>
                                <Image source={{ uri }} style={{ width: '100%', height: '100%', backgroundColor: '#FFFFFF' }} contentFit="contain" />
                                <TouchableOpacity style={styles.removePhotoBtn} onPress={() => {
                                    setFormData({ ...formData, logos: formData.logos.filter((_: any, i: number) => i !== index) });
                                }}>
                                    <Trash2 size={16} color="#FFFFFF" />
                                </TouchableOpacity>
                            </View>
                        ))}
                        {(formData.logos?.length || 0) < 4 && (
                            <TouchableOpacity style={styles.addPhotoTile} onPress={async () => {
                                let result = await ImagePicker.launchImageLibraryAsync({
                                    mediaTypes: ['images'], quality: 0.6, base64: true, allowsMultipleSelection: true,
                                });
                                if (!result.canceled && result.assets && result.assets.length > 0) {
                                    const newLogos = result.assets.map(a => `data:image/jpeg;base64,${a.base64}`);
                                    setFormData({ ...formData, logos: [...(formData.logos || []), ...newLogos].slice(0, 4) });
                                }
                            }}>
                                <Camera size={28} color="#64748B" />
                                <Text style={styles.addPhotoTileText}>Add Logo</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </Animated.View>
            )}

            {/* 3. Main Contractor Staff Array */}
            <AccordionHeader title="1. Main Contractor Staff" id="mcStaff" allowHide={true} />
            {activeSection === 'mcStaff' && (
                <Animated.View entering={FadeIn} style={[styles.accordionContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    {formData.mainContractorStaff?.map((item: any, i: number) => (
                        <View key={item.id} style={[styles.arrayItemCard, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                            <View style={styles.arrayRow}>
                                <TextInput placeholderTextColor={colors.text + '80'} style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }, { flex: 3 }]} placeholder="Description / Role" value={item.description} onChangeText={t => {
                                    const newArr = [...formData.mainContractorStaff]; newArr[i].description = t; setFormData({ ...formData, mainContractorStaff: newArr });
                                }} />
                                <TextInput placeholderTextColor={colors.text + '80'} style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }, { flex: 1, marginLeft: 8 }]} placeholder="Nos" keyboardType="numeric" value={item.count} onChangeText={t => {
                                    const newArr = [...formData.mainContractorStaff]; newArr[i].count = t; setFormData({ ...formData, mainContractorStaff: newArr });
                                }} />
                                <TouchableOpacity style={styles.deleteBtn} onPress={() => setFormData({ ...formData, mainContractorStaff: formData.mainContractorStaff.filter((_: any, idx: number) => idx !== i) })}>
                                    <Trash2 size={18} color="#EF4444" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))}
                    <TouchableOpacity style={styles.addButton} onPress={() => setFormData({ ...formData, mainContractorStaff: [...(formData.mainContractorStaff || []), { id: Date.now().toString(), description: '', count: '' }] })}>
                        <Plus size={16} color="#2563EB" style={{ marginRight: 6 }} />
                        <Text style={styles.addBtnText}>Add Staff Member</Text>
                    </TouchableOpacity>
                </Animated.View>
            )
            }

            {/* 5. Subcontractor's Staff Array */}
            <AccordionHeader title="3. Subcontractor's Staff" id="subconStaff" allowHide={true} />
            {
                activeSection === 'subconStaff' && (
                    <Animated.View entering={FadeIn} style={[styles.accordionContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        {formData.subcontractorStaff?.map((item: any, i: number) => (
                            <View key={item.id} style={[styles.arrayItemCard, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                                <View style={styles.arrayRow}>
                                    <TextInput placeholderTextColor={colors.text + '80'} style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }, { flex: 3 }]} placeholder="Name" value={item.name} onChangeText={t => {
                                        const newArr = [...formData.subcontractorStaff]; newArr[i].name = t; setFormData({ ...formData, subcontractorStaff: newArr });
                                    }} />
                                    <TextInput placeholderTextColor={colors.text + '80'} style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }, { flex: 1, marginLeft: 8 }]} placeholder="Nos" keyboardType="numeric" value={item.count} onChangeText={t => {
                                        const newArr = [...formData.subcontractorStaff]; newArr[i].count = t; setFormData({ ...formData, subcontractorStaff: newArr });
                                    }} />
                                    <TouchableOpacity style={styles.deleteBtn} onPress={() => setFormData({ ...formData, subcontractorStaff: formData.subcontractorStaff.filter((_: any, idx: number) => idx !== i) })}>
                                        <Trash2 size={18} color="#EF4444" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))}
                        <TouchableOpacity style={styles.addButton} onPress={() => setFormData({ ...formData, subcontractorStaff: [...(formData.subcontractorStaff || []), { id: Date.now().toString(), name: '', count: '' }] })}>
                            <Plus size={16} color="#2563EB" style={{ marginRight: 6 }} />
                            <Text style={styles.addBtnText}>Add Subcon Staff</Text>
                        </TouchableOpacity>
                    </Animated.View>
                )
            }

            {/* 6. Equipment Array */}
            <AccordionHeader title="4. Equipment & Vehicles" id="equip" allowHide={true} />
            {
                activeSection === 'equip' && (
                    <Animated.View entering={FadeIn} style={[styles.accordionContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        {formData.equipment?.map((item: any, i: number) => (
                            <View key={item.id} style={[styles.arrayItemCard, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                                <View style={styles.arrayRow}>
                                    <TextInput placeholderTextColor={colors.text + '80'} style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }, { flex: 3 }]} placeholder="Equipment Description" value={item.description} onChangeText={t => {
                                        const newArr = [...formData.equipment]; newArr[i].description = t; setFormData({ ...formData, equipment: newArr });
                                    }} />
                                    <TextInput placeholderTextColor={colors.text + '80'} style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }, { flex: 1, marginLeft: 8 }]} placeholder="Nos" keyboardType="numeric" value={item.count} onChangeText={t => {
                                        const newArr = [...formData.equipment]; newArr[i].count = t; setFormData({ ...formData, equipment: newArr });
                                    }} />
                                    <TouchableOpacity style={styles.deleteBtn} onPress={() => setFormData({ ...formData, equipment: formData.equipment.filter((_: any, idx: number) => idx !== i) })}>
                                        <Trash2 size={18} color="#EF4444" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))}
                        <TouchableOpacity style={styles.addButton} onPress={() => setFormData({ ...formData, equipment: [...(formData.equipment || []), { id: Date.now().toString(), description: '', count: '' }] })}>
                            <Plus size={16} color="#2563EB" style={{ marginRight: 6 }} />
                            <Text style={styles.addBtnText}>Add Equipment</Text>
                        </TouchableOpacity>
                    </Animated.View>
                )
            }

            {/* 7. Main Contractor Labor Array */}
            <AccordionHeader title="5. Main Contractor Labor" id="labor" allowHide={true} />
            {
                activeSection === 'labor' && (
                    <Animated.View entering={FadeIn} style={[styles.accordionContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        {formData.mainContractorLabor?.map((item: any, i: number) => (
                            <View key={item.id} style={[styles.arrayItemCard, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                                <TextInput placeholderTextColor={colors.text + '80'} style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }, { marginBottom: 8 }]} placeholder="Trade (e.g. Mason)" value={item.trade} onChangeText={t => {
                                    const newArr = [...formData.mainContractorLabor]; newArr[i].trade = t; setFormData({ ...formData, mainContractorLabor: newArr });
                                }} />
                                <View style={styles.arrayRow}>
                                    <TextInput placeholderTextColor={colors.text + '80'} style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }, { flex: 1 }]} placeholder="In House" keyboardType="numeric" value={item.inHouse} onChangeText={t => {
                                        const newArr = [...formData.mainContractorLabor]; newArr[i].inHouse = t;
                                        newArr[i].total = ((Number(t) || 0) + (Number(newArr[i].supply) || 0)).toString();
                                        setFormData({ ...formData, mainContractorLabor: newArr });
                                    }} />
                                    <TextInput placeholderTextColor={colors.text + '80'} style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }, { flex: 1, marginLeft: 8 }]} placeholder="Supply" keyboardType="numeric" value={item.supply} onChangeText={t => {
                                        const newArr = [...formData.mainContractorLabor]; newArr[i].supply = t;
                                        newArr[i].total = ((Number(newArr[i].inHouse) || 0) + (Number(t) || 0)).toString();
                                        setFormData({ ...formData, mainContractorLabor: newArr });
                                    }} />
                                    <TextInput placeholderTextColor={colors.text + '80'} style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }, { flex: 1, marginLeft: 8, backgroundColor: '#EFF6FF', fontWeight: 'bold' as const }]} placeholder="Total" keyboardType="numeric" value={item.total} editable={false} />
                                    <TouchableOpacity style={styles.deleteBtn} onPress={() => setFormData({ ...formData, mainContractorLabor: formData.mainContractorLabor.filter((_: any, idx: number) => idx !== i) })}>
                                        <Trash2 size={18} color="#EF4444" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))}
                        <TouchableOpacity style={styles.addButton} onPress={() => setFormData({ ...formData, mainContractorLabor: [...(formData.mainContractorLabor || []), { id: Date.now().toString(), trade: '', inHouse: '', supply: '', total: '' }] })}>
                            <Plus size={16} color="#2563EB" style={{ marginRight: 6 }} />
                            <Text style={styles.addBtnText}>Add Labor</Text>
                        </TouchableOpacity>
                    </Animated.View>
                )
            }

            {/* 8. Subcontractor Labor Array */}
            <AccordionHeader title="6. Subcontractor Labor" id="subconLabor" />
            {
                activeSection === 'subconLabor' && (
                    <Animated.View entering={FadeIn} style={[styles.accordionContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        {formData.subcontractorLabor?.map((item: any, i: number) => (
                            <View key={item.id} style={[styles.arrayItemCard, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                                <View style={styles.arrayRow}>
                                    <TextInput placeholderTextColor={colors.text + '80'} style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }, { flex: 3 }]} placeholder="Subcon Name" value={item.name} onChangeText={t => {
                                        const newArr = [...formData.subcontractorLabor]; newArr[i].name = t; setFormData({ ...formData, subcontractorLabor: newArr });
                                    }} />
                                    <TextInput placeholderTextColor={colors.text + '80'} style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }, { flex: 1, marginLeft: 8 }]} placeholder="Nos" keyboardType="numeric" value={item.count} onChangeText={t => {
                                        const newArr = [...formData.subcontractorLabor]; newArr[i].count = t; setFormData({ ...formData, subcontractorLabor: newArr });
                                    }} />
                                    <TouchableOpacity style={styles.deleteBtn} onPress={() => setFormData({ ...formData, subcontractorLabor: formData.subcontractorLabor.filter((_: any, idx: number) => idx !== i) })}>
                                        <Trash2 size={18} color="#EF4444" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))}
                        <TouchableOpacity style={styles.addButton} onPress={() => setFormData({ ...formData, subcontractorLabor: [...(formData.subcontractorLabor || []), { id: Date.now().toString(), name: '', count: '' }] })}>
                            <Plus size={16} color="#2563EB" style={{ marginRight: 6 }} />
                            <Text style={styles.addBtnText}>Add Subcon Labor</Text>
                        </TouchableOpacity>
                    </Animated.View>
                )
            }

            {/* 9. Night Shift Array */}
            <AccordionHeader title="7. Night Shift Labor" id="nightShift" allowHide={true} />
            {
                activeSection === 'nightShift' && (
                    <Animated.View entering={FadeIn} style={[styles.accordionContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        {formData.nightShift?.map((item: any, i: number) => (
                            <View key={item.id} style={[styles.arrayItemCard, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                                <View style={styles.arrayRow}>
                                    <TextInput placeholderTextColor={colors.text + '80'} style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }, { flex: 3 }]} placeholder="Trade" value={item.trade} onChangeText={t => {
                                        const newArr = [...formData.nightShift]; newArr[i].trade = t; setFormData({ ...formData, nightShift: newArr });
                                    }} />
                                    <TextInput placeholderTextColor={colors.text + '80'} style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }, { flex: 1, marginLeft: 8 }]} placeholder="Nos" keyboardType="numeric" value={item.count} onChangeText={t => {
                                        const newArr = [...formData.nightShift]; newArr[i].count = t; setFormData({ ...formData, nightShift: newArr });
                                    }} />
                                    <TouchableOpacity style={styles.deleteBtn} onPress={() => setFormData({ ...formData, nightShift: formData.nightShift.filter((_: any, idx: number) => idx !== i) })}>
                                        <Trash2 size={18} color="#EF4444" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))}
                        <TouchableOpacity style={styles.addButton} onPress={() => setFormData({ ...formData, nightShift: [...(formData.nightShift || []), { id: Date.now().toString(), trade: '', count: '' }] })}>
                            <Plus size={16} color="#2563EB" style={{ marginRight: 6 }} />
                            <Text style={styles.addBtnText}>Add Night Shift</Text>
                        </TouchableOpacity>
                    </Animated.View>
                )
            }

            {/* 10. On-going Activities Array */}
            <AccordionHeader title="8. On-Going Activities" id="activities" allowHide={true} />
            {
                activeSection === 'activities' && (
                    <Animated.View entering={FadeIn} style={[styles.accordionContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        {formData.activitiesProgress?.map((item: any, i: number) => (
                            <View key={item.id} style={[styles.arrayItemCard, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                                <TextInput placeholderTextColor={colors.text + '80'} style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }, { marginBottom: 8 }]} placeholder="Activity Description" value={item.activityName} onChangeText={t => {
                                    const newArr = [...formData.activitiesProgress]; newArr[i].activityName = t; setFormData({ ...formData, activitiesProgress: newArr });
                                }} />
                                <View style={[styles.arrayRow, { marginBottom: 8 }]}>
                                    <TextInput placeholderTextColor={colors.text + '80'} style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }, { flex: 1 }]} placeholder="Unit (Sqm)" value={item.uom} onChangeText={t => {
                                        const newArr = [...formData.activitiesProgress]; newArr[i].uom = t; setFormData({ ...formData, activitiesProgress: newArr });
                                    }} />
                                    <TextInput placeholderTextColor={colors.text + '80'} style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }, { flex: 1, marginLeft: 8 }]} placeholder="Total Qty" keyboardType="numeric" value={item.totalQty} onChangeText={t => {
                                        const newArr = [...formData.activitiesProgress]; newArr[i].totalQty = t;
                                        const bal = (Number(t) || 0) - ((Number(newArr[i].prevQty) || 0) + (Number(newArr[i].todayQty) || 0));
                                        newArr[i].balanceQty = Math.max(0, bal).toString();
                                        setFormData({ ...formData, activitiesProgress: newArr });
                                    }} />
                                </View>
                                <View style={[styles.arrayRow, { marginBottom: 8 }]}>
                                    <TextInput placeholderTextColor={colors.text + '80'} style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }, { flex: 1 }]} placeholder="Prev. Qty" keyboardType="numeric" value={item.prevQty} onChangeText={t => {
                                        const newArr = [...formData.activitiesProgress]; newArr[i].prevQty = t;
                                        const bal = (Number(newArr[i].totalQty) || 0) - ((Number(t) || 0) + (Number(newArr[i].todayQty) || 0));
                                        newArr[i].balanceQty = Math.max(0, bal).toString();
                                        setFormData({ ...formData, activitiesProgress: newArr });
                                    }} />
                                    <TextInput placeholderTextColor={colors.text + '80'} style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }, { flex: 1, marginLeft: 8 }]} placeholder="Today Qty" keyboardType="numeric" value={item.todayQty} onChangeText={t => {
                                        const newArr = [...formData.activitiesProgress]; newArr[i].todayQty = t;
                                        const bal = (Number(newArr[i].totalQty) || 0) - ((Number(newArr[i].prevQty) || 0) + (Number(t) || 0));
                                        newArr[i].balanceQty = Math.max(0, bal).toString();
                                        setFormData({ ...formData, activitiesProgress: newArr });
                                    }} />
                                </View>
                                <View style={styles.arrayRow}>
                                    <TextInput placeholderTextColor={colors.text + '80'} style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }, { flex: 1, backgroundColor: '#EFF6FF' }]} placeholder="Balance Qty" keyboardType="numeric" value={item.balanceQty} onChangeText={t => {
                                        const newArr = [...formData.activitiesProgress]; newArr[i].balanceQty = t; setFormData({ ...formData, activitiesProgress: newArr });
                                    }} />
                                    <TouchableOpacity style={styles.deleteBtn} onPress={() => setFormData({ ...formData, activitiesProgress: formData.activitiesProgress.filter((_: any, idx: number) => idx !== i) })}>
                                        <Trash2 size={18} color="#EF4444" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))}
                        <TouchableOpacity style={styles.addButton} onPress={() => setFormData({ ...formData, activitiesProgress: [...(formData.activitiesProgress || []), { id: Date.now().toString(), activityName: '', uom: '', totalQty: '', prevQty: '', todayQty: '', balanceQty: '' }] })}>
                            <Plus size={16} color="#2563EB" style={{ marginRight: 6 }} />
                            <Text style={styles.addBtnText}>Add Activity</Text>
                        </TouchableOpacity>
                    </Animated.View>
                )
            }

            {/* 11. Areas of Concern */}
            <AccordionHeader title="9. Areas of Concern" id="concerns" allowHide={true} />
            {
                activeSection === 'concerns' && (
                    <Animated.View entering={FadeIn} style={[styles.accordionContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        {formData.areasOfConcern?.map((item: any, i: number) => (
                            <View key={item.id} style={[styles.arrayItemCard, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                    <TextInput placeholderTextColor={colors.text + '80'} style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }, { flex: 1 }]} placeholder="Location / Building No" value={item.location} onChangeText={t => {
                                        const newArr = [...formData.areasOfConcern]; newArr[i].location = t; setFormData({ ...formData, areasOfConcern: newArr });
                                    }} />
                                    <TouchableOpacity style={styles.deleteBtn} onPress={() => setFormData({ ...formData, areasOfConcern: formData.areasOfConcern.filter((_: any, idx: number) => idx !== i) })}>
                                        <Trash2 size={18} color="#EF4444" />
                                    </TouchableOpacity>
                                </View>
                                <TextInput placeholderTextColor={colors.text + '80'} style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }, styles.textArea, { marginBottom: 8 }]} multiline placeholder="Area of Concern / Issue" value={item.concern} onChangeText={t => {
                                    const newArr = [...formData.areasOfConcern]; newArr[i].concern = t; setFormData({ ...formData, areasOfConcern: newArr });
                                }} />
                                <TextInput placeholderTextColor={colors.text + '80'} style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }, styles.textArea]} multiline placeholder="Corrective Action Required" value={item.action} onChangeText={t => {
                                    const newArr = [...formData.areasOfConcern]; newArr[i].action = t; setFormData({ ...formData, areasOfConcern: newArr });
                                }} />
                            </View>
                        ))}
                        <TouchableOpacity style={styles.addButton} onPress={() => setFormData({ ...formData, areasOfConcern: [...(formData.areasOfConcern || []), { id: Date.now().toString(), location: '', concern: '', action: '' }] })}>
                            <Plus size={16} color="#2563EB" style={{ marginRight: 6 }} />
                            <Text style={styles.addBtnText}>Add Concern</Text>
                        </TouchableOpacity>
                    </Animated.View>
                )
            }
        </>
    );

    const renderSnaggingFields = () => {
        // Collect unique data for filters
        const allContractors = Array.from(new Set((formData.snags || []).map((s: any) => s.contractor).filter(Boolean)));
        const allLevels = Array.from(new Set((formData.snags || []).map((s: any) => s.level).filter(Boolean)));

        const filteredSnags = (formData.snags || []).filter((s: any) => {
            if (snagFilterSystem !== 'All' && s.system !== snagFilterSystem) return false;
            if (snagFilterSeverity !== 'All' && s.severity !== snagFilterSeverity) return false;
            if (snagFilterStatus !== 'All' && s.status !== snagFilterStatus) return false;
            if (snagFilterContractor !== 'All' && s.contractor !== snagFilterContractor) return false;
            if (snagFilterLevel !== 'All' && s.level !== snagFilterLevel) return false;
            return true;
        });

        return (
            <>
                {/* 1. Property Cover Information */}
                <AccordionHeader title="Property Summary & Meta" id="pcaMeta" allowHide={true} />
                {activeSection === 'pcaMeta' && (
                    <Animated.View entering={FadeIn} style={[styles.accordionContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Text style={[styles.sectionHeading, { color: colors.text }]}>Inspection Details</Text>
                        <Text style={[styles.label, { color: colors.text }, { color: colors.text }]}>Inspection Date</Text>
                        {Platform.OS === 'web' ? createElement('input', {
                            type: 'date', value: formData.inspectionDate, onChange: (e: any) => setFormData({ ...formData, inspectionDate: e.target.value }),
                            style: { padding: 14, borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 15, fontFamily: 'inherit', color: '#0F172A', backgroundColor: '#F8FAFC', width: '100%', boxSizing: 'border-box', marginBottom: 12 }
                        }) : (
                            <TouchableOpacity onPress={() => setActiveDatePicker('inspectionDate')} style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border }, { marginBottom: 12, justifyContent: 'center' }]}>
                                <Text style={{ color: formData.inspectionDate ? '#0F172A' : '#94A3B8' }}>{formData.inspectionDate || 'YYYY-MM-DD'}</Text>
                            </TouchableOpacity>
                        )}
                        {activeDatePicker === 'inspectionDate' && (
                            <View style={{ backgroundColor: Platform.OS === 'ios' ? '#F8FAFC' : 'transparent', borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
                                <DateTimePicker
                                    value={formData.inspectionDate ? new Date(formData.inspectionDate) : new Date()}
                                    mode="date"
                                    display={Platform.OS === 'ios' ? 'inline' : 'default'}
                                    onChange={(event: any, selectedDate?: Date) => {
                                        if (Platform.OS === 'android') setActiveDatePicker(null);
                                        if (selectedDate) {
                                            setFormData({ ...formData, inspectionDate: selectedDate.toISOString().split('T')[0] });
                                        }
                                    }}
                                />
                                {Platform.OS === 'ios' && (
                                    <TouchableOpacity 
                                        style={{ backgroundColor: '#2563EB', padding: 12, alignItems: 'center' }} 
                                        onPress={() => setActiveDatePicker(null)}
                                    >
                                        <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>Done</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        )}

                        <View style={[styles.arrayRow, { marginBottom: 12 }]}>
                            <TextInput placeholderTextColor={colors.text + '80'} style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }, { flex: 1 }]} placeholder="Insp. Company" value={formData.inspectionCompany} onChangeText={t => setFormData({ ...formData, inspectionCompany: t })} />
                            <TextInput placeholderTextColor={colors.text + '80'} style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }, { flex: 1 }]} placeholder="Inspector Name" value={formData.inspectorName} onChangeText={t => setFormData({ ...formData, inspectorName: t })} />
                        </View>

                        <View style={[styles.divider, { backgroundColor: colors.border }]} />
                        <Text style={[styles.sectionHeading, { color: colors.text }]}>Property Details</Text>
                        
                        <Text style={[styles.label, { color: colors.text }, { color: colors.text }]}>Property Type</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                            {['Apartment', 'Building', 'Villa', 'Commercial', 'Other'].map(pt => (
                                <TouchableOpacity key={pt} style={[styles.pill, formData.propertyType === pt && styles.pillActive, { marginRight: 8 }]} onPress={() => setFormData({ ...formData, propertyType: pt })}>
                                    <Text style={[styles.pillText, formData.propertyType === pt && styles.pillTextActive]}>{pt}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <TextInput placeholderTextColor={colors.text + '80'} style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }, { marginBottom: 12 }]} placeholder="Project / Property Name" value={formData.propertyName} onChangeText={t => setFormData({ ...formData, propertyName: t })} />
                        <View style={[styles.arrayRow, { marginBottom: 12 }]}>
                            <TextInput placeholderTextColor={colors.text + '80'} style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }, { flex: 2 }]} placeholder="Address" value={formData.propertyAddress} onChangeText={t => setFormData({ ...formData, propertyAddress: t })} />
                            <TextInput placeholderTextColor={colors.text + '80'} style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }, { flex: 1 }]} placeholder="City" value={formData.city} onChangeText={t => setFormData({ ...formData, city: t })} />
                        </View>

                        <Text style={[styles.label, { color: colors.text }, { color: colors.text }]}>Location Details</Text>
                        <View style={[styles.arrayRow, { marginBottom: 12 }]}>
                            {['Apartment', 'Building', 'Commercial', 'Other'].includes(formData.propertyType) && (
                                <TextInput placeholderTextColor={colors.text + '80'} style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }, { flex: 1 }]} placeholder="Bldg Name" value={formData.buildingName} onChangeText={t => setFormData({ ...formData, buildingName: t })} />
                            )}
                            {['Apartment', 'Commercial'].includes(formData.propertyType) && (
                                <>
                                    <TextInput placeholderTextColor={colors.text + '80'} style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }, { flex: 1.5 }]} placeholder="Floor No." value={formData.floorLevel} onChangeText={t => setFormData({ ...formData, floorLevel: t })} />
                                    <TextInput placeholderTextColor={colors.text + '80'} style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }, { flex: 1 }]} placeholder="Apt No." value={formData.apartmentNumber} onChangeText={t => setFormData({ ...formData, apartmentNumber: t })} />
                                </>
                            )}
                            {(formData.propertyType === 'Villa') && (
                                <TextInput placeholderTextColor={colors.text + '80'} style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }, { flex: 1 }]} placeholder="Villa No. / Location Details" value={formData.buildingName} onChangeText={t => setFormData({ ...formData, buildingName: t })} />
                            )}
                        </View>

                        <Text style={[styles.label, { color: colors.text }, { color: colors.text }]}>Zoning & Size</Text>
                        <View style={[styles.arrayRow, { marginBottom: 12 }]}>
                            <TextInput placeholderTextColor={colors.text + '80'} style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }, { flex: 1 }]} placeholder="e.g. Residential" value={formData.zoning} onChangeText={t => setFormData({ ...formData, zoning: t })} />
                            <TextInput placeholderTextColor={colors.text + '80'} style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }, { flex: 1.2 }]} placeholder="e.g. 1500 Sq.Ft" value={formData.propertySize} onChangeText={t => setFormData({ ...formData, propertySize: t })} />
                        </View>

                        <View style={[styles.divider, { backgroundColor: colors.border }]} />
                        <Text style={[styles.sectionHeading, { color: colors.text }]}>Utility Providers</Text>
                        <TextInput placeholderTextColor={colors.text + '80'} style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }, { marginBottom: 8 }]} placeholder="Water Provider" value={formData.waterProvider} onChangeText={t => setFormData({ ...formData, waterProvider: t })} />
                        <TextInput placeholderTextColor={colors.text + '80'} style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }, { marginBottom: 8 }]} placeholder="Sanitary Provider" value={formData.sanitaryProvider} onChangeText={t => setFormData({ ...formData, sanitaryProvider: t })} />
                        <TextInput placeholderTextColor={colors.text + '80'} style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }, { marginBottom: 8 }]} placeholder="Electricity Provider" value={formData.electricityProvider} onChangeText={t => setFormData({ ...formData, electricityProvider: t })} />
                    </Animated.View>
                )}

                {/* 2. Cover Photo */}
                <AccordionHeader title="Cover Property Photo" id="pcaCoverPhoto" />
                {activeSection === 'pcaCoverPhoto' && (
                    <Animated.View entering={FadeIn} style={[styles.accordionContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Text style={[styles.label, { color: colors.text }, { fontSize: 13, color: '#64748B', marginBottom: 12, fontWeight: 'normal' }]}>
                            This photo will appear on the cover page of the generated PDF report. Please select a clear, wide shot of the property.
                        </Text>
                        {formData.pcaMainPhotoUri ? (
                            <View style={{ width: '100%', aspectRatio: 3 / 2, borderRadius: 12, overflow: 'hidden', marginBottom: 12 }}>
                                <Image source={{ uri: formData.pcaMainPhotoUri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                                <TouchableOpacity style={[styles.removePhotoBtn, { top: 8, right: 8, padding: 8 }]} onPress={() => setFormData({ ...formData, pcaMainPhotoUri: '' })}>
                                    <Trash2 size={20} color="#FFFFFF" />
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <TouchableOpacity style={[styles.addPhotoTile, { width: '100%', aspectRatio: 3 / 2 }]} onPress={async () => {
                                let result = await ImagePicker.launchImageLibraryAsync({
                                    mediaTypes: ['images'], quality: 0.6, base64: true, allowsMultipleSelection: false,
                                });
                                if (!result.canceled && result.assets && result.assets.length > 0) {
                                    setFormData({ ...formData, pcaMainPhotoUri: `data:image/jpeg;base64,${result.assets[0].base64}` });
                                }
                            }}>
                                <Camera size={32} color="#64748B" />
                                <Text style={styles.addPhotoTileText}>Select Cover Photo</Text>
                            </TouchableOpacity>
                        )}
                    </Animated.View>
                )}

                {/* 3. Snags / Defects */}
                <AccordionHeader title="Observations & Defects" id="snagsList" allowHide={true} />
                {activeSection === 'snagsList' && (
                    <Animated.View entering={FadeIn} style={[styles.accordionContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        {/* Filters */}
                        <View style={{ backgroundColor: '#F1F5F9', padding: 12, borderRadius: 12, marginBottom: 16 }}>
                            <Text style={[styles.label, { color: colors.text }, { fontSize: 13, color: '#475569' }]}>Filter Defects ({filteredSnags.length}/{formData.snags?.length || 0})</Text>
                            
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                                {['All', 'CIVIL SYSTEM', 'PLUMBING', 'ELECTRICAL', 'HVAC', 'OTHER'].map(sys => (
                                    <TouchableOpacity key={sys} style={[styles.pill, snagFilterSystem === sys && styles.pillActive, { marginRight: 8, paddingVertical: 6, paddingHorizontal: 12 }]} onPress={() => setSnagFilterSystem(sys)}>
                                        <Text style={[styles.pillText, snagFilterSystem === sys && styles.pillTextActive, { fontSize: 12 }]}>{sys}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                            
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                                {['All', 'High', 'Moderate', 'Low'].map(sev => (
                                    <TouchableOpacity key={sev} style={[styles.pill, snagFilterSeverity === sev && styles.pillActive, { marginRight: 8, paddingVertical: 6, paddingHorizontal: 12 }]} onPress={() => setSnagFilterSeverity(sev)}>
                                        <Text style={[styles.pillText, snagFilterSeverity === sev && styles.pillTextActive, { fontSize: 12 }]}>{sev}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>

                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                                {['All', 'Pending', 'In Progress', 'Completed', 'Defect Remains'].map(st => (
                                    <TouchableOpacity key={st} style={[styles.pill, snagFilterStatus === st && styles.pillActive, { marginRight: 8, paddingVertical: 6, paddingHorizontal: 12 }]} onPress={() => setSnagFilterStatus(st)}>
                                        <Text style={[styles.pillText, snagFilterStatus === st && styles.pillTextActive, { fontSize: 12 }]}>{st}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>

                            {allContractors.length > 0 && (
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                                    <TouchableOpacity style={[styles.pill, snagFilterContractor === 'All' && styles.pillActive, { marginRight: 8, paddingVertical: 6, paddingHorizontal: 12 }]} onPress={() => setSnagFilterContractor('All')}>
                                        <Text style={[styles.pillText, snagFilterContractor === 'All' && styles.pillTextActive, { fontSize: 12 }]}>All Contractors</Text>
                                    </TouchableOpacity>
                                    {allContractors.map((cont: any) => (
                                        <TouchableOpacity key={cont} style={[styles.pill, snagFilterContractor === cont && styles.pillActive, { marginRight: 8, paddingVertical: 6, paddingHorizontal: 12 }]} onPress={() => setSnagFilterContractor(cont)}>
                                            <Text style={[styles.pillText, snagFilterContractor === cont && styles.pillTextActive, { fontSize: 12 }]}>{cont}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            )}

                            {allLevels.length > 0 && (
                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                    <TouchableOpacity style={[styles.pill, snagFilterLevel === 'All' && styles.pillActive, { marginRight: 8, paddingVertical: 6, paddingHorizontal: 12 }]} onPress={() => setSnagFilterLevel('All')}>
                                        <Text style={[styles.pillText, snagFilterLevel === 'All' && styles.pillTextActive, { fontSize: 12 }]}>All Levels</Text>
                                    </TouchableOpacity>
                                    {allLevels.map((lvl: any) => (
                                        <TouchableOpacity key={lvl} style={[styles.pill, snagFilterLevel === lvl && styles.pillActive, { marginRight: 8, paddingVertical: 6, paddingHorizontal: 12 }]} onPress={() => setSnagFilterLevel(lvl)}>
                                            <Text style={[styles.pillText, snagFilterLevel === lvl && styles.pillTextActive, { fontSize: 12 }]}>{lvl}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            )}
                        </View>

                        {filteredSnags.map((snag: any, filteredIndex: number) => {
                            // Find actual index in real array for updates
                            const i = formData.snags.findIndex((s: any) => s.id === snag.id);
                            if (i === -1) return null;

                            return (
                                <View key={snag.id} style={[styles.arrayItemCard, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                        <Text style={{ fontSize: 15, fontWeight: '700', color: '#0F172A' }}>Observation #{i + 1}</Text>
                                        <TouchableOpacity style={styles.deleteBtn} onPress={() => setFormData({ ...formData, snags: formData.snags.filter((_: any, idx: number) => idx !== i) })}>
                                            <Trash2 size={18} color="#EF4444" />
                                        </TouchableOpacity>
                                    </View>

                                    <View style={[styles.arrayRow, { marginBottom: 10 }]}>
                                        <TextInput placeholderTextColor={colors.text + '80'} style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }, { flex: 1 }]} placeholder="System (e.g. CIVIL)" value={snag.system} onChangeText={t => {
                                            const newArr = [...formData.snags]; newArr[i].system = t; setFormData({ ...formData, snags: newArr });
                                        }} />
                                        <TextInput placeholderTextColor={colors.text + '80'} style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }, { flex: 1 }]} placeholder="Asset Name" value={snag.assetName} onChangeText={t => {
                                            const newArr = [...formData.snags]; newArr[i].assetName = t; setFormData({ ...formData, snags: newArr });
                                        }} />
                                    </View>
                                    
                                    <View style={[styles.arrayRow, { marginBottom: 10 }]}>
                                        <TextInput placeholderTextColor={colors.text + '80'} style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }, { flex: 1.2 }]} placeholder="Location / Area" value={snag.location} onChangeText={t => {
                                            const newArr = [...formData.snags]; newArr[i].location = t; setFormData({ ...formData, snags: newArr });
                                        }} />
                                        <TextInput placeholderTextColor={colors.text + '80'} style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }, { flex: 0.8 }]} placeholder="Level" value={snag.level} onChangeText={t => {
                                            const newArr = [...formData.snags]; newArr[i].level = t; setFormData({ ...formData, snags: newArr });
                                        }} />
                                        <TextInput placeholderTextColor={colors.text + '80'} style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }, { flex: 1 }]} placeholder="Room" value={snag.room} onChangeText={t => {
                                            const newArr = [...formData.snags]; newArr[i].room = t; setFormData({ ...formData, snags: newArr });
                                        }} />
                                    </View>

                                    <View style={[styles.arrayRow, { marginBottom: 10 }]}>
                                        <TextInput placeholderTextColor={colors.text + '80'} style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }, { flex: 1 }]} placeholder="Contractor" value={snag.contractor} onChangeText={t => {
                                            const newArr = [...formData.snags]; newArr[i].contractor = t; setFormData({ ...formData, snags: newArr });
                                        }} />
                                        <TextInput placeholderTextColor={colors.text + '80'} style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }, { flex: 1 }]} placeholder="Target Date" value={snag.targetDate} onChangeText={t => {
                                            const newArr = [...formData.snags]; newArr[i].targetDate = t; setFormData({ ...formData, snags: newArr });
                                        }} />
                                    </View>
                                    
                                    <View style={{ marginBottom: 10 }}>
                                        <Text style={[styles.label, { color: colors.text }, { fontSize: 12, marginBottom: 4 }]}>Severity</Text>
                                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 4 }}>
                                            {['Low', 'Moderate', 'High'].map(sev => (
                                                <TouchableOpacity key={sev} style={[styles.pill, snag.severity === sev && styles.pillActive, { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8 }]} onPress={() => {
                                                    const newArr = [...formData.snags]; newArr[i].severity = sev; setFormData({ ...formData, snags: newArr });
                                                }}>
                                                    <Text style={[styles.pillText, snag.severity === sev && styles.pillTextActive, { fontSize: 13 }]}>{sev}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </ScrollView>
                                    </View>

                                    <TextInput placeholderTextColor={colors.text + '80'} style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }, styles.textArea, { marginBottom: 10, height: 60 }]} multiline placeholder="Observation / Issue Description" value={snag.issue} onChangeText={t => {
                                        const newArr = [...formData.snags]; newArr[i].issue = t; setFormData({ ...formData, snags: newArr });
                                    }} />

                                    <TextInput placeholderTextColor={colors.text + '80'} style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }, styles.textArea, { marginBottom: 12, height: 60 }]} multiline placeholder="Recommendation / Corrective Action" value={snag.recommendation} onChangeText={t => {
                                        const newArr = [...formData.snags]; newArr[i].recommendation = t; setFormData({ ...formData, snags: newArr });
                                    }} />

                                    {/* Observation Photo */}
                                    <View style={{ marginBottom: 16 }}>
                                        <Text style={[styles.label, { color: colors.text }, { fontSize: 13, marginBottom: 4 }]}>Photographic Evidence</Text>
                                        <Text style={{ fontSize: 12, color: '#64748B', marginBottom: 12 }}>Upload a clear photo showing the precise snag / defect.</Text>
                                        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                                            {snag.photoUri ? (
                                            <View style={{ width: 80, height: 80, borderRadius: 8, overflow: 'hidden', position: 'relative' }}>
                                                <Image source={{ uri: snag.photoUri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                                                <TouchableOpacity style={[styles.removePhotoBtn, { padding: 4, borderRadius: 4 }]} onPress={() => {
                                                    const newArr = [...formData.snags]; newArr[i].photoUri = ''; setFormData({ ...formData, snags: newArr });
                                                }}>
                                                    <Trash2 size={12} color="#FFFFFF" />
                                                </TouchableOpacity>
                                            </View>
                                        ) : (
                                            <TouchableOpacity style={[styles.addPhotoTile, { width: 80, height: 80, borderRadius: 8 }]} onPress={async () => {
                                                let result = await ImagePicker.launchImageLibraryAsync({
                                                    mediaTypes: ['images'], quality: 0.6, base64: true, allowsMultipleSelection: false,
                                                });
                                                if (!result.canceled && result.assets && result.assets.length > 0) {
                                                    const newArr = [...formData.snags]; newArr[i].photoUri = `data:image/jpeg;base64,${result.assets[0].base64}`; setFormData({ ...formData, snags: newArr });
                                                }
                                            }}>
                                                <Camera size={20} color="#64748B" />
                                            </TouchableOpacity>
                                        )}
                                        
                                            <View style={{ flex: 1 }}>
                                                <Text style={[styles.label, { color: colors.text }, { fontSize: 12, marginBottom: 4 }]}>Investigation Status</Text>
                                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 4, marginBottom: 8 }}>
                                                    {['Pending', 'In Progress', 'Completed', 'Defect Remains'].map(ris => (
                                                        <TouchableOpacity key={ris} style={[styles.pill, snag.status === ris && (ris === 'Completed' ? { backgroundColor: '#DCFCE7', borderColor: '#22C55E' } : styles.pillActive), { paddingHorizontal: 8, paddingVertical: 6, borderRadius: 6 }]} onPress={() => {
                                                            const newArr = [...formData.snags]; newArr[i].status = ris; setFormData({ ...formData, snags: newArr });
                                                        }}>
                                                            <Text style={[styles.pillText, snag.status === ris && (ris === 'Completed' ? { color: '#16A34A', fontWeight: 'bold' } : styles.pillTextActive), { fontSize: 11 }]}>{ris}</Text>
                                                        </TouchableOpacity>
                                                    ))}
                                                </ScrollView>
                                            </View>
                                        </View>
                                    </View>

                                </View>
                            );
                        })}

                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <TouchableOpacity style={[styles.addButton, { flex: 1 }]} onPress={() => setFormData({ 
                                ...formData, 
                                snags: [...(formData.snags || []), { 
                                    id: Date.now().toString(), 
                                    system: '', assetName: '', location: '', level: '', room: '', issue: '', recommendation: '', 
                                    severity: 'Moderate', contractor: '', targetDate: '', status: 'Pending', reinspectionNotes: '', photoUri: '' 
                                }] 
                            })}>
                                <Plus size={16} color="#2563EB" style={{ marginRight: 6 }} />
                                <Text style={styles.addBtnText}>Add Snag</Text>
                            </TouchableOpacity>

                            <TouchableOpacity 
                                style={[styles.addButton, { flex: 1, backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]} 
                                onPress={handleAutoSnag}
                                disabled={isAutoSnagging}
                            >
                                {isAutoSnagging ? (
                                    <ActivityIndicator size="small" color="#2563EB" />
                                ) : (
                                    <>
                                        <Sparkles size={16} color="#2563EB" style={{ marginRight: 6 }} />
                                        <Text style={styles.addBtnText}>Auto-Snag with AI</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                )}
            </>
        );
    };

    const renderHSEFields = () => {
        // Group checklists by category
        const categories = Array.from(new Set((formData.checklists || []).map((c: any) => c.category)));

        return (
            <>
                {/* 1. General HSE Data */}
                <AccordionHeader title="HSE Inspection Details" id="hseGeneral" />
                {activeSection === 'hseGeneral' && (
                    <Animated.View entering={FadeIn} style={[styles.accordionContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Text style={[styles.label, { color: colors.text }, { color: colors.text }]}>Inspection Date</Text>
                        {Platform.OS === 'web' ? createElement('input', {
                            type: 'date', value: formData.inspectionDate, onChange: (e: any) => setFormData({ ...formData, inspectionDate: e.target.value }),
                            style: { padding: 14, borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 15, fontFamily: 'inherit', color: '#0F172A', backgroundColor: '#F8FAFC', width: '100%', boxSizing: 'border-box' }
                        }) : (
                            <TouchableOpacity onPress={() => setActiveDatePicker('inspectionDate')} style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border }, { justifyContent: 'center' }]}>
                                <Text style={{ color: formData.inspectionDate ? '#0F172A' : '#94A3B8' }}>{formData.inspectionDate || 'YYYY-MM-DD'}</Text>
                            </TouchableOpacity>
                        )}
                        {activeDatePicker === 'inspectionDate' && (
                            <View style={{ backgroundColor: Platform.OS === 'ios' ? '#F8FAFC' : 'transparent', borderRadius: 12, overflow: 'hidden', marginTop: 12 }}>
                                <DateTimePicker
                                    value={formData.inspectionDate ? new Date(formData.inspectionDate) : new Date()}
                                    mode="date"
                                    display={Platform.OS === 'ios' ? 'inline' : 'default'}
                                    onChange={(event: any, selectedDate?: Date) => {
                                        if (Platform.OS === 'android') setActiveDatePicker(null);
                                        if (selectedDate) setFormData({ ...formData, inspectionDate: selectedDate.toISOString().split('T')[0] });
                                    }}
                                />
                                {Platform.OS === 'ios' && (
                                    <TouchableOpacity style={{ backgroundColor: '#2563EB', padding: 12, alignItems: 'center' }} onPress={() => setActiveDatePicker(null)}>
                                        <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>Done</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        )}

                        <Text style={[styles.label, { color: colors.text }, { marginTop: 12 }]}>Inspector Name</Text>
                        <TextInput placeholderTextColor={colors.text + '80'} style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]} placeholder="Name of HSE Inspector" value={formData.inspectorName} onChangeText={t => setFormData({ ...formData, inspectorName: t })} />

                        <View style={[styles.arrayRow, { marginTop: 12 }]}>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.label, { color: colors.text }, { color: colors.text }]}>Weather Conditions</Text>
                                <TextInput placeholderTextColor={colors.text + '80'} style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]} placeholder="e.g. Sunny, 32°C" value={formData.weatherConditions} onChangeText={t => setFormData({ ...formData, weatherConditions: t })} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.label, { color: colors.text }, { color: colors.text }]}>Total Man-Hours</Text>
                                <TextInput placeholderTextColor={colors.text + '80'} style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]} keyboardType="numeric" placeholder="e.g. 1500" value={formData.totalManHours} onChangeText={t => setFormData({ ...formData, totalManHours: t })} />
                            </View>
                        </View>
                    </Animated.View>
                )}

                {/* 2. HSE Checklist */}
                <AccordionHeader title="HSE Audit Checklist" id="hseChecklist" allowHide={true} />
                {activeSection === 'hseChecklist' && (
                    <Animated.View entering={FadeIn} style={[styles.accordionContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        {categories.map((category: any) => (
                            <View key={`cat-${category}`} style={{ marginBottom: 16 }}>
                                <Text style={[styles.sectionHeading, { color: '#334155', backgroundColor: '#F1F5F9', padding: 8, borderRadius: 8, overflow: 'hidden' }]}>{category}</Text>
                                {(formData.checklists || []).map((item: any, idx: number) => {
                                    if (item.category !== category) return null;
                                    return (
                                        <View key={item.id} style={[styles.arrayItemCard, { marginBottom: 8, padding: 16 }]}>
                                            <Text style={{ fontSize: 14, fontWeight: '600', color: '#0F172A', marginBottom: 12 }}>{item.item}</Text>
                                            
                                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                                                <View style={{ flexDirection: 'row', gap: 8 }}>
                                                    {['Pass', 'Fail', 'N/A'].map(status => (
                                                        <TouchableOpacity key={status} style={[styles.pill, item.status === status && (status === 'Pass' ? { backgroundColor: '#DCFCE7', borderColor: '#22C55E' } : status === 'Fail' ? { backgroundColor: '#FEE2E2', borderColor: '#EF4444' } : styles.pillActive), { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 }]} onPress={() => {
                                                            const newCh = [...formData.checklists]; newCh[idx].status = status; setFormData({ ...formData, checklists: newCh });
                                                        }}>
                                                            <Text style={[styles.pillText, item.status === status && (status === 'Pass' ? { color: '#16A34A', fontWeight: 'bold' } : status === 'Fail' ? { color: '#DC2626', fontWeight: 'bold' } : styles.pillTextActive)]}>{status}</Text>
                                                        </TouchableOpacity>
                                                    ))}
                                                </View>
                                                
                                                <TextInput placeholderTextColor={colors.text + '80'} style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }, { flex: 1, minWidth: 200 }]} placeholder="Comments / Notes" value={item.notes} onChangeText={t => {
                                                    const newCh = [...formData.checklists]; newCh[idx].notes = t; setFormData({ ...formData, checklists: newCh });
                                                }} />
                                            </View>
                                        </View>
                                    );
                                })}
                            </View>
                        ))}
                    </Animated.View>
                )}

                {/* 3. Incidents Log */}
                <AccordionHeader title="Incident & Near Miss Log" id="hseIncidents" allowHide={true} />
                {activeSection === 'hseIncidents' && (
                    <Animated.View entering={FadeIn} style={[styles.accordionContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        {formData.incidents?.map((inc: any, i: number) => (
                            <View key={inc.id} style={[styles.arrayItemCard, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                                    <Text style={[styles.label, { color: colors.text }, { color: colors.text }]}>Incident Type</Text>
                                    <TouchableOpacity style={styles.deleteBtn} onPress={() => setFormData({ ...formData, incidents: formData.incidents.filter((_: any, idx: number) => idx !== i) })}>
                                        <Trash2 size={16} color="#EF4444" />
                                    </TouchableOpacity>
                                </View>
                                
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                                    {['Near Miss', 'First Aid', 'Medical Treatment', 'Lost Time', 'Environmental', 'Other'].map(type => (
                                        <TouchableOpacity key={type} style={[styles.pill, inc.type === type && styles.pillActive, { marginRight: 8 }]} onPress={() => {
                                            const newInc = [...formData.incidents]; newInc[i].type = type; setFormData({ ...formData, incidents: newInc });
                                        }}>
                                            <Text style={[styles.pillText, inc.type === type && styles.pillTextActive, { fontSize: 13 }]}>{type}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>

                                <TextInput placeholderTextColor={colors.text + '80'} style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }, styles.textArea, { height: 60, marginBottom: 8 }]} multiline placeholder="Incident Details & Description" value={inc.description} onChangeText={t => {
                                    const newInc = [...formData.incidents]; newInc[i].description = t; setFormData({ ...formData, incidents: newInc });
                                }} />
                                
                                <TextInput placeholderTextColor={colors.text + '80'} style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }, styles.textArea, { height: 60 }]} multiline placeholder="Immediate Action Taken" value={inc.actionTaken} onChangeText={t => {
                                    const newInc = [...formData.incidents]; newInc[i].actionTaken = t; setFormData({ ...formData, incidents: newInc });
                                }} />
                            </View>
                        ))}
                        <TouchableOpacity style={styles.addButton} onPress={() => setFormData({ ...formData, incidents: [...(formData.incidents || []), { id: Date.now().toString(), type: 'Near Miss', description: '', actionTaken: '' }] })}>
                            <Plus size={16} color="#2563EB" style={{ marginRight: 6 }} />
                            <Text style={styles.addBtnText}>Log New Incident</Text>
                        </TouchableOpacity>
                    </Animated.View>
                )}

                {/* 4. Training / Toolbox Talks */}
                <AccordionHeader title="Toolbox Talks & HSE Training" id="hseTraining" allowHide={true} />
                {activeSection === 'hseTraining' && (
                    <Animated.View entering={FadeIn} style={[styles.accordionContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        {formData.trainings?.map((tr: any, i: number) => (
                            <View key={tr.id} style={[styles.arrayItemCard, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                                <View style={[styles.arrayRow, { marginBottom: 8 }]}>
                                    <TextInput placeholderTextColor={colors.text + '80'} style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }, { flex: 2 }]} placeholder="Training Topic (e.g. Fall Protection)" value={tr.topic} onChangeText={t => {
                                        const newTr = [...formData.trainings]; newTr[i].topic = t; setFormData({ ...formData, trainings: newTr });
                                    }} />
                                    <TouchableOpacity style={styles.deleteBtn} onPress={() => setFormData({ ...formData, trainings: formData.trainings.filter((_: any, idx: number) => idx !== i) })}>
                                        <Trash2 size={16} color="#EF4444" />
                                    </TouchableOpacity>
                                </View>
                                <View style={styles.arrayRow}>
                                    <TextInput placeholderTextColor={colors.text + '80'} style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }, { flex: 1.5 }]} placeholder="Trainer Name" value={tr.trainer} onChangeText={t => {
                                        const newTr = [...formData.trainings]; newTr[i].trainer = t; setFormData({ ...formData, trainings: newTr });
                                    }} />
                                    <TextInput placeholderTextColor={colors.text + '80'} style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }, { flex: 1 }]} placeholder="Attendees" keyboardType="numeric" value={tr.numberOfParticipants} onChangeText={t => {
                                        const newTr = [...formData.trainings]; newTr[i].numberOfParticipants = t; setFormData({ ...formData, trainings: newTr });
                                    }} />
                                </View>
                            </View>
                        ))}
                        <TouchableOpacity style={styles.addButton} onPress={() => setFormData({ ...formData, trainings: [...(formData.trainings || []), { id: Date.now().toString(), topic: '', trainer: '', numberOfParticipants: '' }] })}>
                            <Plus size={16} color="#2563EB" style={{ marginRight: 6 }} />
                            <Text style={styles.addBtnText}>Add Training Record</Text>
                        </TouchableOpacity>
                    </Animated.View>
                )}

                {/* 5. General Observations & Actions */}
                <AccordionHeader title="General Observations" id="hseObs" />
                {activeSection === 'hseObs' && (
                    <Animated.View entering={FadeIn} style={[styles.accordionContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Text style={[styles.label, { color: colors.text }, { color: colors.text }]}>General HSE Observations</Text>
                        <TextInput placeholderTextColor={colors.text + '80'} style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }, styles.textArea, { marginBottom: 16 }]} multiline placeholder="Record any positive observations, overall site safety culture, or general notes..." value={formData.generalObservations} onChangeText={t => setFormData({ ...formData, generalObservations: t })} />

                        <Text style={[styles.label, { color: colors.text }, { color: colors.text }]}>General Corrective Actions</Text>
                        <TextInput placeholderTextColor={colors.text + '80'} style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }, styles.textArea]} multiline placeholder="Note down any broader corrective actions not tied to specific incidents..." value={formData.correctiveActions} onChangeText={t => setFormData({ ...formData, correctiveActions: t })} />
                    </Animated.View>
                )}
            </>
        );
    };

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
            <KeyboardAvoidingView style={[styles.container, { backgroundColor: colors.background }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
                    <BackButton style={{ position: "absolute", left: 20, zIndex: 20, bottom: 8 }} />
                    <Text style={styles.headerTitle} numberOfLines={1}>{getHeaderTitle()}</Text>
                    <TouchableOpacity onPress={handleSave} style={[styles.saveButton, (!author.trim() || isSaving) && styles.saveButtonDisabled]} disabled={!author.trim() || isSaving}>
                        {isSaving ? (
                            <>
                                <ActivityIndicator size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                                <Text style={styles.saveButtonText}>Saving...</Text>
                            </>
                        ) : (
                            <>
                                <Save size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                                <Text style={styles.saveButtonText}>Save</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>

                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                    <View style={[styles.authorSection, { backgroundColor: colors.card }]}>
                        <Text style={[styles.label, { color: colors.text }, { color: colors.text }]}>Prepared By (Signatory) *</Text>
                        <TextInput placeholderTextColor={colors.text + '80'} style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]} placeholder="Your Full Name" value={author} onChangeText={setAuthor} autoCapitalize="words" />
                    </View>

                    {type === 'daily' && renderDailyFields()}
                    {type === 'snagging' && renderSnaggingFields()}
                    {type === 'hse' && renderHSEFields()}

                    {/* Universal Photos Section */}
                    <AccordionHeader title="Photographic Evidence" id="photos" />
                    {activeSection === 'photos' && (
                        <Animated.View entering={FadeIn} style={[styles.accordionContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <Text style={[styles.label, { color: colors.text }, { color: colors.text }]}>Tip: Pre-markup your photos using your native phone gallery tools before uploading.</Text>
                            <View style={styles.photoGrid}>
                                {formData.photos && formData.photos.map((photoObj: any, index: number) => {
                                    const uri = typeof photoObj === 'string' ? photoObj : photoObj.uri;
                                    const caption = typeof photoObj === 'string' ? '' : photoObj.caption;

                                    return (
                                        <View key={index} style={styles.photoWrapper}>
                                            <Image source={{ uri }} style={styles.photoThumb} contentFit="cover" />
                                            <TouchableOpacity style={styles.removePhotoBtn} onPress={() => {
                                                setFormData({ ...formData, photos: formData.photos.filter((_: any, i: number) => i !== index) });
                                            }}>
                                                <Trash2 size={16} color="#FFFFFF" />
                                            </TouchableOpacity>
                                            <TextInput placeholderTextColor={colors.text + '80'}
                                                style={{ position: 'absolute', bottom: 0, width: '100%', backgroundColor: 'rgba(255,255,255,0.9)', fontSize: 10, padding: 4, height: 24 }}
                                                placeholder="Caption..."
                                                value={caption}
                                                onChangeText={t => {
                                                    const newPhotos = [...formData.photos];
                                                    newPhotos[index] = { uri, caption: t };
                                                    setFormData({ ...formData, photos: newPhotos });
                                                }}
                                            />
                                        </View>
                                    );
                                })}
                                <TouchableOpacity style={styles.addPhotoTile} onPress={async () => {
                                    let result = await ImagePicker.launchImageLibraryAsync({
                                        mediaTypes: ['images'], allowsMultipleSelection: true, quality: 0.6, base64: true
                                    });
                                    if (!result.canceled && result.assets && result.assets.length > 0) {
                                        const newPhotos = result.assets.map(a => ({ uri: `data:image/jpeg;base64,${a.base64}`, caption: '' }));
                                        setFormData({ ...formData, photos: [...(formData.photos || []), ...newPhotos] });
                                    }
                                }}>
                                    <Camera size={28} color="#64748B" />
                                    <Text style={styles.addPhotoTileText}>Upload Image</Text>
                                </TouchableOpacity>
                            </View>
                        </Animated.View>
                    )}

                    <View style={{ height: 160 }} />
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
    container: { flex: 1, backgroundColor: '#F1F5F9' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: "center",
        paddingHorizontal: 20, height: 60, backgroundColor: '#FFFFFF',
        borderBottomWidth: 1, borderBottomColor: '#E2E8F0', zIndex: 10,
    },
    backButton: { padding: 8, marginLeft: -8 },
    headerTitle: {  fontSize: 17, fontWeight: '700', color: '#0F172A', textAlign: 'center', marginHorizontal: 8 },
    saveButton: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#2563EB',
        paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    },
    saveButtonDisabled: { backgroundColor: '#94A3B8' },
    saveButtonText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
    content: { flex: 1, padding: 16 },
    authorSection: {
        backgroundColor: '#FFFFFF', padding: 16, borderRadius: 16, marginBottom: 16,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
    },
    accordionHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        backgroundColor: '#FFFFFF', padding: 16, borderRadius: 12, marginBottom: 8,
        borderWidth: 1, borderColor: '#E2E8F0',
    },
    accordionTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
    accordionContent: {
        backgroundColor: '#FFFFFF', padding: 16, borderRadius: 12, marginBottom: 16,
        borderWidth: 1, borderColor: '#E2E8F0', borderTopWidth: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0, marginTop: -12, paddingTop: 20,
    },
    label: { fontSize: 14, fontWeight: '600', color: '#334155', marginBottom: 8 },
    sectionHeading: { fontSize: 15, fontWeight: '700', color: '#0F172A', marginBottom: 16, marginTop: 4 },
    divider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 16 },
    input: {
        backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12,
        paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: '#0F172A',
        minWidth: 0,
    },
    metricsRow: { flexDirection: 'row', gap: 12 },
    textArea: { height: 100, textAlignVertical: 'top' },
    arrayItemCard: {
        backgroundColor: '#F8FAFC', padding: 12, borderRadius: 12, marginBottom: 12,
        borderWidth: 1, borderColor: '#E2E8F0',
    },
    arrayRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    deleteBtn: { padding: 8 },
    addButton: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        paddingVertical: 12, borderRadius: 12, backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE', borderStyle: 'dashed',
    },
    addBtnText: { color: '#2563EB', fontWeight: '600', fontSize: 14 },
    pillContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    pill: {
        paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F1F5F9',
        borderWidth: 1, borderColor: '#E2E8F0',
    },
    pillActive: { backgroundColor: '#DBEAFE', borderColor: '#3B82F6' },
    pillText: { fontSize: 14, color: '#64748B', fontWeight: '500' },
    pillTextActive: { color: '#2563EB', fontWeight: '700' },
    photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    photoWrapper: { width: '30%', aspectRatio: 1, position: 'relative', borderRadius: 12, overflow: 'hidden' },
    photoThumb: { width: '100%', height: '100%' },
    removePhotoBtn: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.5)', padding: 4, borderRadius: 12 },
    addPhotoTile: {
        width: '30%', aspectRatio: 1, borderRadius: 12, backgroundColor: '#F8FAFC', borderWidth: 2, borderColor: '#E2E8F0', borderStyle: 'dashed',
        alignItems: 'center', justifyContent: 'center'
    },
    addPhotoTileText: { fontSize: 12, fontWeight: '600', color: '#64748B', marginTop: 4 },
});
