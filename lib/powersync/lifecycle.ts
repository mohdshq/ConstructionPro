import { AbstractPowerSyncDatabase } from '@powersync/react-native';
import { Connector } from './Connector';
import { Alert } from 'react-native';

let isConnected = false;
let connectPromise: Promise<void> | null = null;

export const setupPowerSync = async (powersync: AbstractPowerSyncDatabase) => {
  if (isConnected) return;
  if (connectPromise) return connectPromise;

  connectPromise = (async () => {
    try {
      await powersync.connect(new Connector());
      isConnected = true;
    } catch (error) {
      isConnected = false;
      throw error;
    } finally {
      connectPromise = null;
    }
  })();

  return connectPromise;
};

export const teardownPowerSync = async (powersync: AbstractPowerSyncDatabase) => {
  connectPromise = null;
  if (!isConnected) return;
  try {
    const stats = await powersync.getUploadQueueStats();
    if (stats.count > 0) {
      Alert.alert(
        'Offline Changes Saved',
        `You have ${stats.count} unsynced changes. They have been saved securely on this device and will sync the next time you sign in.`,
        [{ text: 'OK' }]
      );
    }
    await powersync.disconnect();
    isConnected = false;
  } catch (error) {
    console.warn('[PowerSync] teardown failed:', error);
  }
};

export const clearPowerSyncForNewUser = async (
  powersync: AbstractPowerSyncDatabase,
  onConfirm: () => Promise<void>,
  onCancel: () => void
) => {
  try {
    const stats = await powersync.getUploadQueueStats();
    if (stats.count > 0) {
      Alert.alert(
        'Warning: Unsynced Data',
        `The previous user left ${stats.count} unsynced changes on this device. Signing in as a different user will permanently delete these changes.\n\nAre you sure you want to proceed?`,
        [
          { text: 'Cancel', style: 'cancel', onPress: onCancel },
          { 
            text: 'Delete and Sign In', 
            style: 'destructive', 
            onPress: async () => {
              await powersync.disconnectAndClear();
              await onConfirm();
            } 
          }
        ]
      );
    } else {
      await powersync.disconnectAndClear();
      await onConfirm();
    }
  } catch (error) {
    console.warn('[PowerSync] clear for new user failed:', error);
    await powersync.disconnectAndClear();
    await onConfirm();
  }
};
