import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, SafeAreaView, Platform, ActionSheetIOS, Alert, Linking } from 'react-native';
import { useState, useMemo } from 'react';
import { Search, BookOpen, ChevronRight, ExternalLink, Globe, MapPin, Building, ShieldCheck, FileSignature, Factory, BadgeCheck, FileText, Settings, Leaf } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useThemeColors } from '../../store/useThemeColors';
import { searchStandards, StandardRegion, ConstructionStandard, StandardCategory } from '../../store/standardsData';
import * as WebBrowser from 'expo-web-browser';

const REGIONS: Array<StandardRegion | 'All'> = ['All', 'UAE', 'Gulf', 'International'];

export default function StandardsScreen() {
    const { colors } = useThemeColors();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedRegion, setSelectedRegion] = useState<StandardRegion | 'All'>('All');
    const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

    // Filter standards based on search query and region
    const filteredStandards = useMemo(() => {
        return searchStandards(searchQuery, selectedRegion);
    }, [searchQuery, selectedRegion]);

    const getCategoryIcon = (category: StandardCategory) => {
        switch (category) {
            case 'Building Codes': return <Building color="#3B82F6" size={24} />;
            case 'Safety': return <ShieldCheck color="#EF4444" size={24} />;
            case 'Contracts': return <FileSignature color="#F59E0B" size={24} />;
            case 'Materials': return <Factory color="#8B5CF6" size={24} />;
            case 'Testing': return <BadgeCheck color="#10B981" size={24} />;
            case 'Structural': return <FileText color="#0EA5E9" size={24} />;
            case 'Sustainability': return <Leaf color="#84CC16" size={24} />;
            case 'Electrical': return <Settings color="#F97316" size={24} />;
            case 'Plumbing': return <Settings color="#06B6D4" size={24} />;
            default: return <BookOpen color={colors.primary} size={24} />;
        }
    };

    const handleOpenStandard = async (standard: ConstructionStandard) => {
        if (Platform.OS === 'web') {
            window.open(standard.url, '_blank');
            return;
        }
        
        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
                {
                    options: ['Cancel', 'Open in App', 'Open in Native Browser'],
                    cancelButtonIndex: 0,
                    title: standard.title,
                    message: `Source: ${standard.sourceName}`
                },
                async (buttonIndex) => {
                    if (buttonIndex === 1) {
                        await WebBrowser.openBrowserAsync(standard.url);
                    } else if (buttonIndex === 2) {
                        Linking.openURL(standard.url);
                    }
                }
            );
        } else {
            Alert.alert(
                standard.title,
                `Source: ${standard.sourceName}\nHow would you like to open this standard?`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Open in App', onPress: () => WebBrowser.openBrowserAsync(standard.url) },
                    { text: 'Open in Native Browser', onPress: () => Linking.openURL(standard.url) },
                ],
                { cancelable: true }
            );
        }
    };

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                {/* Header */}
                <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Standards</Text>
                    <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>Engineering Reference Library</Text>

                    <View style={[styles.searchContainer, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                        <Search color={colors.textMuted} size={20} style={styles.searchIcon} />
                        <TextInput
                            style={[styles.searchInput, { color: colors.text }]}
                            placeholder="Search standards, codes, testing..."
                            placeholderTextColor={colors.textMuted}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>

                    {/* Region Filters */}
                    <ScrollView 
                        horizontal 
                        showsHorizontalScrollIndicator={false} 
                        style={styles.filterScroll}
                        contentContainerStyle={styles.filterContainer}
                    >
                        {REGIONS.map((region) => {
                            const isSelected = selectedRegion === region;
                            return (
                                <TouchableOpacity
                                    key={region}
                                    style={[
                                        styles.filterPill,
                                        { backgroundColor: isSelected ? colors.primary : colors.card, borderColor: colors.border },
                                        isSelected && { borderColor: colors.primary }
                                    ]}
                                    onPress={() => setSelectedRegion(region)}
                                >
                                    {region === 'All' ? <Globe size={16} color={isSelected ? 'white' : colors.textMuted} /> : <MapPin size={16} color={isSelected ? 'white' : colors.textMuted} />}
                                    <Text style={[
                                        styles.filterText,
                                        { color: isSelected ? 'white' : colors.text }
                                    ]}>
                                        {region}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>

                {/* List */}
                <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
                    {filteredStandards.map((item, index) => {
                        const isExpanded = expandedCardId === item.id;
                        return (
                        <Animated.View key={item.id} entering={FadeInDown.delay(index * 50).springify()}>
                            <TouchableOpacity 
                                style={[styles.card, { backgroundColor: colors.card, borderColor: isExpanded ? colors.primary : colors.border }]} 
                                activeOpacity={0.7}
                                onPress={() => setExpandedCardId(isExpanded ? null : item.id)}
                            >
                                <View style={styles.cardHeader}>
                                    <View style={[styles.cardIcon, { backgroundColor: colors.background }]}>
                                        {getCategoryIcon(item.category)}
                                    </View>
                                    <View style={styles.cardContent}>
                                        <View style={styles.cardMetaRow}>
                                            <Text style={[styles.categoryText, { color: colors.primary }]}>{item.category}</Text>
                                            <Text style={[styles.regionBadge, { color: colors.textMuted }]}>{item.region}</Text>
                                        </View>
                                        <Text style={[styles.titleText, { color: colors.text }]}>{item.title}</Text>
                                        {!isExpanded && <Text style={[styles.descText, { color: colors.textMuted }]} numberOfLines={2}>{item.description}</Text>}
                                    </View>
                                    <ChevronRight color={colors.textMuted} size={20} style={{ transform: [{ rotate: isExpanded ? '90deg' : '0deg' }] }} />
                                </View>

                                {isExpanded && (
                                    <View style={[styles.expandedContent, { borderTopColor: colors.border }]}>
                                        <Text style={[styles.briefText, { color: colors.text }]}>{item.brief}</Text>
                                        
                                        <View style={styles.sourceRow}>
                                            <Text style={[styles.sourceText, { color: colors.textMuted }]}>Authority/Source: {item.sourceName}</Text>
                                        </View>

                                        <TouchableOpacity 
                                            style={[styles.openButton, { backgroundColor: colors.primary }]}
                                            onPress={() => handleOpenStandard(item)}
                                        >
                                            <ExternalLink size={16} color="white" style={{ marginRight: 8 }} />
                                            <Text style={styles.openButtonText}>Access Document Link</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </TouchableOpacity>
                        </Animated.View>
                    )})}

                    {filteredStandards.length === 0 && (
                        <View style={styles.emptyState}>
                            <BookOpen color={colors.border} size={48} />
                            <Text style={[styles.emptyTitle, { color: colors.text }]}>No results found</Text>
                            <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>Try adjusting your search query or region filter.</Text>
                        </View>
                    )}
                </ScrollView>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
    },
    container: {
        flex: 1,
    },
    header: {
        paddingHorizontal: 24,
        paddingTop: Platform.OS === 'android' ? 24 : 10,
        paddingBottom: 16,
        borderBottomWidth: 1,
        zIndex: 10,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        textAlign: 'center',
    },
    headerSubtitle: {
        fontSize: 14,
        marginTop: 4,
        marginBottom: 20,
        textAlign: 'center',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        paddingHorizontal: 16,
        borderWidth: 1,
        marginBottom: 16,
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        paddingVertical: 12,
        fontSize: 16,
    },
    filterScroll: {
        maxHeight: 40,
    },
    filterContainer: {
        paddingRight: 24,
        gap: 8,
        flexDirection: 'row',
    },
    filterPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        gap: 6,
    },
    filterText: {
        fontSize: 14,
        fontWeight: '600',
    },
    listContent: {
        padding: 24,
        paddingBottom: Platform.OS === 'ios' ? 120 : 100,
    },
    card: {
        flexDirection: 'column',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        ...Platform.select({
            web: { boxShadow: '0px 2px 8px rgba(0,0,0,0.04)' as any },
            default: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 }
        })
    },
    cardIcon: {
        width: 50,
        height: 50,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    cardContent: {
        flex: 1,
        marginRight: 10,
    },
    cardMetaRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    categoryText: {
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    regionBadge: {
        fontSize: 11,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    titleText: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 6,
        lineHeight: 22,
    },
    descText: {
        fontSize: 13,
        lineHeight: 18,
        marginBottom: 8,
    },
    sourceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
        marginBottom: 16,
    },
    sourceText: {
        fontSize: 12,
        fontWeight: '600',
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    expandedContent: {
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
    },
    briefText: {
        fontSize: 14,
        lineHeight: 22,
    },
    openButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 8,
    },
    openButtonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 60,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginTop: 16,
        marginBottom: 8,
    },
    emptyDesc: {
        fontSize: 14,
        textAlign: 'center',
    }
});
