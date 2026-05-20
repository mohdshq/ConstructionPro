import BackButton from "../components/BackButton";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform, TextInput, Image } from 'react-native';
import { Crown, CheckCircle2, ShieldCheck, Zap, ArrowLeft, Settings2, Moon, Sun, Monitor, Scale, User, Camera } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import Purchases from 'react-native-purchases';
import Animated, { FadeIn, FadeInDown, useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence } from 'react-native-reanimated';
import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { useStore, ThemeType, UnitSystem } from '../store/useStore';
import { useThemeColors } from '../store/useThemeColors';
import { telemetry } from '../lib/telemetry';

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
    const { theme, units, setTheme, setUnits, userName, userPhoto, setUserName, setUserPhoto, aiApiKey, setAiApiKey } = useStore();
    const { colors, isDark } = useThemeColors();

    // Advanced-AI disclosure: hidden by default (most users should wait for
    // the hosted proxy). We open it automatically for users who already have
    // a key set, so they can still find and edit it.
    const [showAdvancedAI, setShowAdvancedAI] = useState<boolean>(Boolean(aiApiKey));

    useEffect(() => {
        glowOpacity.value = withRepeat(
            withSequence(
                withTiming(0.25, { duration: 2000 }),
                withTiming(0.15, { duration: 2000 })
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
            quality: 0.5,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            const uri = result.assets[0].uri;
            try {
                const fileName = `profile_${Date.now()}.jpg`;
                // @ts-ignore
                const newPath = `${FileSystem.documentDirectory}${fileName}`;
                await FileSystem.copyAsync({ from: uri, to: newPath });
                setUserPhoto(newPath);
            } catch (err) {
                console.error('Failed to save profile photo', err);
                setUserPhoto(uri); // Fallback
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
                telemetry.captureException(e, { where: 'settings.handleSubscribe' });
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
                                {userPhoto ? (
                                    <Image source={{ uri: userPhoto }} style={styles.profileImage} />
                                ) : (
                                    <View style={[styles.profileImagePlaceholder, { backgroundColor: colors.avatarBackground }]}>
                                        <Text style={[styles.profileInitials, { color: colors.avatarText }]}>{userName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}</Text>
                                    </View>
                                )}
                                <View style={[styles.cameraBadge, { backgroundColor: colors.primary }]}>
                                    <Camera color="#FFFFFF" size={12} />
                                </View>
                            </TouchableOpacity>
                            <View style={styles.profileInputContainer}>
                                <Text style={[styles.prefLabel, { color: colors.textMuted }]}>Name</Text>
                                <TextInput
                                    style={[styles.textInput, { backgroundColor: colors.inputBackground, color: colors.text }]}
                                    value={userName}
                                    onChangeText={setUserName}
                                    placeholder="Enter your name"
                                    placeholderTextColor={colors.textMuted}
                                />
                            </View>
                        </View>
                    </View>
                </Animated.View>

                {/*
                  * AI section
                  * ----------
                  * Previously this section asked every user to paste a personal
                  * Gemini API key — bad UX and confusing for non-technical site
                  * teams. The hosted AI proxy ships in Phase 2; until then we
                  * keep the field available behind an "Advanced" disclosure for
                  * the small number of early adopters who already pasted a key.
                  *
                  * Once the proxy ships, this entire block is deleted and the
                  * `aiApiKey` field is removed from the store.
                  */}
                <Animated.View entering={FadeInDown.delay(50).springify()} style={styles.prefSection}>
                    <View style={styles.sectionHeader}>
                        <Zap color={colors.text} size={20} />
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>AI Assistant</Text>
                    </View>

                    <View style={[styles.prefCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Text style={{ fontSize: 14, color: colors.text, lineHeight: 20, fontWeight: '600', marginBottom: 6 }}>
                            Built-in AI is launching soon.
                        </Text>
                        <Text style={{ fontSize: 13, color: colors.textMuted, lineHeight: 18 }}>
                            We&apos;re finishing the hosted AI assistant so you can ask construction questions, draft reports, and analyse site photos without setting anything up. No key needed.
                        </Text>

                        <TouchableOpacity
                            style={{ marginTop: 16, paddingVertical: 10, alignItems: 'flex-start' }}
                            onPress={() => setShowAdvancedAI((v: boolean) => !v)}
                            accessibilityRole="button"
                        >
                            <Text style={{ fontSize: 13, color: colors.primary, fontWeight: '600' }}>
                                {showAdvancedAI ? 'Hide advanced options' : 'Advanced options (use your own key)'}
                            </Text>
                        </TouchableOpacity>

                        {showAdvancedAI && (
                            <View style={{ marginTop: 8 }}>
                                <Text style={[styles.prefLabel, { color: colors.textMuted }]}>Google AI Studio API Key (optional)</Text>
                                <TextInput
                                    style={[styles.textInput, { backgroundColor: colors.inputBackground, color: colors.text, marginTop: 8 }]}
                                    value={aiApiKey}
                                    onChangeText={setAiApiKey}
                                    placeholder="AIzaSy..."
                                    placeholderTextColor={colors.textMuted}
                                    secureTextEntry
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                />
                                <Text style={{ marginTop: 8, fontSize: 12, color: colors.textMuted, lineHeight: 18 }}>
                                    Power users can paste a personal key from aistudio.google.com to test AI features before the hosted version ships. Stored only on this device.
                                </Text>
                            </View>
                        )}
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

                {/* Premium Paywall Section */}
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
    }
});
