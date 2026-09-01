import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect, useMemo } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { useProjectsStore, ProjectSnag } from '../../../../store/projectsStore';
import { useThemeColors } from '../../../../store/useThemeColors';
import { useAuthStore } from '../../../../store/useAuthStore';
import { attachmentQueue } from '../../../../lib/attachments/attachmentQueue';
import { classifyMediaSource } from '../../../../lib/attachments/resolveMediaUri';
import PhotoMarkup from '../../../../components/PhotoMarkup';
import BackButton from '../../../../components/BackButton';
import ProjectImage from '../../../../components/ProjectImage';
import { Plus, X, Camera } from 'lucide-react-native';
import { makeUnitCode } from '../../../../lib/units/unitCode';
import { makeSnagRef } from '../../../../lib/units/snagRef';
import PickerDropdown from '../report/components/PickerDropdown';
import { ROOM_PRESETS } from '../../../../lib/units/roomPresets';
import { normalizeName, namesMatch } from '../../../../lib/units/normalizeName';
import { usePowerSyncProject } from '../../../../lib/powersync/useProjects';

export default function CreateSnagScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const { getProject, addSnag, addKnownRoom } = useProjectsStore();
    const { colors } = useThemeColors();
    const user = useAuthStore(s => s.user);
    
    const { data: powerSyncProject } = usePowerSyncProject(id);
    const project = powerSyncProject || getProject(id);
    const buildings = Array.isArray(project?.buildings) ? project.buildings : [];

    const roomOptions = useMemo(() => {
        const list = [...ROOM_PRESETS];
        const knownRooms = Array.isArray(project?.knownRooms) ? project.knownRooms : [];
        for (const kr of knownRooms) {
            if (!list.some(p => namesMatch(p, kr))) {
                list.push(kr);
            }
        }
        return list;
    }, [project?.knownRooms]);
    
    const [buildingId, setBuildingId] = useState<string>('');
    const [floor, setFloor] = useState<string>('');
    const [flat, setFlat] = useState<string>('');
    const [areaType, setAreaType] = useState<ProjectSnag['areaType']>('unit');

    const onAreaTypeChange = (val: string) => {
        setAreaType(val as ProjectSnag['areaType']);
        if (val !== 'unit') setFlat('');
    };
    const [severity, setSeverity] = useState<ProjectSnag['severity']>('minor');
    const [trade, setTrade] = useState<string>('');
    const [room, setRoom] = useState<string>('');
    const [description, setDescription] = useState<string>('');
    const [contextPhoto, setContextPhoto] = useState<string | null>(null);
    const [detailPhoto, setDetailPhoto] = useState<string | null>(null);
    const [markupPhoto, setMarkupPhoto] = useState<{uri: string, target: 'context' | 'detail'} | null>(null);
    
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleRoomSelect = async (val: string) => {
        const normalized = normalizeName(val);
        // Only attempt to add if it's not empty
        if (normalized) {
            const result = await addKnownRoom(id, normalized);
            if (result === 'exists' && val !== normalized) {
                // Not strictly necessary to alert here, but user asked for "already exists" if custom
                // Wait, if it already exists, just silently select the existing one or alert.
                // Let's only alert if it's a genuine custom entry and it matches an existing one.
                // Actually, the user asked for a lightweight notice if it returns 'exists'.
                // If it's a preset selected from the dropdown, `addKnownRoom` will be called, it returns 'exists'.
                // A toast might be annoying on normal selection. The prompt says:
                // "On custom room entry (the allowCustom path of PickerDropdown): normalize via normalizeName, then call addKnownRoom. If it returns exists, show a lightweight notice ... and select the existing entry"
                // PickerDropdown calls `onSelect` with the value. There's no separate event for custom vs select.
                // I will alert if the exact `val` is not in `roomOptions` initially but `result === 'exists'`.
                if (result === 'exists' && !roomOptions.includes(val)) {
                    Alert.alert("Notice", "This room already exists.");
                }
            }
        }
        setRoom(normalized);
    };

    if (!project) {
        return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><Text>Project not found</Text></View>;
    }

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
                        });
                        if (!result.canceled && result.assets[0]?.uri) {
                            setMarkupPhoto({ uri: result.assets[0].uri, target });
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
                        });
                        if (!result.canceled && result.assets[0]?.uri) {
                            setMarkupPhoto({ uri: result.assets[0].uri, target });
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

    const persistSnagPhoto = async (fileUri: string, target: 'context' | 'detail') => {
        if (classifyMediaSource(fileUri) === 'attachment_ref') {
            if (target === 'context') setContextPhoto(fileUri);
            else setDetailPhoto(fileUri);
            return;
        }
        try {
            const attId = await attachmentQueue.generateAttachmentId();
            const attachment = await attachmentQueue.saveFile({
                id: attId,
                data: fileUri,
                fileExtension: 'jpg',
                mediaType: 'image/jpeg',
                metaData: JSON.stringify({
                    kind: 'report_photo',
                    userId: user?.id || 'anonymous',
                    projectId: id,
                }),
            });
            if (target === 'context') setContextPhoto(attachment.filename);
            else setDetailPhoto(attachment.filename);
        } catch (e) {
            console.warn('[Snags] Failed to queue snag photo attachment:', e);
            if (target === 'context') setContextPhoto(fileUri);
            else setDetailPhoto(fileUri);
        }
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

        const snagData: Omit<ProjectSnag, 'id' | 'seq' | 'createdAt'> = {
            projectId: id,
            buildingId: buildingId || undefined,
            floor: floor ? parseInt(floor, 10) : undefined,
            flat: flat ? parseInt(flat, 10) : undefined,
            areaType,
            severity,
            trade: trade.trim() || undefined,
            room: room.trim() || undefined,
            description: description.trim(),
            photos,
            status: 'open',
        };

        const newSeq = await addSnag(snagData);
        setIsSubmitting(false);

        if (newSeq) {
            const building = buildings.find(b => b.id === buildingId);
            const unitCode = makeUnitCode(
                snagData.floor, 
                snagData.flat, 
                project, 
                building, 
                snagData.areaType
            );
            const snagRef = makeSnagRef(unitCode, newSeq);
            Alert.alert(
                "Success", 
                `Snag created successfully!\nRef: ${snagRef}`,
                [
                    {
                        text: "Add Another",
                        onPress: () => {
                            setSeverity('minor');
                            setTrade('');
                            setRoom('');
                            setDescription('');
                            setContextPhoto(null);
                            setDetailPhoto(null);
                        }
                    },
                    {
                        text: "Done",
                        onPress: () => router.back()
                    }
                ]
            );
        } else {
            Alert.alert("Error", "Failed to save snag.");
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]} >
                <BackButton />
                <Text style={[styles.headerTitle, { color: colors.text }]}>New Snag</Text>
                <TouchableOpacity onPress={handleSave} disabled={isSubmitting}>
                    {isSubmitting ? (
                        <ActivityIndicator color={colors.primary} />
                    ) : (
                        <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 16 }}>Save</Text>
                    )}
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
                {buildings.length > 0 && (
                    <View style={styles.formGroup}>
                        <Text style={[styles.label, { color: colors.text }]}>Building / Tower</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row' }}>
                            <TouchableOpacity 
                                style={[styles.chip, buildingId === '' && { backgroundColor: colors.primary }]}
                                onPress={() => setBuildingId('')}
                            >
                                <Text style={[styles.chipText, buildingId === '' && { color: '#fff' }]}>None</Text>
                            </TouchableOpacity>
                            {buildings.map(b => (
                                <TouchableOpacity 
                                    key={b.id} 
                                    style={[styles.chip, buildingId === b.id && { backgroundColor: colors.primary }]}
                                    onPress={() => setBuildingId(b.id)}
                                >
                                    <Text style={[styles.chipText, buildingId === b.id && { color: '#fff' }]}>{b.code} {b.name ? `- ${b.name}` : ''}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                )}

                <View style={{ flexDirection: 'row', gap: 16 }}>
                    <View style={[styles.formGroup, { flex: 1 }]}>
                        <Text style={[styles.label, { color: colors.text }]}>Floor</Text>
                        <TextInput
                            style={[styles.input, { color: colors.text, backgroundColor: colors.inputBackground, borderColor: colors.border }]}
                            placeholder="e.g. 5"
                            placeholderTextColor={colors.textMuted}
                            value={floor}
                            onChangeText={setFloor}
                            keyboardType="numeric"
                        />
                    </View>
                    <View style={[styles.formGroup, { flex: 1 }]}>
                        <Text style={[styles.label, { color: colors.text }]}>Flat / Unit</Text>
                        <TextInput
                            style={[
                                styles.input, 
                                { color: colors.text, backgroundColor: colors.inputBackground, borderColor: colors.border },
                                areaType !== 'unit' && styles.inputDisabled
                            ]}
                            placeholder={areaType === 'unit' ? "e.g. 1" : "—"}
                            placeholderTextColor={colors.textMuted}
                            value={areaType === 'unit' ? flat : ''}
                            onChangeText={setFlat}
                            keyboardType="numeric"
                            editable={areaType === 'unit'}
                        />
                        <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 4 }}>Unit number on the floor</Text>
                    </View>
                </View>

                <View style={styles.formGroup}>
                    <Text style={[styles.label, { color: colors.text }]}>Area Type</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row' }}>
                        {['unit', 'elevation', 'parking', 'landscape', 'roof', 'mep', 'common'].map(type => (
                            <TouchableOpacity 
                                key={type} 
                                style={[styles.chip, areaType === type && { backgroundColor: colors.primary }]}
                                onPress={() => onAreaTypeChange(type)}
                            >
                                <Text style={[styles.chipText, areaType === type && { color: '#fff' }]}>{type}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
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
                    <Text style={[styles.label, { color: colors.text }]}>Room (Optional)</Text>
                    <PickerDropdown
                        value={room}
                        options={roomOptions}
                        allowCustom
                        onSelect={handleRoomSelect}
                        placeholder="Select or type a room"
                        colors={colors}
                    />
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
                    <Text style={[styles.label, { color: colors.text }]}>Photos (Max 2)</Text>
                    <View style={{ flexDirection: 'row', gap: 16 }}>
                        <View style={{ flex: 1, alignItems: 'center' }}>
                            <Text style={[styles.photoSubtext, { color: colors.text, marginBottom: 8 }]}>Context</Text>
                            <TouchableOpacity style={[styles.logoPicker, { borderColor: colors.border }]} onPress={() => contextPhoto ? setMarkupPhoto({ uri: contextPhoto, target: 'context' }) : handlePickImage('context')}>
                                {contextPhoto ? <ProjectImage photoUri={contextPhoto} projectId={id} style={styles.logoPreview} resizeMode="cover" /> : <Camera size={24} color={colors.textMuted} />}
                                {contextPhoto && (
                                    <TouchableOpacity style={styles.removeLogoBtn} onPress={(e) => { e.stopPropagation(); setContextPhoto(null); }}>
                                        <X size={12} color="#FFF" />
                                    </TouchableOpacity>
                                )}
                            </TouchableOpacity>
                        </View>
                        <View style={{ flex: 1, alignItems: 'center' }}>
                            <Text style={[styles.photoSubtext, { color: colors.text, marginBottom: 8 }]}>Detail</Text>
                            <TouchableOpacity style={[styles.logoPicker, { borderColor: colors.border }]} onPress={() => detailPhoto ? setMarkupPhoto({ uri: detailPhoto, target: 'detail' }) : handlePickImage('detail')}>
                                {detailPhoto ? <ProjectImage photoUri={detailPhoto} projectId={id} style={styles.logoPreview} resizeMode="cover" /> : <Camera size={24} color={colors.textMuted} />}
                                {detailPhoto && (
                                    <TouchableOpacity style={styles.removeLogoBtn} onPress={(e) => { e.stopPropagation(); setDetailPhoto(null); }}>
                                        <X size={12} color="#FFF" />
                                    </TouchableOpacity>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>

            {markupPhoto && (
                <PhotoMarkup 
                    visible={true}
                    imageUri={markupPhoto.uri}
                    onSkip={() => {
                        persistSnagPhoto(markupPhoto.uri, markupPhoto.target);
                        setMarkupPhoto(null);
                    }}
                    onDone={(fileUri) => {
                        persistSnagPhoto(fileUri, markupPhoto.target);
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
    inputDisabled: {
        backgroundColor: '#F1F5F9',
        color: '#94A3B8',
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
    chipText: { fontSize: 14, color: '#777' },
    logoPicker: {
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
});
