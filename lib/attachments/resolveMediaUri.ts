import { attachmentLocalStorage } from './localStorage';
import { getSignedUrl, getPublicUrl } from '@/lib/supabaseSync';


export type MediaSourceType = 'direct_uri' | 'attachment_ref' | 'legacy_path' | 'empty';

const ATTACHMENT_REF_REGEX = /^[^/\\]+\.[A-Za-z0-9]{1,10}$/;

export function classifyMediaSource(val: string | null | undefined): MediaSourceType {
  if (!val || typeof val !== 'string') return 'empty';
  const trimmed = val.trim();
  if (!trimmed) return 'empty';

  // Exclude JSON objects or arrays
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) return 'empty';

  // Direct local, data, or web URIs
  if (
    trimmed.startsWith('data:') ||
    trimmed.startsWith('file:') ||
    trimmed.startsWith('http:') ||
    trimmed.startsWith('https:') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('content:')
  ) {
    return 'direct_uri';
  }

  // Legacy storage path contains slashes (e.g. userId/projectId/img.jpg or userId/avatar.jpg)
  if (trimmed.includes('/') || trimmed.includes('\\')) {
    return 'legacy_path';
  }

  // Attachment references are strictly single filenames with extensions (e.g. uuid.jpg)
  if (ATTACHMENT_REF_REGEX.test(trimmed)) {
    return 'attachment_ref';
  }

  return 'empty';
}

interface CacheEntry {
  url: string;
  expiresAt: number;
}

// In-memory cache for remote/signed URLs: 3000 seconds (50 minutes) TTL
const urlCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 3000 * 1000;

export function clearMediaUrlCache(): void {
  urlCache.clear();
}

export interface ResolveMediaOptions {
  bucket?: 'report-photos' | 'drawings' | 'avatars';
  projectId?: string;
  userId?: string;
}

export async function resolveMediaUri(
  sourceUri: string | null | undefined,
  options: ResolveMediaOptions = {}
): Promise<string | null> {
  const kind = classifyMediaSource(sourceUri);
  if (kind === 'empty' || !sourceUri) return null;

  const trimmed = sourceUri.trim();

  // 1. Direct URIs (local files, base64 data, full web URLs)
  if (kind === 'direct_uri') {
    return trimmed;
  }

  const bucket = options.bucket || 'report-photos';

  // 2. Attachment References (local-first check on disk)
  if (kind === 'attachment_ref') {
    const localUri = attachmentLocalStorage.getLocalUri(trimmed);
    const exists = await attachmentLocalStorage.fileExists(localUri);
    if (exists) {
      return localUri;
    }

    // Not on local disk (e.g. created on another device) -> resolve from Supabase Storage
    const cacheKey = `${bucket}:${options.projectId || ''}:${trimmed}`;
    const cached = urlCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.url;
    }

    let remotePath = trimmed;
    if (bucket === 'avatars') {
      if (!options.userId) {
        // Without userId, a bare filename avatar attachment ref cannot be resolved to a valid storage path
        return null;
      }
      remotePath = `${options.userId}/${trimmed}`;
      const publicUrl = getPublicUrl('avatars', remotePath);
      if (publicUrl) {
        urlCache.set(cacheKey, { url: publicUrl, expiresAt: Date.now() + CACHE_TTL_MS });
        return publicUrl;
      }
    } else {
      remotePath = options.projectId ? `${options.projectId}/${trimmed}` : trimmed;
      const res = await getSignedUrl(bucket, remotePath, 3600);
      if (res.ok) {
        urlCache.set(cacheKey, { url: res.url, expiresAt: Date.now() + CACHE_TTL_MS });
        return res.url;
      }
    }

    return null;
  }

  // 3. Legacy Storage Paths (online-only)
  if (kind === 'legacy_path') {
    const cacheKey = `legacy:${bucket}:${trimmed}`;
    const cached = urlCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.url;
    }

    if (bucket === 'avatars') {
      const publicUrl = getPublicUrl('avatars', trimmed);
      if (publicUrl) {
        urlCache.set(cacheKey, { url: publicUrl, expiresAt: Date.now() + CACHE_TTL_MS });
        return publicUrl;
      }
    } else {
      const res = await getSignedUrl(bucket, trimmed, 3600);
      if (res.ok) {
        urlCache.set(cacheKey, { url: res.url, expiresAt: Date.now() + CACHE_TTL_MS });
        return res.url;
      }
    }

    return null;
  }


  return null;
}
