import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Plus, Trash2 } from 'lucide-react-native';
import { ManpowerRow, PRESET_STAFF_ROLES, PRESET_LABOR_TRADES } from '../../../../../store/projectsStore';
import { summaryByCompany, summaryByTrade, grandTotal, nightShiftTotal } from '../../../../../lib/reports/manpowerTotals';
import PickerDropdown from './PickerDropdown';

interface Props {
    rows: ManpowerRow[];
    onChange: (rows: ManpowerRow[]) => void;
    knownCompanies?: string[];
    colors: any;
    hiddenSections?: string[];
    onHiddenSectionsChange?: (hidden: string[]) => void;
}

export default function ManpowerSection({ rows, onChange, knownCompanies = [], colors, hiddenSections = [], onHiddenSectionsChange }: Props) {
    const toggleSection = (key: string) => {
        if (!onHiddenSectionsChange) return;
        if (hiddenSections.includes(key)) {
            onHiddenSectionsChange(hiddenSections.filter(k => k !== key));
        } else {
            onHiddenSectionsChange([...hiddenSections, key]);
        }
    };
    
    // Group rows by company. We preserve insertion order of companies by tracking them.
    const groups: { company: string; isMainContractor: boolean; rows: { row: ManpowerRow; index: number }[] }[] = [];
    const companyMap = new Map<string, number>();

    rows.forEach((row, i) => {
        const compName = row.company || '';
        if (!companyMap.has(compName)) {
            companyMap.set(compName, groups.length);
            groups.push({ company: compName, isMainContractor: row.isMainContractor, rows: [] });
        }
        groups[companyMap.get(compName)!].rows.push({ row, index: i });
    });

    const updateRow = (index: number, updates: Partial<ManpowerRow>) => {
        const newRows = [...rows];
        newRows[index] = { ...newRows[index], ...updates };
        onChange(newRows);
    };

    const deleteRow = (index: number) => {
        const newRows = [...rows];
        newRows.splice(index, 1);
        onChange(newRows);
    };

    const addCompany = () => {
        onChange([
            ...rows,
            {
                id: Date.now().toString() + Math.random().toString(),
                company: '',
                isMainContractor: false,
                category: 'staff',
                trade: '',
                shift: 'day',
                inHouse: 0,
                supply: 0,
                count: 0
            }
        ]);
    };

    const addCategoryToCompany = (company: string, isMainContractor: boolean, category: 'staff' | 'labor') => {
        onChange([
            ...rows,
            {
                id: Date.now().toString() + Math.random().toString(),
                company,
                isMainContractor,
                category,
                trade: '',
                shift: 'day',
                inHouse: 0,
                supply: 0,
                count: 0
            }
        ]);
    };

    const updateCompanyGroup = (oldCompany: string, newCompany: string) => {
        const trimmedNew = newCompany.trim();
        const usedCompanies = new Set(groups.map(g => g.company.toLowerCase()));
        if (usedCompanies.has(trimmedNew.toLowerCase()) && trimmedNew.toLowerCase() !== oldCompany.toLowerCase()) {
            Alert.alert("Duplicate Company", "This company already exists in the report.");
            return;
        }

        const newRows = rows.map(r => (r.company || '') === oldCompany ? { ...r, company: trimmedNew } : r);
        onChange(newRows);
    };

    const handleTradeSelect = (originalIndex: number, company: string, category: 'staff' | 'labor', shift: 'day' | 'night', newTrade: string, currentTrade: string) => {
        const trimmedTrade = newTrade.trim();
        const companyRows = rows.filter(r => (r.company || '') === company && r.category === category && r.shift === shift);
        const usedTrades = new Set(companyRows.map(r => r.trade.toLowerCase()));
        
        if (trimmedTrade !== '' && usedTrades.has(trimmedTrade.toLowerCase()) && trimmedTrade.toLowerCase() !== currentTrade.toLowerCase()) {
            Alert.alert("Duplicate Trade", `This ${category} trade already exists for the ${shift} shift.`);
            return;
        }

        updateRow(originalIndex, { trade: trimmedTrade });
    };

    const handleShiftSelect = (originalIndex: number, company: string, category: 'staff' | 'labor', trade: string, currentShift: 'day' | 'night', newShift: 'day' | 'night') => {
        if (currentShift === newShift) return;
        const trimmedTrade = trade.trim();
        if (trimmedTrade !== '') {
            const companyRows = rows.filter(r => (r.company || '') === company && r.category === category && r.shift === newShift);
            const usedTrades = new Set(companyRows.map(r => r.trade.toLowerCase()));
            if (usedTrades.has(trimmedTrade.toLowerCase())) {
                Alert.alert("Duplicate Trade", `This ${category} trade already exists for the ${newShift} shift.`);
                return;
            }
        }
        updateRow(originalIndex, { shift: newShift });
    };

    const applyToggleMainContractor = (company: string, newVal: boolean) => {
        const newRows = rows.map(r => {
            if ((r.company || '') === company) {
                const updatedRow = { ...r, isMainContractor: newVal };
                if (!newVal) {
                    updatedRow.count = (r.inHouse || 0) + (r.supply || 0) + (r.count || 0);
                    updatedRow.inHouse = 0;
                    updatedRow.supply = 0;
                }
                return updatedRow;
            }
            return r;
        });
        onChange(newRows);
    };

    const toggleMainContractorGroup = (company: string, currentVal: boolean) => {
        const isTurningOn = !currentVal;
        
        if (isTurningOn) {
            const existingMainContractors = groups
                .filter(g => g.isMainContractor && g.company !== company)
                .map(g => g.company || 'Unassigned');
                
            if (existingMainContractors.length > 0) {
                Alert.alert(
                    "Main Contractor Already Set",
                    `The following company is already set as a main contractor: ${existingMainContractors.join(', ')}.\nMost projects only have one main contractor.`,
                    [
                        { text: "Cancel", style: "cancel" },
                        { text: "Add Anyway", onPress: () => applyToggleMainContractor(company, true) }
                    ]
                );
                return;
            }
        }
        
        applyToggleMainContractor(company, isTurningOn);
    };

    const compSummary = summaryByCompany(rows);
    const staffRoleSummary = summaryByTrade(rows.filter(r => r.category === 'staff'));
    const laborTradeSummary = summaryByTrade(rows.filter(r => r.category !== 'staff'));
    const gTotal = grandTotal(rows);
    const nsTotal = nightShiftTotal(rows);

    return (
        <View style={styles.container}>
            {groups.map((group, gIdx) => {
                const displayName = group.company === '' ? 'Unassigned' : group.company;
                
                const usedCompanies = new Set(groups.map(g => g.company.toLowerCase()));
                const availableCompanies = knownCompanies.filter(kc => 
                    !usedCompanies.has(kc.toLowerCase()) || kc.toLowerCase() === group.company.toLowerCase()
                );

                const staffRows = group.rows.filter(r => r.row.category === 'staff');
                const laborRows = group.rows.filter(r => r.row.category !== 'staff');

                const renderSubGroup = (category: 'staff' | 'labor', subGroupRows: typeof group.rows) => {
                    const title = category === 'staff' ? 'Staff' : 'Labor';
                    const presets = category === 'staff' ? PRESET_STAFF_ROLES : PRESET_LABOR_TRADES;
                    return (
                        <View style={{ marginTop: 16 }}>
                            <Text style={{ fontWeight: '600', marginBottom: 8, color: colors.text }}>{title}</Text>
                            {subGroupRows.map(({ row, index: originalIndex }) => {
                                const companyRowsForShift = group.rows.filter(r => r.row.category === category && r.row.shift === row.shift);
                                const usedTradesInGroupAndShift = new Set(
                                    companyRowsForShift.filter(r => r.row.trade.trim() !== '').map(r => r.row.trade.toLowerCase())
                                );
                                const availableTrades = presets.filter(pt => 
                                    !usedTradesInGroupAndShift.has(pt.toLowerCase()) || pt.toLowerCase() === row.trade.toLowerCase()
                                );

                                return (
                                <View key={row.id} style={[styles.tradeRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                    <View style={styles.rowLayout}>
                                        <View style={{ flex: 1 }}>
                                            <PickerDropdown
                                                value={row.trade}
                                                options={availableTrades as any}
                                                onSelect={(v) => handleTradeSelect(originalIndex, group.company, category, row.shift, v, row.trade)}
                                                placeholder="Select..."
                                                allowCustom
                                                colors={colors}
                                            />
                                        </View>
                                        <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteRow(originalIndex)}>
                                            <Trash2 size={18} color="#EF4444" />
                                        </TouchableOpacity>
                                    </View>
                                    <View style={[styles.rowLayout, { marginTop: 12 }]}>
                                        <View style={{ flexDirection: 'row', marginRight: 8 }}>
                                            <TouchableOpacity
                                                style={[styles.shiftPill, { borderTopRightRadius: 0, borderBottomRightRadius: 0, borderRightWidth: 0 }, row.shift === 'day' ? { backgroundColor: '#F59E0B', borderColor: '#F59E0B' } : { backgroundColor: colors.inputBackground, borderColor: colors.border }]}
                                                onPress={() => handleShiftSelect(originalIndex, group.company, category, row.trade, row.shift, 'day')}
                                            >
                                                <Text style={[styles.shiftPillText, row.shift === 'day' ? { color: '#FFF' } : { color: colors.text }]}>Day</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={[styles.shiftPill, { borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }, row.shift === 'night' ? { backgroundColor: '#6366F1', borderColor: '#6366F1' } : { backgroundColor: colors.inputBackground, borderColor: colors.border }]}
                                                onPress={() => handleShiftSelect(originalIndex, group.company, category, row.trade, row.shift, 'night')}
                                            >
                                                <Text style={[styles.shiftPillText, row.shift === 'night' ? { color: '#FFF' } : { color: colors.text }]}>Night</Text>
                                            </TouchableOpacity>
                                        </View>
                                        {group.isMainContractor && category === 'labor' ? (
                                            <>
                                                <View style={{ flex: 1 }}>
                                                    <TextInput
                                                        style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
                                                        keyboardType="numeric"
                                                        placeholder="In-House"
                                                        placeholderTextColor={colors.text + '80'}
                                                        value={row.inHouse ? row.inHouse.toString() : ''}
                                                        onChangeText={t => updateRow(originalIndex, { inHouse: parseInt(t) || 0 })}
                                                    />
                                                </View>
                                                <View style={{ flex: 1 }}>
                                                    <TextInput
                                                        style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
                                                        keyboardType="numeric"
                                                        placeholder="Supply"
                                                        placeholderTextColor={colors.text + '80'}
                                                        value={row.supply ? row.supply.toString() : ''}
                                                        onChangeText={t => updateRow(originalIndex, { supply: parseInt(t) || 0 })}
                                                    />
                                                </View>
                                                <View style={{ width: 60 }}>
                                                    <TextInput
                                                        style={[styles.input, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE', color: '#1E3A8A', fontWeight: 'bold', textAlign: 'center' }]}
                                                        editable={false}
                                                        value={((Number(row.inHouse) || 0) + (Number(row.supply) || 0)).toString()}
                                                    />
                                                </View>
                                            </>
                                        ) : (
                                            <View style={{ flex: 1 }}>
                                                <TextInput
                                                    style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
                                                    keyboardType="numeric"
                                                    placeholder="Count"
                                                    placeholderTextColor={colors.text + '80'}
                                                    value={row.count ? row.count.toString() : ''}
                                                    onChangeText={t => updateRow(originalIndex, { count: parseInt(t) || 0 })}
                                                />
                                            </View>
                                        )}
                                    </View>
                                </View>
                                );
                            })}
                            <TouchableOpacity style={styles.addTradeBtn} onPress={() => addCategoryToCompany(group.company, group.isMainContractor, category)}>
                                <Plus size={16} color={colors.text} style={{ marginRight: 6 }} />
                                <Text style={[styles.addTradeText, { color: colors.text }]}>Add {title}</Text>
                            </TouchableOpacity>
                        </View>
                    );
                };

                return (
                    <View key={`group-${gIdx}`} style={[styles.card, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                        <View style={[styles.rowLayout, { marginBottom: 16, zIndex: 10 }]}>
                            <View style={{ flex: 1 }}>
                                <PickerDropdown
                                    value={group.company}
                                    options={availableCompanies}
                                    onSelect={(v) => updateCompanyGroup(group.company, v)}
                                    placeholder="Select Company..."
                                    allowCustom
                                    colors={colors}
                                />
                            </View>
                            <TouchableOpacity
                                style={[styles.chip, group.isMainContractor ? { backgroundColor: '#2563EB', borderColor: '#2563EB' } : { backgroundColor: colors.card, borderColor: colors.border }]}
                                onPress={() => toggleMainContractorGroup(group.company, group.isMainContractor)}
                            >
                                <Text style={[styles.chipText, group.isMainContractor ? { color: '#FFF' } : { color: colors.text }]}>
                                    Main Contractor
                                </Text>
                            </TouchableOpacity>
                        </View>
                        {renderSubGroup('staff', staffRows)}
                        {renderSubGroup('labor', laborRows)}
                    </View>
                );
            })}

            <TouchableOpacity style={styles.addButton} onPress={addCompany}>
                <Plus size={16} color="#2563EB" style={{ marginRight: 6 }} />
                <Text style={styles.addBtnText}>Add Company</Text>
            </TouchableOpacity>

            <Text style={[styles.sectionHeading, { color: colors.text, marginTop: 24 }]}>Summary by Company</Text>
            <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {compSummary.map((s, idx) => (
                    <View key={idx} style={styles.summaryRow}>
                        <Text style={[styles.summaryText, { color: colors.text, flex: 2 }]} numberOfLines={1}>
                            {s.company || 'Unnamed Company'} {s.isMainContractor ? '(Main)' : ''}
                        </Text>
                        {s.isMainContractor ? (
                            <Text style={[styles.summarySubText, { color: colors.text + '99', flex: 2 }]}>In: {s.inHouse} | Sup: {s.supply}</Text>
                        ) : (
                            <View style={{ flex: 2 }} />
                        )}
                        <Text style={[styles.summaryValue, { color: colors.text, flex: 1, textAlign: 'right' }]}>{s.total}</Text>
                    </View>
                ))}
                {compSummary.length === 0 && <Text style={{ color: colors.text + '80' }}>No companies added.</Text>}
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <View style={styles.summaryRow}>
                    <Text style={[styles.summaryText, { color: colors.text, fontWeight: 'bold' }]}>Grand Total</Text>
                    <Text style={[styles.summaryValue, { color: '#2563EB', fontWeight: 'bold', fontSize: 16 }]}>{gTotal}</Text>
                </View>
                {nsTotal > 0 && (
                    <View style={styles.summaryRow}>
                        <Text style={[styles.summaryText, { color: colors.text + '99' }]}>Night Shift Total</Text>
                        <Text style={[styles.summaryValue, { color: '#6366F1' }]}>{nsTotal}</Text>
                    </View>
                )}
            </View>

            <Text style={[styles.sectionHeading, { color: colors.text, marginTop: 16 }]}>Summary by Staff Role</Text>
            <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {staffRoleSummary.map((t, idx) => (
                    <View key={idx} style={styles.summaryRow}>
                        <Text style={[styles.summaryText, { color: colors.text }]}>{t.trade}</Text>
                        <Text style={[styles.summaryValue, { color: colors.text }]}>{t.count}</Text>
                    </View>
                ))}
                {staffRoleSummary.length === 0 && <Text style={{ color: colors.text + '80' }}>No staff roles added.</Text>}
            </View>

            <Text style={[styles.sectionHeading, { color: colors.text, marginTop: 16 }]}>Summary by Labor Trade</Text>
            <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {laborTradeSummary.map((t, idx) => (
                    <View key={idx} style={styles.summaryRow}>
                        <Text style={[styles.summaryText, { color: colors.text }]}>{t.trade}</Text>
                        <Text style={[styles.summaryValue, { color: colors.text }]}>{t.count}</Text>
                    </View>
                ))}
                {laborTradeSummary.length === 0 && <Text style={{ color: colors.text + '80' }}>No labor trades added.</Text>}
            </View>

            {/* Toggles */}
            <View style={{ marginTop: 32 }}>
                <Text style={[styles.sectionHeading, { color: colors.text }]}>PDF Visibility Settings</Text>
                
                <TouchableOpacity style={[styles.rowLayout, { marginBottom: 12 }]} onPress={() => toggleSection('manpowerDetail')} disabled={!onHiddenSectionsChange}>
                    <View style={[styles.checkbox, !hiddenSections.includes('manpowerDetail') && styles.checkboxActive]}>
                        {!hiddenSections.includes('manpowerDetail') && <Text style={{ color: '#FFF', fontSize: 12, textAlign: 'center' }}>✓</Text>}
                    </View>
                    <Text style={{ color: colors.text }}>Show Manpower Detail Table</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.rowLayout, { marginBottom: 12 }]} onPress={() => toggleSection('manpowerByCompany')} disabled={!onHiddenSectionsChange}>
                    <View style={[styles.checkbox, !hiddenSections.includes('manpowerByCompany') && styles.checkboxActive]}>
                        {!hiddenSections.includes('manpowerByCompany') && <Text style={{ color: '#FFF', fontSize: 12, textAlign: 'center' }}>✓</Text>}
                    </View>
                    <Text style={{ color: colors.text }}>Show Summary by Company</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.rowLayout, { marginBottom: 12 }]} onPress={() => toggleSection('manpowerByTrade')} disabled={!onHiddenSectionsChange}>
                    <View style={[styles.checkbox, !hiddenSections.includes('manpowerByTrade') && styles.checkboxActive]}>
                        {!hiddenSections.includes('manpowerByTrade') && <Text style={{ color: '#FFF', fontSize: 12, textAlign: 'center' }}>✓</Text>}
                    </View>
                    <Text style={{ color: colors.text }}>Show Summary by Trade</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    checkbox: {
        width: 20, height: 20, borderRadius: 4, borderWidth: 1, borderColor: '#94A3B8',
        justifyContent: 'center', alignItems: 'center'
    },
    checkboxActive: {
        backgroundColor: '#2563EB', borderColor: '#2563EB'
    },
    container: { flex: 1 },
    card: {
        padding: 12, borderRadius: 12, marginBottom: 12,
        borderWidth: 1,
    },
    tradeRow: {
        padding: 12, borderRadius: 8, borderWidth: 1, marginBottom: 8
    },
    rowLayout: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    input: {
        borderWidth: 1, borderRadius: 8,
        paddingHorizontal: 12, paddingVertical: 10, fontSize: 14,
    },
    chip: {
        borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12,
        justifyContent: 'center', alignItems: 'center'
    },
    chipText: { fontSize: 13, fontWeight: '600' },
    deleteBtn: { padding: 8 },
    shiftPill: {
        borderWidth: 1, paddingHorizontal: 12, paddingVertical: 12,
        justifyContent: 'center', alignItems: 'center'
    },
    shiftPillText: { fontSize: 13, fontWeight: '600' },
    addTradeBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        paddingVertical: 10, marginTop: 4,
    },
    addTradeText: { fontWeight: '500', fontSize: 14 },
    addButton: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        paddingVertical: 12, borderRadius: 12, backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE', borderStyle: 'dashed',
    },
    addBtnText: { color: '#2563EB', fontWeight: '600', fontSize: 14 },
    sectionHeading: { fontSize: 15, fontWeight: '700', marginBottom: 12 },
    summaryCard: { padding: 16, borderRadius: 12, borderWidth: 1 },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 4 },
    summaryText: { fontSize: 14, fontWeight: '500' },
    summarySubText: { fontSize: 12 },
    summaryValue: { fontSize: 15, fontWeight: '600' },
    divider: { height: 1, marginVertical: 12 },
});
