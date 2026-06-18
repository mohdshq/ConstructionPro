import {
  AbstractPowerSyncDatabase, PowerSyncBackendConnector, UpdateType,
} from '@powersync/react-native';
import { supabase } from '@/lib/supabase';

export class Connector implements PowerSyncBackendConnector {
  async fetchCredentials() {
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
        if (result?.error) throw result.error;
      }
      await transaction.complete();
    } catch (ex: any) {
      // Re-throw so PowerSync retries; data stays queued.
      throw ex;
    }
  }
}
