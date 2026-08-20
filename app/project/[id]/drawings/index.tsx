import BackButton from "../../../../components/BackButton";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Modal, TextInput, SafeAreaView, Platform, ActionSheetIOS } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useProjectsStore, Drawing, DrawingFolder } from '../../../../store/projectsStore';
import { useState, useMemo } from 'react';
import { Folder, FileText, Image as ImageIcon, File, Plus, MoreVertical, ChevronRight, X, ArrowLeft, Trash2, Compass, FileSpreadsheet } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import { File as FSFile } from 'expo-file-system';
import { useThemeColors } from '../../../../store/useThemeColors';
import { usePowerSyncFolders } from '../../../../lib/powersync/useFolders';
import { usePowerSyncDrawings } from '../../../../lib/powersync/useDrawings';
import { usePowerSyncMembers } from '../../../../lib/powersync/useMembers';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { getSignedUrl } from '../../../../lib/supabaseSync';
import { useAuthStore } from '../../../../store/useAuthStore';
import { attachmentQueue } from '@/lib/attachments/attachmentQueue';
import * as ImageManipulator from 'expo-image-manipulator';
import { resolveDrawingUploadMeta } from '@/lib/attachments/drawingMime';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

type ListItem = 
  | { type: 'folder'; data: DrawingFolder }
  | { type: 'file'; data: Drawing };

