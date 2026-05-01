import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, SafeAreaView, Modal } from 'react-native';
import { useState, useMemo } from 'react';
import { ArrowLeft, Ruler, Maximize, Box, Scale, Thermometer, Gauge, Activity, RotateCw, Wind, Zap, Battery, Droplets, Droplet, MoveRight, Layers, Flame, ChevronsUp, Crosshair, Clock, Database, Radio, Sun, Search, ChevronDown, X } from "lucide-react-native";
import BackButton from "../components/BackButton";
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { router } from 'expo-router';
import { useThemeColors } from '../store/useThemeColors';

type Category = 'Length' | 'Area' | 'Volume' | 'Weight' | 'Temperature' | 'Pressure' | 'Force' | 'Torque' | 'Speed' | 'Power' | 'Energy' | 'Density' | 'Mass Flow' | 'Vol Flow' | 'Dyn Viscosity' | 'Kin Viscosity' | 'Specific Heat' | 'Thermal Cond' | 'Acceleration' | 'Angle' | 'Time' | 'Data Storage' | 'Data Rate' | 'Illuminance' | 'Frequency' | 'Fuel Consumption' | 'Electric Current' | 'Electric Potential' | 'Electric Resistance' | 'Capacitance';

const categories: { label: Category; icon: any }[] = [
    { label: 'Length', icon: Ruler },
    { label: 'Area', icon: Maximize },
    { label: 'Volume', icon: Box },
    { label: 'Weight', icon: Scale },
    { label: 'Temperature', icon: Thermometer },
    { label: 'Pressure', icon: Gauge },
    { label: 'Force', icon: Activity },
    { label: 'Torque', icon: RotateCw },
    { label: 'Speed', icon: Wind },
    { label: 'Power', icon: Zap },
    { label: 'Energy', icon: Battery },
    { label: 'Density', icon: Layers },
    { label: 'Mass Flow', icon: Scale },
    { label: 'Vol Flow', icon: Droplets },
    { label: 'Dyn Viscosity', icon: Droplet },
    { label: 'Kin Viscosity', icon: Droplet },
    { label: 'Specific Heat', icon: Flame },
    { label: 'Thermal Cond', icon: Flame },
    { label: 'Acceleration', icon: ChevronsUp },
    { label: 'Angle', icon: Crosshair },
    { label: 'Time', icon: Clock },
    { label: 'Data Storage', icon: Database },
    { label: 'Data Rate', icon: Database },
    { label: 'Illuminance', icon: Sun },
    { label: 'Frequency', icon: Radio },
    { label: 'Fuel Consumption', icon: Droplet },
    { label: 'Electric Current', icon: Zap },
    { label: 'Electric Potential', icon: Zap },
    { label: 'Electric Resistance', icon: Activity },
    { label: 'Capacitance', icon: Battery },
];

