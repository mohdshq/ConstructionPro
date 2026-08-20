const inMemoryFiles = new Map<string, Uint8Array | string>();
const inMemoryDirs = new Set<string>();

export class Paths {
  static get document() {
    return new Directory('file:///data/user/0/com.app/files');
  }
  static get cache() {
    return new Directory('file:///data/user/0/com.app/cache');
  }
}

export class Directory {
  uri: string;
  constructor(...uris: any[]) {
    this.uri = uris
      .map((u) => (typeof u === 'string' ? u : u?.uri || ''))
      .filter(Boolean)
      .join('/')
      .replace(/\/+/g, '/')
      .replace(':/', '://');
  }

  get exists(): boolean {
    return inMemoryDirs.has(this.uri);
  }

  create = jest.fn((_options?: any) => {
    inMemoryDirs.add(this.uri);
  });

  delete = jest.fn(() => {
    inMemoryDirs.delete(this.uri);
    for (const key of Array.from(inMemoryFiles.keys())) {
      if (key.startsWith(this.uri)) {
        inMemoryFiles.delete(key);
      }
    }
  });

  list = jest.fn().mockReturnValue([]);
}

export class File {
  uri: string;
  parentDirectory: Directory;

  constructor(...uris: any[]) {
    this.uri = uris
      .map((u) => (typeof u === 'string' ? u : u?.uri || ''))
      .filter(Boolean)
      .join('/')
      .replace(/\/+/g, '/')
      .replace(':/', '://');
    const lastSlash = this.uri.lastIndexOf('/');
    const parentUri = lastSlash > 0 ? this.uri.substring(0, lastSlash) : this.uri;
    this.parentDirectory = new Directory(parentUri);
  }

  get exists(): boolean {
    return inMemoryFiles.has(this.uri);
  }

  get size(): number | null {
    const data = inMemoryFiles.get(this.uri);
    if (!data) return null;
    if (typeof data === 'string') return data.length;
    return data.byteLength;
  }

  create = jest.fn((_options?: any) => {
    if (!inMemoryFiles.has(this.uri)) {
      inMemoryFiles.set(this.uri, new Uint8Array(0));
    }
  });

  write = jest.fn((data: any) => {
    if (data instanceof Uint8Array) {
      inMemoryFiles.set(this.uri, data);
    } else if (typeof data === 'string') {
      inMemoryFiles.set(this.uri, data);
    } else if (data instanceof ArrayBuffer) {
      inMemoryFiles.set(this.uri, new Uint8Array(data));
    } else {
      inMemoryFiles.set(this.uri, new Uint8Array(data));
    }
  });

  delete = jest.fn(() => {
    inMemoryFiles.delete(this.uri);
  });

  copy = jest.fn((dest: File) => {
    const data = inMemoryFiles.get(this.uri);
    if (data !== undefined) {
      inMemoryFiles.set(dest.uri, data);
    }
  });

  bytes = jest.fn(async () => {
    const data = inMemoryFiles.get(this.uri);
    if (data === undefined) throw new Error(`File does not exist: ${this.uri}`);
    if (typeof data === 'string') return new TextEncoder().encode(data);
    return data;
  });

  arrayBuffer = jest.fn(async () => {
    const uint8 = await this.bytes();
    return uint8.buffer.slice(uint8.byteOffset, uint8.byteOffset + uint8.byteLength);
  });

  text = jest.fn(async () => {
    const data = inMemoryFiles.get(this.uri);
    if (data === undefined) throw new Error(`File does not exist: ${this.uri}`);
    if (typeof data === 'string') return data;
    return new TextDecoder().decode(data);
  });
}
