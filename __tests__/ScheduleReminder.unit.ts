import notifee, {
  AuthorizationStatus,
} from '@notifee/react-native';
import {
  scheduleReminder,
  resetScheduledReminder,
} from '../components/Staking/components/scheduleReminder';

jest.mock('@notifee/react-native', () => {
  const mockNotifee = {
    getNotificationSettings: jest.fn(),
    requestPermission: jest.fn(),
    getTriggerNotifications: jest.fn(() => Promise.resolve([])),
    cancelAllNotifications: jest.fn(() => Promise.resolve()),
    createChannel: jest.fn(() => Promise.resolve('reminders')),
    createTriggerNotification: jest.fn(() => Promise.resolve()),
  };
  return {
    __esModule: true,
    default: mockNotifee,
    AndroidImportance: { HIGH: 4 },
    TriggerType: { TIMESTAMP: 0 },
    AuthorizationStatus: {
      NOT_DETERMINED: 0,
      DENIED: 1,
      AUTHORIZED: 2,
      PROVISIONAL: 3,
    },
  };
});

const authorize = (): void => {
  (notifee.getNotificationSettings as jest.Mock).mockResolvedValue({
    authorizationStatus: AuthorizationStatus.AUTHORIZED,
  });
};

describe('scheduleReminder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetScheduledReminder();
    authorize();
  });

  it('schedules a trigger notification', async () => {
    await scheduleReminder({ seconds: 3600, numberActions: 2 });
    expect(notifee.createTriggerNotification).toHaveBeenCalledTimes(1);
    const [notification] = (notifee.createTriggerNotification as jest.Mock)
      .mock.calls[0];
    expect(notification.body).toContain('2 scheduled action');
  });

  it('skips rescheduling when the fire time and action count are unchanged', async () => {
    await scheduleReminder({ seconds: 3600, numberActions: 2 });
    await scheduleReminder({ seconds: 3620, numberActions: 2 });
    await scheduleReminder({ seconds: 3580, numberActions: 2 });
    expect(notifee.createTriggerNotification).toHaveBeenCalledTimes(1);
  });

  it('reschedules when the action count changes', async () => {
    await scheduleReminder({ seconds: 3600, numberActions: 2 });
    await scheduleReminder({ seconds: 3600, numberActions: 3 });
    expect(notifee.createTriggerNotification).toHaveBeenCalledTimes(2);
  });

  it('reschedules when the rounded fire time changes', async () => {
    await scheduleReminder({ seconds: 3600, numberActions: 2 });
    await scheduleReminder({ seconds: 3900, numberActions: 2 });
    expect(notifee.createTriggerNotification).toHaveBeenCalledTimes(2);
  });

  it('does not remember the schedule when permission is declined', async () => {
    (notifee.getNotificationSettings as jest.Mock).mockResolvedValue({
      authorizationStatus: AuthorizationStatus.DENIED,
    });
    (notifee.requestPermission as jest.Mock).mockResolvedValue({
      authorizationStatus: AuthorizationStatus.DENIED,
    });

    await scheduleReminder({ seconds: 3600, numberActions: 2 });
    expect(notifee.createTriggerNotification).not.toHaveBeenCalled();

    (notifee.getNotificationSettings as jest.Mock).mockResolvedValue({
      authorizationStatus: AuthorizationStatus.AUTHORIZED,
    });
    await scheduleReminder({ seconds: 3600, numberActions: 2 });
    expect(notifee.createTriggerNotification).toHaveBeenCalledTimes(1);
  });
});
