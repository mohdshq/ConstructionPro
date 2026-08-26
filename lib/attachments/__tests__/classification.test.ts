import { execFileSync } from 'child_process';
import { classifyMediaSource } from '../resolveMediaUri';

describe('Media Classification Predicate Parity (JS vs SQL)', () => {
  const FIXTURES = [
    // Valid attachment references
    { val: 'e9c8e227-7f88-4c12-9c3f-859a1e0b5c11.jpg', expected: 'attachment_ref' },
    { val: 'drawing_plan_1.pdf', expected: 'attachment_ref' },
    { val: 'doc.docx', expected: 'attachment_ref' },
    { val: 'data.xlsx', expected: 'attachment_ref' },
    { val: 'cad_file.dwg', expected: 'attachment_ref' },

    // Legacy storage paths
    { val: 'user-1/proj-1/img.jpg', expected: 'legacy_path' },
    { val: 'user-1/avatar.jpg', expected: 'legacy_path' },
    { val: 'proj-1/photo_123.jpg', expected: 'legacy_path' },

    // Direct URIs
    { val: 'file:///var/mobile/Containers/photo.jpg', expected: 'direct_uri' },
    { val: 'data:image/jpeg;base64,1234', expected: 'direct_uri' },
    { val: 'http://example.com/img.jpg', expected: 'direct_uri' },
    { val: 'https://example.com/img.jpg', expected: 'direct_uri' },
    { val: 'blob:http://localhost/1234', expected: 'direct_uri' },
    { val: 'content://media/external/images/1', expected: 'direct_uri' },

    // JSON objects / arrays (e.g. missing .uri key)
    { val: '{"caption":"no uri here.jpg"}', expected: 'empty' },
    { val: '["photo1.jpg"]', expected: 'empty' },

    // Empty / Invalid / No extension
    { val: null, expected: 'empty' },
    { val: undefined, expected: 'empty' },
    { val: '', expected: 'empty' },
    { val: '   ', expected: 'empty' },
    { val: 'no_extension', expected: 'empty' },
    { val: '.hiddenfile', expected: 'empty' },
  ];

  it('correctly classifies media sources in JS', () => {
    for (const fixture of FIXTURES) {
      const result = classifyMediaSource(fixture.val);
      expect(result).toBe(fixture.expected);
    }
  });

  it('asserts SQL filter matches JS classifyMediaSource === attachment_ref', () => {
    // Run SQL predicate test for each fixture against SQLite
    const testCasesSql = FIXTURES.filter((f) => f.val !== null && f.val !== undefined)
      .map((f, idx) => `SELECT ${idx} AS idx, '${f.val.replace(/'/g, "''")}' AS ref`)
      .join(' UNION ALL ');

    const SQL_FILTER_TEST = `
      WITH fixtures AS (
        ${testCasesSql}
      )
      SELECT idx FROM fixtures
      WHERE ref IS NOT NULL AND ref != ''
        AND ref NOT LIKE '%/%'
        AND ref NOT LIKE 'data:%'
        AND ref NOT LIKE 'file://%'
        AND ref NOT LIKE 'http:%'
        AND ref NOT LIKE 'https:%'
        AND ref NOT LIKE 'blob:%'
        AND ref NOT LIKE 'content:%'
        AND ref NOT LIKE '{%'
        AND ref NOT LIKE '[%'
        AND instr(ref, '.') > 1;
    `;

    const output = execFileSync('sqlite3', [':memory:'], {
      input: SQL_FILTER_TEST,
      encoding: 'utf8',
    });

    const passedIndices = new Set(
      output
        .trim()
        .split('\n')
        .filter((l) => l.trim().length > 0)
        .map((l) => parseInt(l.trim(), 10))
    );

    const nonNullFixtures = FIXTURES.filter((f) => f.val !== null && f.val !== undefined);
    nonNullFixtures.forEach((f, idx) => {
      const sqlMatched = passedIndices.has(idx);
      const jsIsAttachmentRef = classifyMediaSource(f.val) === 'attachment_ref';

      // SQL matched IFF JS classified as attachment_ref
      expect(sqlMatched).toBe(jsIsAttachmentRef);
    });
  });
});
