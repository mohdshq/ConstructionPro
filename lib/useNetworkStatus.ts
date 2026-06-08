import { useState, useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';

export function useNetworkStatus() {
    const [isOnline, setIsOnline] = useState(true);
    const [isInternetReachable, setIsInternetReachable] = useState<boolean | null>(true);

    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener((state) => {
            setIsOnline(state.isConnected ?? true);
            setIsInternetReachable(state.isInternetReachable ?? true);
        });

        return () => unsubscribe();
    }, []);

    // NOTE: key off connection state only. isInternetReachable can get "stuck" at false
    // on iOS simulators (and some networks) when connectivity is restored, which would
    // pin the offline banner on permanently. Connection state (isConnected) flips reliably
    // both ways. Captive-portal / "connected but no internet" edge case is deferred to
    // M4 (sync-queue request failures will surface it).
    const isOffline = isOnline === false;

    return { isOnline, isInternetReachable, isOffline };
}
