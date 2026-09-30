import React, { useMemo } from 'react';
import { requireNativeComponent, StyleSheet, Text, View } from 'react-native';
import type { NativeSyntheticEvent, ViewProps } from 'react-native';
import type { StoryProject } from '../types/story';
import { engineAvailable } from '../media/engine';
import { shared } from '../theme/theme';
interface NativeProps extends ViewProps {
  project: string;
  playing: boolean;
  seekMs: number;
  onStoryProgress: (
    event: NativeSyntheticEvent<{
      positionMs: number;
      ended: boolean;
      playing: boolean;
    }>,
  ) => void;
  onStoryError: (event: NativeSyntheticEvent<{ message: string }>) => void;
}
const NativePreview = engineAvailable
  ? requireNativeComponent<NativeProps>('StoryPreview')
  : null;
export function StoryPreview({
  project,
  playing,
  seekMs,
  onProgress,
  onError,
}: {
  project: StoryProject;
  playing: boolean;
  seekMs: number;
  onProgress: (position: number, ended: boolean) => void;
  onError: (message: string) => void;
}) {
  // Name/autosave timestamp changes must not reconstruct the native player.
  const json = useMemo(
    () => JSON.stringify({ ...project, name: '', updatedAt: 0 }),
    [project],
  );
  return NativePreview ? (
    <NativePreview
      style={StyleSheet.absoluteFill}
      project={json}
      playing={playing}
      seekMs={seekMs}
      onStoryProgress={event =>
        onProgress(event.nativeEvent.positionMs, event.nativeEvent.ended)
      }
      onStoryError={event => onError(event.nativeEvent.message)}
    />
  ) : (
    <View>
      <Text style={shared.body}>Preview is available on Android.</Text>
    </View>
  );
}
