import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Image, RefreshControl } from 'react-native';
import { BlurView } from 'expo-blur';
import { Calculator, FileText, CheckSquare, Layers, Sparkles, Settings as SettingsIcon, Zap } from 'lucide-react-native';
import Animated, { FadeIn, FadeInDown, withRepeat, withSequence, withTiming, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useEffect, useState, useCallback } from 'react';
import { router } from 'expo-router';
import { useStore } from '../../store/useStore';
import { useProjectsStore } from '../../store/projectsStore';
import { useQuery } from '@powersync/react-native';
import { useThemeColors } from '../../store/useThemeColors';
import { useAuthStore } from '../../store/useAuthStore';
import { getPublicUrl } from '../../lib/supabaseSync';
import ConnectionBadge from '../../components/ConnectionBadge';

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

interface ActionCardProps {
  title: string;
  icon: React.ReactNode;
  delay: number;
  color: string;
  onPress: () => void;
}

function ActionCard({ title, icon, delay, color, onPress }: ActionCardProps) {
  const { colors } = useThemeColors();
  return (
    <Animated.View entering={FadeInDown.delay(delay).springify()} style={styles.cardContainer}>
      <TouchableOpacity activeOpacity={0.8} style={styles.cardTouch} onPress={onPress}>
        <View style={[styles.cardContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.iconContainer, { backgroundColor: `${color}15` }]}>
            {icon}
          </View>
          <Text style={[styles.cardTitle, { color: colors.text }]}>{title}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function HomeScreen() {
  const glowOpacity = useSharedValue(0.15);
  const glowScale = useSharedValue(1);
  const { userName, userPhoto } = useStore();
  const { initialSync } = useProjectsStore();
  const { colors, isDark } = useThemeColors();
  const { profile, user } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await initialSync();
    setRefreshing(false);
  }, [initialSync]);

  // Prefer Supabase profile data, fallback to local store
  const displayName = profile?.full_name || userName || user?.email?.split('@')[0] || 'Engineer';
  const avatarUrl = profile?.avatar_url
    ? getPublicUrl('avatars', profile.avatar_url)
    : userPhoto;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning,';
    if (hour < 18) return 'Good afternoon,';
    return 'Good evening,';
  };

  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const { data: activeRows } = useQuery<{ c: number }>(
    `SELECT COUNT(*) AS c FROM projects WHERE status != 'completed'`
  );
  const { data: reportRows } = useQuery<{ c: number }>(
    `SELECT COUNT(*) AS c FROM reports`
  );
  const activeProjectsCount = activeRows?.[0]?.c ?? 0;
  const totalReportsCount = reportRows?.[0]?.c ?? 0;

  useEffect(() => {
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.3, { duration: 1500 }),
        withTiming(0.15, { duration: 1500 })
      ),
      -1,
      true
    );
    glowScale.value = withRepeat(
      withSequence(
        withTiming(1.02, { duration: 1500 }),
        withTiming(1, { duration: 1500 })
      ),
      -1,
      true
    );
  }, []);

  const animatedGlowStyle = useAnimatedStyle(() => {
    return {
      opacity: glowOpacity.value,
      transform: [{ scale: glowScale.value }],
    };
  });

  return (
    <ScrollView 
        style={[styles.container, { backgroundColor: colors.background }]} 
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      <Animated.View entering={FadeIn.duration(1000)} style={styles.header}>
        <View style={styles.headerProfileRow}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.profileAvatarImage} />
          ) : (
            <View style={[styles.profileAvatar, { backgroundColor: colors.avatarBackground }]}>
              <Text style={[styles.profileText, { color: colors.avatarText }]}>
                {displayName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.headerTextContainer}>
            <Text style={[styles.greeting, { color: colors.textMuted }]}>{getGreeting()}</Text>
            <Text style={[styles.name, { color: colors.text }]}>{displayName}</Text>
            <Text style={[styles.dateText, { color: colors.textMuted }]}>{currentDate}</Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => router.push('/settings')}
          style={[styles.settingsButton, { backgroundColor: colors.card }]}
          activeOpacity={0.7}
        >
          <SettingsIcon color={colors.textMuted} size={24} />
        </TouchableOpacity>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.aiCardContainer}>
        <Animated.View style={[styles.aiGlow, animatedGlowStyle]} />
        <TouchableOpacity activeOpacity={0.9} onPress={() => router.push('/ai-wizard')}>
          <BlurView intensity={Platform.OS === 'ios' ? 40 : 100} tint={isDark ? "dark" : "light"} style={[styles.aiCardInner, { backgroundColor: isDark ? 'rgba(30, 41, 59, 0.7)' : 'rgba(255, 255, 255, 0.7)' }]}>
            <View style={[styles.aiIconWrapper, { backgroundColor: isDark ? '#1E3A8A' : '#EFF6FF' }]}>
              <Sparkles color={isDark ? "#60A5FA" : "#2563EB"} size={24} />
            </View>
            <View style={styles.aiTextWrapper}>
              <Text style={[styles.aiTitle, { color: isDark ? '#FFFFFF' : '#1E3A8A' }]}>✨ Quick AI Report</Text>
              <Text style={[styles.aiSubtitle, { color: isDark ? '#94A3B8' : '#475569' }]}>Use voice and camera to auto-generate reports.</Text>
            </View>
          </BlurView>
        </TouchableOpacity>
      </Animated.View>

      <View style={{ alignItems: 'center', marginBottom: 12 }}>
        <ConnectionBadge />
      </View>

      <Animated.Text entering={FadeInDown.delay(300).springify()} style={[styles.sectionTitle, { color: colors.text }]}>
        Quick Actions
      </Animated.Text>

      <View style={styles.grid}>
        <ActionCard
          title="Calculators"
          icon={<Calculator color="#2563EB" size={28} />}
          delay={400}
          color="#2563EB"
          onPress={() => router.push('/tools')}
        />
        <ActionCard
          title="Reports"
          icon={<FileText color="#F59E0B" size={28} />}
          delay={500}
          color="#F59E0B"
          onPress={() => router.push('/projects')}
        />
        <ActionCard
          title="Snagging"
          icon={<CheckSquare color="#E11D48" size={28} />}
          delay={600}
          color="#E11D48"
          onPress={() => router.push('/projects')}
        />
        <ActionCard
          title="Drawings"
          icon={<Layers color="#0EA5E9" size={28} />}
          delay={700}
          color="#0EA5E9"
          onPress={() => router.push('/projects')}
        />
      </View>

      <Animated.Text entering={FadeInDown.delay(800).springify()} style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>
        Quick Stats
      </Animated.Text>
      
      <View style={styles.statsContainer}>
        <Animated.View entering={FadeInDown.delay(900).springify()} style={styles.statCardWrapper}>
          <TouchableOpacity activeOpacity={0.8} style={styles.statTouch} onPress={() => router.push('/projects')}>
            <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Layers color="#2563EB" size={24} />
              <Text style={[styles.statValue, { color: colors.text }]}>{activeProjectsCount}</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Active Projects</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(1000).springify()} style={styles.statCardWrapper}>
          <TouchableOpacity activeOpacity={0.8} style={styles.statTouch} onPress={() => router.push('/projects')}>
            <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <FileText color="#F59E0B" size={24} />
              <Text style={[styles.statValue, { color: colors.text }]}>{totalReportsCount}</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Total Reports</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>
      </View>

      <View style={{ height: 120 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC', // Very light cool gray/blue
  },
  content: {
    padding: 24,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  headerProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileAvatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 16,
  },
  profileAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#DBEAFE', // Light blue background
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  profileText: {
    color: '#1E3A8A', // Deep blue
    fontWeight: 'bold',
    fontSize: 16,
  },
  headerTextContainer: {
    justifyContent: 'center',
  },
  greeting: {
    fontSize: 14,
    color: '#64748B', // Slate 500
    marginBottom: 2,
    fontWeight: '500',
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A', // Slate 900
    letterSpacing: -0.5,
  },
  dateText: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
    fontWeight: '500',
  },
  settingsButton: {
    padding: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    ...Platform.select({
      web: { boxShadow: '0px 2px 8px rgba(0,0,0,0.05)' as any },
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }
    }),
  },
  aiCardContainer: {
    marginBottom: 32,
    position: 'relative',
    ...Platform.select({
      web: { boxShadow: '0px 8px 24px rgba(37,99,235,0.1)' as any },
      default: { shadowColor: '#2563EB', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 24, elevation: 8 }
    }),
  },
  aiGlow: {
    position: 'absolute',
    top: -5,
    left: -5,
    right: -5,
    bottom: -5,
    backgroundColor: '#3B82F6',
    borderRadius: 24,
    opacity: 0.15,
  },
  aiCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
    borderRadius: 20,
    backgroundColor: Platform.OS === 'ios' ? 'rgba(255, 255, 255, 0.7)' : '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    overflow: 'hidden',
  },
  aiIconWrapper: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  aiTextWrapper: {
    flex: 1,
  },
  aiTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E3A8A',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  aiSubtitle: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  cardContainer: {
    width: '48%',
    marginBottom: 16,
  },
  cardTouch: {
    width: '100%',
  },
  cardContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    height: 140,
    justifyContent: 'center',
    alignItems: 'flex-start',
    ...Platform.select({
      web: { boxShadow: '0px 4px 12px rgba(0,0,0,0.04)' as any },
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 3 }
    }),
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
    letterSpacing: -0.3,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCardWrapper: {
    width: '48%',
  },
  statTouch: {
    width: '100%',
  },
  statCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      web: { boxShadow: '0px 2px 8px rgba(0,0,0,0.03)' as any },
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 }
    }),
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 12,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  }
});
