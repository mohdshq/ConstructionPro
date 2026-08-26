import { execFileSync } from 'child_process';
import { ATTACHMENT_WATCH_QUERY } from '../watchAttachments';

describe('ATTACHMENT_WATCH_QUERY against Real SQLite with JSON1', () => {
  function runSqlite(sqlScript: string): any[] {
    const output = execFileSync('sqlite3', [':memory:'], {
      input: sqlScript,
      encoding: 'utf8',
    });
    const lines = output.trim().split('\n').filter((l) => l.trim().length > 0);
    return lines.map((line) => {
      const parts = line.split('|');
      return {
        id: parts[0],
        filename: parts[1],
        mediaType: parts[2],
        metaData: parts[3] ? JSON.parse(parts[3]) : null,
      };
    });
  }

  const SCHEMA_SQL = `
    CREATE TABLE projects (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      photo_url TEXT
    );

    CREATE TABLE drawings (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      project_id TEXT,
      type TEXT,
      storage_path TEXT
    );

    CREATE TABLE profiles (
      id TEXT PRIMARY KEY,
      avatar_url TEXT
    );

    CREATE TABLE reports (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      project_id TEXT,
      template_data TEXT
    );
  `;

  describe('Control Test: Proving Unsanitized Query Throws on Malformed JSON', () => {
    it('CONTROL: unsanitized json_each in FROM clause aborts SQLite execution on malformed JSON', () => {
      const UNSANITIZED_QUERY = `
        SELECT r.id, je.value
        FROM reports r, json_each(r.template_data, '$.photos') je;
      `;
      const SCRIPT = `
        ${SCHEMA_SQL}
        INSERT INTO reports (id, user_id, project_id, template_data) VALUES
          ('rep-bad', 'user-1', 'proj-1', '{ broken json');
        ${UNSANITIZED_QUERY}
      `;

      expect(() => {
        execFileSync('sqlite3', [':memory:'], {
          input: SCRIPT,
          encoding: 'utf8',
          stdio: ['pipe', 'pipe', 'pipe'],
        });
      }).toThrow(/malformed JSON/i);
    });
  });

  describe('Project and Drawing and Profile Watch Queries', () => {
    it('extracts valid project cover photo and filters out legacy/local URIs', () => {
      const SCRIPT = `
        ${SCHEMA_SQL}
        INSERT INTO projects (id, user_id, photo_url) VALUES
          ('proj-1', 'user-1', 'att-proj-1.jpg'),
          ('proj-2', 'user-1', 'legacy/path/cover.jpg'),
          ('proj-3', 'user-1', 'file:///var/mobile/local.jpg'),
          ('proj-4', 'user-1', NULL),
          ('proj-5', 'user-1', '');
        ${ATTACHMENT_WATCH_QUERY};
      `;
      const results = runSqlite(SCRIPT);
      expect(results.map((r) => r.filename)).toEqual(['att-proj-1.jpg']);
      expect(results[0].id).toBe('att-proj-1');
      expect(results[0].metaData).toEqual({ kind: 'project_cover', userId: 'user-1', projectId: 'proj-1' });
    });

    it('extracts valid drawings and derives correct mediaType for pdf/png/dwg', () => {
      const SCRIPT = `
        ${SCHEMA_SQL}
        INSERT INTO drawings (id, user_id, project_id, type, storage_path) VALUES
          ('draw-1', 'user-1', 'proj-1', 'pdf', 'att-draw-1.pdf'),
          ('draw-2', 'user-1', 'proj-1', 'image', 'att-draw-2.png'),
          ('draw-3', 'user-1', 'proj-1', 'cad', 'att-draw-3.dwg'),
          ('draw-4', 'user-1', 'proj-1', 'pdf', 'legacy/path/drawing.pdf'),
          ('draw-5', 'user-1', 'proj-1', 'pdf', NULL);
        ${ATTACHMENT_WATCH_QUERY};
      `;
      const results = runSqlite(SCRIPT);
      expect(results.map((r) => r.filename)).toEqual(['att-draw-1.pdf', 'att-draw-2.png', 'att-draw-3.dwg']);
      expect(results.find((r) => r.filename === 'att-draw-1.pdf')?.mediaType).toBe('application/pdf');
      expect(results.find((r) => r.filename === 'att-draw-2.png')?.mediaType).toBe('image/jpeg');
      expect(results.find((r) => r.filename === 'att-draw-3.dwg')?.mediaType).toBe('application/octet-stream');
    });

    it('extracts valid avatar references and filters legacy/data URIs', () => {
      const SCRIPT = `
        ${SCHEMA_SQL}
        INSERT INTO profiles (id, avatar_url) VALUES
          ('user-1', 'att-avatar-1.jpg'),
          ('user-2', 'user-2/avatar.jpg'),
          ('user-3', NULL),
          ('user-4', 'data:image/jpeg;base64,1234');
        ${ATTACHMENT_WATCH_QUERY};
      `;
      const results = runSqlite(SCRIPT);
      expect(results.map((r) => r.filename)).toEqual(['att-avatar-1.jpg']);
      expect(results[0].metaData).toEqual({ kind: 'avatar', userId: 'user-1' });
    });
  });

  describe('Report Photos Fixtures (9 Variations + Malformed Edge Cases)', () => {
    it('Fixture 1: Valid JSON array of photo filename strings', () => {
      const SCRIPT = `
        ${SCHEMA_SQL}
        INSERT INTO reports (id, user_id, project_id, template_data) VALUES
          ('rep-1', 'user-1', 'proj-1', '{"photos":["att-rep-1.jpg","att-rep-2.jpg"]}');
        ${ATTACHMENT_WATCH_QUERY};
      `;
      const results = runSqlite(SCRIPT);
      expect(results.map((r) => r.filename)).toEqual(['att-rep-1.jpg', 'att-rep-2.jpg']);
    });

    it('Fixture 2: Valid JSON array of photo objects with .uri and .caption', () => {
      const SCRIPT = `
        ${SCHEMA_SQL}
        INSERT INTO reports (id, user_id, project_id, template_data) VALUES
          ('rep-2', 'user-1', 'proj-1', '{"photos":[{"uri":"att-rep-3.jpg","caption":"Crack in wall"}]}');
        ${ATTACHMENT_WATCH_QUERY};
      `;
      const results = runSqlite(SCRIPT);
      expect(results.map((r) => r.filename)).toEqual(['att-rep-3.jpg']);
    });

    it('Fixture 3: template_data is NULL', () => {
      const SCRIPT = `
        ${SCHEMA_SQL}
        INSERT INTO reports (id, user_id, project_id, template_data) VALUES
          ('rep-3', 'user-1', 'proj-1', NULL);
        ${ATTACHMENT_WATCH_QUERY};
      `;
      const results = runSqlite(SCRIPT);
      expect(results).toHaveLength(0);
    });

    it('Fixture 4: template_data is empty string', () => {
      const SCRIPT = `
        ${SCHEMA_SQL}
        INSERT INTO reports (id, user_id, project_id, template_data) VALUES
          ('rep-4', 'user-1', 'proj-1', '');
        ${ATTACHMENT_WATCH_QUERY};
      `;
      const results = runSqlite(SCRIPT);
      expect(results).toHaveLength(0);
    });

    it('Fixture 5: template_data is malformed JSON (resilient via FROM-clause sanitization)', () => {
      const SCRIPT = `
        ${SCHEMA_SQL}
        INSERT INTO reports (id, user_id, project_id, template_data) VALUES
          ('rep-5', 'user-1', 'proj-1', '{ broken json');
        ${ATTACHMENT_WATCH_QUERY};
      `;
      const results = runSqlite(SCRIPT);
      expect(results).toHaveLength(0);
    });

    it('Fixture 6: photos is a string instead of an array', () => {
      const SCRIPT = `
        ${SCHEMA_SQL}
        INSERT INTO reports (id, user_id, project_id, template_data) VALUES
          ('rep-6', 'user-1', 'proj-1', '{"photos":"att-rep-not-array.jpg"}');
        ${ATTACHMENT_WATCH_QUERY};
      `;
      const results = runSqlite(SCRIPT);
      expect(results).toHaveLength(0);
    });

    it('Fixture 7: photos is null', () => {
      const SCRIPT = `
        ${SCHEMA_SQL}
        INSERT INTO reports (id, user_id, project_id, template_data) VALUES
          ('rep-7', 'user-1', 'proj-1', '{"photos":null}');
        ${ATTACHMENT_WATCH_QUERY};
      `;
      const results = runSqlite(SCRIPT);
      expect(results).toHaveLength(0);
    });

    it('Fixture 8: photos key is absent', () => {
      const SCRIPT = `
        ${SCHEMA_SQL}
        INSERT INTO reports (id, user_id, project_id, template_data) VALUES
          ('rep-8', 'user-1', 'proj-1', '{"notes":"no photos here"}');
        ${ATTACHMENT_WATCH_QUERY};
      `;
      const results = runSqlite(SCRIPT);
      expect(results).toHaveLength(0);
    });

    it('Fixture 9: photos is array of objects WITHOUT .uri key', () => {
      const SCRIPT = `
        ${SCHEMA_SQL}
        INSERT INTO reports (id, user_id, project_id, template_data) VALUES
          ('rep-9', 'user-1', 'proj-1', '{"photos":[{"caption":"only caption, no uri"}]}');
        ${ATTACHMENT_WATCH_QUERY};
      `;
      const results = runSqlite(SCRIPT);
      expect(results).toHaveLength(0);
    });

    it('Mixed photos array containing legacy paths, file URIs, data URIs and valid attachment ref', () => {
      const SCRIPT = `
        ${SCHEMA_SQL}
        INSERT INTO reports (id, user_id, project_id, template_data) VALUES
          ('rep-10', 'user-1', 'proj-1', '{"photos":["legacy/path/photo.jpg", "file:///local/photo.jpg", "data:image/jpeg;base64,...", "att-rep-4.jpg"]}');
        ${ATTACHMENT_WATCH_QUERY};
      `;
      const results = runSqlite(SCRIPT);
      expect(results.map((r) => r.filename)).toEqual(['att-rep-4.jpg']);
    });
  });
});
