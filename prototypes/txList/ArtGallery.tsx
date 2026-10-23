/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { Platform, ScrollView, Text, View } from 'react-native';

import { text, useTheme } from '../../app/theme';
import { ART_KEYS, ArtKey } from './TxList';
import ArtLoop from './ArtLoop';

const VIDEOS: Partial<Record<ArtKey, unknown>> = {
  ring: require('./art/loops/ring.mp4'),
  pair: require('./art/loops/pair.mp4'),
  spiral: require('./art/loops/spiral.mp4'),
  wave: require('./art/loops/wave.mp4'),
  dashes: require('./art/loops/dashes.mp4'),
  frame: require('./art/loops/frame.mp4'),
  triangle: require('./art/loops/triangle.mp4'),
  orbit: require('./art/loops/orbit.mp4'),
  arcs: require('./art/loops/arcs.mp4'),
  knot: require('./art/loops/knot.mp4'),
};

const url = (v: unknown): string => {
  if (typeof v === 'string') {
    return v;
  }
  const o = v as { default?: string; uri?: string };
  return o.default ?? o.uri ?? '';
};

const Grid: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ScrollView
    contentContainerStyle={{
      padding: 32,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 24,
      justifyContent: 'center',
    }}
  >
    {children}
  </ScrollView>
);

const Caption: React.FC<{ k: ArtKey }> = ({ k }) => {
  const { colors } = useTheme();
  return (
    <Text style={[text.footnote, { color: colors.fgSubtle }]}>
      {k}
      {k === 'orbit' ? ' · still reserved for empty' : ''}
    </Text>
  );
};

/** Every chalk shape, each loop playing from its sprite sheet. */
const ArtGallery: React.FC<{ fps?: number }> = ({ fps }) => (
  <Grid>
    {ART_KEYS.map(k => (
      <View key={k} style={{ alignItems: 'center', gap: 8 }}>
        <ArtLoop art={k} fps={fps} />
        <Caption k={k} />
      </View>
    ))}
  </Grid>
);

/** The same loops as mp4 files on the canvas colour. Web only. */
export const ArtVideos: React.FC = () => {
  const { colors } = useTheme();
  if (Platform.OS !== 'web') {
    return null;
  }
  return (
    <Grid>
      {(Object.keys(VIDEOS) as ArtKey[]).map(k => (
        <View key={k} style={{ alignItems: 'center', gap: 8 }}>
          {React.createElement('video', {
            src: url(VIDEOS[k]),
            width: 200,
            height: 200,
            autoPlay: true,
            loop: true,
            muted: true,
            playsInline: true,
            style: { display: 'block', borderRadius: 16 },
          })}
          <Text style={[text.footnote, { color: colors.fgSubtle }]}>{k}</Text>
        </View>
      ))}
    </Grid>
  );
};

export default ArtGallery;
