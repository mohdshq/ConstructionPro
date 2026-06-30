import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, TextInput, StyleSheet, SafeAreaView } from 'react-native';
import { ChevronDown, X } from 'lucide-react-native';

interface PickerDropdownProps {
    value: string;
    options: string[];
    onSelect: (v: string) => void;
    placeholder: string;
    allowCustom?: boolean;
    colors: any;
}

export default function PickerDropdown({ value, options, onSelect, placeholder, allowCustom, colors }: PickerDropdownProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [isCustomMode, setIsCustomMode] = useState(false);
    const [customValue, setCustomValue] = useState('');

    const handleSelect = (val: string) => {
        onSelect(val);
        setIsVisible(false);
        setIsCustomMode(false);
    };

    const submitCustom = () => {
        if (customValue.trim() !== '') {
            handleSelect(customValue.trim());
        }
    };

    const renderItem = ({ item }: { item: string }) => (
        <TouchableOpacity 
            style={[styles.item, { borderBottomColor: colors.border }]} 
            onPress={() => handleSelect(item)}
        >
            <Text style={[styles.itemText, { color: colors.text }]}>{item}</Text>
        </TouchableOpacity>
    );

    return (
        <>
            <TouchableOpacity 
                style={[styles.trigger, { backgroundColor: colors.card, borderColor: colors.border }]} 
                onPress={() => setIsVisible(true)}
            >
                <Text style={[styles.triggerText, { color: value ? colors.text : colors.text + '80' }]} numberOfLines={1}>
                    {value || placeholder}
                </Text>
                <ChevronDown size={20} color={colors.text + '80'} />
            </TouchableOpacity>

            <Modal visible={isVisible} transparent animationType="slide">
                <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
                    <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
                        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>{placeholder}</Text>
                            <TouchableOpacity onPress={() => { setIsVisible(false); setIsCustomMode(false); }}>
                                <X size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>

                        {isCustomMode ? (
                            <View style={styles.customContainer}>
                                <TextInput
                                    style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                                    placeholder="Enter custom value..."
                                    placeholderTextColor={colors.text + '80'}
                                    value={customValue}
                                    onChangeText={setCustomValue}
                                    autoFocus
                                />
                                <TouchableOpacity 
                                    style={[styles.btn, { backgroundColor: '#2563EB' }]} 
                                    onPress={submitCustom}
                                >
                                    <Text style={styles.btnText}>Done</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <FlatList
                                data={options}
                                keyExtractor={(item, index) => `${item}-${index}`}
                                renderItem={renderItem}
                                ListFooterComponent={() => allowCustom ? (
                                    <TouchableOpacity 
                                        style={[styles.item, { borderBottomColor: colors.border }]} 
                                        onPress={() => { setIsCustomMode(true); setCustomValue(''); }}
                                    >
                                        <Text style={[styles.itemText, { color: '#2563EB', fontWeight: '600' }]}>+ Add new...</Text>
                                    </TouchableOpacity>
                                ) : null}
                            />
                        )}
                        <SafeAreaView />
                    </View>
                </View>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    trigger: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderRadius: 8,
        minHeight: 44
    },
    triggerText: { fontSize: 14, flex: 1 },
    modalOverlay: { flex: 1, justifyContent: 'flex-end' },
    modalContent: { borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '80%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
    modalTitle: { fontSize: 16, fontWeight: '700' },
    item: { paddingVertical: 16, paddingHorizontal: 20, borderBottomWidth: StyleSheet.hairlineWidth },
    itemText: { fontSize: 16 },
    customContainer: { padding: 16 },
    input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, fontSize: 16, marginBottom: 16 },
    btn: { padding: 14, borderRadius: 8, alignItems: 'center' },
    btnText: { color: '#FFF', fontSize: 16, fontWeight: '600' }
});
