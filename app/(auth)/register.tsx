import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Mail, Lock, User, AlertCircle, ArrowRight } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { useThemeColors } from '../../store/useThemeColors';

export default function RegisterScreen() {
    const { colors } = useThemeColors();
    const router = useRouter();
    
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleRegister = async () => {
        if (!fullName || !email || !password || !confirmPassword) {
            setError('Please fill in all fields');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        try {
            setLoading(true);
            setError(null);
            
            const { error, data } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName,
                    }
                }
            });

            if (error) throw error;
            
            // Note: If email confirmation is enabled, the session will be null
            if (data.session) {
                // User is signed in automatically, layout auth listener will redirect
            } else {
                Alert.alert(
                    'Registration Successful', 
                    'Please check your email to verify your account.',
                    [{ text: 'OK', onPress: () => router.dismissTo('/(auth)/login') }]
                );
            }
        } catch (e: any) {
            setError(e.message || 'An error occurred during registration');
            if (e.message.includes('URL is missing')) {
                setError('Supabase is not configured. Please add your Project URL and Anon Key to the .env file.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView 
            style={[styles.container, { backgroundColor: colors.background }]} 
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
                <View style={styles.headerContainer}>
                    <Text style={[styles.title, { color: colors.text }]}>Create Account</Text>
                    <Text style={[styles.subtitle, { color: colors.textMuted }]}>Join ConstructionPro today</Text>
                </View>

                <View style={styles.formContainer}>
                    {error && (
                        <View style={styles.errorContainer}>
                            <AlertCircle size={16} color="#DC2626" />
                            <Text style={styles.errorText}>{error}</Text>
                        </View>
                    )}

                    <View style={styles.inputContainer}>
                        <Text style={[styles.inputLabel, { color: colors.text }]}>Full Name</Text>
                        <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.card }]}>
                            <User size={20} color={colors.textMuted} style={styles.inputIcon} />
                            <TextInput
                                style={[styles.input, { color: colors.text }]}
                                placeholder="John Doe"
                                placeholderTextColor={colors.textMuted}
                                value={fullName}
                                onChangeText={(text) => { setFullName(text); setError(null); }}
                            />
                        </View>
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={[styles.inputLabel, { color: colors.text }]}>Email Address</Text>
                        <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.card }]}>
                            <Mail size={20} color={colors.textMuted} style={styles.inputIcon} />
                            <TextInput
                                style={[styles.input, { color: colors.text }]}
                                placeholder="name@company.com"
                                placeholderTextColor={colors.textMuted}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                value={email}
                                onChangeText={(text) => { setEmail(text); setError(null); }}
                            />
                        </View>
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={[styles.inputLabel, { color: colors.text }]}>Password</Text>
                        <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.card }]}>
                            <Lock size={20} color={colors.textMuted} style={styles.inputIcon} />
                            <TextInput
                                style={[styles.input, { color: colors.text }]}
                                placeholder="••••••••"
                                placeholderTextColor={colors.textMuted}
                                secureTextEntry
                                value={password}
                                onChangeText={(text) => { setPassword(text); setError(null); }}
                            />
                        </View>
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={[styles.inputLabel, { color: colors.text }]}>Confirm Password</Text>
                        <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.card }]}>
                            <Lock size={20} color={colors.textMuted} style={styles.inputIcon} />
                            <TextInput
                                style={[styles.input, { color: colors.text }]}
                                placeholder="••••••••"
                                placeholderTextColor={colors.textMuted}
                                secureTextEntry
                                value={confirmPassword}
                                onChangeText={(text) => { setConfirmPassword(text); setError(null); }}
                            />
                        </View>
                    </View>

                    <TouchableOpacity 
                        style={[styles.registerButton, { backgroundColor: colors.primary }]}
                        onPress={handleRegister}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <>
                                <Text style={styles.registerButtonText}>Create Account</Text>
                                <ArrowRight size={20} color="#fff" />
                            </>
                        )}
                    </TouchableOpacity>

                    <View style={styles.footerContainer}>
                        <Text style={[styles.footerText, { color: colors.textMuted }]}>Already have an account? </Text>
                        <Link href="/(auth)/login" asChild>
                            <TouchableOpacity>
                                <Text style={[styles.footerLink, { color: colors.primary }]}>Sign In</Text>
                            </TouchableOpacity>
                        </Link>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContainer: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 24,
    },
    headerContainer: {
        marginBottom: 40,
        alignItems: 'center'
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
    },
    formContainer: {
        width: '100%',
        maxWidth: 400,
        alignSelf: 'center',
    },
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEF2F2',
        borderWidth: 1,
        borderColor: '#FCA5A5',
        padding: 12,
        borderRadius: 8,
        marginBottom: 20,
    },
    errorText: {
        color: '#DC2626',
        marginLeft: 8,
        fontSize: 14,
        flex: 1,
    },
    inputContainer: {
        marginBottom: 16,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 56,
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        height: '100%',
        fontSize: 16,
    },
    registerButton: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        height: 56,
        borderRadius: 12,
        marginTop: 14,
        shadowColor: '#2563EB',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    registerButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        marginRight: 8,
    },
    footerContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 32,
    },
    footerText: {
        fontSize: 15,
    },
    footerLink: {
        fontSize: 15,
        fontWeight: '700',
    }
});
