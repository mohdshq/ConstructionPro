declare module 'react-native-view-shot' {
    import { RefObject } from 'react';
    import { View } from 'react-native';
    export function captureRef(ref: RefObject<View> | number, options?: any): Promise<string>;
}
