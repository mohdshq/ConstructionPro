import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, SafeAreaView, Platform } from 'react-native';
import { Stack, useRouter } from 'react-router-native'; // Wait, it's expo-router
import { useRouter as useExpoRouter } from 'expo-router';
import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import { Mic, Square, Camera, Image as ImageIcon, ChevronRight, X, Loader2, Sparkles, CheckCircle } from 'lucide-react-native';
import { useProjectsStore, Project, ReportType } from '../store/projectsStore';
import { supabase } from '../lib/supabase';
import * as FileSystem from 'expo-file-system';
import { useThemeColors } from '../store/useThemeColors';
import { useStore } from '../store/useStore';
import Animated, { FadeIn, SlideInRight, SlideOutLeft } from 'react-native-reanimated';

export default function AIWizardScreen() {
    const { colors } = useThemeColors();
    const router = useExpoRouter();
    const { projects } = useProjectsStore();
    const { isPremium } = useStore();

    const [step, setStep] = useState<'project' | 'type' | 'snag-context' | 'snag-capture' | 'daily-capture' | 'processing'>('project');
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [selectedType, setSelectedType] = useState<ReportType | null>(null);
    
    // Snagging specific state
    const [snagContext, setSnagContext] = useState<any>({});
    const [capturedSnags, setCapturedSnags] = useState<any[]>([]);

    // Daily specific state
    const [dailyData, setDailyData] = useState<any>({});

    // Recording State
    const [recording, setRecording] = useState<Audio.Recording | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [processingText, setProcessingText] = useState('Processing...');

    // Cleanup recording
    useEffect(() => {
        return () => {
            if (recording) {
                recording.stopAndUnloadAsync().catch(() => {});
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
            });
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

    const handleVoiceSubmit = async (processStep: 'context' | 'snag' | 'generate') => {
        const uri = await stopRecording();
        if (!uri) return;

        setStep('processing');
        setProcessingText('Analyzing voice...');

        try {
            let base64Audio;
            if (Platform.OS === 'web') {
                const response = await fetch(uri);
                const blob = await response.blob();
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
                audioBase64: `data:audio/m4a;base64,${base64Audio}`,
                currentStep: processStep,
                reportType: selectedType,
                contextData: snagContext
            };

            const { data, error } = await supabase.functions.invoke('ai-report-wizard', {
                body: payload
            });

            if (error) throw error;
            if (data?.error) throw new Error(data.error);

            handleAIResult(processStep, data.result);
        } catch (error: any) {
            console.error(error);
            Alert.alert("Error", error.message || "Failed to process voice.");
            // Revert step based on type
            if (selectedType === 'snagging') {
                setStep(processStep === 'context' ? 'snag-context' : 'snag-capture');
            } else {
                setStep('daily-capture');
            }
        }
    };

    const handlePhotoSubmit = async (useCamera: boolean) => {
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
            
            const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
            
            const payload = {
                imageBase64: base64Image,
                currentStep: 'snag',
                reportType: 'snagging',
                contextData: snagContext
            };

            const { data, error } = await supabase.functions.invoke('ai-report-wizard', {
                body: payload
            });

            if (error) throw error;
            if (data?.error) throw new Error(data.error);

            const newSnag = { ...data.result, photoUri: base64Image, id: Date.now().toString() };
            setCapturedSnags(prev => [...prev, newSnag]);
            
            Alert.alert(
                "Snag Captured",
                `Identified: ${newSnag.issue}\n\nTake another snag in this area?`,
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
        if (processStep === 'context') {
            setSnagContext(result);
            setStep('snag-capture');
        } else if (processStep === 'generate') {
            setDailyData(result);
            navigateToReview(result);
        }
    };

    const navigateToReview = (finalData?: any) => {
        if (selectedType === 'snagging') {
            const formData = {
                snags: capturedSnags.map(s => ({
                    ...s,
                    location: snagContext.building || '',
                    level: snagContext.floor || '',
                    room: snagContext.area || '',
                    status: 'Pending',
                    severity: s.severity || 'Moderate'
                }))
            };
            router.replace({
                pathname: `/project/[id]/report/create`,
                params: { id: selectedProject!.id, type: 'snagging', initialData: JSON.stringify(formData) }
            });
        } else {
            router.replace({
                pathname: `/project/[id]/report/create`,
                params: { id: selectedProject!.id, type: 'daily', initialData: JSON.stringify(finalData || dailyData) }
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
                        onPress={() => { setSelectedProject(p); setStep('type'); }}
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
                    onPress={() => { setSelectedType('snagging'); setStep('snag-context'); }}
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

    const renderVoicePrompt = (title: string, subtitle: string, processStep: 'context' | 'generate') => (
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
            <Text style={styles.title}>Capture Snag</Text>
            <Text style={styles.subtitle}>
                Location: {snagContext.building} {snagContext.floor ? `(Fl ${snagContext.floor})` : ''}
            </Text>
            
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
                <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }}>
                    <X size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text }}>AI Assistant</Text>
                <View style={{ width: 40 }} />
            </View>
            <View style={{ flex: 1, padding: 20 }}>
                {step === 'project' && renderProjectSelection()}
                {step === 'type' && renderTypeSelection()}
                {step === 'snag-context' && renderVoicePrompt('Where are you?', 'e.g. "I am in Building A, Floor 3, North Wing"', 'context')}
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
    finishBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});