const unitData: Record<Category, string[]> = {
    Length: ['Meters', 'Centimeters', 'Millimeters', 'Kilometers', 'Inches', 'Feet', 'Yards', 'Miles'],
    Area: ['Square Meters', 'Square Centimeters', 'Hectares', 'Square Inches', 'Square Feet', 'Acres'],
    Volume: ['Cubic Meters', 'Liters', 'Milliliters', 'Cubic Inches', 'Cubic Feet', 'Gallons (US)'],
    Weight: ['Kilograms', 'Grams', 'Metric Tons', 'Ounces', 'Pounds', 'Short Tons'],
    Temperature: ['Celsius', 'Fahrenheit', 'Kelvin'],
    Pressure: ['Pascals', 'Kilopascals', 'Megapascals', 'Bar', 'Milibar', 'psi', 'psf', 'atm'],
    Force: ['Newtons', 'Kilonewtons', 'Pounds-force (lbf)', 'Kilograms-force (kgf)'],
    Torque: ['Newton-meters (N-m)', 'Pound-feet (lb-ft)', 'Pound-inches (lb-in)', 'Kilogram-meters (kg-m)'],
    Speed: ['Meters / sec', 'Meters / min', 'Kilometers / hour', 'Feet / sec', 'Feet / min', 'Miles / hour', 'Knots'],
    Power: ['Watts', 'Kilowatts', 'Megawatts', 'Horsepower (Mech)', 'BTU / hour', 'Tons of Refrig'],
    Energy: ['Joules', 'Kilojoules', 'Megajoules', 'Watt-hours', 'Kilowatt-hours', 'BTU', 'Kilocalories'],
    Density: ['kg / m³', 'g / cm³', 'lb / ft³', 'lb / in³', 'lb / gal (US)'],
    'Mass Flow': ['kg / sec', 'kg / min', 'kg / hour', 'lb / sec', 'lb / min', 'lb / hour'],
    'Vol Flow': ['m³ / sec', 'm³ / hour', 'Liters / sec', 'Liters / min', 'CFM', 'GPM (US)', 'GPM (UK)'],
    'Dyn Viscosity': ['Pascal-seconds', 'Poise', 'Centipoise', 'lb / (ft-s)'],
    'Kin Viscosity': ['m² / sec', 'Stokes', 'Centistokes', 'ft² / sec'],
    'Specific Heat': ['kJ / (kg-K)', 'J / (kg-K)', 'BTU / (lb-F)', 'kcal / (kg-C)'],
    'Thermal Cond': ['W / (m-K)', 'BTU / (hr-ft-F)', 'BTU-in / (hr-ft²-F)'],
    Acceleration: ['m / s²', 'g (Standard)', 'ft / s²'],
    Angle: ['Degrees', 'Radians', 'Gradians', 'Minutes of arc'],
    Time: ['Seconds', 'Minutes', 'Hours', 'Days', 'Weeks', 'Years'],
    'Data Storage': ['Bytes', 'Kilobytes', 'Megabytes', 'Gigabytes', 'Terabytes'],
    'Data Rate': ['Bits / sec', 'Kilobits / sec', 'Megabits / sec', 'Gigabits / sec', 'Megabytes / sec'],
    Illuminance: ['Lux', 'Foot-candles'],
    Frequency: ['Hertz', 'Kilohertz', 'Megahertz', 'Gigahertz', 'RPM'],
    'Fuel Consumption': ['Liters / 100km', 'km / Liter', 'Miles / Gallon (US)', 'Miles / Gallon (UK)'],
    'Electric Current': ['Amperes', 'Milliamperes', 'Kiloamperes', 'Biot'],
    'Electric Potential': ['Volts', 'Millivolts', 'Kilovolts', 'Megavolts'],
    'Electric Resistance': ['Ohms', 'Kilo-ohms', 'Mega-ohms'],
    Capacitance: ['Farads', 'Microfarads', 'Nanofarads', 'Picofarads'],
};

