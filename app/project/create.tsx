import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, SafeAreaView, Platform, KeyboardAvoidingView } from 'react-native';
import { ArrowLeft, Image as ImageIcon, MapPin, Building2, User, FileText, DollarSign, CalendarDays, Briefcase, Hash } from "lucide-react-native";
import BackButton from "../../components/BackButton";
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, createElement, useEffect } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { useProjectsStore } from '../../store/projectsStore';
import { useThemeColors } from '../../store/useThemeColors';
import { useAuthStore } from '../../store/useAuthStore';
import { uploadPhoto } from '../../lib/supabaseSync';
import { ActivityIndicator, Alert } from 'react-native';
import ProjectImage from '../../components/ProjectImage';

export default function CreateProjectScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const { addProject, updateProject, getProject } = useProjectsStore();
    const { colors } = useThemeColors();

    const [name, setName] = useState('');
    const [location, setLocation] = useState('');
    const [client, setClient] = useState('');
    const [description, setDescription] = useState('');
    const [contractValue, setContractValue] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [projectManager, setProjectManager] = useState('');
    const [referenceNumber, setReferenceNumber] = useState('');
    const [photoUri, setPhotoUri] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { user } = useAuthStore();

    // Pre-fill if editing
    useEffect(() => {
        if (id) {
            const project = getProject(id);
            if (project) {
                setName(project.name);
                setLocation(project.location || '');
                setClient(project.client || '');
                setDescription(project.description || '');
                setContractValue(project.contractValue || '');
                setStartDate(project.startDate || '');
                setEndDate(project.endDate || '');
                setProjectManager(project.projectManager || '');
                setReferenceNumber(project.referenceNumber || '');
                setPhotoUri(project.photoUri || null);
            }
        }
    }, [id, getProject]);

    const handlePickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [16, 9],
            quality: 0.8,
        });

        if (!result.canceled) {
            setPhotoUri(result.assets[0].uri);
        }
    };

    const handleCreate = async () => {
        if (!name.trim()) return;
        setIsSubmitting(true);

        let finalPhotoUri = photoUri;
        if (photoUri && (photoUri.includes('://') || photoUri.startsWith('data:') || photoUri.startsWith('blob:'))) {
            try {
                if (user?.id) {
                    finalPhotoUri = await uploadPhoto('report-photos', user.id, photoUri, { prefix: 'project_cover' });
                }
            } catch (e: any) {
                Alert.alert('Upload Failed', 'Failed to upload project cover image. ' + e.message);
                setIsSubmitting(false);
                return;
            }
        }

        const projectData = {
            name: name.trim(),
            location: location.trim(),
            client: client.trim(),
            description: description.trim() || undefined,
            contractValue: contractValue.trim() || undefined,
            startDate: startDate.trim() || undefined,
            endDate: endDate.trim() || undefined,
            projectManager: projectManager.trim() || undefined,
            referenceNumber: referenceNumber.trim() || undefined,
            photoUri: finalPhotoUri || undefined,
        };

        if (id) {
            updateProject(id, projectData);
        } else {
            addProject({ ...projectData, status: 'planning' });
        }

        setIsSubmitting(false);
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
                    <Text style={[styles.headerTitle, { color: colors.text }]}>{id ? 'Edit Project' : 'New Project'}</Text>
                    <TouchableOpacity
                        style={[styles.saveButton, (!name.trim() || isSubmitting) && { backgroundColor: colors.border }]}
                        onPress={handleCreate}
                        disabled={!name.trim() || isSubmitting}
                    >
                        {isSubmitting ? (
                            <ActivityIndicator size="small" color={colors.textMuted} />
                        ) : (
                            <Text style={[styles.saveButtonText, !name.trim() && { color: colors.textMuted }]}>{id ? 'Save' : 'Create'}</Text>
                        )}
                    </TouchableOpacity>
                </View>

                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                    <TouchableOpacity style={[styles.photoPickerContainer, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={handlePickImage} activeOpacity={0.8}>
                        {photoUri ? (
                            <ProjectImage photoUri={photoUri} style={styles.photoPreview} resizeMode="cover" />
                        ) : (
                            <View style={[styles.photoPlaceholder, { backgroundColor: colors.background }]}>
                                <View style={styles.photoIconCircle}>
                                    <ImageIcon size={32} color="#3B82F6" />
                                </View>
                                <Text style={[styles.photoText, { color: colors.text }]}>Add Project Cover</Text>
                                <Text style={[styles.photoSubtext, { color: colors.textMuted }]}>16:9 ratio recommended</Text>
                            </View>
                        )}
                    </TouchableOpacity>

                    {/* Form Fields */}
                    <View style={styles.formGroup}>
                        <Text style={[styles.label, { color: colors.text }]}>Project Name *</Text>
                        <View style={[styles.inputContainer, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                            <Building2 size={20} color={colors.textMuted} style={styles.inputIcon} />
                            <TextInput
                                style={[styles.input, { color: colors.text }]}
                                placeholder="e.g. Downtown Highrise"
                                placeholderTextColor={colors.textMuted}
                                value={name}
                                onChangeText={setName}
                                autoCapitalize="words"
                            />
                        </View>
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={[styles.label, { color: colors.text }]}>Reference Number</Text>
                        <View style={[styles.inputContainer, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                            <Hash size={20} color={colors.textMuted} style={styles.inputIcon} />
                            <TextInput
                                style={[styles.input, { color: colors.text }]}
                                placeholder="e.g. PRJ-2026-001"
                                placeholderTextColor={colors.textMuted}
                                value={referenceNumber}
                                onChangeText={setReferenceNumber}
                                autoCapitalize="characters"
                                maxLength={50}
                            />
                        </View>
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={[styles.label, { color: colors.text }]}>Location</Text>
                        <View style={[styles.inputContainer, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                            <MapPin size={20} color={colors.textMuted} style={styles.inputIcon} />
                            <TextInput
                                style={[styles.input, { color: colors.text }]}
                                placeholder="Site address or coordinates"
                                placeholderTextColor={colors.textMuted}
                                value={location}
                                onChangeText={setLocation}
                                autoCapitalize="words"
                            />
                        </View>
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={[styles.label, { color: colors.text }]}>Client / Owner</Text>
                        <View style={[styles.inputContainer, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                            <User size={20} color={colors.textMuted} style={styles.inputIcon} />
                            <TextInput
                                style={[styles.input, { color: colors.text }]}
                                placeholder="Company or person name"
                                placeholderTextColor={colors.textMuted}
                                value={client}
                                onChangeText={setClient}
                                autoCapitalize="words"
                            />
                        </View>
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={[styles.label, { color: colors.text }]}>Contract Value</Text>
                        <View style={[styles.inputContainer, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                            <DollarSign size={20} color={colors.textMuted} style={styles.inputIcon} />
                            <TextInput
                                style={[styles.input, { color: colors.text }]}
                                placeholder="e.g. 5,000,000"
                                placeholderTextColor={colors.textMuted}
                                value={contractValue}
                                onChangeText={setContractValue}
                                keyboardType="numeric"
                            />
                        </View>
                    </View>

                    <View style={styles.row}>
                        <View style={[styles.formGroup, styles.flexHalf, { marginRight: 8 }]}>
                            <Text style={[styles.label, { color: colors.text }]}>Start Date</Text>
                            <View style={[styles.inputContainer, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                                <CalendarDays size={20} color={colors.textMuted} style={styles.inputIcon} />
                                {Platform.OS === 'web' ? createElement('input', {
                                    type: 'date', value: startDate, onChange: (e: any) => setStartDate(e.target.value),
                                    style: { flex: 1, backgroundColor: 'transparent', border: 'none', outline: 'none', fontSize: 16, fontFamily: 'inherit', color: colors.text }
                                }) : (
                                    <TextInput
                                        style={[styles.input, { color: colors.text }]}
                                        placeholder="YYYY-MM-DD"
                                        placeholderTextColor={colors.textMuted}
                                        value={startDate}
                                        onChangeText={setStartDate}
                                    />
                                )}
                            </View>
                        </View>
                        <View style={[styles.formGroup, styles.flexHalf, { marginLeft: 8 }]}>
                            <Text style={[styles.label, { color: colors.text }]}>End Date</Text>
                            <View style={[styles.inputContainer, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                                <CalendarDays size={20} color={colors.textMuted} style={styles.inputIcon} />
                                {Platform.OS === 'web' ? createElement('input', {
                                    type: 'date', value: endDate, onChange: (e: any) => setEndDate(e.target.value),
                                    style: { flex: 1, backgroundColor: 'transparent', border: 'none', outline: 'none', fontSize: 16, fontFamily: 'inherit', color: colors.text }
                                }) : (
                                    <TextInput
                                        style={[styles.input, { color: colors.text }]}
                                        placeholder="YYYY-MM-DD"
                                        placeholderTextColor={colors.textMuted}
                                        value={endDate}
                                        onChangeText={setEndDate}
                                    />
                                )}
                            </View>
                        </View>
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={[styles.label, { color: colors.text }]}>Project Manager</Text>
                        <View style={[styles.inputContainer, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                            <Briefcase size={20} color={colors.textMuted} style={styles.inputIcon} />
                            <TextInput
                                style={[styles.input, { color: colors.text }]}
                                placeholder="Manager's full name"
                                placeholderTextColor={colors.textMuted}
                                value={projectManager}
                                onChangeText={setProjectManager}
                                autoCapitalize="words"
                            />
                        </View>
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={[styles.label, { color: colors.text }]}>Project Description</Text>
                        <View style={[styles.inputContainer, styles.textAreaContainer, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                            <FileText size={20} color={colors.textMuted} style={[styles.inputIcon, { marginTop: 12 }]} />
                            <TextInput
                                style={[styles.textArea, { color: colors.text }]}
                                placeholder="Scope of work, key deliverables, etc."
                                placeholderTextColor={colors.textMuted}
                                value={description}
                                onChangeText={setDescription}
                                multiline
                                textAlignVertical="top"
                            />
                        </View>
                    </View>

                    <View style={{ height: 40 }} />
                </ScrollView>
            </KeyboardAvoidingView>
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
        alignItems: 'center',
        justifyContent: "center",
        paddingHorizontal: 20,
        height: 60,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
    },
    backButton: {
        padding: 8,
        marginLeft: -8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0F172A',
            textAlign: "center",
},
    saveButton: {
        backgroundColor: '#2563EB',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    saveButtonDisabled: {
        backgroundColor: '#94A3B8',
    },
    saveButtonText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 14,
    },
    content: {
        flex: 1,
        padding: 24,
    },
    photoPickerContainer: {
        width: '100%',
        height: 180,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        marginBottom: 24,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: '#E2E8F0',
        borderStyle: 'dashed',
    },
    photoPreview: {
        width: '100%',
        height: '100%',
    },
    photoPlaceholder: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F8FAFC',
    },
    photoIconCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#DBEAFE',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    photoText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#0F172A',
        marginBottom: 4,
    },
    photoSubtext: {
        fontSize: 13,
        color: '#64748B',
    },
    formGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#334155',
        marginBottom: 8,
        marginLeft: 4,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
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
        color: '#0F172A',
    },
    row: {
        flexDirection: 'row',
        width: '100%',
    },
    flexHalf: {
        flex: 1,
    },
    textAreaContainer: {
        height: 120,
        alignItems: 'flex-start',
    },
    textArea: {
        flex: 1,
        height: '100%',
        fontSize: 16,
        color: '#0F172A',
        paddingTop: 12,
        paddingBottom: 12,
    },
});
