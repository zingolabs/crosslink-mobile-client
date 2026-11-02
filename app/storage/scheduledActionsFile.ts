import * as RNFS from 'react-native-fs';

import { GlobalConst, ScheduledActionType } from '../AppState';

export type ScheduledActionsFile = ScheduledActionType[];

const fileName = (): string =>
  RNFS.DocumentDirectoryPath + '/scheduledActions.json';

export async function readScheduledActions(): Promise<ScheduledActionsFile> {
  try {
    if (!(await RNFS.exists(fileName()))) {
      console.log('Scheduled Actions read file: The file does not exists');
      return [];
    }
    const actions: ScheduledActionsFile = await JSON.parse(
      (await RNFS.readFile(fileName(), GlobalConst.utf8)).toString(),
    );
    return actions;
  } catch (err) {
    console.log('Scheduled Actions read file:', err);
    return [];
  }
}

export async function writeScheduledActions(
  next: ScheduledActionsFile,
): Promise<void> {
  await RNFS.writeFile(fileName(), JSON.stringify(next), GlobalConst.utf8);
}

export async function addScheduledAction(
  action: ScheduledActionType,
): Promise<ScheduledActionsFile> {
  const actions = await readScheduledActions();
  const maxId = actions.length > 0 ? Math.max(...actions.map(a => a.id)) : 0;
  const next: ScheduledActionsFile = [...actions, { ...action, id: maxId + 1 }];
  await writeScheduledActions(next);
  return next;
}

export async function removeScheduledAction(
  id: number,
): Promise<ScheduledActionsFile> {
  const next: ScheduledActionsFile = (await readScheduledActions()).filter(
    i => i.id !== id,
  );
  await writeScheduledActions(next);
  return next;
}

export async function resetScheduledActions(): Promise<void> {
  await writeScheduledActions([]);
}
