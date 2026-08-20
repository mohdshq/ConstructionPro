export class Table {
  constructor(public columns?: any, public options?: any) {}
}

export class AttachmentTable extends Table {
  constructor(public options?: any) {
    super({}, options);
  }
}

export const column = {
  text: 'TEXT',
  integer: 'INTEGER',
  real: 'REAL',
};

export class Schema {
  constructor(public tables: any) {}
}

export enum AttachmentState {
  QUEUED_UPLOAD = 0,
  QUEUED_DOWNLOAD = 1,
  QUEUED_DELETE = 2,
  SYNCED = 3,
  ARCHIVED = 4,
}

export enum UpdateType {
  PUT = 'PUT',
  PATCH = 'PATCH',
  DELETE = 'DELETE',
}

export interface AttachmentRecord {
  id: string;
  filename: string;
  localUri?: string;
  size?: number;
  mediaType?: string;
  timestamp?: number;
  metaData?: string;
  hasSynced?: boolean;
  state: AttachmentState;
}

export interface WatchedAttachmentItem {
  id: string;
  filename: string;
  mediaType?: string;
  metaData?: string;
}

export interface AttachmentErrorHandler {
  onUploadError(attachment: AttachmentRecord, error: unknown): Promise<boolean>;
  onDownloadError(attachment: AttachmentRecord, error: unknown): Promise<boolean>;
  onDeleteError(attachment: AttachmentRecord, error: unknown): Promise<boolean>;
}

export class AttachmentQueue {
  constructor(public options?: any) {}
  generateAttachmentId = jest.fn().mockResolvedValue('mock-att-id-123');
  startSync = jest.fn().mockResolvedValue(undefined);
  stopSync = jest.fn().mockResolvedValue(undefined);
  saveFile = jest.fn().mockImplementation(async (opts) => ({
    id: opts.id || 'mock-att-id-123',
    filename: `${opts.id || 'mock-att-id-123'}.${opts.fileExtension}`,
    state: AttachmentState.QUEUED_UPLOAD,
    metaData: opts.metaData,
    mediaType: opts.mediaType,
  }));
  deleteFile = jest.fn().mockResolvedValue(undefined);
  clearQueue = jest.fn().mockResolvedValue(undefined);
  withAttachmentContext = jest.fn().mockImplementation(async (callback: any) => {
    const mockContext = {
      getAttachment: jest.fn().mockResolvedValue(undefined),
      getAttachments: jest.fn().mockResolvedValue([]),
    };
    return callback(mockContext);
  });
}

export class PowerSyncDatabase {
  constructor(public options?: any) {}
  connect = jest.fn().mockResolvedValue(undefined);
  disconnect = jest.fn().mockResolvedValue(undefined);
  disconnectAndClear = jest.fn().mockResolvedValue(undefined);
  getUploadQueueStats = jest.fn().mockResolvedValue({ count: 0, size: 0 });
  execute = jest.fn().mockResolvedValue({ rows: [] });
  getAll = jest.fn().mockResolvedValue([]);
  getOptional = jest.fn().mockResolvedValue(null);
  watch = jest.fn();
  resolveTables = jest.fn().mockResolvedValue(['projects', 'drawings', 'profiles', 'reports']);
}

export abstract class AbstractPowerSyncDatabase {

  abstract connect(connector: any): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract disconnectAndClear(): Promise<void>;
  abstract getUploadQueueStats(): Promise<{ count: number; size?: number }>;
  abstract execute(sql: string, params?: any[]): Promise<any>;
  abstract getAll<T>(sql: string, params?: any[]): Promise<T[]>;
  abstract getOptional<T>(sql: string, params?: any[]): Promise<T | null>;
  abstract watch(sql: string, params?: any[], handler?: any, options?: any): void;
  abstract resolveTables(sql: string): Promise<string[]> | string[];
}
