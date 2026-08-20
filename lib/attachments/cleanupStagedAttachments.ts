import { AbstractPowerSyncDatabase } from '@powersync/react-native';
import { attachmentQueue } from './attachmentQueue';

/**
 * Reconciles and cleans up unreferenced QUEUED_UPLOAD attachments that were created
 * during editing sessions that were abandoned / force-quit before saving.
 */
export async function cleanupStagedAttachments(db: AbstractPowerSyncDatabase): Promise<void> {
  try {
    const unreferenced = await db.getAll<{ id: string }>(`
      SELECT a.id FROM attachments a
      WHERE a.state = 0 AND (a.has_synced = 0 OR a.has_synced IS NULL)
        AND NOT EXISTS (SELECT 1 FROM projects WHERE photo_url = a.filename)
        AND NOT EXISTS (SELECT 1 FROM drawings WHERE storage_path = a.filename)
        AND NOT EXISTS (SELECT 1 FROM profiles WHERE avatar_url = a.filename)
        AND NOT EXISTS (
          SELECT 1 FROM reports r,
          json_each(
            CASE WHEN json_valid(r.template_data)
                 THEN CASE WHEN json_type(r.template_data, '$.photos') = 'array'
                           THEN json_extract(r.template_data, '$.photos')
                           ELSE '[]' END
                 ELSE '[]' END
          ) je
          WHERE (
            CASE
              WHEN json_valid(je.value) AND json_extract(je.value, '$.uri') IS NOT NULL
              THEN json_extract(je.value, '$.uri')
              ELSE je.value
            END
          ) = a.filename
        )
    `);

    for (const row of unreferenced) {
      await attachmentQueue.deleteFile({ id: row.id });
    }
  } catch (e) {
    console.warn('[cleanupStagedAttachments] Failed reconciliation sweep:', e);
  }
}
