import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { FolderOpen, X } from 'lucide-react-native';
import { useProjectsStore } from '../store/projectsStore';
import { useAuthStore } from '../store/useAuthStore';
import { useThemeColors } from '../store/useThemeColors';

interface SaveCalculationModalProps {
    visible: boolean;
    onClose: () => void;
    calculationType: string;
    calculationData: any;
}

export default function SaveCalculationModal({ visible, onClose, calculationType, calculationData }: SaveCalculationModalProps) {
    const { colors } = useThemeColors();
    const { projects, addCalculation } = useProjectsStore();
    const { user } = useAuthStore();
    const [isSaving, setIsSaving] = useState(false);

    const activeProjects = projects.filter(p => p.status !== 'completed');

    const handleSave = async (projectId: string) => {
        if (!user?.id) {
            Alert.alert('Error', 'You must be logged in to save calculations.');
            return;
        }

        setIsSaving(true);
        try {
            await addCalculation({
                projectId,
                userId: user.id,
                type: calculationType,
                data: calculationData
            });
            Alert.alert('Success', 'Calculation saved to project.');
            onClose();
        } catch (error) {
            Alert.alert('Error', 'Failed to save calculation.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Modal visible={visible} transparent animationType="slide">
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
                    <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                        <Text style={[styles.modalTitle, { color: colors.text }]}>Save to Project</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <X size={24} color={colors.text} />
                        </TouchableOpacity>
                    </View>
                    <ScrollView style={styles.projectList}>
                        {activeProjects.length === 0 ? (
                            <Text style={[styles.emptyText, { color: colors.textMuted }]}>No active projects found.</Text>
                        ) : (
                            activeProjects.map(proj => (
                                <TouchableOpacity 
                                    key={proj.id} 
                                    style={[styles.projectItem, { borderBottomColor: colors.border }]}
                                    onPress={() => handleSave(proj.id)}
                                    disabled={isSaving}
                                >
                                    <View style={[styles.projectIcon, { backgroundColor: colors.card }]}>
                                        <FolderOpen size={20} color={colors.primary} />
                                    </View>
                                    <View style={styles.projectInfo}>
                                        <Text style={[styles.projectName, { color: colors.text }]}>{proj.name}</Text>
                                        <Text style={[styles.projectRef, { color: colors.textMuted }]}>{proj.referenceNumber}</Text>
                                    </View>
                                </TouchableOpacity>
                            ))
                        )}
                    </ScrollView>
                    {isSaving && (
                        <View style={styles.loadingOverlay}>
                            <ActivityIndicator size="large" color={colors.primary} />
                        </View>
                    )}
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
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
        paddingBottom: 40,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    closeButton: {
        padding: 4,
    },
    projectList: {
        padding: 20,
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 40,
        fontSize: 16,
    },
    projectItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
    },
    projectIcon: {
        width: 40,
        height: 40,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    projectInfo: {
        flex: 1,
    },
    projectName: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    projectRef: {
        fontSize: 13,
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255,255,255,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 24,
    }
});
