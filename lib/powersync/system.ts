import { PowerSyncDatabase } from '@powersync/react-native';
import { OPSqliteOpenFactory } from '@powersync/op-sqlite';
import { AppSchema } from './AppSchema';
import { Connector } from './Connector';

const factory = new OPSqliteOpenFactory({ dbFilename: 'constructionpro.db' });
export const powersync = new PowerSyncDatabase({ schema: AppSchema, database: factory });


