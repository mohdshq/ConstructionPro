export const cacheDirectory = 'file:///data/user/0/com.app/cache/';
export const documentDirectory = 'file:///data/user/0/com.app/files/';
export const readAsStringAsync = jest.fn().mockResolvedValue('base64mock');
export const downloadAsync = jest.fn().mockImplementation(async (url, target) => ({ uri: target }));
export const getInfoAsync = jest.fn().mockResolvedValue({ exists: true, size: 1024 });
export const deleteAsync = jest.fn().mockResolvedValue(undefined);
export const copyAsync = jest.fn().mockResolvedValue(undefined);
