import { resolveDrawingUploadMeta } from '../drawingMime';

describe('resolveDrawingUploadMeta (Strict MIME Allowlist & Type Mapping)', () => {
  it('maps PDF accurately', () => {
    const res = resolveDrawingUploadMeta('architectural_plan.pdf', 'application/pdf');
    expect(res).toEqual({
      fileType: 'pdf',
      mediaType: 'application/pdf',
      fileExtension: 'pdf',
    });
  });

  it('maps image types (JPEG, PNG, WebP) accurately', () => {
    expect(resolveDrawingUploadMeta('site_sketch.jpg', 'image/jpeg')).toEqual({
      fileType: 'image',
      mediaType: 'image/jpeg',
      fileExtension: 'jpg',
    });
    expect(resolveDrawingUploadMeta('site_sketch.png', 'image/png')).toEqual({
      fileType: 'image',
      mediaType: 'image/png',
      fileExtension: 'png',
    });
    expect(resolveDrawingUploadMeta('site_sketch.webp', 'image/webp')).toEqual({
      fileType: 'image',
      mediaType: 'image/webp',
      fileExtension: 'webp',
    });
  });

  it('maps OOXML Word (.docx) and OOXML Excel (.xlsx) accurately', () => {
    const docxRes = resolveDrawingUploadMeta(
      'specifications.docx',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
    expect(docxRes).toEqual({
      fileType: 'word',
      mediaType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      fileExtension: 'docx',
    });

    const xlsxRes = resolveDrawingUploadMeta(
      'boq_schedule.xlsx',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    expect(xlsxRes).toEqual({
      fileType: 'excel',
      mediaType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      fileExtension: 'xlsx',
    });
  });

  it('safely falls back CAD types (DWG / DXF / application/acad / image/vnd.dwg) to application/octet-stream and type cad', () => {
    const dwgMimeRes = resolveDrawingUploadMeta('floor_plan.dwg', 'application/acad');
    expect(dwgMimeRes).toEqual({
      fileType: 'cad',
      mediaType: 'application/octet-stream',
      fileExtension: 'dwg',
    });

    const dxfRes = resolveDrawingUploadMeta('elevation.dxf', 'image/vnd.dxf');
    expect(dxfRes).toEqual({
      fileType: 'cad',
      mediaType: 'application/octet-stream',
      fileExtension: 'dxf',
    });
  });

  it('safely falls back legacy Word (.doc) and legacy Excel (.xls) to application/octet-stream and type other', () => {
    const docRes = resolveDrawingUploadMeta('contract.doc', 'application/msword');
    expect(docRes).toEqual({
      fileType: 'other',
      mediaType: 'application/octet-stream',
      fileExtension: 'doc',
    });

    const xlsRes = resolveDrawingUploadMeta('budget.xls', 'application/vnd.ms-excel');
    expect(xlsRes).toEqual({
      fileType: 'other',
      mediaType: 'application/octet-stream',
      fileExtension: 'xls',
    });
  });

  it('safely handles undefined, null, or empty MIME and file names', () => {
    const undefinedRes = resolveDrawingUploadMeta('unknown_binary', undefined);
    expect(undefinedRes).toEqual({
      fileType: 'other',
      mediaType: 'application/octet-stream',
      fileExtension: 'unknown_binary',
    });

    const nullRes = resolveDrawingUploadMeta('', null);
    expect(nullRes).toEqual({
      fileType: 'other',
      mediaType: 'application/octet-stream',
      fileExtension: 'bin',
    });
  });
});
