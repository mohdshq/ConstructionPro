import { File, Directory, Paths } from 'expo-file-system';

export type AttachmentData = ArrayBuffer | string | ArrayBufferView;

export interface LocalStorageAdapter {
  saveFile(filePath: string, data: AttachmentData): Promise<number>;
  readFile(filePath: string): Promise<ArrayBuffer>;
  deleteFile(filePath: string): Promise<void>;
  fileExists(filePath: string): Promise<boolean>;
  makeDir(path: string): Promise<void>;
  rmDir(path: string): Promise<void>;
  initialize(): Promise<void>;
  clear(): Promise<void>;
  getLocalUri(filename: string): string;
}

export class ExpoFileSystemLocalStorageAdapter implements LocalStorageAdapter {
  private readonly baseDirectory: Directory;

  constructor(subDirectory = 'attachments') {
    this.baseDirectory = new Directory(Paths.document, subDirectory);
  }

  async initialize(): Promise<void> {
    await this.makeDir(this.baseDirectory.uri);
  }

  async saveFile(filePath: string, data: AttachmentData): Promise<number> {
    const file = new File(filePath);
    const parentDir = file.parentDirectory;
    if (!parentDir.exists) {
      parentDir.create({ intermediates: true, idempotent: true });
    }

    if (data instanceof ArrayBuffer) {
      const uint8 = new Uint8Array(data);
      if (file.exists) {
        file.delete();
      }
      file.create({ intermediates: true, overwrite: true });
      file.write(uint8);
      return uint8.byteLength;
    }

    if (ArrayBuffer.isView(data)) {
      const uint8 = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
      if (file.exists) {
        file.delete();
      }
      file.create({ intermediates: true, overwrite: true });
      file.write(uint8);
      return uint8.byteLength;
    }

    if (typeof data === 'string') {
      if (data.startsWith('file://') || data.startsWith('/')) {
        const srcFile = new File(data);
        if (file.exists) {
          file.delete();
        }
        srcFile.copy(file);
        return file.size ?? 0;
      }

      // String text or base64 data
      if (file.exists) {
        file.delete();
      }
      file.create({ intermediates: true, overwrite: true });
      file.write(data);
      return file.size ?? 0;
    }

    return 0;
  }

  async readFile(filePath: string): Promise<ArrayBuffer> {
    const file = new File(filePath);
    if (!file.exists) {
      throw new Error(`File does not exist: ${filePath}`);
    }
    const uint8 = await file.bytes();
    // Carefully slice the buffer so we return the exact slice, not a pooled shared buffer
    return uint8.buffer.slice(uint8.byteOffset, uint8.byteOffset + uint8.byteLength);
  }

  async deleteFile(filePath: string): Promise<void> {
    try {
      const file = new File(filePath);
      if (file.exists) {
        file.delete();
      }
    } catch {
      // Idempotent delete
    }
  }

  async fileExists(filePath: string): Promise<boolean> {
    try {
      return new File(filePath).exists;
    } catch {
      return false;
    }
  }

  async makeDir(path: string): Promise<void> {
    try {
      const dir = new Directory(path);
      if (!dir.exists) {
        dir.create({ intermediates: true, idempotent: true });
      }
    } catch {
      // Idempotent directory creation
    }
  }

  async rmDir(path: string): Promise<void> {
    try {
      const dir = new Directory(path);
      if (dir.exists) {
        dir.delete();
      }
    } catch {
      // Idempotent directory removal
    }
  }

  async clear(): Promise<void> {
    try {
      if (this.baseDirectory.exists) {
        this.baseDirectory.delete();
      }
    } catch {
      // Ignore
    }
    await this.initialize();
  }

  getLocalUri(filename: string): string {
    return new File(this.baseDirectory, filename).uri;
  }
}

export const attachmentLocalStorage = new ExpoFileSystemLocalStorageAdapter();
