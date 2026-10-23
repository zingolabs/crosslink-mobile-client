import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import ChalkWelcome from './ChalkWelcome';
import { wordmarkVariantNames } from './ChalkWordmark';
import { range } from './shaders/storyFrame';

/**
 * Typeface explorations for the wordmark on the static chalk welcome.
 * Web fonts load from Google Fonts on web only.
 */
const meta = {
  title: 'Prototypes/Chalk columns/Wordmark',
  component: ChalkWelcome,
  argTypes: {
    wordmark: { control: 'select', options: wordmarkVariantNames },
    showHeader: { control: 'boolean' },
    baseline: range(0.2, 0.5, 0.01),
    columnTop: range(0.3, 0.8, 0.01),
    rainTop: range(0.5, 1, 0.01),
    density: range(0, 1.5, 0.01),
    seed: range(1, 50, 1),
  },
  args: {
    intro: false,
    showHeader: false,
    wordmark: 'futMichroma',
    baseline: 0.3,
    columnTop: 0.48,
    mask: 'dissolve',
    maskFeather: 0.1,
    maskPad: -0.03,
    rainTop: 0.9,
    density: 0.75,
    pressure: 0.82,
    glow: 0.5,
    spanTop: 0.1,
    seed: 4,
    createNewWallet: () => {},
    getwalletToRestore: () => {},
    openServers: () => {},
  },
} satisfies Meta<typeof ChalkWelcome>;

export default meta;
type Story = StoryObj<typeof meta>;

export const System: Story = {};
export const Plaque: Story = { args: { wordmark: 'plaque' } };
export const PlaqueInstrument: Story = {
  args: { wordmark: 'plaqueInstrument' },
};
export const PlaqueFraunces: Story = {
  args: { wordmark: 'plaqueFraunces' },
};
export const PlaqueCormorant: Story = {
  args: { wordmark: 'plaqueCormorant' },
};
export const PlaqueItaliana: Story = {
  args: { wordmark: 'plaqueItaliana' },
};
export const ChalkAmatic: Story = { args: { wordmark: 'chalkAmatic' } };
export const ChalkRockSalt: Story = { args: { wordmark: 'chalkRockSalt' } };
export const ChalkWalter: Story = { args: { wordmark: 'chalkWalter' } };
export const ChalkLondrina: Story = { args: { wordmark: 'chalkLondrina' } };
export const ChalkFredericka: Story = { args: { wordmark: 'chalkFredericka' } };
export const ChalkCabin: Story = { args: { wordmark: 'chalkCabin' } };
export const ChalkMarker: Story = { args: { wordmark: 'chalkMarker' } };
export const ChalkGloria: Story = { args: { wordmark: 'chalkGloria' } };
export const ChalkShadows: Story = { args: { wordmark: 'chalkShadows' } };
export const ChalkGrotesk: Story = { args: { wordmark: 'chalkGrotesk' } };
export const ChalkSerif: Story = { args: { wordmark: 'chalkSerif' } };
export const ChalkSystem: Story = { args: { wordmark: 'chalkSystem' } };
export const FutOrbitron: Story = { args: { wordmark: 'futOrbitron' } };
export const FutAudiowide: Story = { args: { wordmark: 'futAudiowide' } };
export const FutMichroma: Story = { args: { wordmark: 'futMichroma' } };
export const FutSyncopate: Story = { args: { wordmark: 'futSyncopate' } };
export const FutMajorMono: Story = { args: { wordmark: 'futMajorMono' } };
export const FutBrunoAce: Story = { args: { wordmark: 'futBrunoAce' } };
export const FutTektur: Story = { args: { wordmark: 'futTektur' } };
export const FutChakra: Story = { args: { wordmark: 'futChakra' } };
export const FutZenDots: Story = { args: { wordmark: 'futZenDots' } };
export const FutTurret: Story = { args: { wordmark: 'futTurret' } };
export const FutOxanium: Story = { args: { wordmark: 'futOxanium' } };
export const FutRajdhani: Story = { args: { wordmark: 'futRajdhani' } };
export const Fraunces: Story = { args: { wordmark: 'fraunces' } };
export const Instrument: Story = { args: { wordmark: 'instrument' } };
export const InstrumentItalic: Story = {
  args: { wordmark: 'instrumentItalic' },
};
export const Cormorant: Story = { args: { wordmark: 'cormorant' } };
export const Playfair: Story = { args: { wordmark: 'playfair' } };
export const SpaceGrotesk: Story = { args: { wordmark: 'spaceGrotesk' } };
export const Syne: Story = { args: { wordmark: 'syne' } };
export const Archivo: Story = { args: { wordmark: 'archivo' } };
export const Bricolage: Story = { args: { wordmark: 'bricolage' } };
export const Mono: Story = { args: { wordmark: 'mono' } };
export const DmSerif: Story = { args: { wordmark: 'dmSerif' } };
export const Bodoni: Story = { args: { wordmark: 'bodoni' } };
export const Italiana: Story = { args: { wordmark: 'italiana' } };
export const Sketch: Story = { args: { wordmark: 'sketch' } };
export const Fredericka: Story = { args: { wordmark: 'fredericka' } };
export const Caveat: Story = { args: { wordmark: 'caveat' } };
export const Unbounded: Story = { args: { wordmark: 'unbounded' } };
export const Newsreader: Story = { args: { wordmark: 'newsreader' } };
