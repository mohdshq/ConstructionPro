import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Platform, Alert, TextInput, ActivityIndicator } from 'react-native';
import { ArrowLeft, UserPlus, Users, Crown, Shield, Eye, MoreVertical } from "lucide-react-native";
import BackButton from "../../../components/BackButton";
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useEffect, useState, useMemo } from 'react';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useProjectsStore } from '../../../store/projectsStore';
import { useThemeColors } from '../../../store/useThemeColors';
import { useAuthStore } from '../../../store/useAuthStore';
import { supabase } from '../../../lib/supabase';
import { usePowerSyncMembers } from '../../../lib/powersync/useMembers';
import { usePowerSyncProject } from '@/lib/powersync/useProjects';
import { UserAvatar } from '../../../components/UserAvatar';

interface InviteResponse {
    success: boolean;
    error?: string;
    message?: string;
}

export default function TeamScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { getProject } = useProjectsStore();
    const { colors } = useThemeColors();
    const currentUserId = useAuthStore(state => state.user?.id);

    const { data: powerSyncProject, isLoading } = usePowerSyncProject(id);
    const project = powerSyncProject || getProject(id);
    const members = usePowerSyncMembers(id);
    const currentMember = members.find(m => m.userId === currentUserId);
    const isManager = useMemo(() => {
        if (!currentUserId || !project) return false;
        const isDirectOwner = Boolean(project.userId && project.userId === currentUserId);
        const hasManagerMemberRole = project.memberRole === 'owner' || project.memberRole === 'manager';
        const hasManagerCurrentMember = currentMember?.role === 'owner' || currentMember?.role === 'manager';
        return isDirectOwner || hasManagerMemberRole || hasManagerCurrentMember;
    }, [project, currentUserId, currentMember]);

    const [inviteEmail, setInviteEmail] = useState('');
    const [isInviting, setIsInviting] = useState(false);

    if (isLoading && !project) {
        return (
            <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
                <Stack.Screen options={{ headerShown: false }} />
                <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
                    <BackButton style={{ position: "absolute", left: 20, zIndex: 20, bottom: 8 }} />
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Team Members</Text>
                </View>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={colors.primary || '#2563EB'} />
                    <Text style={{ marginTop: 12, fontSize: 15, color: colors.textMuted }}>Loading team...</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (!project) {
        return (
            <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
                <Stack.Screen options={{ headerShown: false }} />
                <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
                    <BackButton style={{ position: "absolute", left: 20, zIndex: 20, bottom: 8 }} />
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Project Not Found</Text>
                </View>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }}>
                    <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: 8 }}>Project Not Found</Text>
                    <Text style={{ fontSize: 14, color: colors.textMuted, textAlign: 'center', marginBottom: 24 }}>The requested project could not be found or you do not have access.</Text>
                    <TouchableOpacity
                        style={{ backgroundColor: colors.primary || '#2563EB', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 }}
                        onPress={() => router.back()}
                    >
                        <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 15 }}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    const handleInvite = async () => {
        if (!inviteEmail.trim()) return;
        
        setIsInviting(true);
        try {
            const { data, error } = await supabase.rpc('invite_user_by_email', {
                _project_id: id,
                _email: inviteEmail.trim().toLowerCase(),
                _role: 'viewer' // Default to viewer for safety
            });

            const response = data as unknown as InviteResponse | null;

            const showAlert = (title: string, message: string) => {
                if (Platform.OS === 'web') {
                    window.alert(`${title}: ${message}`);
                } else {
                    Alert.alert(title, message);
                }
            };

            if (error) {
                showAlert('Error', error.message);
            } else if (response && !response.success) {
                showAlert('Invite Failed', response.error || 'An unknown error occurred');
            } else {
                showAlert('Success', 'User added to the team!');
                setInviteEmail('');
                // Note: The UI will update automatically on the next pull-to-refresh or app load.
            }
        } catch (err: any) {
            if (Platform.OS === 'web') {
                window.alert(`Error: ${err.message}`);
            } else {
                Alert.alert('Error', err.message);
            }
        } finally {
            setIsInviting(false);
        }
    };

    const getRoleIcon = (role: string) => {
        switch (role) {
            case 'owner': return <Crown size={16} color="#F59E0B" />;
            case 'manager': return <Shield size={16} color="#3B82F6" />;
            default: return <Eye size={16} color="#64748B" />;
        }
    };

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
            <Stack.Screen options={{ headerShown: false }} />
            <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
                <BackButton style={{ position: "absolute", left: 20, zIndex: 20, bottom: 8 }} />
                <Text style={[styles.headerTitle, { color: colors.text }]}>Team Members</Text>
            </View>

            <ScrollView style={[styles.container, { backgroundColor: colors.background }]} keyboardShouldPersistTaps="handled">
                {isManager && (
                    <Animated.View entering={FadeInDown.delay(100).springify()} style={[styles.inviteSection, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Invite Member</Text>
                        <View style={styles.inviteRow}>
                            <View style={[styles.inputContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
                                <TextInput
                                    style={[styles.input, { color: colors.text }]}
                                    placeholder="Enter email address"
                                    placeholderTextColor={colors.textMuted}
                                    value={inviteEmail}
                                    onChangeText={setInviteEmail}
                                    autoCapitalize="none"
                                    keyboardType="email-address"
                                />
                            </View>
                            <TouchableOpacity 
                                style={[styles.inviteBtn, (!inviteEmail.trim() || isInviting) && { opacity: 0.5 }]} 
                                onPress={handleInvite}
                                disabled={!inviteEmail.trim() || isInviting}
                            >
                                <UserPlus size={20} color="#FFFFFF" />
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                )}

                <View style={styles.membersList}>
                    {members.map((member, index) => (
                        <Animated.View entering={FadeInDown.delay(100 + index * 50).springify()} key={member.id}>
                            <View style={[styles.memberCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                <UserAvatar
                                    avatarUrl={member.profile?.avatar_url}
                                    userId={member.userId}
                                    name={member.profile?.full_name}
                                    size={48}
                                    style={styles.avatar}
                                    placeholderStyle={[styles.avatarPlaceholder, { backgroundColor: colors.border }]}
                                    placeholderTextStyle={[styles.avatarText, { color: colors.text }]}
                                />
                                
                                <View style={styles.memberInfo}>
                                    <Text style={[styles.memberName, { color: colors.text }]}>
                                        {member.profile?.full_name || 'Unknown User'}
                                    </Text>
                                    <View style={styles.roleBadge}>
                                        {getRoleIcon(member.role)}
                                        <Text style={[styles.roleText, { color: colors.textMuted }]}>
                                            {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                                        </Text>
                                    </View>
                                </View>
                                
                                {isManager && member.role !== 'owner' && (
                                    <TouchableOpacity style={styles.actionBtn}>
                                        <MoreVertical size={20} color={colors.textMuted} />
                                    </TouchableOpacity>
                                )}
                            </View>
                        </Animated.View>
                    ))}

                    {members.length === 0 && (
                        <View style={styles.emptyState}>
                            <Users size={48} color={colors.textMuted} style={{ marginBottom: 16 }} />
                            <Text style={[styles.emptyStateTitle, { color: colors.text }]}>No Team Members</Text>
                            <Text style={[styles.emptyStateDesc, { color: colors.textMuted }]}>
                                You are the only person on this project.
                            </Text>
                        </View>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: "center",
        paddingHorizontal: 20,
        height: 60,
        borderBottomWidth: 1,
        zIndex: 10,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    container: { flex: 1 },
    inviteSection: {
        padding: 20,
        borderBottomWidth: 1,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 12,
    },
    inviteRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    inputContainer: {
        flex: 1,
        height: 48,
        borderRadius: 12,
        borderWidth: 1,
        paddingHorizontal: 16,
        justifyContent: 'center',
    },
    input: {
        fontSize: 16,
    },
    inviteBtn: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: '#2563EB',
        alignItems: 'center',
        justifyContent: 'center',
    },
    membersList: {
        padding: 20,
        gap: 12,
    },
    memberCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
    },
    avatarPlaceholder: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        fontSize: 18,
        fontWeight: '700',
    },
    memberInfo: {
        flex: 1,
        marginLeft: 16,
    },
    memberName: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    roleBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    roleText: {
        fontSize: 14,
    },
    actionBtn: {
        padding: 8,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 40,
    },
    emptyStateTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 8,
    },
    emptyStateDesc: {
        fontSize: 15,
        textAlign: 'center',
    },
});
