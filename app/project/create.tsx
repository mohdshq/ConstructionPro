import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, SafeAreaView, Platform, KeyboardAvoidingView } from 'react-native';
import { ArrowLeft, Image as ImageIcon, MapPin, Building2, User, FileText, DollarSign, CalendarDays, Briefcase, Hash, Plus, X } from "lucide-react-native";
import BackButton from "../../components/BackButton";
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, createElement, useEffect } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { File } from 'expo-file-system';
import { Image } from 'expo-image';
import { useProjectsStore, Building } from '../../store/projectsStore';
import { useThemeColors } from '../../store/useThemeColors';
import { useAuthStore } from '../../store/useAuthStore';
import { ActivityIndicator, Alert } from 'react-native';
import ProjectImage from '../../components/ProjectImage';
import { attachmentQueue } from '@/lib/attachments/attachmentQueue';
import { classifyMediaSource } from '@/lib/attachments/resolveMediaUri';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

export default function CreateProjectScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const { addProject, updateProject, getProject, projects } = useProjectsStore();
    const { colors } = useThemeColors();

    const [name, setName] = useState('');
    const [location, setLocation] = useState('');
    const [client, setClient] = useState('');
    const [description, setDescription] = useState('');
    const [contractValue, setContractValue] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [projectManager, setProjectManager] = useState('');
    const [mainContractorName, setMainContractorName] = useState('');
    const [referenceNumber, setReferenceNumber] = useState('');
    const [photoUri, setPhotoUri] = useState<string | null>(null);
    const [initialPhotoUri, setInitialPhotoUri] = useState<string | null>(null);
    const [employerLogo, setEmployerLogo] = useState<string | null>(null);
    const [consultantLogo, setConsultantLogo] = useState<string | null>(null);
    const [contractorLogos, setContractorLogos] = useState<string[]>([]);
    const [buildings, setBuildings] = useState<Building[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { user } = useAuthStore();

    // Pre-fill if editing
    useEffect(() => {
        if (id) {
            const project = getProject(id);
            if (project) {
                setName(project.name);
                setLocation(project.location);
                setClient(project.client);
                setDescription(project.description || '');
                setContractValue(project.contractValue || '');
                setStartDate(project.startDate || '');
                setEndDate(project.endDate || '');
                setProjectManager(project.projectManager || '');
                setMainContractorName(project.mainContractorName || '');
                setReferenceNumber(project.referenceNumber || '');
                setPhotoUri(project.photoUri || null);
                setInitialPhotoUri(project.photoUri || null);
                setEmployerLogo(project.employerLogo || null);
                setConsultantLogo(project.consultantLogo || null);
                setContractorLogos(project.contractorLogos || []);
                setBuildings(project.buildings || []);
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

        if (!result.canceled && result.assets[0]) {
            const picked = result.assets[0];
            // Normalize to JPEG with 1920px max dimension (downscale only on long edge)
            const w = picked.width || 0;
            const h = picked.height || 0;
            const maxDim = Math.max(w, h);
            const actions = (maxDim > 1920)
                ? [{ resize: (w >= h) ? { width: 1920 } : { height: 1920 } }]
                : [];
            const manipulated = await ImageManipulator.manipulateAsync(
                picked.uri,
                actions,
                { format: ImageManipulator.SaveFormat.JPEG, compress: 0.8 }
            );

            // 10MB Size guard (report-photos bucket limit is 10MB)
            const f = new File(manipulated.uri);
            const size = f.size ?? (picked as any).fileSize ?? 0;

            if (size > 10 * 1024 * 1024) {
                Alert.alert('File Too Large', 'Maximum supported file size for cover photo is 10MB.');
                return;
            }

            setPhotoUri(manipulated.uri);
        }
    };

    const pickLogo = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.6,
            base64: true,
        });
        if (!result.canceled && result.assets[0].base64) {
            const uri = `data:image/jpeg;base64,${result.assets[0].base64}`;
            return uri;
        }
        return null;
    };

    const handleCreate = async () => {
        const trimmedName = name.trim();
        if (!trimmedName) return;

        const isDuplicate = projects.some(p => 
            p.id !== id && p.name.toLowerCase() === trimmedName.toLowerCase()
        );
        if (isDuplicate) {
            Alert.alert("Duplicate Project", "A project with this name already exists.");
            return;
        }

        const validBuildings = buildings.filter(b => b.code.trim());
        const hasDuplicateBuildingCodes = validBuildings.some((b, i) => 
            validBuildings.findIndex(other => other.code.trim().toLowerCase() === b.code.trim().toLowerCase()) !== i
        );
        if (hasDuplicateBuildingCodes) {
            Alert.alert("Duplicate Buildings", "Building codes must be unique.");
            return;
        }

        setIsSubmitting(true);

        const targetProjectId = id || uuidv4();
        let finalPhotoUri = photoUri;

        // Process cover photo through AttachmentQueue if it is a new/local URI
        if (photoUri && classifyMediaSource(photoUri) === 'direct_uri') {
            try {
                const attId = await attachmentQueue.generateAttachmentId();
                const file = new File(photoUri);
                const bytes = await file.bytes();
                const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);

                const attachment = await attachmentQueue.saveFile({
                    id: attId,
                    data: arrayBuffer,
                    fileExtension: 'jpg',
                    mediaType: 'image/jpeg',
                    metaData: JSON.stringify({
                        kind: 'project_cover',
                        userId: user?.id || 'anonymous',
                        projectId: targetProjectId,
                    }),
                });

                finalPhotoUri = attachment.filename;

                // If replacing an existing attachment cover, clean up the old one
                if (initialPhotoUri && classifyMediaSource(initialPhotoUri) === 'attachment_ref') {
                    const oldAttId = initialPhotoUri.split('.')[0];
                    try { await attachmentQueue.deleteFile({ id: oldAttId }); } catch (e) { console.warn('Failed to delete replaced cover:', e); }
                }
            } catch (e: any) {
                console.warn('[CreateProject] Failed to queue cover attachment:', e);
                // Keep local photoUri as fallback
            }
        }

        const projectData = {
            name: trimmedName,
            location: location.trim(),
            client: client.trim(),
            description: description.trim() || undefined,
            contractValue: contractValue.trim() || undefined,
            startDate: startDate.trim() || undefined,
            endDate: endDate.trim() || undefined,
            projectManager: projectManager.trim() || undefined,
            mainContractorName: mainContractorName.trim() || undefined,
            referenceNumber: referenceNumber.trim() || undefined,
            photoUri: finalPhotoUri || undefined,
            employerLogo: employerLogo || undefined,
            consultantLogo: consultantLogo || undefined,
            contractorLogos: contractorLogos.length > 0 ? contractorLogos : undefined,
            buildings: validBuildings,
        };

        if (id) {
            await updateProject(id, projectData);
        } else {
            await addProject({ ...projectData, status: 'planning' });
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
                            <ProjectImage photoUri={photoUri} projectId={id} style={styles.photoPreview} resizeMode="cover" />
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
                        <Text style={[styles.label, { color: colors.text }]}>Main Contractor Name</Text>
                        <View style={[styles.inputContainer, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                            <Building2 size={20} color={colors.textMuted} style={styles.inputIcon} />
                            <TextInput
                                style={[styles.input, { color: colors.text }]}
                                placeholder="e.g. Acme Construction Co."
                                placeholderTextColor={colors.textMuted}
                                value={mainContractorName}
                                onChangeText={setMainContractorName}
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

                    <View style={styles.formGroup}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <Text style={[styles.label, { color: colors.text, marginBottom: 0 }]}>Buildings / Towers</Text>
                            <TouchableOpacity onPress={() => setBuildings([...buildings, { id: uuidv4(), code: '' }])}>
                                <Text style={{ color: colors.primary, fontWeight: 'bold' }}>+ Add building</Text>
                            </TouchableOpacity>
                        </View>
                        
                        {buildings.map((building, index) => (
                            <View key={building.id} style={{ backgroundColor: colors.card, padding: 12, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: colors.border }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                    <Text style={{ color: colors.text, fontWeight: '600' }}>Building {index + 1}</Text>
                                    <TouchableOpacity onPress={() => setBuildings(buildings.filter(b => b.id !== building.id))}>
                                        <X size={16} color="#EF4444" />
                                    </TouchableOpacity>
                                </View>
                                
                                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.photoSubtext, { color: colors.textMuted, marginBottom: 4 }]}>Code (e.g. A, T1) *</Text>
                                        <TextInput
                                            style={[styles.input, { color: colors.text, height: 40, paddingHorizontal: 12, backgroundColor: colors.inputBackground, borderColor: colors.border }]}
                                            placeholder="Code"
                                            placeholderTextColor={colors.textMuted}
                                            value={building.code}
                                            onChangeText={(t) => {
                                                const newB = [...buildings];
                                                newB[index].code = t;
                                                setBuildings(newB);
                                            }}
                                        />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.photoSubtext, { color: colors.textMuted, marginBottom: 4 }]}>Name (Optional)</Text>
                                        <TextInput
                                            style={[styles.input, { color: colors.text, height: 40, paddingHorizontal: 12, backgroundColor: colors.inputBackground, borderColor: colors.border }]}
                                            placeholder="Name"
                                            placeholderTextColor={colors.textMuted}
                                            value={building.name || ''}
                                            onChangeText={(t) => {
                                                const newB = [...buildings];
                                                newB[index].name = t;
                                                setBuildings(newB);
                                            }}
                                        />
                                    </View>
                                </View>
                                
                                <View>
                                    <Text style={[styles.photoSubtext, { color: colors.textMuted, marginBottom: 4 }]}>Floor Spec (e.g. 3B+G+26+R - reference only)</Text>
                                    <TextInput
                                        style={[styles.input, { color: colors.text, height: 40, paddingHorizontal: 12, backgroundColor: colors.inputBackground, borderColor: colors.border }]}
                                        placeholder="Floor specification"
                                        placeholderTextColor={colors.textMuted}
                                        value={building.floorSpec || ''}
                                        onChangeText={(t) => {
                                            const newB = [...buildings];
                                            newB[index].floorSpec = t;
                                            setBuildings(newB);
                                        }}
                                    />
                                </View>
                            </View>
                        ))}
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={[styles.label, { color: colors.text }]}>Party Logos</Text>
                        
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
                            <View style={{ flex: 1, marginRight: 8, alignItems: 'center' }}>
                                <Text style={[styles.photoSubtext, { color: colors.text, marginBottom: 8 }]}>Employer</Text>
                                <TouchableOpacity style={[styles.logoPicker, { borderColor: colors.border }]} onPress={async () => { const uri = await pickLogo(); if (uri) setEmployerLogo(uri); }}>
                                    {employerLogo ? <ProjectImage photoUri={employerLogo} projectId={id} style={styles.logoPreview} resizeMode="contain" /> : <Plus size={24} color={colors.textMuted} />}
                                    {employerLogo && (
                                        <TouchableOpacity style={styles.removeLogoBtn} onPress={() => setEmployerLogo(null)}>
                                            <X size={12} color="#FFF" />
                                        </TouchableOpacity>
                                    )}
                                </TouchableOpacity>
                            </View>

                            <View style={{ flex: 1, marginLeft: 8, alignItems: 'center' }}>
                                <Text style={[styles.photoSubtext, { color: colors.text, marginBottom: 8 }]}>Consultant</Text>
                                <TouchableOpacity style={[styles.logoPicker, { borderColor: colors.border }]} onPress={async () => { const uri = await pickLogo(); if (uri) setConsultantLogo(uri); }}>
                                    {consultantLogo ? <ProjectImage photoUri={consultantLogo} projectId={id} style={styles.logoPreview} resizeMode="contain" /> : <Plus size={24} color={colors.textMuted} />}
                                    {consultantLogo && (
                                        <TouchableOpacity style={styles.removeLogoBtn} onPress={() => setConsultantLogo(null)}>
                                            <X size={12} color="#FFF" />
                                        </TouchableOpacity>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>

                        <Text style={[styles.photoSubtext, { color: colors.text, marginBottom: 8 }]}>Contractor(s) - Max 4</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                            {contractorLogos.map((uri, idx) => (
                                <View key={idx} style={[styles.logoPicker, { borderColor: colors.border }]}>
                                    <ProjectImage photoUri={uri} projectId={id} style={styles.logoPreview} resizeMode="contain" />
                                    <TouchableOpacity style={styles.removeLogoBtn} onPress={() => setContractorLogos(prev => prev.filter((_, i) => i !== idx))}>
                                        <X size={12} color="#FFF" />
                                    </TouchableOpacity>
                                </View>
                            ))}
                            {contractorLogos.length < 4 && (
                                <TouchableOpacity style={[styles.logoPicker, { borderColor: colors.border }]} onPress={async () => { const uri = await pickLogo(); if (uri) setContractorLogos(prev => [...prev, uri]); }}>
                                    <Plus size={24} color={colors.textMuted} />
                                </TouchableOpacity>
                            )}
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
    logoPicker: {
        width: 80,
        height: 80,
        borderRadius: 8,
        borderWidth: 1,
        borderStyle: 'dashed',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F8FAFC',
        overflow: 'hidden',
    },
    logoPreview: {
        width: '100%',
        height: '100%',
    },
    removeLogoBtn: {
        position: 'absolute',
        top: 4,
        right: 4,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: 'rgba(0,0,0,0.5)',
        alignItems: 'center',
        justifyContent: 'center',
    },
});