// Simplified conversion factors (to base unit, e.g. Meters)
const conversionFactors: Record<string, number> = {
    // Length (Base: Meters)
    'Meters': 1, 'Centimeters': 0.01, 'Millimeters': 0.001, 'Kilometers': 1000,
    'Inches': 0.0254, 'Feet': 0.3048, 'Yards': 0.9144, 'Miles': 1609.34,

    // Area (Base: Square Meters)
    'Square Meters': 1, 'Square Centimeters': 0.0001, 'Hectares': 10000,
    'Square Inches': 0.00064516, 'Square Feet': 0.092903, 'Acres': 4046.86,

    // Volume (Base: Liters)
    'Cubic Meters': 1000, 'Liters': 1, 'Milliliters': 0.001,
    'Cubic Inches': 0.0163871, 'Cubic Feet': 28.3168, 'Gallons (US)': 3.78541,

    // Weight (Base: Kilograms)
    'Kilograms': 1, 'Grams': 0.001, 'Metric Tons': 1000,
    'Ounces': 0.0283495, 'Pounds': 0.453592, 'Short Tons': 907.185,

    // Pressure (Base: Pascals)
    'Pascals': 1, 'Kilopascals': 1000, 'Megapascals': 1000000, 'Bar': 100000,
    'Milibar': 100, 'psi': 6894.76, 'psf': 47.8803, 'atm': 101325,

    // Force (Base: Newtons)
    'Newtons': 1, 'Kilonewtons': 1000, 'Pounds-force (lbf)': 4.44822, 'Kilograms-force (kgf)': 9.80665,

    // Torque (Base: N-m)
    'Newton-meters (N-m)': 1, 'Pound-feet (lb-ft)': 1.35582, 'Pound-inches (lb-in)': 0.112985, 'Kilogram-meters (kg-m)': 9.80665,

    // Speed (Base: m/s)
    'Meters / sec': 1, 'Meters / min': 0.0166667, 'Kilometers / hour': 0.277778,
    'Feet / sec': 0.3048, 'Feet / min': 0.00508, 'Miles / hour': 0.44704, 'Knots': 0.514444,

    // Power (Base: Watts)
    'Watts': 1, 'Kilowatts': 1000, 'Megawatts': 1000000, 'Horsepower (Mech)': 745.7,
    'BTU / hour': 0.293071, 'Tons of Refrig': 3516.85,

    // Energy (Base: Joules)
    'Joules': 1, 'Kilojoules': 1000, 'Megajoules': 1000000, 'Watt-hours': 3600,
    'Kilowatt-hours': 3600000, 'BTU': 1055.06, 'Kilocalories': 4184,

    // Density (Base: kg/m³)
    'kg / m³': 1, 'g / cm³': 1000, 'lb / ft³': 16.0185, 'lb / in³': 27679.9, 'lb / gal (US)': 119.826,

    // Mass Flow (Base: kg/s)
    'kg / sec': 1, 'kg / min': 1 / 60, 'kg / hour': 1 / 3600,
    'lb / sec': 0.453592, 'lb / min': 0.453592 / 60, 'lb / hour': 0.453592 / 3600,

    // Vol Flow (Base: m³/s)
    'm³ / sec': 1, 'm³ / hour': 1 / 3600, 'Liters / sec': 0.001, 'Liters / min': 0.001 / 60,
    'CFM': 0.000471947, 'GPM (US)': 0.0000630902, 'GPM (UK)': 0.0000757682,

    // Dyn Viscosity (Base: Pa-s)
    'Pascal-seconds': 1, 'Poise': 0.1, 'Centipoise': 0.001, 'lb / (ft-s)': 1.48816,

    // Kin Viscosity (Base: m²/s)
    'm² / sec': 1, 'Stokes': 0.0001, 'Centistokes': 0.000001, 'ft² / sec': 0.092903,

    // Specific Heat (Base: J/kg-K)
    'kJ / (kg-K)': 1000, 'J / (kg-K)': 1, 'BTU / (lb-F)': 4186.8, 'kcal / (kg-C)': 4184,

    // Thermal Cond (Base: W/m-K)
    'W / (m-K)': 1, 'BTU / (hr-ft-F)': 1.73073, 'BTU-in / (hr-ft²-F)': 0.144228,

    // Acceleration (Base: m/s²)
    'm / s²': 1, 'g (Standard)': 9.80665, 'ft / s²': 0.3048,

    // Angle (Base: Degrees)
    'Degrees': 1, 'Radians': 57.2958, 'Gradians': 0.9, 'Minutes of arc': 0.0166667,

    // Time (Base: Seconds)
    'Seconds': 1, 'Minutes': 60, 'Hours': 3600, 'Days': 86400, 'Weeks': 604800, 'Years': 31536000,

    // Data Storage (Base: Bytes)
    'Bytes': 1, 'Kilobytes': 1024, 'Megabytes': 1048576, 'Gigabytes': 1073741824, 'Terabytes': 1099511627776,

    // Data Rate (Base: bps)
    'Bits / sec': 1, 'Kilobits / sec': 1000, 'Megabits / sec': 1000000, 'Gigabits / sec': 1000000000,
    'Megabytes / sec': 8000000,

    // Illuminance (Base: Lux)
    'Lux': 1, 'Foot-candles': 10.7639,

    // Frequency (Base: Hertz)
    'Hertz': 1, 'Kilohertz': 1000, 'Megahertz': 1000000, 'Gigahertz': 1000000000, 'RPM': 0.0166667,

    // Electric (Base Units)
    'Amperes': 1, 'Milliamperes': 0.001, 'Kiloamperes': 1000, 'Biot': 10,
    'Volts': 1, 'Millivolts': 0.001, 'Kilovolts': 1000, 'Megavolts': 1000000,
    'Ohms': 1, 'Kilo-ohms': 1000, 'Mega-ohms': 1000000,
    'Farads': 1, 'Microfarads': 0.000001, 'Nanofarads': 0.000000001, 'Picofarads': 0.000000000001,
};

