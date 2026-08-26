import {
  AbstractPowerSyncDatabase, PowerSyncBackendConnector, UpdateType,
} from '@powersync/react-native';
import { supabase } from '@/lib/supabase';
import { captureWarning } from '@/lib/sentryLogger';

export class Connector implements PowerSyncBackendConnector {
  async fetchCredentials() {
    // getSession() remains a plain call: with processLock configured in lib/supabase.ts,
    // this call serializes safely against concurrent app-side token refreshes, preventing
    // Supabase's refresh-token reuse detection from triggering legitimate session revocations (B10).
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;
    return {
      endpoint: process.env.EXPO_PUBLIC_POWERSYNC_URL!,
      token: session.access_token,
    };
  }

  async uploadData(database: AbstractPowerSyncDatabase) {
    const transaction = await database.getNextCrudTransaction();
    if (!transaction) return;

    try {
      for (const op of transaction.crud) {
        // op.table is a runtime string; cast to the typed client's table union.
        // op.opData is a generic record; cast for the typed query builder.
        const table = supabase.from(op.table as any);
        const data = (op.opData ?? {}) as any;

        // Reports store template_data as a JSON string locally (text column).
        // Supabase expects JSONB, so parse before upload to avoid double-encoding.
        if (op.table === 'reports' && data && typeof data.template_data === 'string') {
          try {
            data.template_data = JSON.parse(data.template_data);
          } catch {
            data.template_data = {};
          }
        }

        if (op.table === 'calculations' && op.opData && typeof op.opData.data === 'string') {
          try { op.opData.data = JSON.parse(op.opData.data); } catch { op.opData.data = {}; }
        }

        if (op.table === 'snags' && data && typeof data.photos === 'string') {
          try { data.photos = JSON.parse(data.photos); } catch { data.photos = []; }
        }

        let result;
        switch (op.op) {
          case UpdateType.PUT:
            result = await table.upsert({ ...data, id: op.id });
            break;
          case UpdateType.PATCH:
            result = await table.update(data).eq('id', op.id);
            break;
          case UpdateType.DELETE:
            result = await table.delete().eq('id', op.id);
            break;
        }
        if (result?.error) {
          const err = result.error;
          // Only drop on permanent Postgres RLS violations (42501 or explicit RLS policy error).
          // Do NOT drop on JWT/auth expiry errors like PGRST301; those must throw and retry.
          const isRlsRejection =
            err.code === '42501' ||
            err.message?.toLowerCase().includes('violates row-level security policy');

          if (isRlsRejection) {
            const warnMsg = `[PowerSync Connector] Permanent RLS authorization rejection — dropping operation to prevent head-of-line blocking: ${JSON.stringify({
              op: op.op,
              table: op.table,
              id: op.id,
              opData: op.opData,
              errorCode: err.code,
              errorMessage: err.message,
            })}`;
            captureWarning('PowerSyncConnector', warnMsg, {
              op: op.op,
              table: op.table,
              id: op.id,
              errorCode: err.code,
              errorMessage: err.message,
            });
            continue;
          }
          throw err;
        }
      }
      await transaction.complete();
    } catch (ex: any) {
      // Re-throw so PowerSync retries; data stays queued.
      throw ex;
    }
  }
}
