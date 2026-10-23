import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import TxList, { ART_KEYS } from './txList/TxList';
import ArtGallery, { ArtVideos } from './txList/ArtGallery';
import { FPS_OPTIONS } from './txList/art/loops/index';

/**
 * The Home transaction list. Rows fade in on first paint, a new
 * transaction settles in from above while the rows below slide down, and a
 * pending row shows the loader where the time goes until it confirms.
 *
 * The toolbar simulates the wallet: R receive, S send, K stake, C confirm
 * the oldest pending, A auto-feed, 0 reset. Arrivals confirm on their own
 * after four seconds.
 */
const meta = {
  title: 'Prototypes/Transaction list',
  component: TxList,
  argTypes: {
    art: { control: 'select', options: ART_KEYS },
    fps: { control: 'inline-radio', options: [...FPS_OPTIONS] },
  },
  args: { art: 'orbit', fps: 8 },
} satisfies Meta<typeof TxList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = { args: { empty: false } };

/**
 * A fresh wallet. Press R to watch the first transaction land. The `art`
 * control swaps the chalk shape; see `art/generate.mjs` for how they are made.
 */
export const Empty: Story = { args: { empty: true } };

/**
 * All ten chalk shapes looping from pre-rendered sprite sheets, with a
 * slight boil on the stroke edges. The `fps` control picks a sheet with
 * more or fewer frames; the two-second cycle never changes. The orbit
 * still is reserved for the empty state; its loop is here for the record.
 */
export const EmptyArt: Story = {
  parameters: { phoneFrame: false },
  render: args => <ArtGallery fps={args.fps} />,
};

/** The ten loops as mp4 files at 24 fps, for sharing outside Storybook. */
export const EmptyArtVideos: StoryObj = {
  parameters: { phoneFrame: false },
  render: () => <ArtVideos />,
};

/** The wallet's privacy toggle masks every figure, as the balance header does. */
export const PrivacyOn: Story = {
  parameters: { context: { privacy: true } },
};

/** First sync still running: the balance dims and a spinner sits beside it. */
export const Syncing: Story = {
  args: { empty: false },
  parameters: {
    context: {
      syncingStatus: {
        scan_ranges: [{ priority: 'Scanning', start_block: 0, end_block: 1 }],
        percentage_total_outputs_scanned: 62.4,
      },
    },
  },
};