export default function UniversalConverterScreen() {
    const { colors } = useThemeColors();
    const [activeCategory, setActiveCategory] = useState<Category>('Length');
    const [fromUnit, setFromUnit] = useState<string>('Meters');
    const [toUnit, setToUnit] = useState<string>('Feet');
    const [inputValue, setInputValue] = useState<string>('1');
    const [searchQuery, setSearchQuery] = useState('');
    const [isPickerVisible, setIsPickerVisible] = useState(false);

    const filteredCategories = useMemo(() => {
        if (!searchQuery.trim()) return categories;
        const query = searchQuery.toLowerCase();
        return categories.filter(c => c.label.toLowerCase().includes(query));
    }, [searchQuery]);

    // Handle category change and reset units
    const handleCategoryChange = (cat: Category) => {
        setActiveCategory(cat);
        setFromUnit(unitData[cat][0]);
        setToUnit(unitData[cat][1]);
        setInputValue('1');
        setIsPickerVisible(false);
    };

    const calculateConversion = () => {
        const val = parseFloat(inputValue);
        if (isNaN(val)) return '0.00';

        if (activeCategory === 'Temperature') {
            // Special logic for Temp
            let celsius = 0;
            if (fromUnit === 'Celsius') celsius = val;
            else if (fromUnit === 'Fahrenheit') celsius = (val - 32) * 5 / 9;
            else if (fromUnit === 'Kelvin') celsius = val - 273.15;

            if (toUnit === 'Celsius') return celsius.toFixed(2);
            if (toUnit === 'Fahrenheit') return ((celsius * 9 / 5) + 32).toFixed(2);
            if (toUnit === 'Kelvin') return (celsius + 273.15).toFixed(2);
            return '0.00';
        }

        if (activeCategory === 'Fuel Consumption') {
            if (fromUnit === toUnit) return val.toFixed(2);
            // MPG inversely proportional to L/100km
            // 235.215 / MPG = L/100km
            // Let's standardise to L/100km internally
            let l100km = val;
            if (fromUnit === 'km / Liter') l100km = 100 / val;
            else if (fromUnit === 'Miles / Gallon (US)') l100km = 235.215 / val;
            else if (fromUnit === 'Miles / Gallon (UK)') l100km = 282.481 / val;

            if (toUnit === 'Liters / 100km') return l100km.toFixed(2);
            if (toUnit === 'km / Liter') return (100 / l100km).toFixed(2);
            if (toUnit === 'Miles / Gallon (US)') return (235.215 / l100km).toFixed(2);
            if (toUnit === 'Miles / Gallon (UK)') return (282.481 / l100km).toFixed(2);
        }

        // Standard factor conversion
        const inBase = val * conversionFactors[fromUnit];
        const result = inBase / conversionFactors[toUnit];
        return result.toPrecision(6).replace(/\.?0+$/, ''); // clean trailing zeros
    };

    const result = useMemo(() => calculateConversion(), [inputValue, fromUnit, toUnit, activeCategory]);

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={[styles.headerBar, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
                <BackButton style={{ position: "absolute", left: 20, zIndex: 20, bottom: 8 }} />
                <Text style={[styles.headerBarTitle, { color: colors.text }]}>Universal Converter</Text>
            </View>

            {/* Active Category Header Button instead of ScrollBar */}
            <View style={styles.categorySelectorWrapper}>
                <TouchableOpacity
                    style={styles.categorySelectorBtn}
                    onPress={() => setIsPickerVisible(true)}
                    activeOpacity={0.7}
                >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={styles.categorySelectorLabel}>Current Category</Text>
                        <Text style={styles.categorySelectorValue}>{activeCategory}</Text>
                    </View>
                    <ChevronDown size={20} color="#0F172A" />
                </TouchableOpacity>
            </View>

            {/* Full Screen Category Picker Modal */}
            <Modal visible={isPickerVisible} animationType="slide" presentationStyle="pageSheet">
                <SafeAreaView style={styles.modalSafeArea}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Select Category</Text>
                        <TouchableOpacity onPress={() => setIsPickerVisible(false)} style={styles.closeBtn}>
                            <X size={24} color="#0F172A" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.modalSearchContainer}>
                        <Search color="#94A3B8" size={20} style={styles.searchIcon} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Find a category..."
                            placeholderTextColor="#94A3B8"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            clearButtonMode="while-editing"
                        />
                    </View>

                    <ScrollView contentContainerStyle={styles.gridContainer} showsVerticalScrollIndicator={false}>
                        {filteredCategories.map((cat, index) => {
                            const Icon = cat.icon;
                            const isActive = activeCategory === cat.label;
                            return (
                                <Animated.View key={cat.label} entering={FadeInDown.delay(index * 20).springify()} style={styles.gridItemWrapper}>
                                    <TouchableOpacity
                                        style={[styles.gridCard, isActive && styles.gridCardActive]}
                                        onPress={() => handleCategoryChange(cat.label)}
                                        activeOpacity={0.8}
                                    >
                                        <View style={[styles.gridIconContainer, isActive && styles.gridIconContainerActive]}>
                                            <Icon size={24} color={isActive ? '#FFFFFF' : '#64748B'} />
                                        </View>
                                        <Text style={[styles.gridCardTitle, isActive && styles.gridCardTitleActive]} numberOfLines={1} adjustsFontSizeToFit>
                                            {cat.label}
                                        </Text>
                                    </TouchableOpacity>
                                </Animated.View>
                            )
                        })}
                    </ScrollView>
                </SafeAreaView>
            </Modal>

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.content}>

                    <Animated.View entering={FadeInDown.springify()} style={styles.card}>
                        <Text style={styles.cardLabel}>From</Text>

                        {/* Unit Selector Strip */}
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.unitStrip}>
                            {unitData[activeCategory].map(unit => (
                                <TouchableOpacity
                                    key={unit}
                                    style={[styles.unitPill, fromUnit === unit && styles.unitPillActive]}
                                    onPress={() => setFromUnit(unit)}
                                >
                                    <Text style={[styles.unitPillText, fromUnit === unit && styles.unitPillTextActive]}>{unit}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <TextInput
                            style={styles.hugeInput}
                            keyboardType="numeric"
                            value={inputValue}
                            onChangeText={setInputValue}
                            placeholder="0"
                            placeholderTextColor="#CBD5E1"
                        />
                    </Animated.View>

                    <View style={styles.dividerContainer}>
                        <View style={styles.dividerLine} />
                        <View style={styles.dividerCircle}>
                            <Text style={styles.dividerEqual}>=</Text>
                        </View>
                        <View style={styles.dividerLine} />
                    </View>

                    <Animated.View entering={FadeInDown.delay(100).springify()} style={[styles.card, styles.resultCard]}>
                        <Text style={styles.cardLabel}>To</Text>

                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.unitStrip}>
                            {unitData[activeCategory].map(unit => (
                                <TouchableOpacity
                                    key={unit}
                                    style={[styles.unitPill, toUnit === unit && styles.unitPillActive]}
                                    onPress={() => setToUnit(unit)}
                                >
                                    <Text style={[styles.unitPillText, toUnit === unit && styles.unitPillTextActive]}>{unit}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <Text style={styles.hugeResultText} numberOfLines={1} adjustsFontSizeToFit>
                            {result}
                        </Text>
                    </Animated.View>

                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    headerBar: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingTop: Platform.OS === "ios" ? 60 : 30,
        paddingBottom: 16,
        paddingHorizontal: 20,
        backgroundColor: "#FFFFFF",
        borderBottomWidth: 1,
        borderBottomColor: "#E2E8F0",
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
        fontWeight: "700",
        color: "#0F172A",
        textAlign: "center",
        paddingHorizontal: 40,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F1F5F9',
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 44,
        marginHorizontal: 20,
        marginBottom: 16,
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
    categorySelectorWrapper: {
        paddingHorizontal: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    categorySelectorBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#F8FAFC',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    categorySelectorLabel: {
        fontSize: 14,
        color: '#64748B',
        marginRight: 8,
        fontWeight: '500',
    },
    categorySelectorValue: {
        fontSize: 16,
        color: '#0F172A',
        fontWeight: '700',
    },
    modalSafeArea: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
        backgroundColor: '#FFFFFF',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0F172A',
    },
    closeBtn: {
        position: 'absolute',
        right: 16,
        padding: 8,
    },
    modalSearchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 44,
        margin: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 16,
        paddingBottom: 40,
        justifyContent: 'space-between',
    },
    gridItemWrapper: {
        width: '31%',
        marginBottom: 16,
    },
    gridCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        paddingVertical: 16,
        paddingHorizontal: 8,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    gridCardActive: {
        backgroundColor: '#2563EB',
        borderColor: '#2563EB',
    },
    gridIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#F1F5F9',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    gridIconContainerActive: {
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    gridCardTitle: {
        fontSize: 12,
        fontWeight: '600',
        color: '#475569',
        textAlign: 'center',
    },
    gridCardTitleActive: {
        color: '#FFFFFF',
    },
    content: {
        padding: 24,
        paddingBottom: 40,
        backgroundColor: '#F8FAFC',
        minHeight: '100%',
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },
    resultCard: {
        backgroundColor: '#EFF6FF',
        borderColor: '#BFDBFE',
    },
    cardLabel: {
        fontSize: 13,
        fontWeight: '700',
        color: '#64748B',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 12,
    },
    unitStrip: {
        flexDirection: 'row',
        marginBottom: 16,
    },
    unitPill: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        marginRight: 8,
        backgroundColor: '#F8FAFC',
    },
    unitPillActive: {
        borderColor: '#2563EB',
        backgroundColor: '#EFF6FF',
    },
    unitPillText: {
        fontSize: 13,
        fontWeight: '500',
        color: '#64748B',
    },
    unitPillTextActive: {
        color: '#2563EB',
        fontWeight: '600',
    },
    hugeInput: {
        fontSize: 48,
        fontWeight: '800',
        color: '#0F172A',
        padding: 0,
        letterSpacing: -1,
    },
    hugeResultText: {
        fontSize: 48,
        fontWeight: '800',
        color: '#2563EB',
        letterSpacing: -1,
    },
    dividerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: -10,
        zIndex: 10,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#E2E8F0',
        marginHorizontal: 16,
    },
    dividerCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        justifyContent: 'center',
        alignItems: 'center',
    },
    dividerEqual: {
        fontSize: 16,
        fontWeight: '800',
        color: '#94A3B8',
    }
});
