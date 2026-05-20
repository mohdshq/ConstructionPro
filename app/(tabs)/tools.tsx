import BackButton from "../../components/BackButton";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, Platform, TextInput , Alert } from 'react-native';
import { useState } from 'react';
import { Calculator, FileText, ChevronRight, Activity, ArrowRightLeft, Scale, Zap, Wind, Truck, Compass, Grid3X3, ArrowUpRight, DollarSign, Box, Minimize, Replace, MoveUpRight, Droplet, Droplets, TrendingUp, Pickaxe, Mountain, Home, LayoutGrid, AlignVerticalSpaceAround, Layers, Minus, Layout, ArrowUpFromLine, Users, Search } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { router } from 'expo-router';
import { useThemeColors } from '../../store/useThemeColors';
import { useStore } from '../../store/useStore';

type ToolCategory = 'civil' | 'structural' | 'mep' | 'plumbing' | 'geotech' | 'productivity' | 'financial' | 'converters';

export default function ToolsScreen() {
    const [activeTab, setActiveTab] = useState<ToolCategory | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const { colors, isDark } = useThemeColors();
    const { isPremium } = useStore();

    const civilTools = [
// ... [kept below]

        { id: 'concrete', name: 'Concrete Volume Estimator', desc: 'Calculate slabs, footings, and walls', icon: <Box color="#2563EB" size={24} />, route: '/concrete-calculator' },
        { id: 'rebar', name: 'Rebar Weight Estimator', desc: 'Calculate steel tonnage by length and diameter', icon: <AlignVerticalSpaceAround color="#0EA5E9" size={24} />, route: '/rebar-calculator' },
        { id: 'block', name: 'Block/Brick Wall Estimator', desc: 'Wall material requirements and mortar', icon: <Grid3X3 color="#F59E0B" size={24} />, route: '/block-calculator' },
        { id: 'soil', name: 'Soil Excavation & Fill', desc: 'Cut and fill volume with swell factors', icon: <Mountain color="#8B5CF6" size={24} />, route: '/soil-calculator' },
        { id: 'asphalt', name: 'Asphalt Yield Calculator', desc: 'Paving area and hot mix tons', icon: <Compass color="#0F172A" size={24} />, route: '/asphalt-calculator' },
        { id: 'tile', name: 'Tile & Grout Estimator', desc: 'Room area and tile waste calculation', icon: <LayoutGrid color="#10B981" size={24} />, route: '/tile-calculator' },
        { id: 'stair', name: 'Stair Estimator', desc: 'Rise, run, and stringer layout', icon: <ArrowUpRight color="#F59E0B" size={24} />, route: '/stair-calculator' },
        { id: 'roof', name: 'Roof Pitch Multiplier', desc: 'True area from flat plan area', icon: <Home color="#047857" size={24} />, route: '/dynamic-calculator?id=roof-pitch' },
        { id: 'paver', name: 'Paver Block Estimator', desc: 'Total blocks with 5% waste', icon: <LayoutGrid color="#065F46" size={24} />, route: '/dynamic-calculator?id=paver-blocks' },
        { id: 'trench', name: 'Trench & Bedding Vol', desc: 'Excavation minus pipe volume', icon: <AlignVerticalSpaceAround color="#064E3B" size={24} />, route: '/dynamic-calculator?id=trench-volume' },
        { id: 'concrete_mix', name: 'Concrete Mix Proportions', desc: 'Batch volumes per grade', icon: <Layers color="#022C22" size={24} />, route: '/dynamic-calculator?id=concrete-mix' },
        { id: 'paint', name: 'Paint Area Estimator', desc: 'Gallons/Liters for walls and ceilings', icon: <Droplet color="#047857" size={24} />, route: '/dynamic-calculator?id=paint-estimator' },
        { id: 'drywall', name: 'Drywall Sheets', desc: 'Sheet count with waste factor', icon: <Layers color="#064E3B" size={24} />, route: '/dynamic-calculator?id=drywall-sheets' },
        { id: 'stud', name: 'Wall Stud Framing', desc: 'Count studs & plates', icon: <LayoutGrid color="#022C22" size={24} />, route: '/dynamic-calculator?id=stud-framing' },
    ];

    const structuralTools = [
        { id: 'beam_sim', name: 'Simple Beam Deflection', desc: 'Max deflection for center load', icon: <Minus color="#B91C1C" size={24} />, route: '/dynamic-calculator?id=beam-deflection-simple' },
        { id: 'beam_uni', name: 'Uniform Load Beam', desc: 'Deflection under distributed load', icon: <Layout color="#991B1B" size={24} />, route: '/dynamic-calculator?id=beam-deflection-uniform' },
        { id: 'euler', name: 'Euler Column Buckling', desc: 'Critical load for ideal columns', icon: <ArrowUpFromLine color="#7F1D1D" size={24} />, route: '/dynamic-calculator?id=column-buckling' },
        { id: 'punch', name: 'Concrete Punching Shear', desc: 'Slab shear perimeter capacity', icon: <Box color="#450A0A" size={24} />, route: '/dynamic-calculator?id=punching-shear' },
        { id: 'wind', name: 'Base Wind Pressure', desc: 'Velocity pressure by exposure', icon: <Wind color="#991B1B" size={24} />, route: '/dynamic-calculator?id=wind-load-base' },
        { id: 'live', name: 'Live Load Estimator', desc: 'ASCE 7 Minimum Design Loads', icon: <Users color="#7F1D1D" size={24} />, route: '/dynamic-calculator?id=live-load' },
        { id: 'moment', name: 'Max Bending Moment', desc: 'Simply supported uniform load', icon: <Minus color="#7F1D1D" size={24} />, route: '/dynamic-calculator?id=bending-moment' },
    ];

    const geotechTools = [
        { id: 'retaining', name: 'Retaining Wall Check', desc: 'Global overturning factor of safety', icon: <ArrowRightLeft color="#854D0E" size={24} />, route: '/dynamic-calculator?id=retaining-wall-overturning' },
        { id: 'moisture', name: 'Soil Moisture Content', desc: 'Water weight to dry soil weight', icon: <Droplets color="#713F12" size={24} />, route: '/dynamic-calculator?id=moisture-content' },
        { id: 'void_ratio', name: 'Void Ratio & Porosity', desc: 'Volumetric phase relationships', icon: <Box color="#422006" size={24} />, route: '/dynamic-calculator?id=void-ratio' },
        { id: 'bearing', name: 'Net Safe Bearing Capacity', desc: 'Ultimate capacity / Safety Factor', icon: <ArrowUpRight color="#A16207" size={24} />, route: '/dynamic-calculator?id=bearing-capacity' },
        { id: 'borrow', name: 'Borrow Pit Volume', desc: 'Bank vs Haul vs Compacted yield', icon: <Pickaxe color="#CA8A04" size={24} />, route: '/dynamic-calculator?id=borrow-pit-volume' },
    ];

    const mepTools = [
        { id: 'voltage', name: 'Voltage Drop Calculator', desc: 'Cable sizing and electrical limits', icon: <Zap color="#EAB308" size={24} />, route: '/voltage-calculator' },
        { id: 'pipe', name: 'Pipe Fill Capacity', desc: 'Calculate max wires per conduit size', icon: <Calculator color="#06B6D4" size={24} />, route: '/pipe-calculator' },
        { id: 'hvac', name: 'HVAC Tonnage Estimator', desc: 'Quick cooling load rules of thumb', icon: <Wind color="#14B8A6" size={24} />, route: '/hvac-calculator' },
        { id: 'ohms', name: "Ohm's Law Calculator", desc: 'Find V, I, R, or P with just two inputs', icon: <Zap color="#BE185D" size={24} />, route: '/ohms-calculator' },
        { id: 'duct', name: 'HVAC Duct Sizing', desc: 'Velocity and friction metrics', icon: <Wind color="#047857" size={24} />, route: '/dynamic-calculator?id=hvac-duct' },
        { id: 'ach', name: 'Air Changes/Hr (ACH)', desc: 'Ventilation flow requirements', icon: <Pickaxe color="#059669" size={24} />, route: '/dynamic-calculator?id=air-changes' },
        { id: 'motor', name: '3-Phase Motor Power', desc: 'Electrical HP from V, I, and PF', icon: <Zap color="#10B981" size={24} />, route: '/dynamic-calculator?id=motor-power' },
        { id: 'ac', name: 'AC Unit Tonnage', desc: 'Cooling load from room area', icon: <Wind color="#047857" size={24} />, route: '/dynamic-calculator?id=ac-tonnage' },
    ];

    const plumbingTools = [
        { id: 'pipe_vel', name: 'Liquid Pipe Velocity', desc: 'Check flow limits for water hammer', icon: <Droplets color="#0891B2" size={24} />, route: '/dynamic-calculator?id=pipe-velocity' },
        { id: 'btu_water', name: 'Water Heating Energy', desc: 'Thermodynamics to heat water volume', icon: <Droplet color="#0E7490" size={24} />, route: '/dynamic-calculator?id=btu-water' },
        { id: 'pipe_vol', name: 'Pipe Capacity Volume', desc: 'Total fluid in a length of pipe', icon: <Droplet color="#155E75" size={24} />, route: '/dynamic-calculator?id=pipe-volume' },
    ];

    const productivityTools = [
        { id: 'labor', name: 'Labor Cost & Duration', desc: 'Estimate man-hours and crew timeline', icon: <DollarSign color="#4F46E5" size={24} />, route: '/labor-calculator' },
        { id: 'pour', name: 'Concrete Pour Delivery Rate', desc: 'Truck spacing and placement logistics', icon: <Truck color="#6366F1" size={24} />, route: '/pour-calculator' },
        { id: 'crew', name: 'Task Productivity Rate', desc: 'Total duration based on daily output', icon: <Activity color="#4338CA" size={24} />, route: '/dynamic-calculator?id=crew-productivity' },
    ];

    const financialTools = [
        { id: 'roi', name: 'Equipment ROI & Payback', desc: 'Compare capital costs to savings', icon: <TrendingUp color="#16A34A" size={24} />, route: '/dynamic-calculator?id=roi-calculator' },
        { id: 'markup', name: 'Margin vs Markup Pricing', desc: 'Set selling prices accurately', icon: <DollarSign color="#15803D" size={24} />, route: '/dynamic-calculator?id=markup-margin' },
        { id: 'loan', name: 'Equipment Loan EMI', desc: 'Monthly payment amortization', icon: <DollarSign color="#166534" size={24} />, route: '/dynamic-calculator?id=loan-payment' },
        { id: 'rent_buy', name: 'Rent vs Buy Break-Even', desc: 'Determine cost crossover months', icon: <TrendingUp color="#14532D" size={24} />, route: '/dynamic-calculator?id=rent-vs-buy' },
    ];

    const converters = [
        { id: 'universal', name: 'Universal Unit Converter', desc: 'Length, Area, Volume, Weight & Temp', icon: <ArrowRightLeft color="#8B5CF6" size={24} />, route: '/converter' },
    ];

    const allTools = [
        ...civilTools,
        ...structuralTools,
        ...geotechTools,
        ...mepTools,
        ...plumbingTools,
        ...productivityTools,
        ...financialTools,
        ...converters,
    ];

    const getActiveData = () => {
        if (searchQuery.trim().length > 0) {
            const query = searchQuery.toLowerCase();
            return allTools.filter(tool =>
                tool.name.toLowerCase().includes(query) ||
                tool.desc.toLowerCase().includes(query)
            );
        }

        switch (activeTab) {
            case 'civil': return civilTools;
            case 'structural': return structuralTools;
            case 'geotech': return geotechTools;
            case 'mep': return mepTools;
            case 'plumbing': return plumbingTools;
            case 'productivity': return productivityTools;
            case 'financial': return financialTools;
            case 'converters': return converters;
        }
    };

    const checkProAccess = (toolId: string) => {
        if (isPremium) return true;
        
        if (converters.some(c => c.id === toolId)) return true;
        
        const isFree = [
            ...civilTools.slice(0, 2),
            ...structuralTools.slice(0, 2),
            ...geotechTools.slice(0, 2),
            ...mepTools.slice(0, 2),
            ...plumbingTools.slice(0, 2),
            ...productivityTools.slice(0, 2),
            ...financialTools.slice(0, 2)
        ].some(t => t.id === toolId);
        
        return isFree;
    };

    const categories = [
        { id: 'civil' as ToolCategory, label: 'Civil & Architectural', icon: <Home color="#2563EB" size={28} />, count: civilTools.length },
        { id: 'structural' as ToolCategory, label: 'Structural Eng', icon: <Layout color="#991B1B" size={28} />, count: structuralTools.length },
        { id: 'geotech' as ToolCategory, label: 'Geotechnical & Soil', icon: <Mountain color="#854D0E" size={28} />, count: geotechTools.length },
        { id: 'mep' as ToolCategory, label: 'MEP & HVAC', icon: <Zap color="#059669" size={28} />, count: mepTools.length },
        { id: 'plumbing' as ToolCategory, label: 'Plumbing & Water', icon: <Droplets color="#0891B2" size={28} />, count: plumbingTools.length },
        { id: 'productivity' as ToolCategory, label: 'Productivity', icon: <Activity color="#4338CA" size={28} />, count: productivityTools.length },
        { id: 'financial' as ToolCategory, label: 'Financial & Cost', icon: <DollarSign color="#166534" size={28} />, count: financialTools.length },
        { id: 'converters' as ToolCategory, label: 'Unit Converters', icon: <ArrowRightLeft color="#8B5CF6" size={28} />, count: converters.length },
    ];

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.card }]}>
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <View style={[styles.header, { backgroundColor: colors.card }]}>
                    
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 16, minHeight: 40 }}>
                        {activeTab && (
                            <BackButton 
                                onPress={() => setActiveTab(null)} 
                                style={{ position: 'absolute', left: -8, zIndex: 10, width: 40, height: 40 }} 
                            />
                        )}
                        <Text style={[styles.headerTitle, { color: colors.text, paddingHorizontal: 30 }]} numberOfLines={1}>
                            {activeTab ? categories.find(c => c.id === activeTab)?.label : "Tools Hub"}
                        </Text>
                    </View>


                    <View style={[styles.searchContainer, { backgroundColor: colors.inputBackground }]}>
                        <Search color={colors.textMuted} size={20} style={styles.searchIcon} />
                        <TextInput
                            style={[styles.searchInput, { color: colors.text }]}
                            placeholder="Find calculators, estimators..."
                            placeholderTextColor={colors.textMuted}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            clearButtonMode="while-editing"
                        />
                    </View>
                </View>

                {searchQuery.length === 0 && !activeTab && (
                    <ScrollView contentContainerStyle={styles.gridContainer} showsVerticalScrollIndicator={false}>
                        {categories.map((cat, index) => (
                            <Animated.View key={cat.id} entering={FadeInDown.delay(index * 50).springify()} style={styles.gridItemWrapper}>
                                <TouchableOpacity
                                    style={[styles.gridCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                                    activeOpacity={0.8}
                                    onPress={() => setActiveTab(cat.id)}
                                >
                                    <View style={[styles.gridIconContainer, { backgroundColor: colors.inputBackground }]}>{cat.icon}</View>
                                    <Text style={[styles.gridCardTitle, { color: colors.text }]}>{cat.label}</Text>
                                    <Text style={[styles.gridCardSub, { color: colors.textMuted }]}>{cat.count} tools</Text>
                                </TouchableOpacity>
                            </Animated.View>
                        ))}
                    </ScrollView>
                )}

                {(searchQuery.length > 0 || activeTab) && (
                    <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
                        

                        {getActiveData()?.map((item, index) => {
                            const isProFeature = !checkProAccess(item.id);
                            return (
                                <Animated.View key={item.id} entering={FadeInDown.delay(index * 50).springify()}>
                                    <TouchableOpacity
                                        style={[styles.toolCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                                        activeOpacity={0.7}
                                        onPress={() => {
                                            if (isProFeature) {
                                                Alert.alert(
                                                    "Premium Required",
                                                    "This calculator is reserved for Construction Pro Premium members. Upgrade to access all tools.",
                                                    [
                                                        { text: "Cancel", style: "cancel" },
                                                        { text: "Upgrade", style: "default", onPress: () => router.push('/settings' as any) }
                                                    ]
                                                );
                                                return;
                                            }
                                            router.push(item.route as any);
                                        }}
                                    >
                                        <View style={[styles.iconContainer, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>{item.icon}</View>
                                        <View style={styles.textContainer}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                <Text style={[styles.toolName, { color: colors.text }]}>{item.name}</Text>
                                                {isProFeature && (
                                                    <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 8 }}>
                                                        <Text style={{ color: '#D97706', fontSize: 10, fontWeight: 'bold' }}>PRO</Text>
                                                    </View>
                                                )}
                                            </View>
                                            <Text style={[styles.toolDesc, { color: colors.textMuted }]}>{item.desc}</Text>
                                        </View>
                                        <ChevronRight size={20} color={colors.textMuted} />
                                    </TouchableOpacity>
                                </Animated.View>
                            );
                        })}
                    </ScrollView>
                )}
            </View>
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
        paddingHorizontal: 24,
        paddingTop: Platform.OS === 'android' ? 24 : 10,
        backgroundColor: '#FFFFFF',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0F172A',
        textAlign: 'center',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F1F5F9',
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 44,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: '#0F172A',
        height: '100%',
    },
    segmentWrapper: {
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
        paddingBottom: 16,
    },
    segmentContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        marginTop: 12,
    },
    segmentButton: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: '#F1F5F9',
        marginRight: 8,
    },
    segmentActive: {
        backgroundColor: '#0F172A',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 4,
    },
    segmentText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#64748B',
    },
    segmentTextActive: {
        color: '#FFFFFF',
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 100,
        justifyContent: 'space-between',
    },
    gridItemWrapper: {
        width: '48%',
        marginBottom: 16,
    },
    gridCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
        height: 140,
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    gridIconContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#F8FAFC',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    gridCardTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#0F172A',
        textAlign: 'center',
        marginBottom: 4,
    },
    gridCardSub: {
        fontSize: 12,
        color: '#64748B',
        fontWeight: '500',
    },
    backToCatsBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        marginBottom: 12,
        paddingHorizontal: 4,
    },
    backToCatsText: {
        fontSize: 16,
        color: '#64748B',
        fontWeight: '600',
        marginLeft: 4,
    },
    listContent: {
        padding: 24,
        paddingBottom: 120, // space for tab bar
    },
    toolCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        padding: 20,
        borderRadius: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: '#F8FAFC',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    textContainer: {
        flex: 1,
    },
    toolName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1E293B',
        marginBottom: 4,
    },
    toolDesc: {
        fontSize: 14,
        color: '#64748B',
    }
});