export default function DrawingsBrowserScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { getProject, addFolder, addDrawing, deleteFolder, deleteDrawing } = useProjectsStore();
    const folders = usePowerSyncFolders(id);
    const drawings = usePowerSyncDrawings(id);
    const members = usePowerSyncMembers(id);
    const authState = useAuthStore.getState();
    const userId = authState.user?.id;
    const authorName = authState.profile?.full_name || authState.user?.user_metadata?.full_name || authState.user?.email || 'Unknown';
    const { colors } = useThemeColors();

    const project = useMemo(() => getProject(id), [id, getProject]);
    const isOwnerOrManager = useMemo(() => {
        if (!userId) return false;
        const currentMember = members.find(m => m.userId === userId);
        return currentMember?.role === 'owner' || currentMember?.role === 'manager';
    }, [userId, members]);
    const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
    
    // Modal states
    const [isActionMenuVisible, setIsActionMenuVisible] = useState(false);
    const [isFolderModalVisible, setIsFolderModalVisible] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    
    const [isRenameModalVisible, setIsRenameModalVisible] = useState(false);
    const [renameItem, setRenameItem] = useState<ListItem | null>(null);
    const [newName, setNewName] = useState('');

    // Fetch appropriate folders and files
    const currentFolders = useMemo(() => 
        folders.filter(f => f.projectId === id && (currentFolderId ? f.parentId === currentFolderId : !f.parentId)),
    [folders, id, currentFolderId]);

    const currentDrawings = useMemo(() => 
        drawings.filter(d => d.projectId === id && (currentFolderId ? d.folderId === currentFolderId : !d.folderId)),
    [drawings, id, currentFolderId]);

    const listData: ListItem[] = useMemo(() => {
        const fList: ListItem[] = currentFolders.map(f => ({ type: 'folder', data: f }));
        const dList: ListItem[] = currentDrawings.map(d => ({ type: 'file', data: d }));
        return [...fList, ...dList];
    }, [currentFolders, currentDrawings]);

    const currentFolder = useMemo(() => 
        currentFolderId ? folders.find(f => f.id === currentFolderId) : null,
    [currentFolderId, folders]);

    if (!project) return null;

    const handleCreateFolder = () => {
        if (!newFolderName.trim()) return;
        addFolder({
            projectId: project.id,
            name: newFolderName.trim(),
            parentId: currentFolderId || undefined
        });
        setNewFolderName('');
        setIsFolderModalVisible(false);
    };

    const handleRenameSubmit = () => {
        if (!renameItem || !newName.trim()) return;
        if (renameItem.type === 'folder') {
            useProjectsStore.getState().updateFolder(renameItem.data.id, { name: newName.trim() });
        } else {
            useProjectsStore.getState().updateDrawing(renameItem.data.id, { name: newName.trim() });
        }
        setIsRenameModalVisible(false);
        setRenameItem(null);
    };

    const handleUpload = async () => {
        setIsActionMenuVisible(false);
        if (!project) return;

        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['application/pdf', 'image/*', 'application/acad', '.dwg', '.dxf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
                copyToCacheDirectory: true
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const asset = result.assets[0];
                if (!userId) { Alert.alert('Error', 'You must be signed in to upload.'); return; }

                const uploadMeta = resolveDrawingUploadMeta(asset.name, asset.mimeType);

                // 25MB Size guard with fallback to FSFile size
                let size = asset.size;
                if (size === undefined || size === null) {
                    const f = new FSFile(asset.uri);
                    size = f.size ?? 0;
                }
                if (size > 25 * 1024 * 1024) {
                    Alert.alert('File Too Large', 'Maximum supported file size for offline drawing is 25MB.');
                    return;
                }

                try {
                    let sourceUri = asset.uri;
                    let fileExtension = uploadMeta.fileExtension;
                    let mediaType = uploadMeta.mediaType;

                    // Normalise image drawings to JPEG
                    if (uploadMeta.fileType === 'image') {
                        const manipulated = await ImageManipulator.manipulateAsync(
                            asset.uri,
                            [],
                            { format: ImageManipulator.SaveFormat.JPEG, compress: 0.8 }
                        );
                        sourceUri = manipulated.uri;
                        fileExtension = 'jpg';
                        mediaType = 'image/jpeg';
                    }

                    const attId = await attachmentQueue.generateAttachmentId();
                    const f = new FSFile(sourceUri);
                    const bytes = await f.bytes();
                    const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);

                    const drawingId = uuidv4();
                    const now = new Date().toISOString();

                    const attachment = await attachmentQueue.saveFile({
                        id: attId,
                        data: arrayBuffer,
                        fileExtension,
                        mediaType,
                        metaData: JSON.stringify({
                            kind: 'drawing',
                            userId,
                            projectId: project.id,
                        }),
                        updateHook: async (tx, att) => {
                            await tx.execute(
                                `INSERT INTO drawings (id, project_id, user_id, folder_id, name, type, storage_path, size, uploaded_at, author)
                                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                                [
                                    drawingId,
                                    project.id,
                                    userId,
                                    currentFolderId || null,
                                    asset.name,
                                    uploadMeta.fileType,
                                    att.filename,
                                    size || 0,
                                    now,
                                    authorName,
                                ]
                            );
                        },
                    });

                    // Update in-memory Zustand store and log activity
                    useProjectsStore.setState((state) => ({
                        drawings: [
                            ...state.drawings,
                            {
                                id: drawingId,
                                projectId: project.id,
                                folderId: currentFolderId || undefined,
                                name: asset.name,
                                type: uploadMeta.fileType,
                                uri: attachment.filename,
                                size: size || 0,
                                uploadedAt: now,
                                author: authorName,
                            },
                        ],
                    }));

                    await useProjectsStore.getState().addActivity({
                        projectId: project.id,
                        userId,
                        action: 'uploaded ' + asset.name,
                        entityType: 'drawing',
                        entityId: drawingId,
                    });
                } catch (e: any) {
                    console.error('Queue save failed:', e);
                    Alert.alert('Error', 'Could not save file locally: ' + (e.message ?? 'Unknown error'));
                }
            }
        } catch (error) {
            console.error('Error picking document:', error);
            Alert.alert('Error', 'Failed to pick document');
        }
    };

    const handlePlusPress = () => {
        setIsActionMenuVisible(true);
    };

    const handleItemOptions = (item: ListItem) => {
        const options: any[] = [
            { text: 'Cancel', style: 'cancel' },
        ];

        if (isOwnerOrManager) {
            options.push({ 
                text: 'Rename', 
                onPress: () => {
                    setRenameItem(item);
                    setNewName(item.data.name);
                    setIsRenameModalVisible(true);
                }
            });
        }

        if (item.type === 'file') {
            options.push({
                text: 'Share',
                onPress: async () => {
                    const drawing = item.data as Drawing;
                    try {
                        let fileUri = drawing.uri;

                        if (!fileUri.startsWith('http') && !fileUri.startsWith('file:')) {
                            const res = await getSignedUrl('drawings', drawing.uri);
                            if (!res.ok) {
                                if (res.reason === 'offline') {
                                    Alert.alert('Share Failed', 'You are offline. Connect to the internet to download this drawing for sharing.');
                                } else {
                                    Alert.alert('Share Failed', 'Could not prepare file for sharing');
                                }
                                return;
                            }
                            const signedUrl = res.url;
                            
                            const cacheUri = FileSystem.cacheDirectory + drawing.name;
                            const downloadResult = await FileSystem.downloadAsync(signedUrl, cacheUri);
                            fileUri = downloadResult.uri;
                        }

                        const isAvailable = await Sharing.isAvailableAsync();
                        if (isAvailable) {
                            await Sharing.shareAsync(fileUri);
                        } else {
                            Alert.alert('Share Failed', 'Sharing is not available on this device');
                        }
                    } catch (error: any) {
                        console.error('Error sharing file:', error);
                        Alert.alert('Share Failed', error.message || 'An error occurred while sharing the file.');
                    }
                }
            });
        }

        if (isOwnerOrManager) {
            options.push({ 
                text: 'Delete', 
                style: 'destructive', 
                onPress: () => {
                    if (item.type === 'folder') deleteFolder(item.data.id);
                    if (item.type === 'file') deleteDrawing(item.data.id);
                }
            });
        }

        // If non-manager viewing a folder with no options other than Cancel, do not show empty dialog
        if (options.length === 1 && item.type === 'folder') {
            return;
        }

        Alert.alert(
            'Options',
            `Manage ${item.type === 'folder' ? 'Folder' : 'File'}`,
            options
        );
    };

    const renderIcon = (item: ListItem) => {
        if (item.type === 'folder') return <Folder size={32} color="#0EA5E9" fill="#E0F2FE" />;
        const file = item.data as Drawing;
        if (file.type === 'pdf') return <FileText size={32} color="#EF4444" />;
        if (file.type === 'image') return <ImageIcon size={32} color="#10B981" />;
        if (file.type === 'cad') return <Compass size={32} color="#F59E0B" />;
        if (file.type === 'word') return <FileText size={32} color="#2563EB" />;
        if (file.type === 'excel') return <FileSpreadsheet size={32} color="#16A34A" />;
        return <File size={32} color="#64748B" />;
    };

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    const renderItem = ({ item }: { item: ListItem }) => (
        <TouchableOpacity 
            style={[styles.listItem, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => {
                if (item.type === 'folder') {
                    setCurrentFolderId(item.data.id);
                } else {
                    router.push(`/project/${project.id}/drawings/${item.data.id}`);
                }
            }}
        >
            <View style={styles.listIconContainer}>
                {renderIcon(item)}
            </View>
            <View style={styles.listTextContainer}>
                <Text style={[styles.listTitle, { color: colors.text }]} numberOfLines={1}>{item.data.name}</Text>
                <Text style={styles.listSubtitle}>
                    {item.type === 'folder' 
                        ? `${new Date(item.data.createdAt).toLocaleDateString()}`
                        : `${formatBytes((item.data as Drawing).size)} • ${new Date((item.data as Drawing).uploadedAt).toLocaleDateString()}`
                    }
                </Text>
            </View>
            <TouchableOpacity style={styles.listOptions} onPress={(e) => { e.stopPropagation(); handleItemOptions(item); }}>
                <MoreVertical size={20} color="#94A3B8" />
            </TouchableOpacity>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
            <Stack.Screen options={{ headerShown: false }} />
            
            {/* Header */}
            <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
                <BackButton style={{ position: "absolute", left: 20, zIndex: 20, bottom: 8 }} />
                <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>Drawings & Documents</Text>
            </View>

            {/* Breadcrumbs */}
            <View style={[styles.breadcrumbs, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => setCurrentFolderId(null)} style={styles.crumbTouch}>
                    <Text style={[styles.crumbText, !currentFolderId && styles.crumbActive, !currentFolderId ? {} : { color: colors.textMuted }]}>Home</Text>
                </TouchableOpacity>
                {currentFolder && (
                    <>
                        <ChevronRight size={16} color="#94A3B8" style={styles.crumbArrow} />
                        <View style={styles.crumbTouch}>
                            <Text style={[styles.crumbText, styles.crumbActive]}>{currentFolder.name}</Text>
                        </View>
                    </>
                )}
            </View>

            {/* List */}
            {listData.length === 0 ? (
                <View style={styles.emptyState}>
                    <Folder size={64} color={colors.border} />
                    <Text style={[styles.emptyTitle, { color: colors.text }]}>This folder is empty</Text>
                    <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>Create a folder or upload a drawing to get started.</Text>
                </View>
            ) : (
                <FlatList
                    data={listData}
                    keyExtractor={(item) => item.data.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContainer}
                />
            )}

            {/* FAB */}
            <TouchableOpacity style={styles.fab} onPress={handlePlusPress}>
                <Plus size={24} color="white" />
            </TouchableOpacity>

            {/* Create Folder Modal */}
            <Modal
                visible={isFolderModalVisible}
                transparent={true}
                animationType="fade"
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>New Folder</Text>
                            <TouchableOpacity onPress={() => setIsFolderModalVisible(false)}>
                                <X size={24} color={colors.textMuted} />
                            </TouchableOpacity>
                        </View>
                        <TextInput
                            style={[styles.modalInput, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
                            placeholderTextColor={colors.textMuted}
                            placeholder="Folder Name"
                            value={newFolderName}
                            onChangeText={setNewFolderName}
                            autoFocus
                        />
                        <View style={styles.modalActions}>
                            <TouchableOpacity 
                                style={[styles.modalBtn, { backgroundColor: colors.background }]}
                                onPress={() => setIsFolderModalVisible(false)}
                            >
                                <Text style={[styles.modalBtnTextCancel, { color: colors.text }]}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.modalBtn, styles.modalBtnCreate]}
                                onPress={handleCreateFolder}
                            >
                                <Text style={styles.modalBtnTextCreate}>Create</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Rename Modal */}
            <Modal
                visible={isRenameModalVisible}
                transparent={true}
                animationType="fade"
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>Rename</Text>
                            <TouchableOpacity onPress={() => setIsRenameModalVisible(false)}>
                                <X size={24} color={colors.textMuted} />
                            </TouchableOpacity>
                        </View>
                        <TextInput
                            style={[styles.modalInput, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
                            placeholderTextColor={colors.textMuted}
                            placeholder="New Name"
                            value={newName}
                            onChangeText={setNewName}
                            autoFocus
                        />
                        <View style={styles.modalActions}>
                            <TouchableOpacity 
                                style={[styles.modalBtn, { backgroundColor: colors.background }]}
                                onPress={() => setIsRenameModalVisible(false)}
                            >
                                <Text style={[styles.modalBtnTextCancel, { color: colors.text }]}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.modalBtn, styles.modalBtnCreate]}
                                onPress={handleRenameSubmit}
                            >
                                <Text style={styles.modalBtnTextCreate}>Save</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Action Menu Modal */}
            <Modal
                visible={isActionMenuVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setIsActionMenuVisible(false)}
            >
                <TouchableOpacity 
                    style={styles.modalOverlay} 
                    activeOpacity={1} 
                    onPress={() => setIsActionMenuVisible(false)}
                >
                    <View style={[styles.actionMenuContent, { backgroundColor: colors.card }]}>
                        <TouchableOpacity 
                            style={styles.actionMenuItem}
                            onPress={() => {
                                setIsActionMenuVisible(false);
                                // Small timeout to allow fade out before showing the next modal or picker
                                setTimeout(() => setIsFolderModalVisible(true), 100); 
                            }}
                        >
                            <Folder size={24} color="#0EA5E9" style={{ marginRight: 16 }} />
                            <Text style={[styles.actionMenuText, { color: colors.text }]}>Create Folder</Text>
                        </TouchableOpacity>
                        
                        <View style={[styles.actionMenuDivider, { backgroundColor: colors.border }]} />
                        
                        <TouchableOpacity 
                            style={styles.actionMenuItem}
                            onPress={() => {
                                setIsActionMenuVisible(false);
                                setTimeout(() => handleUpload(), 100);
                            }}

                        >
                            <Plus size={24} color="#10B981" style={{ marginRight: 16 }} />
                            <Text style={[styles.actionMenuText, { color: colors.text }]}>Upload Document/Drawing</Text>
                        </TouchableOpacity>
                        
                        <View style={[styles.actionMenuDivider, { backgroundColor: colors.border }]} />
                        
                        <TouchableOpacity 
                            style={[styles.actionMenuItem, { justifyContent: 'center' }]}
                            onPress={() => setIsActionMenuVisible(false)}
                        >
                            <Text style={[styles.actionMenuText, { color: '#EF4444', fontWeight: '600' }]}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 20,
        height: 60,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    backButton: {
        padding: 8,
        marginLeft: -8,
    },
    headerTitle: {
        
        fontSize: 18,
        fontWeight: '700',
        color: '#0F172A',
        textAlign: 'center',
    },
    breadcrumbs: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        backgroundColor: '#F8FAFC',
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
    },
    crumbTouch: {
        paddingVertical: 4,
    },
    crumbText: {
        fontSize: 14,
        color: '#64748B',
        fontWeight: '500',
    },
    crumbActive: {
        color: '#0EA5E9',
        fontWeight: '700',
    },
    crumbArrow: {
        marginHorizontal: 8,
    },
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#475569',
        marginTop: 16,
        marginBottom: 8,
    },
    emptyDesc: {
        fontSize: 14,
        color: '#94A3B8',
        textAlign: 'center',
        lineHeight: 20,
    },
    listContainer: {
        padding: 16,
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        ...Platform.select({
            web: { boxShadow: '0px 2px 4px rgba(0,0,0,0.02)' as any },
            default: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 4, elevation: 1 }
        })
    },
    listIconContainer: {
        marginRight: 16,
    },
    listTextContainer: {
        flex: 1,
    },
    listTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1E293B',
        marginBottom: 4,
    },
    listSubtitle: {
        fontSize: 12,
        color: '#64748B',
    },
    listOptions: {
        padding: 8,
        marginRight: -8,
    },
    fab: {
        position: 'absolute',
        bottom: 32,
        right: 24,
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#0EA5E9',
        alignItems: 'center',
        justifyContent: 'center',
        ...Platform.select({
            web: { boxShadow: '0px 4px 12px rgba(14,165,233,0.3)' as any },
            default: { shadowColor: '#0EA5E9', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 5 }
        })
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        width: '100%',
        maxWidth: 400,
        borderRadius: 16,
        padding: 24,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0F172A',
    },
    modalInput: {
        borderWidth: 1,
        borderColor: '#CBD5E1',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        color: '#0F172A',
        marginBottom: 24,
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
    },
    modalBtn: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 8,
    },
    modalBtnCancel: {
        backgroundColor: '#F1F5F9',
    },
    modalBtnCreate: {
        backgroundColor: '#0EA5E9',
    },
    modalBtnTextCancel: {
        color: '#475569',
        fontWeight: '600',
    },
    modalBtnTextCreate: {
        color: '#FFFFFF',
        fontWeight: '600',
    },
    actionMenuContent: {
        backgroundColor: '#FFFFFF',
        width: '100%',
        maxWidth: 350,
        borderRadius: 16,
        paddingVertical: 8,
        ...Platform.select({
            web: { boxShadow: '0px 8px 24px rgba(0,0,0,0.12)' as any },
            default: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 24, elevation: 10 }
        })
    },
    actionMenuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 24,
    },
    actionMenuText: {
        fontSize: 16,
        color: '#0F172A',
        fontWeight: '500',
    },
    actionMenuDivider: {
        height: 1,
        backgroundColor: '#F1F5F9',
        width: '100%',
    }
});
