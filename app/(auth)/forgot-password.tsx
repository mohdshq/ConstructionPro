import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Mail, ArrowLeft, AlertCircle, CheckCircle } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { useThemeColors } from '../../store/useThemeColors';

export default function ForgotPasswordScreen() {
    const { colors } = useThemeColors();
    const router = useRouter();
    
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleReset = async () => {
        if (!email) {
            setError('Please enter your email address');
            return;
        }

        try {
            setLoading(true);
            setError(null);
            
            const { error } = await supabase.auth.resetPasswordForEmail(email);

            if (error) throw error;
            
            setSuccess(true);
        } catch (e: any) {
            setError(e.message || 'An error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView 
            style={[styles.container, { backgroundColor: colors.background }]} 
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <TouchableOpacity 
                style={styles.backButton} 
                onPress={() => router.back()}
            >
                <ArrowLeft size={24} color={colors.text} />
            </TouchableOpacity>

            <View style={styles.headerContainer}>
                <Text style={[styles.title, { color: colors.text }]}>Reset Password</Text>
                <Text style={[styles.subtitle, { color: colors.textMuted }]}>Enter your email to receive a reset link</Text>
            </View>

            <View style={styles.formContainer}>
                {error && (
                    <View style={styles.errorContainer}>
                        <AlertCircle size={16} color="#DC2626" />
                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                )}

                {success ? (
                    <View style={styles.successContainer}>
                        <CheckCircle size={48} color="#16A34A" style={styles.successIcon} />
                        <Text style={[styles.successTitle, { color: colors.text }]}>Check your email</Text>
                        <Text style={[styles.successText, { color: colors.textMuted }]}>
                            We have sent password reset instructions to {email}
                        </Text>
                        <TouchableOpacity 
                            style={[styles.resetButton, { backgroundColor: colors.primary, marginTop: 24 }]}
                            onPress={() => router.replace('/(auth)/login')}
                        >
                            <Text style={styles.resetButtonText}>Return to Login</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <>
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

                        <TouchableOpacity 
                            style={[styles.resetButton, { backgroundColor: colors.primary }]}
                            onPress={handleReset}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.resetButtonText}>Send Reset Link</Text>
                            )}
                        </TouchableOpacity>
                    </>
                )}
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 24,
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    headerContainer: {
        marginBottom: 40,
        paddingHorizontal: 8,
    },
    title: {
        fontSize: 32,
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
    successContainer: {
        alignItems: 'center',
        padding: 24,
    },
    successIcon: {
        marginBottom: 20,
    },
    successTitle: {
        fontSize: 24,
        fontWeight: '700',
        marginBottom: 12,
    },
    successText: {
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 24,
    },
    inputContainer: {
        marginBottom: 24,
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
    resetButton: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        height: 56,
        borderRadius: 12,
        shadowColor: '#2563EB',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
        width: '100%',
    },
    resetButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    }
});
