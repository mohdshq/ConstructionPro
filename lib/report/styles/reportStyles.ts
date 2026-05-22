import { StyleSheet } from 'react-native';

/**
 * Shared styles used across all report form types (Daily, Snagging, HSE).
 * Extracted from the monolithic create.tsx to avoid duplication.
 */
export const reportStyles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
    container: { flex: 1, backgroundColor: '#F1F5F9' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        paddingHorizontal: 20, height: 60, backgroundColor: '#FFFFFF',
        borderBottomWidth: 1, borderBottomColor: '#E2E8F0', zIndex: 10,
    },
    backButton: { padding: 8, marginLeft: -8 },
    headerTitle: { fontSize: 17, fontWeight: '700', color: '#0F172A', textAlign: 'center', marginHorizontal: 8 },
    saveButton: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#2563EB',
        paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    },
    saveButtonDisabled: { backgroundColor: '#94A3B8' },
    saveButtonText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
    content: { flex: 1, padding: 16 },
    authorSection: {
        backgroundColor: '#FFFFFF', padding: 16, borderRadius: 16, marginBottom: 16,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
    },
    accordionContent: {
        backgroundColor: '#FFFFFF', padding: 16, borderRadius: 12, marginBottom: 16,
        borderWidth: 1, borderColor: '#E2E8F0', borderTopWidth: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0, marginTop: -12, paddingTop: 20,
    },
    label: { fontSize: 14, fontWeight: '600', color: '#334155', marginBottom: 8 },
    sectionHeading: { fontSize: 15, fontWeight: '700', color: '#0F172A', marginBottom: 16, marginTop: 4 },
    divider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 16 },
    input: {
        backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12,
        paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: '#0F172A',
        minWidth: 0,
    },
    metricsRow: { flexDirection: 'row', gap: 12 },
    textArea: { height: 100, textAlignVertical: 'top' },
    arrayItemCard: {
        backgroundColor: '#F8FAFC', padding: 12, borderRadius: 12, marginBottom: 12,
        borderWidth: 1, borderColor: '#E2E8F0',
    },
    arrayRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    deleteBtn: { padding: 8 },
    addButton: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        paddingVertical: 12, borderRadius: 12, backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE', borderStyle: 'dashed',
    },
    addBtnText: { color: '#2563EB', fontWeight: '600', fontSize: 14 },
    pillContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    pill: {
        paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F1F5F9',
        borderWidth: 1, borderColor: '#E2E8F0',
    },
    pillActive: { backgroundColor: '#DBEAFE', borderColor: '#3B82F6' },
    pillText: { fontSize: 14, color: '#64748B', fontWeight: '500' },
    pillTextActive: { color: '#2563EB', fontWeight: '700' },
    photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    photoWrapper: { width: '30%', aspectRatio: 1, position: 'relative', borderRadius: 12, overflow: 'hidden' },
    photoThumb: { width: '100%', height: '100%' },
    removePhotoBtn: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.5)', padding: 4, borderRadius: 12 },
    addPhotoTile: {
        width: '30%', aspectRatio: 1, borderRadius: 12, backgroundColor: '#F8FAFC', borderWidth: 2, borderColor: '#E2E8F0', borderStyle: 'dashed',
        alignItems: 'center', justifyContent: 'center'
    },
    addPhotoTileText: { fontSize: 12, fontWeight: '600', color: '#64748B', marginTop: 4 },
});
