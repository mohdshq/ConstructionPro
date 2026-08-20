import { normalizeAndCompressImage, compressImage, compressThumbnail } from '../imageUtils';
import * as ImageManipulator from 'expo-image-manipulator';

jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn().mockImplementation(async (uri, actions, saveOptions) => {
    let width = 1000;
    let height = 500;
    if (actions && actions.length > 0) {
      if (actions[0].resize?.width) {
        width = actions[0].resize.width;
      }
      if (actions[0].resize?.height) {
        height = actions[0].resize.height;
      }
    }
    return {
      uri: 'file:///mock/manipulated.jpg',
      width,
      height,
    };
  }),
  SaveFormat: {
    JPEG: 'jpeg',
    PNG: 'png',
    WEBP: 'webp',
  },
}));

describe('lib/imageUtils - Long-Edge Clamping & Compression', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('clamps landscape images along width without distorting height', async () => {
    await normalizeAndCompressImage('file:///test/photo.jpg', {
      width: 4000,
      height: 2000,
      maxDimension: 1920,
    });

    expect(ImageManipulator.manipulateAsync).toHaveBeenCalledWith(
      'file:///test/photo.jpg',
      [{ resize: { width: 1920 } }],
      expect.objectContaining({ format: 'jpeg', compress: 0.8 })
    );
  });

  it('clamps portrait images along height without distorting width', async () => {
    await normalizeAndCompressImage('file:///test/portrait.jpg', {
      width: 1000,
      height: 3000,
      maxDimension: 1920,
    });

    expect(ImageManipulator.manipulateAsync).toHaveBeenCalledWith(
      'file:///test/portrait.jpg',
      [{ resize: { height: 1920 } }],
      expect.objectContaining({ format: 'jpeg', compress: 0.8 })
    );
  });

  it('skips resize when image is already within bounds (downscale only)', async () => {
    await normalizeAndCompressImage('file:///test/small.jpg', {
      width: 800,
      height: 600,
      maxDimension: 1920,
    });

    expect(ImageManipulator.manipulateAsync).toHaveBeenCalledWith(
      'file:///test/small.jpg',
      [],
      expect.objectContaining({ format: 'jpeg', compress: 0.8 })
    );
  });

  it('compresses thumbnails with 512px maxDimension by default', async () => {
    await compressThumbnail('file:///test/avatar.png', {
      width: 1024,
      height: 1024,
    });

    expect(ImageManipulator.manipulateAsync).toHaveBeenCalledWith(
      'file:///test/avatar.png',
      [{ resize: { width: 512 } }],
      expect.objectContaining({ format: 'jpeg', compress: 0.8 })
    );
  });
});
