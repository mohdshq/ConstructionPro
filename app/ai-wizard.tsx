import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useRouter as useExpoRouter } from 'expo-router';
import { Camera, CheckCircle, ChevronRight, Image as ImageIcon, Mic, Sparkles, Square, X } from 'lucide-react-native';
import React, { useEffect, useState, useRef, useMemo } from 'react';
import { ActivityIndicator, Alert, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View, TextInput } from 'react-native';
import Animated, { FadeIn, SlideInRight } from 'react-native-reanimated';
import { supabase } from '../lib/supabase';
import { Project, ReportType, useProjectsStore, ProjectSnag } from '../store/projectsStore';
import { useStore } from '../store/useStore';
import { useThemeColors } from '../store/useThemeColors';
import { persistCapturedSnags, normalizeFloorToInt, patchSnagSuccess, patchSnagFailure } from '../lib/ai/persistSnags';
import { formatBuildingLabel } from '../lib/projects/buildings';

async function invokeAIWithTimeout(functionName: string, payload: any, ms = 45000): Promise<{ data: any, error: any }> {
    let timeoutId: ReturnType<typeof setTimeout>;
    const timeoutPromise = new Promise<{ data: any, error: any }>((_, reject) => {
        timeoutId = setTimeout(() => {
            reject(new Error('AI is taking too long to respond. Please try again.'));
        }, ms);
    });

    try {
        return await Promise.race([
            supabase.functions.invoke(functionName, { body: payload }),
            timeoutPromise
        ]);
    } finally {
        clearTimeout(timeoutId!);
    }
}

