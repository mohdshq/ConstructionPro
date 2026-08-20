import { ExpoFileSystemLocalStorageAdapter } from '../localStorage';
import { Paths } from 'expo-file-system';

describe('ExpoFileSystemLocalStorageAdapter', () => {
  let adapter: ExpoFileSystemLocalStorageAdapter;

  beforeEach(async () => {
    adapter = new ExpoFileSystemLocalStorageAdapter('test_attachments');
    await adapter.initialize();
  });

  describe('Storage Root Path Invariant', () => {
    it('resolves base directory under Paths.document and never under Paths.cache', () => {
      const sampleUri = adapter.getLocalUri('photo.jpg');
      expect(sampleUri).toContain(Paths.document.uri);
      expect(sampleUri).not.toContain(Paths.cache.uri);
      expect(sampleUri).toBe(`${Paths.document.uri}/test_attachments/photo.jpg`);
    });
  });

  describe('initialize & makeDir', () => {
    it('creates the base directory idempotently', async () => {
      await adapter.initialize();
      const exists = await adapter.fileExists(adapter.getLocalUri('nonexistent.jpg'));
      expect(exists).toBe(false);
    });
  });

  describe('saveFile & readFile', () => {
    it('saves and reads binary ArrayBuffer data accurately', async () => {
      const filePath = adapter.getLocalUri('binary.bin');
      const testBytes = new Uint8Array([10, 20, 30, 40, 50]);

      const bytesWritten = await adapter.saveFile(filePath, testBytes.buffer);
      expect(bytesWritten).toBe(5);

      const exists = await adapter.fileExists(filePath);
      expect(exists).toBe(true);

      const readBuffer = await adapter.readFile(filePath);
      const readBytes = new Uint8Array(readBuffer);
      expect(readBytes).toEqual(testBytes);
    });

    it('saves and reads ArrayBufferView data accurately', async () => {
      const filePath = adapter.getLocalUri('view.bin');
      const testBytes = new Uint8Array([100, 101, 102]);

      const bytesWritten = await adapter.saveFile(filePath, testBytes);
      expect(bytesWritten).toBe(3);

      const readBuffer = await adapter.readFile(filePath);
      expect(new Uint8Array(readBuffer)).toEqual(testBytes);
    });

    it('saves and reads string / file uri copy', async () => {
      const srcPath = adapter.getLocalUri('src.txt');
      const destPath = adapter.getLocalUri('dest.txt');

      await adapter.saveFile(srcPath, 'Hello world');
      expect(await adapter.fileExists(srcPath)).toBe(true);

      await adapter.saveFile(destPath, srcPath);
      expect(await adapter.fileExists(destPath)).toBe(true);

      const readBuffer = await adapter.readFile(destPath);
      const readText = new TextDecoder().decode(readBuffer);
      expect(readText).toBe('Hello world');
    });

    it('throws when reading a non-existent file', async () => {
      const missingPath = adapter.getLocalUri('missing.bin');
      await expect(adapter.readFile(missingPath)).rejects.toThrow('File does not exist');
    });
  });

  describe('deleteFile', () => {
    it('deletes an existing file idempotently without throwing', async () => {
      const filePath = adapter.getLocalUri('to_delete.bin');
      await adapter.saveFile(filePath, new Uint8Array([1, 2, 3]));
      expect(await adapter.fileExists(filePath)).toBe(true);

      await adapter.deleteFile(filePath);
      expect(await adapter.fileExists(filePath)).toBe(false);

      // Second delete on non-existent file should not throw
      await expect(adapter.deleteFile(filePath)).resolves.not.toThrow();
    });
  });

  describe('clear', () => {
    it('clears all files in base directory and re-initializes the directory', async () => {
      const file1 = adapter.getLocalUri('f1.jpg');
      const file2 = adapter.getLocalUri('f2.jpg');

      await adapter.saveFile(file1, new Uint8Array([1]));
      await adapter.saveFile(file2, new Uint8Array([2]));

      expect(await adapter.fileExists(file1)).toBe(true);
      expect(await adapter.fileExists(file2)).toBe(true);

      await adapter.clear();

      expect(await adapter.fileExists(file1)).toBe(false);
      expect(await adapter.fileExists(file2)).toBe(false);
    });
  });
});
