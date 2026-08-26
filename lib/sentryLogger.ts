import * as Sentry from '@sentry/react-native';

export function captureWarning(
  category: 'AttachmentQueue' | 'SupabaseRemoteStorage' | 'PowerSyncConnector' | 'PowerSync',
  message: string,
  data?: Record<string, any>
) {
  console.warn(message);
  try {
    Sentry.addBreadcrumb({
      category,
      message,
      level: 'warning',
      data,
    });
    Sentry.captureMessage(message, 'warning');
  } catch (e) {
    // Graceful fallback if Sentry is uninitialized or in test mode
  }
}
