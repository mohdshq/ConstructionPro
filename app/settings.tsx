import BackButton from "../components/BackButton";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform, TextInput, Image, ActivityIndicator } from 'react-native';
import { Crown, CheckCircle2, ShieldCheck, Zap, ArrowLeft, Settings2, Moon, Sun, Monitor, Scale, User, Camera, LogOut } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { File } from 'expo-file-system';
import Purchases from 'react-native-purchases';
import Animated, { FadeIn, FadeInDown, useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence } from 'react-native-reanimated';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useStore, ThemeType, UnitSystem } from '../store/useStore';
import { useThemeColors } from '../store/useThemeColors';
import { useAuthStore } from '../store/useAuthStore';
import { resolveMediaUri, classifyMediaSource } from '@/lib/attachments/resolveMediaUri';
import { attachmentQueue } from '@/lib/attachments/attachmentQueue';

interface FeatureRowProps {
    title: string;
    delay: number;
    colors: any;
}

function FeatureRow({ title, delay, colors }: FeatureRowProps) {
    return (
        <Animated.View entering={FadeInDown.delay(delay).springify()} style={styles.featureRow}>
            <CheckCircle2 color={colors.primary} size={20} />
            <Text style={[styles.featureText, { color: colors.text }]}>{title}</Text>
        </Animated.View>
    );
}

