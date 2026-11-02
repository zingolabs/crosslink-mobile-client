import notifee, {
  AndroidImportance,
  AuthorizationStatus,
  TimestampTrigger,
  TriggerNotification,
  TriggerType,
} from '@notifee/react-native';

async function requestPermissions() {
  const settings = await notifee.getNotificationSettings();
  console.log(settings);

  if (settings.authorizationStatus >= AuthorizationStatus.AUTHORIZED) {
    console.log('Permission settings:', settings);
    return true;
  } else {
    console.log('User declined permissions');
    const request = await notifee.requestPermission();
    if (request.authorizationStatus >= AuthorizationStatus.AUTHORIZED) {
      console.log('Permission request:', request);
      return true;
    } else {
      console.log('User declined permissions');
      return false;
    }
  }
}

// The block-time estimate changes on every new block, so the caller can
// recompute a slightly different `seconds` each time. Re-creating the
// trigger notification for every block is wasted work; only reschedule
// when the rounded fire time or the action count actually changes.
const ROUND_TO_SECONDS = 60;

let lastScheduled = '';

export const resetScheduledReminder = (): void => {
  lastScheduled = '';
};

export async function scheduleReminder({
  seconds,
  numberActions,
}: {
  seconds: number;
  numberActions: number;
}) {
  const scheduleKey = `${numberActions}:${Math.max(
    0,
    Math.round(seconds / ROUND_TO_SECONDS),
  )}`;
  if (scheduleKey === lastScheduled) {
    return;
  }
  const allowed: boolean = await requestPermissions();

  if (allowed) {
    // only one notification...
    let notifeeId: string | undefined;
    const triggers: TriggerNotification[] =
      await notifee.getTriggerNotifications();
    if (triggers.length === 1) {
      notifeeId = triggers[0].notification.id;
    } else if (triggers.length > 1) {
      await notifee.cancelAllNotifications();
    }

    const channelId = await notifee.createChannel({
      id: 'reminders',
      name: 'Reminders',
      importance: AndroidImportance.HIGH,
    });

    const fireDate = Date.now() + seconds * 1000;

    const trigger: TimestampTrigger = {
      type: TriggerType.TIMESTAMP,
      timestamp: fireDate,
      alarmManager: true, // Android option for timestamp triggers
    };

    const notification = {
      ...(notifeeId !== undefined && { id: notifeeId }),
      title: 'Staking day has arrived',
      body: `You have ${numberActions} scheduled action${numberActions > 1 ? 's' : ''}.`,
      data: {
        deeplink: `delegator://reminder-opened`,
      },
      android: {
        channelId,
        pressAction: {
          id: 'default',
        },
      },
    };

    await notifee.createTriggerNotification(notification, trigger);

    lastScheduled = scheduleKey;

    return;
  }
}
