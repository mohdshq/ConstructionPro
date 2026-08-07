import { PowerSyncDatabase } from '@powersync/react-native';
import { OPSqliteOpenFactory } from '@powersync/op-sqlite';
import { AppSchema } from './AppSchema';
import { Connector } from './Connector';

const factory = new OPSqliteOpenFactory({ dbFilename: 'constructionpro.db' });
export const powersync = new PowerSyncDatabase({ schema: AppSchema, database: factory });

let isConnected = false;
let connectPromise: Promise<void> | null = null;

export const setupPowerSync = async () => {
  if (isConnected) return;
  if (connectPromise) return connectPromise;

  connectPromise = (async () => {
    try {
      await powersync.connect(new Connector());
      isConnected = true;
    } catch (error) {
      isConnected = false;
      throw error;
    } finally {
      connectPromise = null;
    }
  })();

  return connectPromise;
};

export const teardownPowerSync = async () => {
  connectPromise = null;
  if (!isConnected) return;
  isConnected = false;
  try {
    await powersync.disconnectAndClear();
  } catch (error) {
    console.warn('[PowerSync] teardown failed:', error);
  }
};
