import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, SafeAreaView, Platform, KeyboardAvoidingView, Modal, FlatList, ActivityIndicator } from 'react-native';
import { ArrowLeft, Mic, MicOff, Camera, MapPin, CheckCircle, Image as ImageIcon, X, Trash2, Zap } from "lucide-react-native";
import BackButton from "../components/BackButton";
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import { Image } from 'expo-image';
import { useProjectsStore, Project } from '../store/projectsStore';
import { usePowerSyncProjects } from '@/lib/powersync/useProjects';
import { useThemeColors } from '../store/useThemeColors';
import { useStore } from '../store/useStore';

export default function QuickLogScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ projectId?: string }>();
    const { projects: storeProjects, addReport } = useProjectsStore();
    const { data: powerSyncProjects = [] } = usePowerSyncProjects();
    const projects = powerSyncProjects.length > 0 ? powerSyncProjects : storeProjects;
    const { colors } = useThemeColors();
    const userName = useStore(state => state.userName);

    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [isProjectPickerVisible, setIsProjectPickerVisible] = useState(false);

    const [notes, setNotes] = useState('');
    const [location, setLocation] = useState('');
    const [photos, setPhotos] = useState<{ uri: string }[]>([]);

    const [recording, setRecording] = useState<Audio.Recording | null>(null);
    const [audioUris, setAudioUris] = useState<string[]>([]);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);

    const activeProjects = projects;

    useEffect(() => {
        const pId = params.projectId as string | undefined;
        if (pId && activeProjects.length > 0 && !selectedProject) {
            const proj = activeProjects.find(p => p.id === pId);
            if (proj) {
                setSelectedProject(proj);
            }
        }
    }, [params.projectId, activeProjects]);

    // Timer for recording
    useEffect(() => {
        let interval: ReturnType<typeof setInterval>;
        if (isRecording) {
            interval = setInterval(() => {
                setRecordingDuration(prev => prev + 1);
            }, 1000);
        } else {
            setRecordingDuration(0);
        }
        return () => clearInterval(interval);
    }, [isRecording]);

    const handlePickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsMultipleSelection: true,
            quality: 0.8,
        });

        if (!result.canceled && result.assets) {
            const newPhotos = result.assets.map(asset => ({ uri: asset.uri }));
            setPhotos(prev => [...prev, ...newPhotos]);
        }
    };

    const handleTakeImage = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            alert('Sorry, we need camera permissions to make this work!');
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            quality: 0.8,
        });

        if (!result.canceled && result.assets) {
            setPhotos(prev => [...prev, { uri: result.assets[0].uri }]);
        }
    };

    const removePhoto = (index: number) => {
        setPhotos(prev => prev.filter((_, i) => i !== index));
    };

    const startRecording = async () => {
        try {
            const permission = await Audio.requestPermissionsAsync();
            if (permission.status === 'granted') {
                await Audio.setAudioModeAsync({
                    allowsRecordingIOS: true,
                    playsInSilentModeIOS: true,
                });

                const { recording } = await Audio.Recording.createAsync(
                    Audio.RecordingOptionsPresets.HIGH_QUALITY
                );
                setRecording(recording);
                setIsRecording(true);
            } else {
                alert('Please grant microphone permissions to use this feature.');
            }
        } catch (err) {
            console.error('Failed to start recording', err);
        }
    };

    const stopRecording = async () => {
        setIsRecording(false);
        if (!recording) return;

        try {
            await recording.stopAndUnloadAsync();
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: false,
            });
            const uri = recording.getURI();
            if (uri) {
                setAudioUris(prev => [...prev, uri]);
            }
            setRecording(null);
        } catch (error) {
            console.error('Failed to stop recording', error);
        }
    };

    const removeAudio = (index: number) => {
        setAudioUris(prev => prev.filter((_, i) => i !== index));
    };

    const formatDuration = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const handleSave = async () => {
        if (!selectedProject) {
            alert('Please select a project first.');
            return;
        }

        if (!notes.trim() && photos.length === 0 && audioUris.length === 0) {
            alert('Please add some notes, photos, or a voice memo.');
            return;
        }

        let savedPhotos = [];
        for (const photo of photos) {
            if (photo.uri.startsWith('data:') || Platform.OS === 'web') {
                savedPhotos.push({ uri: photo.uri });
            } else {
                try {
                    const fileName = `photo_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
                    // @ts-ignore
                    const newPath = `${FileSystem.documentDirectory}${fileName}`;
                    await FileSystem.copyAsync({ from: photo.uri, to: newPath });
                    savedPhotos.push({ uri: newPath });
                } catch (e) {
                    console.error("Error saving photo:", e);
                    savedPhotos.push({ uri: photo.uri });
                }
            }
        }

        let savedAudioUris = [];
        for (const uri of audioUris) {
            if (uri.startsWith('data:') || Platform.OS === 'web') {
                savedAudioUris.push(uri);
            } else {
                try {
                    const fileName = `audio_${Date.now()}_${Math.random().toString(36).substring(7)}.m4a`;
                    // @ts-ignore
                    const newPath = `${FileSystem.documentDirectory}${fileName}`;
                    await FileSystem.copyAsync({ from: uri, to: newPath });
                    savedAudioUris.push(newPath);
                } catch (e) {
                    console.error("Error saving audio:", e);
                    savedAudioUris.push(uri);
                }
            }
        }

        const reportData = {
            notes: notes.trim(),
            photos: savedPhotos,
            audioUris: savedAudioUris.length > 0 ? savedAudioUris : undefined,
            location: location.trim() || undefined,
        };

        addReport({
            projectId: selectedProject.id,
            type: 'quick-log',
            date: new Date().toISOString(),
            author: userName || 'Unknown',
            templateData: JSON.stringify(reportData),
            status: 'submitted',
        });
        router.back();
    };

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
            <KeyboardAvoidingView
                style={[styles.container, { backgroundColor: colors.background }]}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                {/* Header */}
                <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
                    <BackButton style={{ position: "absolute", left: 20, zIndex: 20, bottom: 8 }} />
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Quick Log</Text>
                    <TouchableOpacity
                        style={[styles.saveButton, (!selectedProject || (!notes && photos.length === 0 && audioUris.length === 0)) && { backgroundColor: colors.border }]}
                        onPress={handleSave}
                        disabled={!selectedProject || (!notes && photos.length === 0 && audioUris.length === 0)}
                    >
                        <Text style={[styles.saveButtonText, (!selectedProject || (!notes && photos.length === 0 && audioUris.length === 0)) && { color: colors.textMuted }]}>Save</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                    
                    {/* Project Selector */}
                    <View style={styles.formGroup}>
                        <Text style={[styles.label, { color: colors.text }]}>Project *</Text>
                        <TouchableOpacity
                            style={[styles.projectSelector, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}
                            onPress={() => setIsProjectPickerVisible(true)}
                        >
                            <Text style={[styles.projectSelectorText, { color: selectedProject ? colors.text : colors.textMuted }]}>
                                {selectedProject ? selectedProject.name : 'Select a Project...'}
                            </Text>
                            <Zap size={20} color={colors.textMuted} />
                        </TouchableOpacity>
                    </View>

                    {/* Notes */}
                    <View style={styles.formGroup}>
                        <Text style={[styles.label, { color: colors.text }]}>Notes</Text>
                        <View style={[styles.inputContainer, styles.textAreaContainer, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                            <TextInput
                                style={[styles.textArea, { color: colors.text }]}
                                placeholder="What did you observe?"
                                placeholderTextColor={colors.textMuted}
                                value={notes}
                                onChangeText={setNotes}
                                multiline
                                textAlignVertical="top"
                            />
                        </View>
                    </View>

                    {/* Location */}
                    <View style={styles.formGroup}>
                        <Text style={[styles.label, { color: colors.text }]}>Location / Area (Optional)</Text>
                        <View style={[styles.inputContainer, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                            <MapPin size={20} color={colors.textMuted} style={styles.inputIcon} />
                            <TextInput
                                style={[styles.input, { color: colors.text }]}
                                placeholder="e.g. Floor 3, North Wing"
                                placeholderTextColor={colors.textMuted}
                                value={location}
                                onChangeText={setLocation}
                            />
                        </View>
                    </View>

                    {/* Photos */}
                    <View style={styles.formGroup}>
                        <View style={styles.sectionHeader}>
                            <Text style={[styles.label, { color: colors.text, marginBottom: 0 }]}>Photos</Text>
                            <View style={styles.mediaActions}>
                                <TouchableOpacity style={[styles.actionIconButton, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={handleTakeImage}>
                                    <Camera size={20} color="#3B82F6" />
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.actionIconButton, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={handlePickImage}>
                                    <ImageIcon size={20} color="#3B82F6" />
                                </TouchableOpacity>
                            </View>
                        </View>
                        
                        {photos.length > 0 && (
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoScroll}>
                                {photos.map((photo, index) => (
                                    <View key={index} style={[styles.photoPreviewWrapper, { borderColor: colors.border }]}>
                                        <Image source={{ uri: photo.uri }} style={styles.photoPreview} contentFit="cover" />
                                        <TouchableOpacity 
                                            style={styles.removePhotoButton}
                                            onPress={() => removePhoto(index)}
                                        >
                                            <X size={14} color="#FFF" />
                                        </TouchableOpacity>
                                    </View>
                                ))}
                            </ScrollView>
                        )}
                    </View>

                    {/* Voice Memo */}
                    <View style={styles.formGroup}>
                        <Text style={[styles.label, { color: colors.text }]}>Voice Memo</Text>
                        
                        {!isRecording && (
                            <TouchableOpacity style={[styles.voiceRecordBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={startRecording}>
                                <View style={styles.voiceIconCircle}>
                                    <Mic size={24} color="#10B981" />
                                </View>
                                <Text style={[styles.voiceBtnText, { color: colors.text }]}>Tap to Record Voice Note</Text>
                            </TouchableOpacity>
                        )}

                        {isRecording && (
                            <TouchableOpacity style={[styles.voiceRecordingActive, { borderColor: '#EF4444' }]} onPress={stopRecording}>
                                <View style={styles.recordingPulse}>
                                    <View style={styles.pulseInner} />
                                </View>
                                <Text style={styles.recordingText}>Recording... {formatDuration(recordingDuration)}</Text>
                                <View style={styles.stopIconCircle}>
                                    <Text style={{ color: '#EF4444', fontWeight: 'bold' }}>STOP</Text>
                                </View>
                            </TouchableOpacity>
                        )}

                        {audioUris.map((uri, index) => (
                            <View key={index} style={[styles.audioPlaybackCard, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 10 }]}>
                                <View style={styles.audioInfo}>
                                    <Mic size={20} color="#3B82F6" />
                                    <Text style={[styles.audioText, { color: colors.text }]}>Voice Note {index + 1}</Text>
                                </View>
                                <TouchableOpacity onPress={() => removeAudio(index)} style={styles.deleteAudioBtn}>
                                    <Trash2 size={20} color="#EF4444" />
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>

                    <View style={{ height: 60 }} />
                </ScrollView>

                {/* Project Picker Modal */}
                <Modal visible={isProjectPickerVisible} animationType="slide" transparent={true}>
                    <View style={styles.modalOverlay}>
                        <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
                            <View style={styles.modalHeader}>
                                <Text style={[styles.modalTitle, { color: colors.text }]}>Select Project</Text>
                                <TouchableOpacity onPress={() => setIsProjectPickerVisible(false)}>
                                    <X size={24} color={colors.text} />
                                </TouchableOpacity>
                            </View>
                            
                            {activeProjects.length === 0 ? (
                                <View style={styles.emptyProjects}>
                                    <Text style={{ color: colors.textMuted }}>No active projects available.</Text>
                                </View>
                            ) : (
                                <FlatList
                                    data={activeProjects}
                                    keyExtractor={(item) => item.id}
                                    renderItem={({ item }) => (
                                        <TouchableOpacity
                                            style={[
                                                styles.projectItem, 
                                                { borderBottomColor: colors.border },
                                                selectedProject?.id === item.id && { backgroundColor: colors.card }
                                            ]}
                                            onPress={() => {
                                                setSelectedProject(item);
                                                setIsProjectPickerVisible(false);
                                            }}
                                        >
                                            <View>
                                                <Text style={[styles.projectName, { color: colors.text }]}>{item.name}</Text>
                                                {item.location && <Text style={[styles.projectLocation, { color: colors.textMuted }]}>{item.location}</Text>}
                                            </View>
                                            {selectedProject?.id === item.id && <CheckCircle size={20} color="#3B82F6" />}
                                        </TouchableOpacity>
                                    )}
                                />
                            )}
                        </View>
                    </View>
                </Modal>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
    },
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: "center",
        paddingHorizontal: 20,
        height: 60,
        borderBottomWidth: 1,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        textAlign: "center",
    },
    saveButton: {
        backgroundColor: '#2563EB',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        position: 'absolute',
        right: 20,
    },
    saveButtonText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 14,
    },
    content: {
        flex: 1,
        padding: 20,
    },
    formGroup: {
        marginBottom: 24,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
        marginLeft: 4,
    },
    projectSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderRadius: 12,
        borderWidth: 1,
        paddingHorizontal: 16,
        height: 56,
    },
    projectSelectorText: {
        fontSize: 16,
        fontWeight: '500',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        borderWidth: 1,
        paddingHorizontal: 16,
        height: 52,
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        height: '100%',
        fontSize: 16,
    },
    textAreaContainer: {
        height: 120,
        alignItems: 'flex-start',
    },
    textArea: {
        flex: 1,
        width: '100%',
        height: '100%',
        fontSize: 16,
        paddingTop: 16,
        paddingBottom: 16,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    mediaActions: {
        flexDirection: 'row',
        gap: 12,
    },
    actionIconButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
    },
    photoScroll: {
        flexDirection: 'row',
    },
    photoPreviewWrapper: {
        width: 100,
        height: 100,
        borderRadius: 12,
        marginRight: 12,
        borderWidth: 1,
        overflow: 'hidden',
        position: 'relative',
    },
    photoPreview: {
        width: '100%',
        height: '100%',
    },
    removePhotoButton: {
        position: 'absolute',
        top: 6,
        right: 6,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(0,0,0,0.6)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    voiceRecordBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 16,
        borderWidth: 1,
        padding: 16,
        borderStyle: 'dashed',
    },
    voiceIconCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    voiceBtnText: {
        fontSize: 16,
        fontWeight: '500',
    },
    voiceRecordingActive: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderRadius: 16,
        borderWidth: 2,
        padding: 16,
        backgroundColor: '#FEF2F2',
    },
    recordingPulse: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(239, 68, 68, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    pulseInner: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#EF4444',
    },
    recordingText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#EF4444',
    },
    stopIconCircle: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
    },
    audioPlaybackCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderRadius: 12,
        borderWidth: 1,
        padding: 16,
    },
    audioInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    audioText: {
        fontSize: 16,
        fontWeight: '500',
    },
    deleteAudioBtn: {
        padding: 8,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '80%',
        minHeight: '50%',
        padding: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    projectItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 12,
        borderBottomWidth: 1,
        borderRadius: 8,
    },
    projectName: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    projectLocation: {
        fontSize: 13,
    },
    emptyProjects: {
        padding: 40,
        alignItems: 'center',
    }
});
