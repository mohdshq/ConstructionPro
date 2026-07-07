import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { useProjectsStore, ProjectSnag } from '../../../../store/projectsStore';
import { usePowerSyncSnag } from '../../../../lib/powersync/useSnags';
import { useThemeColors } from '../../../../store/useThemeColors';
import PhotoMarkup from '../../../../components/PhotoMarkup';
import BackButton from '../../../../components/BackButton';
import ProjectImage from '../../../../components/ProjectImage';
import { X, Camera, Trash2 } from 'lucide-react-native';
import { makeUnitCode } from '../../../../lib/units/unitCode';
import { makeSnagRef } from '../../../../lib/units/snagRef';
import { getSnagStatusBg, getSnagStatusColor, getSnagStatusLabel } from '../../../../lib/units/snagStatus';

export default function EditSnagScreen() {
    const router = useRouter();
    const { id, snagId } = useLocalSearchParams<{ id: string, snagId: string }>();
    const { getProject, updateSnag, deleteSnag } = useProjectsStore();
    const { colors } = useThemeColors();
    
    const project = getProject(id);
    const snag = usePowerSyncSnag(snagId);
    
    const [areaType, setAreaType] = useState<ProjectSnag['areaType']>('unit');
    const [severity, setSeverity] = useState<ProjectSnag['severity']>('minor');
    const [trade, setTrade] = useState<string>('');
    const [description, setDescription] = useState<string>('');
    const [status, setStatus] = useState<ProjectSnag['status']>('open');
    const [contextPhoto, setContextPhoto] = useState<string | null>(null);
    const [detailPhoto, setDetailPhoto] = useState<string | null>(null);
    const [markupPhoto, setMarkupPhoto] = useState<{uri: string, target: 'context' | 'detail'} | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const hydratedSnagId = useRef<string | null>(null);

    // Initialize from loaded snag
    useEffect(() => {
        if (snag && hydratedSnagId.current !== snag.id) {
            setAreaType(snag.areaType);
            setSeverity(snag.severity);
            setTrade(snag.trade || '');
            setDescription(snag.description);
            setStatus(snag.status);
            setContextPhoto(snag.photos && snag.photos[0] ? snag.photos[0] : null);
            setDetailPhoto(snag.photos && snag.photos[1] ? snag.photos[1] : null);
            hydratedSnagId.current = snag.id;
        }
    }, [snag]);

    if (!project || !snag) {
        return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" color={colors.primary} /></View>;
    }

    const building = project.buildings?.find(b => b.id === snag.buildingId);
    const unitCode = snag.legacyCode || makeUnitCode(snag.floor, snag.flat, project, building);
    const snagRef = makeSnagRef(unitCode, snag.seq);

    const handlePickImage = async (target: 'context' | 'detail') => {
        Alert.alert(
            "Add Photo",
            "Choose a source",
            [
                {
                    text: "Take Photo",
                    onPress: async () => {
                        const { status } = await ImagePicker.requestCameraPermissionsAsync();
                        if (status !== 'granted') {
                            Alert.alert("Permission Denied", "Camera permission is needed to take photos");
                            return;
                        }
                        const result = await ImagePicker.launchCameraAsync({
                            mediaTypes: ['images'],
                            allowsEditing: true,
                            aspect: [4, 3],
                            quality: 0.6,
                            base64: true,
                        });
                        if (!result.canceled && result.assets[0].base64) {
                            setMarkupPhoto({ uri: `data:image/jpeg;base64,${result.assets[0].base64}`, target });
                        }
                    }
                },
                {
                    text: "Choose from Library",
                    onPress: async () => {
                        const result = await ImagePicker.launchImageLibraryAsync({
                            mediaTypes: ['images'],
                            allowsEditing: true,
                            aspect: [4, 3],
                            quality: 0.6,
                            base64: true,
                        });
                        if (!result.canceled && result.assets[0].base64) {
                            setMarkupPhoto({ uri: `data:image/jpeg;base64,${result.assets[0].base64}`, target });
                        }
                    }
                },
                {
                    text: "Cancel",
                    style: "cancel"
                }
            ]
        );
    };

    const handleSave = async () => {
        if (!description.trim()) {
            Alert.alert("Validation Error", "Description is required.");
            return;
        }

        setIsSubmitting(true);
        
        const photos = [];
        if (contextPhoto) photos.push(contextPhoto);
        if (detailPhoto) photos.push(detailPhoto);

        const updates: Partial<ProjectSnag> = {
            areaType,
            severity,
            trade: trade.trim() || undefined,
            description: description.trim(),
            photos,
            status,
        };

        try {
            await updateSnag(snagId, updates);
            Alert.alert("Success", "Snag updated successfully", [
                { text: "OK", onPress: () => router.back() }
            ]);
        } catch (e) {
            Alert.alert("Error", "Failed to update snag.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = () => {
        Alert.alert(
            "Delete Snag",
            "Are you sure you want to delete this snag? This action cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Delete", 
                    style: "destructive",
                    onPress: async () => {
                        setIsDeleting(true);
                        try {
                            await deleteSnag(snagId);
                            router.back();
                        } catch (e) {
                            Alert.alert("Error", "Failed to delete snag.");
                        } finally {
                            setIsDeleting(false);
                        }
                    }
                }
            ]
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]} >
                <BackButton />
                <Text style={[styles.headerTitle, { color: colors.text }]}>{snagRef}</Text>
                <TouchableOpacity onPress={handleSave} disabled={isSubmitting || isDeleting}>
                    {isSubmitting ? (
                        <ActivityIndicator color={colors.primary} />
                    ) : (
                        <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 16 }}>Save</Text>
                    )}
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <View style={styles.formGroup}>
                        <Text style={[styles.label, { color: colors.text, marginBottom: 8 }]}>Status</Text>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                            {['open', 'in_progress', 'closed'].map((s) => {
                                const isSelected = status === s;
                                return (
                                    <TouchableOpacity 
                                        key={s} 
                                        style={[
                                            styles.statusChip, 
                                            isSelected && { backgroundColor: getSnagStatusBg(s as ProjectSnag['status']), borderColor: getSnagStatusColor(s as ProjectSnag['status']) }
                                        ]}
                                        onPress={() => setStatus(s as ProjectSnag['status'])}
                                    >
                                        <Text style={[
                                            styles.chipText, 
                                            isSelected && { color: getSnagStatusColor(s as ProjectSnag['status']), fontWeight: '600' }
                                        ]}>{getSnagStatusLabel(s as ProjectSnag['status'])}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>
                </View>

                <View style={styles.formGroup}>
                    <Text style={[styles.label, { color: colors.text }]}>Description *</Text>
                    <TextInput
                        style={[styles.textArea, { color: colors.text, backgroundColor: colors.inputBackground, borderColor: colors.border }]}
                        placeholder="Describe the issue..."
                        placeholderTextColor={colors.textMuted}
                        value={description}
                        onChangeText={setDescription}
                        multiline
                        textAlignVertical="top"
                    />
                </View>

                <View style={styles.formGroup}>
                    <Text style={[styles.label, { color: colors.text }]}>Severity</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row' }}>
                        {['critical', 'major', 'minor', 'cosmetic'].map(s => (
                            <TouchableOpacity 
                                key={s} 
                                style={[styles.chip, severity === s && { backgroundColor: colors.primary }]}
                                onPress={() => setSeverity(s as any)}
                            >
                                <Text style={[styles.chipText, severity === s && { color: '#fff' }, {textTransform: 'capitalize'}]}>{s}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                <View style={styles.formGroup}>
                    <Text style={[styles.label, { color: colors.text }]}>Area Type</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row' }}>
                        {['unit', 'elevation', 'parking', 'landscape', 'roof', 'mep', 'common'].map(type => (
                            <TouchableOpacity 
                                key={type} 
                                style={[styles.chip, areaType === type && { backgroundColor: colors.primary }]}
                                onPress={() => setAreaType(type as any)}
                            >
                                <Text style={[styles.chipText, areaType === type && { color: '#fff' }]}>{type}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                <View style={styles.formGroup}>
                    <Text style={[styles.label, { color: colors.text }]}>Trade (Optional)</Text>
                    <TextInput
                        style={[styles.input, { color: colors.text, backgroundColor: colors.inputBackground, borderColor: colors.border }]}
                        placeholder="e.g. Electrical, MEP, Civil"
                        placeholderTextColor={colors.textMuted}
                        value={trade}
                        onChangeText={setTrade}
                    />
                </View>

                <View style={styles.formGroup}>
                    <Text style={[styles.label, { color: colors.text }]}>Photos (Max 2)</Text>
                    <View style={{ gap: 16 }}>
                        <View style={{ alignItems: 'flex-start' }}>
                            <Text style={[styles.photoSubtext, { color: colors.text, marginBottom: 8 }]}>Context</Text>
                            <TouchableOpacity style={[styles.logoPickerFull, { borderColor: colors.border }]} onPress={() => contextPhoto ? setMarkupPhoto({ uri: contextPhoto, target: 'context' }) : handlePickImage('context')}>
                                {contextPhoto ? <ProjectImage photoUri={contextPhoto} style={styles.logoPreview} resizeMode="cover" /> : <Camera size={24} color={colors.textMuted} />}
                                {contextPhoto && (
                                    <TouchableOpacity style={styles.removeLogoBtn} onPress={(e) => { e.stopPropagation(); setContextPhoto(null); }}>
                                        <X size={12} color="#FFF" />
                                    </TouchableOpacity>
                                )}
                            </TouchableOpacity>
                        </View>
                        <View style={{ alignItems: 'flex-start' }}>
                            <Text style={[styles.photoSubtext, { color: colors.text, marginBottom: 8 }]}>Detail</Text>
                            <TouchableOpacity style={[styles.logoPickerFull, { borderColor: colors.border }]} onPress={() => detailPhoto ? setMarkupPhoto({ uri: detailPhoto, target: 'detail' }) : handlePickImage('detail')}>
                                {detailPhoto ? <ProjectImage photoUri={detailPhoto} style={styles.logoPreview} resizeMode="cover" /> : <Camera size={24} color={colors.textMuted} />}
                                {detailPhoto && (
                                    <TouchableOpacity style={styles.removeLogoBtn} onPress={(e) => { e.stopPropagation(); setDetailPhoto(null); }}>
                                        <X size={12} color="#FFF" />
                                    </TouchableOpacity>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                <TouchableOpacity 
                    style={styles.deleteButton} 
                    onPress={handleDelete}
                    disabled={isDeleting || isSubmitting}
                >
                    {isDeleting ? (
                        <ActivityIndicator color="#EF4444" />
                    ) : (
                        <>
                            <Trash2 size={20} color="#EF4444" />
                            <Text style={styles.deleteButtonText}>Delete Snag</Text>
                        </>
                    )}
                </TouchableOpacity>

                <View style={{ height: 60 }} />
            </ScrollView>

            {markupPhoto && (
                <PhotoMarkup 
                    visible={true}
                    imageUri={markupPhoto.uri}
                    onSkip={() => {
                        if (markupPhoto.target === 'context') setContextPhoto(markupPhoto.uri);
                        else setDetailPhoto(markupPhoto.uri);
                        setMarkupPhoto(null);
                    }}
                    onDone={(base64) => {
                        if (markupPhoto.target === 'context') setContextPhoto(base64);
                        else setDetailPhoto(base64);
                        setMarkupPhoto(null);
                    }}
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
    content: { padding: 16 },
    formGroup: { marginBottom: 20 },
    label: { fontSize: 14, fontWeight: '500', marginBottom: 8 },
    input: {
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 12,
        height: 44,
        fontSize: 16,
    },
    textArea: {
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingTop: 12,
        minHeight: 100,
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
    statusChip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(150,150,150,0.3)',
    },
    chipText: { fontSize: 14, color: '#777' },
    logoPickerFull: {
        width: '100%',
        aspectRatio: 4/3,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    logoPreview: { width: '100%', height: '100%' },
    removeLogoBtn: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: 'rgba(0,0,0,0.6)',
        borderRadius: 12,
        padding: 4,
    },
    photoSubtext: { fontSize: 12 },
    deleteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        marginTop: 20,
        gap: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#EF4444',
    },
    deleteButtonText: {
        color: '#EF4444',
        fontSize: 16,
        fontWeight: '600',
    }
});
