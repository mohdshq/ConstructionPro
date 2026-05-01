const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'app/project/[id]/report/create.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Fix the main contractor labor accordion id mismatch
content = content.replace(/activeSection === 'mcLabor'/g, "activeSection === 'labor'");

// 2. Add placeholderTextColor to all TextInputs
// This regex looks for `<TextInput` and appends `placeholderTextColor="#94A3B8"` or `placeholderTextColor={colors.text + '80'}`
content = content.replace(/<TextInput/g, "<TextInput placeholderTextColor={colors.text + '80'}");

// 3. Fix the DatePickers for Daily Report
// We will replace the activeDatePicker state and daily report date fields
content = content.replace(
    /const \[showDatePicker, setShowDatePicker\] = useState\(false\);/,
    "const [activeDatePicker, setActiveDatePicker] = useState<string | null>(null);"
);

// Snagging report uses `showDatePicker`, we need to change it to `activeDatePicker === 'inspectionDate'`
content = content.replace(
    /setShowDatePicker\(true\)/g,
    "setActiveDatePicker('inspectionDate')"
);
content = content.replace(
    /setShowDatePicker\(false\)/g,
    "setActiveDatePicker(null)"
);
content = content.replace(
    /showDatePicker && \(/g,
    "activeDatePicker === 'inspectionDate' && ("
);

// HSE Report uses `showDatePicker`
// It was already replaced by the lines above.

// Daily Report fields replace:
// Commencement Date
const commencementRegex = /<TextInput .*?placeholder="YYYY-MM-DD" value=\{formData\.commencementDate\} onChangeText=\{t => setFormData\(\{ \.\.\.formData, commencementDate: t \}\)\} \/>/;
const commencementReplacement = `
<TouchableOpacity onPress={() => setActiveDatePicker('commencementDate')} style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border }, { justifyContent: 'center' }]}>
    <Text style={{ color: formData.commencementDate ? colors.text : (colors.text + '80') }}>{formData.commencementDate || 'YYYY-MM-DD'}</Text>
</TouchableOpacity>
{activeDatePicker === 'commencementDate' && (
    <View style={{ backgroundColor: Platform.OS === 'ios' ? '#F8FAFC' : 'transparent', borderRadius: 12, overflow: 'hidden', marginTop: 12 }}>
        <DateTimePicker
            value={formData.commencementDate ? new Date(formData.commencementDate) : new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            onChange={(event: any, selectedDate?: Date) => {
                if (Platform.OS === 'android') setActiveDatePicker(null);
                if (selectedDate) setFormData({ ...formData, commencementDate: selectedDate.toISOString().split('T')[0] });
            }}
        />
        {Platform.OS === 'ios' && (
            <TouchableOpacity style={{ backgroundColor: '#2563EB', padding: 12, alignItems: 'center' }} onPress={() => setActiveDatePicker(null)}>
                <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>Done</Text>
            </TouchableOpacity>
        )}
    </View>
)}
`;
content = content.replace(commencementRegex, commencementReplacement);

// Completion Date
const completionRegex = /<TextInput .*?placeholder="YYYY-MM-DD" value=\{formData\.completionDate\} onChangeText=\{t => setFormData\(\{ \.\.\.formData, completionDate: t \}\)\} \/>/;
const completionReplacement = `
<TouchableOpacity onPress={() => setActiveDatePicker('completionDate')} style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border }, { justifyContent: 'center' }]}>
    <Text style={{ color: formData.completionDate ? colors.text : (colors.text + '80') }}>{formData.completionDate || 'YYYY-MM-DD'}</Text>
</TouchableOpacity>
{activeDatePicker === 'completionDate' && (
    <View style={{ backgroundColor: Platform.OS === 'ios' ? '#F8FAFC' : 'transparent', borderRadius: 12, overflow: 'hidden', marginTop: 12 }}>
        <DateTimePicker
            value={formData.completionDate ? new Date(formData.completionDate) : new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            onChange={(event: any, selectedDate?: Date) => {
                if (Platform.OS === 'android') setActiveDatePicker(null);
                if (selectedDate) setFormData({ ...formData, completionDate: selectedDate.toISOString().split('T')[0] });
            }}
        />
        {Platform.OS === 'ios' && (
            <TouchableOpacity style={{ backgroundColor: '#2563EB', padding: 12, alignItems: 'center' }} onPress={() => setActiveDatePicker(null)}>
                <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>Done</Text>
            </TouchableOpacity>
        )}
    </View>
)}
`;
content = content.replace(completionRegex, completionReplacement);

// Anticipated Completion Date
const anticipatedRegex = /<TextInput .*?placeholder="YYYY-MM-DD" value=\{formData\.anticipatedCompletionDate\} onChangeText=\{t => setFormData\(\{ \.\.\.formData, anticipatedCompletionDate: t \}\)\} \/>/;
const anticipatedReplacement = `
<TouchableOpacity onPress={() => setActiveDatePicker('anticipatedCompletionDate')} style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border }, { justifyContent: 'center' }]}>
    <Text style={{ color: formData.anticipatedCompletionDate ? colors.text : (colors.text + '80') }}>{formData.anticipatedCompletionDate || 'YYYY-MM-DD'}</Text>
</TouchableOpacity>
{activeDatePicker === 'anticipatedCompletionDate' && (
    <View style={{ backgroundColor: Platform.OS === 'ios' ? '#F8FAFC' : 'transparent', borderRadius: 12, overflow: 'hidden', marginTop: 12 }}>
        <DateTimePicker
            value={formData.anticipatedCompletionDate ? new Date(formData.anticipatedCompletionDate) : new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            onChange={(event: any, selectedDate?: Date) => {
                if (Platform.OS === 'android') setActiveDatePicker(null);
                if (selectedDate) setFormData({ ...formData, anticipatedCompletionDate: selectedDate.toISOString().split('T')[0] });
            }}
        />
        {Platform.OS === 'ios' && (
            <TouchableOpacity style={{ backgroundColor: '#2563EB', padding: 12, alignItems: 'center' }} onPress={() => setActiveDatePicker(null)}>
                <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>Done</Text>
            </TouchableOpacity>
        )}
    </View>
)}
`;
content = content.replace(anticipatedRegex, anticipatedReplacement);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated create.tsx');
