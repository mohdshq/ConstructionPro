export interface DrawingUploadMeta {
  fileType: 'pdf' | 'image' | 'cad' | 'word' | 'excel' | 'other';
  mediaType: string;
  fileExtension: string;
}

/**
 * Resolves drawing fileType, mediaType, and extension with strict allowlisting.
 * Ensures that any non-allowlisted MIME type is safely mapped to application/octet-stream
 * so Supabase Storage does not reject the upload with an unrecoverable non-404 error.
 */
export function resolveDrawingUploadMeta(
  fileName: string,
  rawMime?: string | null
): DrawingUploadMeta {
  const mime = (rawMime || '').toLowerCase().trim();
  const lowerName = (fileName || '').toLowerCase().trim();
  const ext = lowerName.split('.').pop() || '';

  // 1. PDF
  if (mime === 'application/pdf' || ext === 'pdf') {
    return {
      fileType: 'pdf',
      mediaType: 'application/pdf',
      fileExtension: 'pdf',
    };
  }

  // 2. Images (Normalised to JPEG or standard web formats)
  if (mime === 'image/jpeg' || mime === 'image/jpg' || ext === 'jpg' || ext === 'jpeg') {
    return {
      fileType: 'image',
      mediaType: 'image/jpeg',
      fileExtension: 'jpg',
    };
  }
  if (mime === 'image/png' || ext === 'png') {
    return {
      fileType: 'image',
      mediaType: 'image/png',
      fileExtension: 'png',
    };
  }
  if (mime === 'image/webp' || ext === 'webp') {
    return {
      fileType: 'image',
      mediaType: 'image/webp',
      fileExtension: 'webp',
    };
  }

  // 3. OOXML Word
  if (
    mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    ext === 'docx'
  ) {
    return {
      fileType: 'word',
      mediaType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      fileExtension: 'docx',
    };
  }

  // 4. OOXML Excel
  if (
    mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    ext === 'xlsx'
  ) {
    return {
      fileType: 'excel',
      mediaType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      fileExtension: 'xlsx',
    };
  }

  // 5. CAD (DWG / DXF) -> type = 'cad', mediaType = 'application/octet-stream'
  if (ext === 'dwg' || ext === 'dxf' || mime.includes('dwg') || mime.includes('acad')) {
    return {
      fileType: 'cad',
      mediaType: 'application/octet-stream',
      fileExtension: ext || 'dwg',
    };
  }

  // 6. Legacy doc/xls, unknown, undefined -> type = 'other', mediaType = 'application/octet-stream'
  return {
    fileType: 'other',
    mediaType: 'application/octet-stream',
    fileExtension: ext || 'bin',
  };
}
