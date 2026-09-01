export const Audio = {
  Recording: {
    createAsync: jest.fn().mockResolvedValue({
      recording: {
        stopAndUnloadAsync: jest.fn().mockResolvedValue(undefined),
        getURI: jest.fn().mockReturnValue('file:///mock/audio.m4a'),
      },
    }),
  },
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
  AndroidOutputFormat: {
    DEFAULT: 0,
    MPEG_4: 2,
    AMR_NB: 3,
    AMR_WB: 4,
    AAC_ADIF: 5,
    AAC_ADTS: 6,
    OUTPUT_FORMAT_RTP_AVP: 7,
    WEBM: 8,
  },
  AndroidAudioEncoder: {
    DEFAULT: 0,
    AMR_NB: 1,
    AMR_WB: 2,
    AAC: 3,
    HE_AAC: 4,
    AAC_ELD: 5,
  },
  IOSOutputFormat: {
    MPEG4AAC: 'aac ',
  },
  IOSAudioQuality: {
    MIN: 0,
    LOW: 0x20,
    MEDIUM: 0x40,
    HIGH: 0x60,
    MAX: 0x7f,
  },
};

export const InterruptionModeIOS = {
  DoNotMix: 1,
  DuckOthers: 2,
};

export const InterruptionModeAndroid = {
  DoNotMix: 1,
  DuckOthers: 2,
};