export default function SettingsScreen() {
    const glowOpacity = useSharedValue(0.15);
    const { theme, units, setTheme, setUnits } = useStore();
    const { colors, isDark } = useThemeColors();
    const { signOut, user, offlineUser, authMode, profile, updateProfile, isLoadingProfile } = useAuthStore();
    const isOfflineGrace = authMode === 'offline-grace';

    // Local state for profile editing
    const [displayName, setDisplayName] = useState(profile?.full_name || offlineUser?.fullName || '');
    const [avatarUri, setAvatarUri] = useState<string | null>(null);
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const nameDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Sync local state when profile loads
    useEffect(() => {
        if (profile?.full_name && !displayName) {
            setDisplayName(profile.full_name);
        }
        if (profile?.avatar_url) {
            resolveMediaUri(profile.avatar_url, {
                bucket: 'avatars',
                userId: profile.id || user?.id,
            }).then((resolved) => {
                if (resolved) setAvatarUri(resolved);
            });
        }
    }, [profile, user?.id]);

    // Debounced name sync
    const handleNameChange = useCallback((text: string) => {
        setDisplayName(text);
        if (nameDebounceRef.current) clearTimeout(nameDebounceRef.current);
        nameDebounceRef.current = setTimeout(async () => {
            if (text.trim() && text.trim() !== profile?.full_name) {
                try {
                    await updateProfile({ full_name: text.trim() });
                } catch (err) {
                    console.error('Failed to sync name:', err);
                }
            }
        }, 800);
    }, [profile, updateProfile]);

    const handleSignOut = () => {
        const doSignOut = async () => {
            // Navigation is handled declaratively by Stack.Protected in
            // app/_layout.tsx once authMode flips to 'signed-out'. Navigating
            // imperatively here mounts a duplicate login screen.
            await signOut();
        };

        if (Platform.OS === 'web') {
            if (window.confirm('Are you sure you want to sign out?')) {
                doSignOut();
            }
        } else {
            Alert.alert(
                'Sign Out',
                'Are you sure you want to sign out? Any unsynced changes, photos, drawings, or attachments will be lost if you switch users or reset this device.',
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Sign Out', style: 'destructive', onPress: doSignOut },
                ]
            );
        }
    };

    useEffect(() => {
        glowOpacity.value = withRepeat(
            withSequence(
                withTiming(0.4, { duration: 1500 }),
                withTiming(0.15, { duration: 1500 })
            ),
            -1,
            true
        );
    }, []);

    const animatedGlow = useAnimatedStyle(() => {
        return {
            opacity: glowOpacity.value,
        };
    });

    const pickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            const picked = result.assets[0];
            const currentUserId = user?.id ?? offlineUser?.id;
            if (!currentUserId) return;

            setIsSavingProfile(true);
            try {
                // Normalize to JPEG with 512px max dimension (downscale only on long edge) and 0.8 compression
                const w = picked.width || 0;
                const h = picked.height || 0;
                const maxDim = Math.max(w, h);
                const actions = (maxDim > 512 || !maxDim)
                    ? [{ resize: (w >= h || !h) ? { width: 512 } : { height: 512 } }]
                    : [];
                const manipulated = await ImageManipulator.manipulateAsync(
                    picked.uri,
                    actions,
                    { format: ImageManipulator.SaveFormat.JPEG, compress: 0.8 }
                );

                // Size guard (Avatars bucket limit is 2MB)
                const f = new File(manipulated.uri);
                const size = f.size ?? (picked as any).fileSize ?? 0;

                if (size > 2 * 1024 * 1024) {
                    Alert.alert('File Too Large', 'Maximum supported file size for avatar is 2MB.');
                    setIsSavingProfile(false);
                    return;
                }

                setAvatarUri(manipulated.uri); // Instant preview

                const attId = await attachmentQueue.generateAttachmentId();
                const bytes = await f.bytes();
                const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);

                const attachment = await attachmentQueue.saveFile({
                    id: attId,
                    data: arrayBuffer,
                    fileExtension: 'jpg',
                    mediaType: 'image/jpeg',
                    metaData: JSON.stringify({ kind: 'avatar', userId: currentUserId }),
                });

                // If user had an existing attachment avatar, delete the old attachment
                if (profile?.avatar_url) {
                    const mediaKind = classifyMediaSource(profile.avatar_url);
                    if (mediaKind === 'attachment_ref') {
                        const oldAttId = profile.avatar_url.split('.')[0];
                        try { await attachmentQueue.deleteFile({ id: oldAttId }); } catch (e) { console.warn('Failed to delete old avatar attachment:', e); }
                    }
                }

                await updateProfile({ avatar_url: attachment.filename });
            } catch (err) {
                console.error('Failed to save avatar:', err);
                Alert.alert('Error', 'Failed to update avatar photo.');
            } finally {
                setIsSavingProfile(false);
            }
        }
    };

    const handleSubscribe = async () => {
        try {
            // NOTE: In production, configure this in your app's entry point (_layout.tsx)
            // Purchases.configure({ apiKey: Platform.OS === 'ios' ? "YOUR_APPLE_KEY" : "YOUR_GOOGLE_KEY" });
            
            const offerings = await Purchases.getOfferings();
            if (offerings.current !== null && offerings.current.availablePackages.length !== 0) {
                const packageToBuy = offerings.current.availablePackages[0];
                const { customerInfo } = await Purchases.purchasePackage(packageToBuy);
                
                if (typeof customerInfo.entitlements.active['premium'] !== "undefined") {
                    Alert.alert("Success", "Welcome to Construction Pro Premium!");
                }
            } else {
                Alert.alert(
                    "RevenueCat Setup Required", 
                    "You need to add your actual API Key to the Purchases.configure() method and create products in your RevenueCat Dashboard before the payment sheet will appear natively."
                );
            }
        } catch (e: any) {
            if (!e.userCancelled) {
                console.error(e);
                Alert.alert("Error", e.message || "Failed to initialize purchase.");
            }
        }
    };

    const renderThemeOption = (type: ThemeType, icon: React.ReactNode, label: string) => {
        const isActive = theme === type;
        return (
            <TouchableOpacity
                style={[styles.prefOption, isActive && [styles.prefOptionActive, { backgroundColor: colors.background }]]}
                onPress={() => setTheme(type)}
            >
                {icon}
                <Text style={[styles.prefOptionText, isActive && { color: colors.primary }]}>{label}</Text>
            </TouchableOpacity>
        );
    };

    const renderUnitOption = (type: UnitSystem, label: string) => {
        const isActive = units === type;
        return (
            <TouchableOpacity
                style={[styles.prefOption, isActive && [styles.prefOptionActive, { backgroundColor: colors.background }]]}
                onPress={() => setUnits(type)}
            >
                <Text style={[styles.prefOptionText, isActive && { color: colors.primary }]}>{label}</Text>
            </TouchableOpacity>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.headerBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
                <BackButton style={{ position: "absolute", left: 20, zIndex: 20, bottom: 8 }} />
                <Text style={[styles.headerBarTitle, { color: colors.text }]}>Settings</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {/* User Profile Section */}
                <Animated.View entering={FadeInDown.delay(50).springify()} style={styles.prefSection}>
                    <View style={styles.sectionHeader}>
                        <User color={colors.text} size={20} />
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>User Profile</Text>
                    </View>

                    <View style={[styles.prefCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={styles.profileRow}>
                            <TouchableOpacity onPress={pickImage} style={styles.profileImageContainer}>
                                {avatarUri ? (
                                    <Image source={{ uri: avatarUri }} style={styles.profileImage} />
                                ) : (
                                    <View style={[styles.profileImagePlaceholder, { backgroundColor: colors.avatarBackground }]}>
                                        <Text style={[styles.profileInitials, { color: colors.avatarText }]}>
                                            {(displayName || user?.email || '').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || '?'}
                                        </Text>
                                    </View>
                                )}
                                <View style={[styles.cameraBadge, { backgroundColor: colors.primary }]}>
                                    {isSavingProfile ? (
                                        <ActivityIndicator size={10} color="#FFFFFF" />
                                    ) : (
                                        <Camera color="#FFFFFF" size={12} />
                                    )}
                                </View>
                            </TouchableOpacity>
                            <View style={styles.profileInputContainer}>
                                <Text style={[styles.prefLabel, { color: colors.textMuted }]}>Name</Text>
                                <TextInput
                                    style={[styles.textInput, { backgroundColor: colors.inputBackground, color: colors.text }]}
                                    value={displayName}
                                    onChangeText={handleNameChange}
                                    placeholder="Enter your name"
                                    placeholderTextColor={colors.textMuted}
                                />
                                {user?.email && (
                                    <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 6 }}>{user.email}</Text>
                                )}
                            </View>
                        </View>
                    </View>
                </Animated.View>

                {/* AI Info Section */}
                <Animated.View entering={FadeInDown.delay(50).springify()} style={styles.prefSection}>
                    <View style={styles.sectionHeader}>
                        <Zap color={colors.text} size={20} />
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>AI Assistant</Text>
                    </View>

                    <View style={[styles.prefCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={{ padding: 4, alignItems: 'center' }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                                <Zap color={colors.primary} size={20} />
                                <Text style={[styles.sectionTitle, { color: colors.text, marginLeft: 8 }]}>AI Powered by ConstructionPro</Text>
                            </View>
                            <Text style={{ fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 20 }}>
                                Your AI Assistant is included with your plan. No API key needed — just open the AI tab and start asking.
                            </Text>
                        </View>
                    </View>
                </Animated.View>

                {/* Global Preferences Section */}
                <Animated.View entering={FadeInDown.delay(50).springify()} style={styles.prefSection}>
                    <View style={styles.sectionHeader}>
                        <Settings2 color={colors.text} size={20} />
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>App Preferences</Text>
                    </View>

                    <View style={[styles.prefCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Text style={[styles.prefLabel, { color: colors.textMuted }]}>Appearance Theme</Text>
                        <View style={[styles.prefGroup, { backgroundColor: colors.inputBackground }]}>
                            {renderThemeOption('light', <Sun size={16} color={theme === 'light' ? '#2563EB' : '#64748B'} />, 'Light')}
                            {renderThemeOption('dark', <Moon size={16} color={theme === 'dark' ? '#2563EB' : '#64748B'} />, 'Dark')}
                            {renderThemeOption('system', <Monitor size={16} color={theme === 'system' ? '#2563EB' : '#64748B'} />, 'System')}
                        </View>

                        <Text style={[styles.prefLabel, { marginTop: 20, color: colors.textMuted }]}>Measurement Units</Text>
                        <View style={[styles.prefGroup, { backgroundColor: colors.inputBackground }]}>
                            {renderUnitOption('metric', 'Metric (m, kg)')}
                            {renderUnitOption('imperial', 'Imperial (ft, lbs)')}
                        </View>
                    </View>
                </Animated.View>

                {/* Premium Paywall Section — Hidden in offline-grace mode */}
                {!isOfflineGrace && (
                    <>
                        <Animated.View entering={FadeIn.duration(1000).delay(150)} style={styles.header}>
                            <Text style={[styles.title, { color: colors.text }]}>Unlock Pro</Text>
                            <Text style={[styles.subtitle, { color: colors.textMuted }]}>Maximize your on-site potential.</Text>
                        </Animated.View>

                        <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.cardContainer}>
                            <Animated.View style={[styles.glowBackground, animatedGlow, { backgroundColor: colors.primary }]} />
                            <View style={[styles.paywallCard, { backgroundColor: colors.card, borderColor: colors.border, shadowColor: colors.primary }]}>
                                <View style={styles.crownContainer}>
                                    <Crown color="#F59E0B" size={40} />
                                </View>

                                <Text style={[styles.planName, { color: isDark ? colors.text : '#1E3A8A' }]}>Construction Pro Premium</Text>
                                <Text style={[styles.price, { color: colors.primary }]}>$19.99<Text style={styles.period}>/month</Text></Text>

                                <View style={styles.featuresContainer}>
                                    <FeatureRow title="Unlimited Projects & Reports" delay={400} colors={colors} />
                                    <FeatureRow title="Advanced Snagging with PDF Markup" delay={500} colors={colors} />
                                    <FeatureRow title="Unlimited AI Assistant Queries" delay={600} colors={colors} />
                                    <FeatureRow title="Cloud Sync & Team Collaboration" delay={700} colors={colors} />
                                    <FeatureRow title="Priority Human Support" delay={800} colors={colors} />
                                </View>

                                <TouchableOpacity style={styles.subscribeButton} onPress={handleSubscribe} activeOpacity={0.8}>
                                    <Animated.View entering={FadeInDown.delay(900).springify()} style={[styles.subscribeInner, { backgroundColor: colors.primary, shadowColor: colors.primary }]}>
                                        <Zap color="#FFFFFF" size={20} />
                                        <Text style={styles.subscribeText}>Upgrade to Premium</Text>
                                    </Animated.View>
                                </TouchableOpacity>
                            </View>
                        </Animated.View>

                        <Animated.View entering={FadeInDown.delay(1000).springify()} style={styles.footer}>
                            <ShieldCheck color="#94A3B8" size={16} />
                            <Text style={styles.footerText}>Secure billing handled by RevenueCat</Text>
                        </Animated.View>
                    </>
                )}

                {/* Sign Out Section */}
                <Animated.View entering={FadeInDown.delay(1100).springify()} style={styles.prefSection}>
                    <TouchableOpacity
                        style={[styles.signOutButton, { backgroundColor: isDark ? '#7F1D1D' : '#FEE2E2', borderColor: isDark ? '#991B1B' : '#FECACA' }]}
                        onPress={handleSignOut}
                        activeOpacity={0.8}
                    >
                        <LogOut size={20} color={isDark ? '#FCA5A5' : '#DC2626'} />
                        <Text style={[styles.signOutText, { color: isDark ? '#FCA5A5' : '#DC2626' }]}>Sign Out</Text>
                    </TouchableOpacity>
                    {(user?.email || offlineUser?.email) && (
                        <Text style={{ fontSize: 12, color: colors.textMuted, textAlign: 'center', marginTop: 8 }}>
                            Signed in as {user?.email || offlineUser?.email}
                        </Text>
                    )}
                </Animated.View>

                <View style={{ height: 100 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    headerBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: Platform.OS === 'ios' ? 60 : 30,
        paddingBottom: 16,
        paddingHorizontal: 20,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
        zIndex: 10,
    },
    backButton: {
        position: 'absolute',
        left: 0,
        bottom: 12,
        zIndex: 20,
    },
    headerBarTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0F172A',
        textAlign: 'center',
        paddingHorizontal: 40,
    },
    content: {
        padding: 24,
        paddingTop: 24,
    },
    prefSection: {
        marginBottom: 40,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#334155',
        marginLeft: 8,
    },
    prefCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    profileRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    profileImageContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        marginRight: 16,
        position: 'relative',
    },
    profileImage: {
        width: 64,
        height: 64,
        borderRadius: 32,
    },
    profileImagePlaceholder: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#DBEAFE',
        justifyContent: 'center',
        alignItems: 'center',
    },
    profileInitials: {
        color: '#1E3A8A',
        fontSize: 20,
        fontWeight: 'bold',
    },
    cameraBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#2563EB',
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    profileInputContainer: {
        flex: 1,
    },
    textInput: {
        backgroundColor: '#F1F5F9',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 16,
        color: '#0F172A',
        fontWeight: '500',
    },
    prefLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#64748B',
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    prefGroup: {
        flexDirection: 'row',
        backgroundColor: '#F1F5F9',
        borderRadius: 10,
        padding: 4,
    },
    prefOption: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 8,
    },
    prefOptionActive: {
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    prefOptionText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#64748B',
        marginLeft: 6,
    },
    prefOptionTextActive: {
        color: '#2563EB',
        fontWeight: '600',
    },
    header: {
        marginBottom: 40,
        alignItems: 'center',
    },
    title: {
        fontSize: 32,
        fontWeight: '800',
        color: '#0F172A',
        marginBottom: 8,
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 16,
        color: '#64748B',
    },
    cardContainer: {
        position: 'relative',
        marginBottom: 30,
    },
    glowBackground: {
        position: 'absolute',
        top: -15,
        left: -15,
        right: -15,
        bottom: -15,
        backgroundColor: '#3B82F6',
        borderRadius: 40,
        opacity: 0.1,
    },
    paywallCard: {
        borderRadius: 24,
        padding: 32,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        alignItems: 'center',
        shadowColor: '#2563EB',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.08,
        shadowRadius: 32,
        elevation: 10,
    },
    crownContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#FEF3C7',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    planName: {
        fontSize: 24,
        fontWeight: '700',
        color: '#1E3A8A',
        marginBottom: 8,
        letterSpacing: -0.5,
    },
    price: {
        fontSize: 36,
        fontWeight: '800',
        color: '#2563EB',
        marginBottom: 32,
        letterSpacing: -1,
    },
    period: {
        fontSize: 16,
        fontWeight: '500',
        color: '#94A3B8',
    },
    featuresContainer: {
        width: '100%',
        marginBottom: 40,
    },
    featureRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    featureText: {
        fontSize: 16,
        color: '#334155',
        marginLeft: 12,
        fontWeight: '500',
    },
    subscribeButton: {
        width: '100%',
    },
    subscribeInner: {
        backgroundColor: '#2563EB',
        paddingVertical: 18,
        borderRadius: 16,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#2563EB',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 8,
    },
    subscribeText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FFFFFF',
        marginLeft: 8,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 20,
    },
    footerText: {
        fontSize: 14,
        color: '#94A3B8',
        marginLeft: 8,
    },
    signOutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 16,
        borderWidth: 1,
    },
    signOutText: {
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 10,
    },
});
