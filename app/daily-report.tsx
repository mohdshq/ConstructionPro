import BackButton from "../components/BackButton";
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useState } from 'react';
import { FileText, ArrowLeft, Send } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { router } from 'expo-router';

export default function DailyReportScreen() {
    const [project, setProject] = useState('');
    const [weather, setWeather] = useState('');
    const [workforce, setWorkforce] = useState('');
    const [notes, setNotes] = useState('');

    const submitReport = () => {
        if (!project || !weather || !workforce) {
            Alert.alert("Missing Fields", "Please fill out all required fields.");
            return;
        }

        Alert.alert(
            "Report Submitted",
            "Daily progress log has been saved and synced to the cloud.",
            [{ text: "OK", onPress: () => router.back() }]
        );
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <View style={styles.headerBar}>
                <BackButton style={{ position: "absolute", left: 20, zIndex: 20, bottom: 8 }} />
                <Text style={styles.headerBarTitle}>Daily Progress Log</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.infoCard}>
                    <FileText color="#E11D48" size={32} />
                    <Text style={styles.infoTitle}>Site Report</Text>
                    <Text style={styles.infoDesc}>Formal daily tracking for workforce, weather conditions, and general progress.</Text>
                </Animated.View>

                <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.formGroup}>
                    <Text style={styles.label}>Project Name *</Text>
                    <View style={styles.inputWrapper}>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. Downtown Highrise"
                            value={project}
                            onChangeText={setProject}
                        />
                    </View>
                </Animated.View>

                <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.formGroup}>
                    <Text style={styles.label}>Weather Conditions *</Text>
                    <View style={styles.inputWrapper}>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. Sunny, 24°C, Low wind"
                            value={weather}
                            onChangeText={setWeather}
                        />
                    </View>
                </Animated.View>

                <Animated.View entering={FadeInDown.delay(400).springify()} style={styles.formGroup}>
                    <Text style={styles.label}>Workforce Count *</Text>
                    <View style={styles.inputWrapper}>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. 45"
                            keyboardType="number-pad"
                            value={workforce}
                            onChangeText={setWorkforce}
                        />
                    </View>
                </Animated.View>

                <Animated.View entering={FadeInDown.delay(500).springify()} style={styles.formGroup}>
                    <Text style={styles.label}>Progress Notes & Constraints</Text>
                    <View style={[styles.inputWrapper, { height: 120, alignItems: 'flex-start', paddingTop: 12 }]}>
                        <TextInput
                            style={[styles.input, { textAlignVertical: 'top' }]}
                            placeholder="Detail the work completed today and any issues blocking progress..."
                            multiline
                            numberOfLines={4}
                            value={notes}
                            onChangeText={setNotes}
                        />
                    </View>
                </Animated.View>

                <Animated.View entering={FadeInDown.delay(600).springify()}>
                    <TouchableOpacity style={styles.submitBtn} onPress={submitReport} activeOpacity={0.8}>
                        <Send color="#FFFFFF" size={20} style={{ marginRight: 8 }} />
                        <Text style={styles.submitBtnText}>Submit Log</Text>
                    </TouchableOpacity>
                </Animated.View>

            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
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
    content: {
        padding: 24,
        paddingBottom: 40,
    },
    infoCard: {
        backgroundColor: '#FFF1F2', // Rose 50
        borderRadius: 16,
        padding: 24,
        marginBottom: 32,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#FFE4E6', // Rose 100
    },
    infoTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#BE123C', // Rose 700
        marginTop: 12,
        marginBottom: 8,
    },
    infoDesc: {
        fontSize: 14,
        color: '#E11D48', // Rose 600
        textAlign: 'center',
        lineHeight: 20,
    },
    formGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#334155',
        marginBottom: 8,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        paddingHorizontal: 16,
    },
    input: {
        flex: 1,
        paddingVertical: 14,
        fontSize: 16,
        color: '#0F172A',
    },
    submitBtn: {
        flexDirection: 'row',
        backgroundColor: '#E11D48', // Rose 600
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 12,
        shadowColor: '#E11D48',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    submitBtnText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    }
});
