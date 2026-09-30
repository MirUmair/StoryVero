import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Button } from '../components/ui';
import { MediaThumb } from '../components/MediaThumb';
import { colors, shared } from '../theme/theme';
import { formatTime } from '../editor/project';
import type { ExportState, StoryExport } from '../types/story';
export function ExportScreen({
  state,
  onCancel,
  onBack,
  onRetry,
}: {
  state: ExportState;
  onCancel: () => void;
  onBack: () => void;
  onRetry: () => void;
}) {
  const processing = state.status === 'processing';
  const progress = state.status === 'processing' ? state.progress : null;
  return (
    <View style={[shared.screen, styles.center]}>
      <Animated.View entering={FadeInDown.duration(260)} style={styles.block}>
        <View style={styles.symbol}>
          <Text style={styles.symbolText}>
            {processing ? '✳' : state.status === 'cancelled' ? '↶' : '!'}
          </Text>
        </View>
        <Text style={shared.label}>
          {processing ? 'A FEW MOMENTS MORE' : 'YOUR PROJECT IS SAFE'}
        </Text>
        <Text style={styles.title}>
          {processing
            ? 'Creating your\nstory…'
            : state.status === 'cancelled'
            ? 'Take your time.'
            : 'Let’s try again.'}
        </Text>
        {processing ? (
          <>
            {progress === null ? (
              <ActivityIndicator size="large" color={colors.ink} />
            ) : (
              <>
                <Text accessibilityLiveRegion="polite" style={styles.percent}>
                  {progress}%
                </Text>
                <View style={styles.track}>
                  <View style={[styles.progress, { width: `${progress}%` }]} />
                </View>
              </>
            )}
            <Text style={styles.description}>
              Keep Storyvero open while your story is created on this device.
            </Text>
            <Button label="Cancel export" secondary onPress={onCancel} />
          </>
        ) : (
          <>
            <Text style={styles.description}>
              {state.status === 'failed'
                ? state.message
                : 'Your moments and edits are still here.'}
            </Text>
            {state.status === 'failed' && (
              <Button label="Try again" onPress={onRetry} />
            )}
            <Button label="Back to editor" secondary onPress={onBack} />
          </>
        )}
      </Animated.View>
    </View>
  );
}
export function ResultScreen({
  result,
  onPlay,
  onShare,
  onSave,
  onEdit,
  onHome,
  onDelete,
}: {
  result: StoryExport;
  onPlay: () => void;
  onShare: () => void;
  onSave: () => void;
  onEdit: () => void;
  onHome: () => void;
  onDelete: () => void;
}) {
  return (
    <View style={[shared.screen, styles.result]}>
      <Animated.View
        entering={FadeInDown.duration(300)}
        style={styles.resultTop}
      >
        <View style={styles.success}>
          <Text style={styles.check}>✓</Text>
        </View>
        <Text style={shared.label}>MADE BY YOU</Text>
        <Text style={styles.resultTitle}>Your Story is Ready</Text>
        <MediaThumb uri={result.thumbnail} video style={styles.resultThumb} />
        <Text numberOfLines={1} style={shared.caption}>
          {result.filename}
        </Text>
        <Text style={shared.body}>
          {formatTime(result.durationMs)} · {result.width} × {result.height} ·{' '}
          {(result.sizeBytes / 1048576).toFixed(1)} MB
        </Text>
      </Animated.View>
      <View style={styles.actions}>
        <Button label="Share your story  ↗" onPress={onShare} />
        <View style={shared.row}>
          <Button
            style={styles.flex}
            label="▶ Play"
            secondary
            onPress={onPlay}
          />
          <Button
            style={styles.flex}
            label="Save to Files"
            secondary
            onPress={onSave}
          />
        </View>
        <View style={shared.row}>
          <Button
            style={styles.flex}
            label="Edit again"
            secondary
            onPress={onEdit}
          />
          <Button
            style={styles.flex}
            label="Create new"
            secondary
            onPress={onHome}
          />
        </View>
        <Button label="Delete export" secondary onPress={onDelete} />
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  center: { justifyContent: 'center', padding: 32 },
  block: { gap: 24, alignItems: 'stretch' },
  symbol: {
    height: 96,
    width: 96,
    borderRadius: 32,
    backgroundColor: colors.lime,
    justifyContent: 'center',
    alignItems: 'center',
  },
  symbolText: { fontSize: 62, color: colors.ink },
  title: {
    fontSize: 42,
    fontWeight: '700',
    lineHeight: 46,
    letterSpacing: -1.5,
    color: colors.ink,
  },
  percent: {
    fontSize: 40,
    fontWeight: '600',
    color: colors.ink,
    fontVariant: ['tabular-nums'],
  },
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  progress: { height: 8, borderRadius: 4, backgroundColor: '#93AB55' },
  description: { color: colors.muted, fontSize: 15, lineHeight: 23 },
  result: { padding: 24, justifyContent: 'space-evenly', gap: 20 },
  resultTop: { alignItems: 'center', gap: 12, flexShrink: 1 },
  success: {
    height: 52,
    width: 52,
    borderRadius: 26,
    backgroundColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: { fontSize: 28, color: colors.ink },
  resultTitle: {
    fontSize: 27,
    fontWeight: '700',
    color: colors.ink,
    letterSpacing: -0.7,
    textAlign: 'center',
  },
  resultThumb: { width: 106, height: 160, marginVertical: 2, flexShrink: 1 },
  actions: { gap: 10 },
  flex: { flex: 1 },
});
