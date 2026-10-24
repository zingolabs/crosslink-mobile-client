// Motion tokens shared by the home screen: one strong ease-out curve for
// anything entering or responding to touch, and a few durations. UI never
// animates with ease-in.
export const curve = [0.23, 1, 0.32, 1] as const;

export const duration = {
  /** Button press feedback. */
  press: 120,
  /** Rows settling into a list. */
  enter: 280,
  /** Layout changes in a visible list. */
  list: 260,
  /** The brief tint on a freshly arrived transaction. */
  highlight: 1600,
} as const;
