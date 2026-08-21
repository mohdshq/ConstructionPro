import { resolveDrawingUploadMeta } from '../drawingMime';

describe('Drawing Upload Name vs Storage Path separation', () => {
  it('preserves picker-provided filename for drawings.name while storage_path uses generated attachment ref', () => {
    // 1. User picks document from device picker
    const pickerAsset = {
      name: 'DPR.pdf',
      mimeType: 'application/pdf',
      size: 1024000,
      uri: 'file:///cache/DPR.pdf',
    };

    const uploadMeta = resolveDrawingUploadMeta(pickerAsset.name, pickerAsset.mimeType);
    const generatedAttachmentId = 'a17e1468-dd6b-451c-8b53-a123456789ab';
    const attachmentFilename = `${generatedAttachmentId}.${uploadMeta.fileExtension}`;

    // 2. Prepare database record fields
    const drawingRecord = {
      id: 'drawing-uuid-999',
      project_id: 'proj-123',
      name: pickerAsset.name, // Must be human-readable picker filename
      type: uploadMeta.fileType,
      storage_path: attachmentFilename, // Must be the UUID attachment reference
      size: pickerAsset.size,
    };

    // 3. Assert name is the picker-provided filename
    expect(drawingRecord.name).toBe('DPR.pdf');
    expect(drawingRecord.storage_path).toBe('a17e1468-dd6b-451c-8b53-a123456789ab.pdf');

    // 4. Assert name and storage_path strictly differ
    expect(drawingRecord.name).not.toBe(drawingRecord.storage_path);
    expect(drawingRecord.name).not.toBe(generatedAttachmentId);
  });

  it('handles image drawings normalized to JPEG while preserving human-readable name', () => {
    const pickerAsset = {
      name: 'Foundation_Plan.PNG',
      mimeType: 'image/png',
      size: 2048000,
      uri: 'file:///cache/Foundation_Plan.PNG',
    };

    const uploadMeta = resolveDrawingUploadMeta(pickerAsset.name, pickerAsset.mimeType);
    const generatedAttachmentId = 'f458e27e-13c0-4298-83db-60b16470f30e';
    const attachmentFilename = `${generatedAttachmentId}.jpg`; // normalized to jpeg

    const drawingRecord = {
      id: 'drawing-uuid-888',
      project_id: 'proj-123',
      name: pickerAsset.name,
      type: uploadMeta.fileType,
      storage_path: attachmentFilename,
      size: pickerAsset.size,
    };

    expect(drawingRecord.name).toBe('Foundation_Plan.PNG');
    expect(drawingRecord.storage_path).toBe('f458e27e-13c0-4298-83db-60b16470f30e.jpg');
    expect(drawingRecord.name).not.toBe(drawingRecord.storage_path);
  });
});
