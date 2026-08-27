import { AbstractPowerSyncDatabase, WatchedAttachmentItem } from '@powersync/react-native';

export const ATTACHMENT_WATCH_QUERY = `
WITH report_photos_raw AS (
  SELECT
    r.user_id,
    r.project_id,
    CASE
      WHEN json_valid(je.value) AND json_extract(je.value, '$.uri') IS NOT NULL
      THEN json_extract(je.value, '$.uri')
      ELSE je.value
    END AS ref
  FROM reports r,
       json_each(
         CASE WHEN json_valid(r.template_data)
              THEN CASE WHEN json_type(r.template_data, '$.photos') = 'array'
                        THEN json_extract(r.template_data, '$.photos')
                        ELSE '[]' END
              ELSE '[]' END
       ) je
  WHERE r.template_data IS NOT NULL
),
snag_photos_raw AS (
  SELECT
    s.user_id,
    s.project_id,
    CASE
      WHEN json_valid(je.value) AND json_extract(je.value, '$.uri') IS NOT NULL
      THEN json_extract(je.value, '$.uri')
      ELSE je.value
    END AS ref
  FROM snags s,
       json_each(
         CASE WHEN json_valid(s.photos)
              THEN CASE WHEN json_type(s.photos, '$') = 'array'
                        THEN s.photos
                        ELSE '[]' END
              ELSE '[]' END
       ) je
  WHERE s.photos IS NOT NULL
)
SELECT
  substr(photo_url, 1, instr(photo_url, '.') - 1) AS id,
  photo_url AS filename,
  'image/jpeg' AS mediaType,
  json_object('kind', 'project_cover', 'userId', projects.user_id, 'projectId', projects.id) AS metaData
FROM projects
WHERE photo_url IS NOT NULL AND photo_url != ''
  AND photo_url NOT LIKE '%/%'
  AND photo_url NOT LIKE 'data:%'
  AND photo_url NOT LIKE 'file://%'
  AND photo_url NOT LIKE '{%'
  AND photo_url NOT LIKE '[%'
  AND instr(photo_url, '.') > 1

UNION ALL

SELECT
  substr(storage_path, 1, instr(storage_path, '.') - 1) AS id,
  storage_path AS filename,
  CASE
    WHEN type = 'pdf' THEN 'application/pdf'
    WHEN type = 'image' THEN 'image/jpeg'
    WHEN type = 'cad' THEN 'application/octet-stream'
    WHEN type = 'word' THEN 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    WHEN type = 'excel' THEN 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ELSE 'application/octet-stream'
  END AS mediaType,
  json_object('kind', 'drawing', 'userId', drawings.user_id, 'projectId', drawings.project_id) AS metaData
FROM drawings
WHERE storage_path IS NOT NULL AND storage_path != ''
  AND storage_path NOT LIKE '%/%'
  AND storage_path NOT LIKE 'data:%'
  AND storage_path NOT LIKE 'file://%'
  AND storage_path NOT LIKE '{%'
  AND storage_path NOT LIKE '[%'
  AND instr(storage_path, '.') > 1

UNION ALL

SELECT
  substr(avatar_url, 1, instr(avatar_url, '.') - 1) AS id,
  avatar_url AS filename,
  'image/jpeg' AS mediaType,
  json_object('kind', 'avatar', 'userId', profiles.id) AS metaData
FROM profiles
WHERE avatar_url IS NOT NULL AND avatar_url != ''
  AND avatar_url NOT LIKE '%/%'
  AND avatar_url NOT LIKE 'data:%'
  AND avatar_url NOT LIKE 'file://%'
  AND avatar_url NOT LIKE '{%'
  AND avatar_url NOT LIKE '[%'
  AND instr(avatar_url, '.') > 1

UNION ALL

SELECT
  substr(ref, 1, instr(ref, '.') - 1) AS id,
  ref AS filename,
  'image/jpeg' AS mediaType,
  json_object('kind', 'report_photo', 'userId', user_id, 'projectId', project_id) AS metaData
FROM report_photos_raw
WHERE ref IS NOT NULL AND ref != ''
  AND ref NOT LIKE '%/%'
  AND ref NOT LIKE 'data:%'
  AND ref NOT LIKE 'file://%'
  AND ref NOT LIKE '{%'
  AND ref NOT LIKE '[%'
  AND instr(ref, '.') > 1

UNION ALL

-- Snag photos live in the report-photos bucket; kind 'report_photo' is handled by resolveRemoteStoragePath
SELECT
  substr(ref, 1, instr(ref, '.') - 1) AS id,
  ref AS filename,
  'image/jpeg' AS mediaType,
  json_object('kind', 'report_photo', 'userId', user_id, 'projectId', project_id) AS metaData
FROM snag_photos_raw
WHERE ref IS NOT NULL AND ref != ''
  AND ref NOT LIKE '%/%'
  AND ref NOT LIKE 'data:%'
  AND ref NOT LIKE 'file://%'
  AND ref NOT LIKE '{%'
  AND ref NOT LIKE '[%'
  AND instr(ref, '.') > 1;
`.trim();

export function createWatchAttachments(db: AbstractPowerSyncDatabase) {
  return (
    onUpdate: (attachments: WatchedAttachmentItem[]) => Promise<void>,
    signal: AbortSignal
  ) => {
    const abortController = new AbortController();
    signal?.addEventListener('abort', () => abortController.abort());

    db.watch(
      ATTACHMENT_WATCH_QUERY,
      [],
      {
        onResult: (result: any) => {
          const items: WatchedAttachmentItem[] = [];
          const rows = (result.rows as any)?._array || result.rows || [];
          for (const row of rows) {
            if (row.id && row.filename) {
              items.push({
                id: row.id,
                filename: row.filename,
                mediaType: row.mediaType,
                metaData: row.metaData,
              });
            }
          }
          onUpdate(items).catch((err) => {
            console.warn('[watchAttachments] Error in onUpdate:', err);
          });
        },
      },
      { signal: abortController.signal }
    );
  };
}

