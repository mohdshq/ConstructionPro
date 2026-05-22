import * as ImageManipulator from 'expo-image-manipulator';

/**
 * Compress and resize an image for upload.
 * Best practices:
 * - Resize to max 1920px on longest side (clear for reports, saves ~70% size)
 * - JPEG at 0.7 quality (good balance of clarity vs file size)
 * - Average result: 200-400KB instead of 3-8MB from phone cameras
 */
export async function compressImage(
    uri: string,
    options?: {
        maxWidth?: number;
        maxHeight?: number;
        quality?: number;
    }
): Promise<{ uri: string; width: number; height: number }> {
    const maxWidth = options?.maxWidth ?? 1920;
    const maxHeight = options?.maxHeight ?? 1920;
    const quality = options?.quality ?? 0.7;

    const result = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: maxWidth, height: maxHeight } }],
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
 * Compress a thumbnail image (for project cover photos, avatars).
 * Smaller: max 800px, 0.6 quality.
 */
export async function compressThumbnail(uri: string): Promise<string> {
    const result = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 800, height: 800 } }],
        {
            compress: 0.6,
            format: ImageManipulator.SaveFormat.JPEG,
        }
    );
    return result.uri;
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
