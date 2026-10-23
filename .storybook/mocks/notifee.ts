export const EventType = {
  DISMISSED: 0,
  PRESS: 1,
  ACTION_PRESS: 2,
  DELIVERED: 3,
  TRIGGER_NOTIFICATION_CREATED: 7,
};
export const AndroidImportance = { HIGH: 4, DEFAULT: 3 };
export const TriggerType = { TIMESTAMP: 0, INTERVAL: 1 };
export const RepeatFrequency = { NONE: -1, HOURLY: 0, DAILY: 1, WEEKLY: 2 };
export const AuthorizationStatus = { AUTHORIZED: 1, DENIED: 0 };

export default {
  getInitialNotification: async () => null,
  onForegroundEvent: () => () => {},
  onBackgroundEvent: () => {},
  requestPermission: async () => ({ authorizationStatus: 1 }),
  createChannel: async () => 'stub-channel',
  createTriggerNotification: async () => 'stub-notification',
  cancelNotification: async () => {},
  cancelAllNotifications: async () => {},
  getTriggerNotifications: async () => [],
  getTriggerNotificationIds: async () => [],
  displayNotification: async () => 'stub-notification',
};
