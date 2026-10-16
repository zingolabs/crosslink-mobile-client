// LifeHash generates an identicon from a digest. On web we return a 1x1
// transparent PNG so avatars render as an empty square instead of crashing.
const BLANK =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

export const LifeHashVersion = { version1: 0, version2: 1, detailed: 2 };

export const LifeHash = {
  makeFromDigest: () => ({ toDataUrl: () => BLANK }),
  makeFromUTF8: () => ({ toDataUrl: () => BLANK }),
};
