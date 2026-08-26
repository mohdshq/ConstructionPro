import * as ImageManipulator from 'expo-image-manipulator';

export interface CompressImageOptions {
  maxDimension?: number;
  width?: number;
  height?: number;
  quality?: number;
}

/**
 * Normalizes and clamps an image along its longest edge without distorting aspect ratio.
 * Downscales only when the source dimension exceeds maxDimension.
 */
export async function normalizeAndCompressImage(
  uri: string,
  options?: CompressImageOptions
): Promise<{ uri: string; width: number; height: number }> {
  const targetMax = options?.maxDimension ?? 1920;
  const quality = options?.quality ?? 0.8;
  const srcW = options?.width || 0;
  const srcH = options?.height || 0;
  const maxDim = Math.max(srcW, srcH);

  // If dimensions are provided and within bounds, skip resize action
  const actions: ImageManipulator.Action[] = [];
  if (maxDim > targetMax || (!srcW && !srcH)) {
    // Clamping along the true long edge preserves aspect ratio
    actions.push({
      resize: srcW >= srcH ? { width: targetMax } : { height: targetMax },
    });
  }

  const result = await ImageManipulator.manipulateAsync(
    uri,
    actions,
    {
      compress: quality,
      format: ImageManipulator.SaveFormat.JPEG,
    }
  );

  return {
    uri: result.uri,
    width: result.width,
    height: result.height,
  };
}

/**
 * Compress an image for upload (reports / drawings / covers).
 * Default: max 1920px long-edge, 0.8 JPEG quality.
 */
export async function compressImage(
  uri: string,
  options?: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    width?: number;
    height?: number;
  }
): Promise<{ uri: string; width: number; height: number }> {
  const maxDim = Math.max(options?.maxWidth ?? 1920, options?.maxHeight ?? 1920);
  return normalizeAndCompressImage(uri, {
    maxDimension: maxDim,
    quality: options?.quality ?? 0.8,
    width: options?.width,
    height: options?.height,
  });
}

/**
 * Compress a thumbnail / avatar image.
 * Default: max 512px long-edge, 0.8 JPEG quality.
 */
export async function compressThumbnail(
  uri: string,
  options?: { width?: number; height?: number; maxDimension?: number }
): Promise<string> {
  const res = await normalizeAndCompressImage(uri, {
    maxDimension: options?.maxDimension ?? 512,
    quality: 0.8,
    width: options?.width,
    height: options?.height,
  });
  return res.uri;
}

/**
 * Convert a local file URI to a Blob for Supabase Storage upload.
 */
export async function uriToBlob(uri: string): Promise<Blob> {
  const response = await fetch(uri);
  return await response.blob();
}

/**
 * Generate a unique filename for storage.
 */
export function generateStorageFilename(prefix: string = 'img'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}_${timestamp}_${random}.jpg`;
}
