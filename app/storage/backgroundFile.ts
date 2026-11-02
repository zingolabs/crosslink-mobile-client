import * as RNFS from 'react-native-fs';

import { BackgroundType, GlobalConst } from '../AppState';

export interface BackgroundFile {
  batches?: number;
  message?: string;
  date?: number;
  dateEnd?: number;
  error?: string;
}

const fileName = (): string => RNFS.DocumentDirectoryPath + '/background.json';

const freshBackground = (): BackgroundType => ({
  batches: 0,
  message: '',
  date: 0,
  dateEnd: 0,
});

export async function readBackground(): Promise<BackgroundType> {
  try {
    if (!(await RNFS.exists(fileName()))) {
      console.log('background read file: The file does not exists');
      return freshBackground();
    }
    const background: BackgroundFile = await JSON.parse(
      (await RNFS.readFile(fileName(), GlobalConst.utf8)).toString(),
    );
    return { ...freshBackground(), ...background };
  } catch (err) {
    console.log('background read file:', err);
    return freshBackground();
  }
}

export async function writeBackground<K extends keyof BackgroundFile>(
  name: K,
  value: NonNullable<BackgroundFile[K]>,
): Promise<void> {
  const background = await readBackground();
  const next: BackgroundFile = { ...background };
  next[name] = value;
  await RNFS.writeFile(fileName(), JSON.stringify(next), GlobalConst.utf8);
}
