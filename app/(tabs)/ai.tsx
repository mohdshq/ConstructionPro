import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { Send, Sparkles, Trash2, Zap, BookOpen, HardHat } from 'lucide-react-native';
import Animated, { FadeInUp, FadeOutDown } from 'react-native-reanimated';
import { useState, useRef, useEffect } from 'react';
import { useThemeColors } from '../../store/useThemeColors';
import { useAIStore, ChatMessage } from '../../store/useAIStore';
import { useStore } from '../../store/useStore';
import { GoogleGenerativeAI } from '@google/generative-ai';

const SUGGESTIONS = [
    { id: '1', text: 'What is the required rebar cover for footings?', icon: <HardHat size={16} /> },
    { id: '2', text: 'Draft a daily report for concrete pouring', icon: <BookOpen size={16} /> },
    { id: '3', text: 'Summarize ACI 318 standards for curing', icon: <Zap size={16} /> },
    { id: '4', text: 'How do I calculate wind load on a roof?', icon: <HardHat size={16} /> },
];

export default function AIScreen() {
    const { colors, isDark } = useThemeColors();
    const { messages, addMessage, clearHistory } = useAIStore();
    const [input, setInput] = useState('');
    const scrollViewRef = useRef<ScrollView>(null);
    const [isTyping, setIsTyping] = useState(false);

    const { aiApiKey } = useStore();

    useEffect(() => {
        // Auto-scroll to bottom when messages change
        setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
    }, [messages, isTyping]);

    const handleSend = async (textToSend: string) => {
        if (!textToSend.trim()) return;

        const userMsg: ChatMessage = { 
            id: Date.now().toString(), 
            text: textToSend.trim(), 
            sender: 'user',
            timestamp: Date.now()
        };
        
        addMessage(userMsg);
        setInput('');
        Keyboard.dismiss();
        setIsTyping(true);

        if (!aiApiKey) {
            setTimeout(() => {
                setIsTyping(false);
                addMessage({
                    id: (Date.now() + 1).toString(),
                    text: "⚠️ Please enter your Gemini API Key in the App Settings to enable AI responses. Go to Settings > AI Configuration.",
                    sender: 'ai',
                    timestamp: Date.now()
                });
            }, 800);
            return;
        }

        try {
            const genAI = new GoogleGenerativeAI(aiApiKey);
            const systemInstruction = "You are an expert construction site assistant. You specialize in construction standards (ACI, IBC, AISC), drafting daily reports, identifying safety hazards, and calculating materials. Be concise, professional, and practical.";
            
            // Convert store messages to Gemini format, skipping the default welcome message
            const history = messages
                .filter(m => m.id !== 'welcome_1')
                .map(m => ({
                    role: m.sender === 'user' ? 'user' : 'model',
                    parts: [{ text: m.text }]
                }));

            // Dynamically fetch available models for this specific API key to avoid 404s
            let validModelNames: string[] = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro']; 
            try {
                const modelsResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${aiApiKey}`);
                const modelsData = await modelsResponse.json();
                
                if (modelsData.models && modelsData.models.length > 0) {
                    const validModels = modelsData.models.filter((m: any) => 
                        m.supportedGenerationMethods && 
                        m.supportedGenerationMethods.includes("generateContent") &&
                        !m.name.includes("vision") && 
                        !m.name.includes("embedding")
                    );
                    
                    if (validModels.length > 0) {
                        // Sort models to prioritize 'flash', then 'pro', then others
                        validModels.sort((a: any, b: any) => {
                            const aIsFlash = a.name.includes('flash') ? 1 : 0;
                            const bIsFlash = b.name.includes('flash') ? 1 : 0;
                            if (aIsFlash !== bIsFlash) return bIsFlash - aIsFlash;
                            
                            const aIsPro = a.name.includes('pro') ? 1 : 0;
                            const bIsPro = b.name.includes('pro') ? 1 : 0;
                            return bIsPro - aIsPro;
                        });
                        
                        validModelNames = validModels.map((m: any) => m.name.replace('models/', ''));
                    }
                }
            } catch (fetchErr) {
                console.warn("Failed to dynamically fetch models, using fallback.", fetchErr);
            }

            let responseText = "";
            let success = false;
            let lastError = null;

            for (const modelName of validModelNames) {
                try {
                    // If the selected model is an older gemini-pro (1.0), it does not support systemInstruction
                    const useSystemDoc = !modelName.match(/^gemini-pro$/i);
                    
                    const model = genAI.getGenerativeModel(
                        useSystemDoc 
                            ? { model: modelName, systemInstruction } 
                            : { model: modelName }
                    );

                    // Handle gemini-pro (1.0) system instruction injection
                    let currentHistory = [...history];
                    if (!useSystemDoc && currentHistory.length === 0) {
                        currentHistory.push({ role: 'user', parts: [{ text: systemInstruction + "\n\nUser: Hello" }] });
                        currentHistory.push({ role: 'model', parts: [{ text: "Hello! How can I help you on site today?" }] });
                    }

                    const chat = model.startChat({ history: currentHistory });
                    const result = await chat.sendMessage(textToSend.trim());
                    responseText = result.response.text();
                    success = true;
                    break; // Stop loop if successful
                } catch (e: any) {
                    lastError = e;
                    console.warn(`Model ${modelName} failed. Falling back to next...`, e.message);
                }
            }

            if (!success) {
                throw lastError || new Error("All models failed to respond.");
            }

            addMessage({
                id: (Date.now() + 1).toString(),
                text: responseText,
                sender: 'ai',
                timestamp: Date.now()
            });

        } catch (error: any) {
            addMessage({
                id: (Date.now() + 1).toString(),
                text: `Error connecting to AI: ${error.message || 'Please check your API key.'}`,
                sender: 'ai',
                timestamp: Date.now()
            });
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor: colors.background }]}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
            <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
                    <Sparkles color="#2563EB" size={20} style={{ marginRight: 8 }} />
                    <Text style={[styles.headerTitle, { color: colors.text }]}>AI Assistant</Text>
                </View>
                <TouchableOpacity onPress={clearHistory} style={{ position: 'absolute', right: 20, bottom: 16, padding: 4 }}>
                    <Trash2 color={colors.textMuted} size={20} />
                </TouchableOpacity>
            </View>

            <ScrollView 
                ref={scrollViewRef}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {messages.map((msg, index) => (
                    <Animated.View
                        key={msg.id}
                        entering={FadeInUp.delay(50).springify()}
                        style={[
                            styles.messageBubble,
                            msg.sender === 'user' 
                                ? { ...styles.userBubble, backgroundColor: colors.primary } 
                                : { ...styles.aiBubble, backgroundColor: colors.card, borderColor: colors.border }
                        ]}
                    >
                        <Text style={[
                            styles.messageText, 
                            msg.sender === 'user' ? styles.userText : { color: colors.text }
                        ]}>
                            {msg.text}
                        </Text>
                        <Text style={[
                            styles.timeText,
                            msg.sender === 'user' ? { color: 'rgba(255,255,255,0.7)' } : { color: colors.textMuted }
                        ]}>
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                    </Animated.View>
                ))}

                {isTyping && (
                    <Animated.View entering={FadeInUp} style={[styles.messageBubble, styles.aiBubble, { backgroundColor: colors.card, borderColor: colors.border, alignSelf: 'flex-start' }]}>
                        <Text style={[styles.messageText, { color: colors.textMuted, fontStyle: 'italic' }]}>AI is analyzing standards...</Text>
                    </Animated.View>
                )}
            </ScrollView>

            <View style={[styles.bottomSection, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
                
                {/* Suggestions List */}
                <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false} 
                    style={styles.suggestionsContainer}
                    contentContainerStyle={{ paddingHorizontal: 16 }}
                >
                    {SUGGESTIONS.map((sug, i) => (
                        <TouchableOpacity 
                            key={sug.id}
                            style={[styles.suggestionChip, { backgroundColor: colors.background, borderColor: colors.border }]}
                            onPress={() => handleSend(sug.text)}
                        >
                            <View style={{ opacity: 0.7, marginRight: 6 }}>
                                {sug.icon}
                            </View>
                            <Text style={[styles.suggestionText, { color: colors.text }]}>{sug.text}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                <View style={[styles.inputContainer, { backgroundColor: colors.card }]}>
                    <TextInput
                        style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
                        placeholder="Ask about codes, drawings, or reports..."
                        placeholderTextColor={colors.textMuted}
                        value={input}
                        onChangeText={setInput}
                        multiline
                    />
                    <TouchableOpacity 
                        onPress={() => handleSend(input)} 
                        style={[styles.sendButton, { backgroundColor: input.trim() ? colors.primary : colors.border }]}
                        disabled={!input.trim()}
                    >
                        <Send color={input.trim() ? "#FFF" : colors.textMuted} size={20} />
                    </TouchableOpacity>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: Platform.OS === 'ios' ? 60 : 30,
        paddingBottom: 16,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        zIndex: 10,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 20,
    },
    messageBubble: {
        maxWidth: '85%',
        padding: 16,
        borderRadius: 20,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    userBubble: {
        alignSelf: 'flex-end',
        borderBottomRightRadius: 4,
    },
    aiBubble: {
        alignSelf: 'flex-start',
        borderBottomLeftRadius: 4,
        borderWidth: 1,
    },
    messageText: {
        fontSize: 15,
        lineHeight: 22,
    },
    userText: {
        color: '#FFFFFF',
        fontWeight: '500',
    },
    timeText: {
        fontSize: 11,
        marginTop: 6,
        alignSelf: 'flex-end',
    },
    bottomSection: {
        borderTopWidth: 1,
        paddingBottom: Platform.OS === 'ios' ? 90 : 80, // Tab bar padding
    },
    suggestionsContainer: {
        maxHeight: 50,
        minHeight: 50,
        marginTop: 12,
        marginBottom: 4,
    },
    suggestionChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1,
        marginRight: 10,
        height: 40,
    },
    suggestionText: {
        fontSize: 13,
        fontWeight: '500',
    },
    inputContainer: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 10,
        alignItems: 'flex-end',
    },
    input: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 14,
        paddingBottom: 14,
        borderRadius: 24,
        fontSize: 15,
        maxHeight: 120,
        minHeight: 52,
        borderWidth: 1,
    },
    sendButton: {
        width: 52,
        height: 52,
        borderRadius: 26,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 12,
    }
});
