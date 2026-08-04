import { parseGeminiJson } from '../../../supabase/functions/_shared/gemini';

describe('parseGeminiJson', () => {
  it('parses valid raw JSON directly', () => {
    const json = '{"issue": "Cracked beam", "severity": "High"}';
    expect(parseGeminiJson(json)).toEqual({
      issue: 'Cracked beam',
      severity: 'High',
    });
  });

  it('strips ```json code fences', () => {
    const raw = '```json\n{"issue": "Exposed conduit", "system": "MEP"}\n```';
    expect(parseGeminiJson(raw)).toEqual({
      issue: 'Exposed conduit',
      system: 'MEP',
    });
  });

  it('strips ``` generic code fences', () => {
    const raw = '```\n{"issue": "Paint blister", "system": "ARCHITECTURAL"}\n```';
    expect(parseGeminiJson(raw)).toEqual({
      issue: 'Paint blister',
      system: 'ARCHITECTURAL',
    });
  });

  it('extracts JSON when surrounded by conversational text', () => {
    const raw = 'Here is the defect analysis:\n{"issue": "Water leakage in slab", "severity": "High"}\nPlease review promptly.';
    expect(parseGeminiJson(raw)).toEqual({
      issue: 'Water leakage in slab',
      severity: 'High',
    });
  });

  it('extracts JSON array when surrounded by text', () => {
    const raw = 'The items found:\n[{"id": 1}, {"id": 2}]\nEnd of list.';
    expect(parseGeminiJson(raw)).toEqual([
      { id: 1 },
      { id: 2 },
    ]);
  });

  it('throws on empty or non-JSON input', () => {
    expect(() => parseGeminiJson('')).toThrow('Empty or non-string response');
    expect(() => parseGeminiJson('No json here at all')).toThrow('AI returned invalid format');
  });
});
