import { PowerSyncDatabase } from '@powersync/react-native';
import { OPSqliteOpenFactory } from '@powersync/op-sqlite';
import { AppSchema } from './AppSchema';
import { Connector } from './Connector';

const factory = new OPSqliteOpenFactory({ dbFilename: 'constructionpro.db' });
export const powersync = new PowerSyncDatabase({ schema: AppSchema, database: factory });

let isConnected = false;

export const setupPowerSync = async () => {
  if (isConnected) return;
  isConnected = true;
  await powersync.connect(new Connector());
};

export const teardownPowerSync = async () => {
  if (!isConnected) return;
  isConnected = false;
  await powersync.disconnectAndClear();
};