export default function AIWizardScreen() {
    const { colors } = useThemeColors();
    const router = useExpoRouter();
    const { projects } = useProjectsStore();
    const { isPremium } = useStore();
    const savingRef = useRef(false);

    const [step, setStep] = useState<'project' | 'type' | 'snag-capture' | 'daily-capture' | 'processing'>('project');
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
    const selectedProject = useMemo(() => projects.find(p => p.id === selectedProjectId) ?? null, [projects, selectedProjectId]);
    const buildings = selectedProject?.buildings ?? [];
    const [selectedType, setSelectedType] = useState<ReportType | null>(null);

    // Snagging specific state
    const [snagContext, setSnagContext] = useState<any>({});
    const [capturedSnags, setCapturedSnags] = useState<any[]>([]);
    const capturedSnagsRef = useRef<any[]>([]);
    const [pendingContextPhoto, setPendingContextPhoto] = useState<string | null>(null);

    const addCapturedSnag = (snag: any) => {
        capturedSnagsRef.current = [...capturedSnagsRef.current, snag];
        setCapturedSnags(capturedSnagsRef.current);
    };

    const patchSnagById = (id: string, patchFn: (list: any[]) => any[]) => {
        capturedSnagsRef.current = patchFn(capturedSnagsRef.current);
        setCapturedSnags(capturedSnagsRef.current);
    };

    const [newBuildingName, setNewBuildingName] = useState('');
    const [showAddBuilding, setShowAddBuilding] = useState(false);
    const [buildingError, setBuildingError] = useState('');

    useEffect(() => {
        if (buildings.length === 1 && !snagContext.buildingId) {
            setSnagContext((prev: any) => ({ ...prev, buildingId: buildings[0].id }));
        }
    }, [buildings, snagContext.buildingId]);

    // Daily specific state
    const [dailyData, setDailyData] = useState<any>({});

    // Recording State
    const [recording, setRecording] = useState<Audio.Recording | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [processingText, setProcessingText] = useState('Processing...');

    const handleAddBuilding = async () => {
        setBuildingError('');
        const trimmed = newBuildingName.trim();
        if (!trimmed) {
            setBuildingError('Name cannot be empty');
            return;
        }
        if (!selectedProject) return;
        const { addBuilding } = useProjectsStore.getState();
        const res = await addBuilding(selectedProject.id, trimmed);
        if (res.status === 'duplicate') {
            setBuildingError('Building already exists in this project');
            return;
        } else if (res.status === 'error') {
            setBuildingError('Failed to add building');
            return;
        }
        
        if (res.building) {
            setSnagContext((prev: any) => ({ ...prev, buildingId: res.building!.id }));
        }
        setNewBuildingName('');
        setShowAddBuilding(false);
    };

    // Cleanup recording
    useEffect(() => {
        return () => {
            if (recording) {
                recording.stopAndUnloadAsync().catch(() => { });
            }
        };
    }, [recording]);

    const startRecording = async () => {
        try {
            const permission = await Audio.requestPermissionsAsync();
            if (permission.status !== 'granted') {
                Alert.alert("Permission Denied", "Microphone access is required for voice reporting.");
                return;
            }
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
                staysActiveInBackground: false,
                interruptionModeIOS: InterruptionModeIOS?.DoNotMix ?? 1,
                interruptionModeAndroid: InterruptionModeAndroid?.DoNotMix ?? 1,
                shouldDuckAndroid: true,
                playThroughEarpieceAndroid: false,
            });
            await new Promise(r => setTimeout(r, 250));
            const { recording } = await Audio.Recording.createAsync(
                Audio.RecordingOptionsPresets.HIGH_QUALITY
            );
            setRecording(recording);
            setIsRecording(true);
        } catch (err) {
            console.error('Failed to start recording', err);
            Alert.alert("Error", "Could not start recording.");
        }
    };

    const stopRecording = async () => {
        if (!recording) return null;
        try {
            setIsRecording(false);
            await recording.stopAndUnloadAsync();
            const uri = recording.getURI();
            setRecording(null);
            return uri;
        } catch (error) {
            console.error('Failed to stop recording', error);
            setRecording(null);
            return null;
        }
    };

    const handleVoiceSubmit = async (processStep: 'generate' = 'generate') => {
        const uri = await stopRecording();
        if (!uri) return;

        setStep('processing');
        setProcessingText('Analyzing voice...');

        try {
            let base64Audio;
            let mimeType = 'audio/mp4';

            if (Platform.OS === 'web') {
                const response = await fetch(uri);
                const blob = await response.blob();
                mimeType = blob.type || 'audio/mp4';
                base64Audio = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => {
                        const dataUrl = reader.result as string;
                        const base64 = dataUrl.split(',')[1];
                        resolve(base64);
                    };
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                });
            } else {
                base64Audio = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
            }

            const payload = {
                audioBase64: `data:${mimeType};base64,${base64Audio}`,
                audioMimeType: mimeType,
                currentStep: processStep,
                reportType: selectedType || 'daily',
                contextData: snagContext
            };

            const { data, error } = await invokeAIWithTimeout('ai-report-wizard', payload);

            if (error) throw error;
            if (data?.error) throw new Error(data.error);

            if (processStep === 'generate') {
                if (!data.result.transcript || data.result.transcript.trim() === '') {
                    Alert.alert('Error', "Couldn't hear that clearly — please try again in a quieter spot");
                    setStep('daily-capture');
                    return;
                }
            }

            handleAIResult(processStep, data.result);
        } catch (error: any) {
            console.error(error);
            Alert.alert("Error", error.message || "Failed to process voice.");
            setStep('daily-capture');
        }
    };

    const handlePhotoSubmit = async (useCamera: boolean) => {
        const resolvedBuildingId = snagContext.buildingId || (buildings.length === 1 ? buildings[0].id : '');
        if (buildings.length >= 1 && !resolvedBuildingId) {
            Alert.alert("Select a building", "Choose a building/tower before capturing snags.");
            return;
        }

        try {
            let result;
            if (useCamera) {
                const p = await ImagePicker.requestCameraPermissionsAsync();
                if (p.status !== 'granted') return;
                result = await ImagePicker.launchCameraAsync({ quality: 0.6, base64: true });
            } else {
                result = await ImagePicker.launchImageLibraryAsync({ quality: 0.6, base64: true });
            }

            if (result.canceled || !result.assets || result.assets.length === 0) return;

            setStep('processing');
            setProcessingText('Analyzing photo...');

            let base64String = result.assets[0].base64;
            let finalUri = result.assets[0].uri;

            if (Platform.OS !== 'web') {
                // Resize image to reduce payload size and speed up AI processing on native
                const manipResult = await ImageManipulator.manipulateAsync(
                    result.assets[0].uri,
                    [{ resize: { width: 800 } }],
                    { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG, base64: true }
                );
                base64String = manipResult.base64;
                finalUri = manipResult.uri;
            }

            if (Platform.OS === 'web') {
                base64String = await new Promise((resolve, reject) => {
                    const img = new Image(); // Use browser Image
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        const MAX_WIDTH = 800;
                        let width = img.width;
                        let height = img.height;

                        if (width > MAX_WIDTH) {
                            height = Math.round(height * (MAX_WIDTH / width));
                            width = MAX_WIDTH;
                        }

                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        if (ctx) {
                            ctx.drawImage(img, 0, 0, width, height);
                            const dataUrl = canvas.toDataURL('image/jpeg', 0.5);
                            resolve(dataUrl.split(',')[1]);
                        } else {
                            resolve(base64String); // fallback
                        }
                    };
                    img.onerror = reject;
                    img.src = finalUri;
                });
            }

            const base64Image = `data:image/jpeg;base64,${base64String}`;

            if (!pendingContextPhoto) {
                setPendingContextPhoto(base64Image);
                setStep('snag-capture');
                Alert.alert("Overview Saved", "Now take a close-up detail photo of the defect.");
                return;
            }

            const detailBase64 = base64Image;

            const _ctx = {
                buildingId: resolvedBuildingId || undefined,
                floor: normalizeFloorToInt(snagContext.floor),
                flat: snagContext.flat ? parseInt(String(snagContext.flat), 10) : undefined,
                areaType: snagContext.areaType || 'unit',
                room: undefined
            };

            const snagId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
            const newSnag = { 
                id: snagId,
                issue: 'Pending analysis',
                description: 'Pending analysis',
                severity: 'Moderate',
                photos: [pendingContextPhoto, detailBase64].filter(Boolean),
                aiStatus: 'pending' as const,
                _ctx 
            };

            // Add snag immediately and synchronously
            addCapturedSnag(newSnag);
            setPendingContextPhoto(null);
            setStep('snag-capture');

            // Fire-and-forget AI analysis
            const payload = {
                base64Image: detailBase64,
                context: snagContext.area || selectedProject?.name
            };

            invokeAIWithTimeout('ai-snag-from-photo', payload)
                .then(({ data, error }) => {
                    if (error || data?.error) {
                        const errMsg = error?.message || data?.error || 'AI analysis failed';
                        patchSnagById(snagId, list => patchSnagFailure(list, snagId, errMsg));
                        return;
                    }
                    const snagData = data?.snag || {};
                    patchSnagById(snagId, list => patchSnagSuccess(list, snagId, snagData));
                })
                .catch((err: any) => {
                    patchSnagById(snagId, list => patchSnagFailure(list, snagId, err?.message || 'Network error'));
                });

            Alert.alert(
                "Snag Captured",
                "Snag recorded. Take another snag in this area?",
                [
                    { text: "Finish & Review", onPress: () => navigateToReview() },
                    { text: "Take Another", onPress: () => setStep('snag-capture') }
                ]
            );

        } catch (error: any) {
            console.error(error);
            Alert.alert("Error", error.message || "Failed to process photo.");
            setStep('snag-capture');
        }
    };

    const handleAIResult = (processStep: string, result: any) => {
        if (processStep === 'generate') {
            setDailyData(result);
            navigateToReview(result);
        }
    };

    const navigateToReview = async (finalData?: any) => {
        if (selectedType === 'snagging') {
            if (savingRef.current) return;
            const snapshot = capturedSnagsRef.current.length > 0 ? capturedSnagsRef.current : capturedSnags;
            if (snapshot.length === 0) {
                Alert.alert('No snags', 'Capture at least one snag first.');
                return;
            }
            savingRef.current = true;
            try {
                setStep('processing');
                setProcessingText('Saving snags...');
                const { addSnag } = useProjectsStore.getState();
                
                const savedCount = await persistCapturedSnags(snapshot, selectedProject!.id, addSnag);
                
                if (savedCount === 0) {
                    Alert.alert("Error", "Could not save — are you signed in?");
                    setStep('snag-capture');
                    return;
                }
                
                capturedSnagsRef.current = [];
                setCapturedSnags([]);
                router.replace({
                    pathname: `/project/[id]/snags`,
                    params: { id: selectedProject!.id, origin: 'ai' }
                });
            } catch (error: any) {
                console.error(error);
                Alert.alert("Error", "Failed to save snags. Please try again.");
                setStep('snag-capture');
            } finally {
                savingRef.current = false;
            }
        } else {
            const dataToReview = finalData || dailyData;

            // Ensure all array items have an ID
            const arrayKeys = [
                'mainContractorStaff', 'subcontractorStaff', 'equipment',
                'mainContractorLabor', 'subcontractorLabor', 'nightShift',
                'activitiesProgress', 'areasOfConcern'
            ];

            arrayKeys.forEach((key) => {
                if (Array.isArray(dataToReview[key])) {
                    dataToReview[key] = dataToReview[key].map((item: any, idx: number) => ({
                        ...item,
                        id: item.id || Date.now().toString() + idx
                    }));
                }
            });

            router.replace({
                pathname: `/project/[id]/report/create`,
                params: { id: selectedProject!.id, type: 'daily', initialData: JSON.stringify(dataToReview) }
            });
        }
    };

    const handleCreateProject = () => {
        if (!isPremium && projects.length >= 1) {
            if (Platform.OS === 'web') {
                const wantsUpgrade = window.confirm(
                    "Free users can only create 1 project. Would you like to upgrade to Construction Pro Premium for unlimited projects?"
                );
                if (wantsUpgrade) {
                    router.back();
                    router.push('/settings' as any);
                }
            } else {
                Alert.alert(
                    "Premium Required",
                    "Free users can only create 1 project. Upgrade to Construction Pro Premium to create unlimited projects.",
                    [
                        { text: "Cancel", style: "cancel" },
                        { text: "Upgrade", style: "default", onPress: () => { router.back(); router.push('/settings' as any); } }
                    ]
                );
            }
            return;
        }
        router.back();
        router.push('/project/create');
    };

    // UI Renderers
    const renderProjectSelection = () => (
        <Animated.View entering={FadeIn} style={styles.stepContainer}>
            <Text style={styles.title}>Select Project</Text>
            <ScrollView style={{ flex: 1 }}>
                {projects.map(p => (
                    <TouchableOpacity
                        key={p.id}
                        style={styles.projectCard}
                        onPress={() => { setSelectedProjectId(p.id); setStep('type'); }}
                    >
                        <Text style={styles.projectName}>{p.name}</Text>
                        <ChevronRight size={20} color="#64748B" />
                    </TouchableOpacity>
                ))}
                <TouchableOpacity
                    style={[styles.projectCard, { borderStyle: 'dashed', backgroundColor: 'transparent' }]}
                    onPress={handleCreateProject}
                >
                    <Text style={[styles.projectName, { color: '#2563EB' }]}>+ Add New Project</Text>
                </TouchableOpacity>
            </ScrollView>
        </Animated.View>
    );

    const renderTypeSelection = () => (
        <Animated.View entering={SlideInRight} style={styles.stepContainer}>
            <Text style={styles.title}>What would you like to report?</Text>
            <View style={{ gap: 16 }}>
                <TouchableOpacity
                    style={[styles.typeCard, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}
                    onPress={() => { setSelectedType('snagging'); setStep('snag-capture'); }}
                >
                    <View style={styles.typeIconContainer}><Sparkles color="#2563EB" size={24} /></View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.typeTitle}>Snagging / Punch List</Text>
                        <Text style={styles.typeDesc}>Walk the site and log defects automatically.</Text>
                    </View>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.typeCard, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}
                    onPress={() => { setSelectedType('daily'); setStep('daily-capture'); }}
                >
                    <View style={[styles.typeIconContainer, { backgroundColor: '#DCFCE7' }]}><Mic color="#16A34A" size={24} /></View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.typeTitle}>Daily Report</Text>
                        <Text style={styles.typeDesc}>Dictate today's summary and manpower.</Text>
                    </View>
                </TouchableOpacity>
            </View>
        </Animated.View>
    );

    const renderVoicePrompt = (title: string, subtitle: string, processStep: 'generate' = 'generate') => (
        <Animated.View entering={SlideInRight} style={styles.stepContainer}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>

            <View style={styles.micContainer}>
                {!isRecording ? (
                    <TouchableOpacity style={styles.micBtn} onPress={startRecording}>
                        <Mic color="#fff" size={40} />
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity style={styles.micBtnRecording} onPress={() => handleVoiceSubmit(processStep)}>
                        <Square color="#fff" size={32} />
                    </TouchableOpacity>
                )}
                <Text style={styles.micText}>
                    {isRecording ? "Tap to Stop & Process" : "Tap to Speak"}
                </Text>
            </View>
        </Animated.View>
    );

    const renderSnagCapture = () => (
        <Animated.View entering={SlideInRight} style={styles.stepContainer}>
            <Text style={styles.title}>{pendingContextPhoto ? "Capture Detail Photo" : "Capture Overview Photo"}</Text>
            
            <View style={{ gap: 12, marginBottom: 20 }}>
                <View>
                    <Text style={[styles.label, { color: colors.text, marginBottom: 8 }]}>Building / Tower</Text>
                    
                    {buildings.length > 0 && (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row', marginBottom: 8 }}>
                            {buildings.map(b => {
                                const isSelected = snagContext.buildingId === b.id || (buildings.length === 1 && !snagContext.buildingId);
                                return (
                                    <TouchableOpacity 
                                        key={b.id} 
                                        style={[styles.chip, isSelected && { backgroundColor: colors.primary }]}
                                        onPress={() => setSnagContext({ ...snagContext, buildingId: b.id })}
                                    >
                                        <Text style={[styles.chipText, isSelected && { color: '#fff' }]}>{formatBuildingLabel(b)}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                            {!showAddBuilding && (
                                <TouchableOpacity style={styles.chip} onPress={() => setShowAddBuilding(true)}>
                                    <Text style={styles.chipText}>+ Add</Text>
                                </TouchableOpacity>
                            )}
                        </ScrollView>
                    )}

                    {(buildings.length === 0 || showAddBuilding) && (
                        <View>
                            <View style={{ flexDirection: 'row', gap: 8 }}>
                                <TextInput
                                    style={[styles.input, { flex: 1, color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]}
                                    placeholder="Enter building name"
                                    placeholderTextColor={colors.textMuted}
                                    value={newBuildingName}
                                    onChangeText={(t) => { setNewBuildingName(t); setBuildingError(''); }}
                                />
                                <TouchableOpacity style={{ backgroundColor: colors.primary, justifyContent: 'center', paddingHorizontal: 16, borderRadius: 8 }} onPress={handleAddBuilding}>
                                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>Add</Text>
                                </TouchableOpacity>
                                {buildings.length > 0 && (
                                    <TouchableOpacity style={{ justifyContent: 'center', paddingHorizontal: 8 }} onPress={() => { setShowAddBuilding(false); setNewBuildingName(''); setBuildingError(''); }}>
                                        <Text style={{ color: colors.textMuted }}>Cancel</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                            {!!buildingError && <Text style={{ color: '#EF4444', fontSize: 12, marginTop: 4 }}>{buildingError}</Text>}
                        </View>
                    )}
                </View>

                <View style={{ flexDirection: 'row', gap: 16 }}>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.label, { color: colors.text, marginBottom: 8 }]}>Floor</Text>
                        <TextInput
                            style={[styles.input, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]}
                            placeholder="e.g. 5"
                            placeholderTextColor={colors.textMuted}
                            value={String(snagContext.floor || '')}
                            onChangeText={(t) => setSnagContext({ ...snagContext, floor: t })}
                            keyboardType="numeric"
                        />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.label, { color: colors.text, marginBottom: 8 }]}>Flat / Unit</Text>
                        <TextInput
                            style={[
                                styles.input, 
                                { color: colors.text, backgroundColor: colors.card, borderColor: colors.border },
                                snagContext.areaType && snagContext.areaType !== 'unit' && { opacity: 0.5, backgroundColor: '#f1f5f9' }
                            ]}
                            placeholder={(!snagContext.areaType || snagContext.areaType === 'unit') ? "e.g. 1" : "—"}
                            placeholderTextColor={colors.textMuted}
                            value={(!snagContext.areaType || snagContext.areaType === 'unit') ? String(snagContext.flat || '') : ''}
                            onChangeText={(t) => setSnagContext({ ...snagContext, flat: t })}
                            keyboardType="numeric"
                            editable={!snagContext.areaType || snagContext.areaType === 'unit'}
                        />
                    </View>
                </View>

                <View>
                    <Text style={[styles.label, { color: colors.text, marginBottom: 8 }]}>Area Type</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row' }}>
                        {['unit', 'elevation', 'parking', 'landscape', 'roof', 'mep', 'common'].map(type => (
                            <TouchableOpacity 
                                key={type} 
                                style={[styles.chip, (snagContext.areaType || 'unit') === type && { backgroundColor: colors.primary }]}
                                onPress={() => setSnagContext({ ...snagContext, areaType: type })}
                            >
                                <Text style={[styles.chipText, (snagContext.areaType || 'unit') === type && { color: '#fff' }]}>{type}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 16, marginTop: 40, justifyContent: 'center' }}>
                <TouchableOpacity style={styles.captureBtn} onPress={() => handlePhotoSubmit(true)}>
                    <Camera color="#fff" size={32} />
                    <Text style={styles.captureText}>Camera</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.captureBtn, { backgroundColor: '#475569' }]} onPress={() => handlePhotoSubmit(false)}>
                    <ImageIcon color="#fff" size={32} />
                    <Text style={styles.captureText}>Gallery</Text>
                </TouchableOpacity>
            </View>

            {capturedSnags.length > 0 && (
                <View style={{ marginTop: 40 }}>
                    <Text style={{ fontWeight: 'bold', marginBottom: 12 }}>Captured ({capturedSnags.length}):</Text>
                    {capturedSnags.map(s => (
                        <View key={s.id} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                            <CheckCircle size={16} color="#22C55E" style={{ marginRight: 8 }} />
                            <Text>{s.issue?.slice(0, 40)}...</Text>
                        </View>
                    ))}
                    <TouchableOpacity style={styles.finishBtn} onPress={() => navigateToReview()}>
                        <Text style={styles.finishBtnText}>Finish & Review</Text>
                    </TouchableOpacity>
                </View>
            )}
        </Animated.View>
    );

    const renderProcessing = () => (
        <Animated.View entering={FadeIn} style={[styles.stepContainer, { justifyContent: 'center', alignItems: 'center' }]}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={{ marginTop: 20, fontSize: 18, color: '#475569', fontWeight: '500' }}>{processingText}</Text>
        </Animated.View>
    );

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => { setPendingContextPhoto(null); router.back(); }} style={{ padding: 8 }}>
                    <X size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text }}>AI Assistant</Text>
                <View style={{ width: 40 }} />
            </View>
            <View style={{ flex: 1, padding: 20 }}>
                {step === 'project' && renderProjectSelection()}
                {step === 'type' && renderTypeSelection()}
                {step === 'snag-capture' && renderSnagCapture()}
                {step === 'daily-capture' && renderVoicePrompt('Daily Summary', 'Speak freely about activities, manpower, and issues.', 'generate')}
                {step === 'processing' && renderProcessing()}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingTop: Platform.OS === 'android' ? 40 : 10,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0'
    },
    stepContainer: { flex: 1 },
    title: { fontSize: 28, fontWeight: 'bold', marginBottom: 8, color: '#1E293B' },
    subtitle: { fontSize: 16, color: '#64748B', marginBottom: 24 },
    projectCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0'
    },
    projectName: { fontSize: 16, fontWeight: '600', color: '#1E293B' },
    typeCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        borderRadius: 12,
        borderWidth: 1,
    },
    typeIconContainer: {
        width: 48, height: 48, borderRadius: 24, backgroundColor: '#DBEAFE',
        justifyContent: 'center', alignItems: 'center', marginRight: 16
    },
    typeTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E293B', marginBottom: 4 },
    typeDesc: { fontSize: 14, color: '#64748B' },
    micContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    micBtn: {
        width: 100, height: 100, borderRadius: 50, backgroundColor: '#3B82F6',
        justifyContent: 'center', alignItems: 'center',
        shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20
    },
    micBtnRecording: {
        width: 100, height: 100, borderRadius: 50, backgroundColor: '#EF4444',
        justifyContent: 'center', alignItems: 'center',
    },
    micText: { marginTop: 24, fontSize: 18, color: '#64748B', fontWeight: '500' },
    captureBtn: {
        width: 120, height: 120, borderRadius: 24, backgroundColor: '#3B82F6',
        justifyContent: 'center', alignItems: 'center'
    },
    captureText: { color: '#fff', fontWeight: '600', marginTop: 12, fontSize: 16 },
    finishBtn: {
        marginTop: 20, backgroundColor: '#10B981', padding: 16, borderRadius: 12, alignItems: 'center'
    },
    finishBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    label: { fontSize: 14, fontWeight: '500', marginBottom: 8 },
    input: {
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 12,
        height: 44,
        fontSize: 16,
    },
    chip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(150,150,150,0.3)',
        marginRight: 8,
    },
    chipText: { fontSize: 14, color: '#777' }
});
