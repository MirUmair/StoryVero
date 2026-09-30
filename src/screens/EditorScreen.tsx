import React, { useEffect, useState } from 'react';
import {
  Alert,
  AppState,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Chip, Sheet } from '../components/ui';
import { MediaThumb } from '../components/MediaThumb';
import { StoryPreview } from '../player/StoryPreview';
import { colors, shared } from '../theme/theme';
import {
  formatTime,
  makeId,
  mediaDuration,
  moveMedia,
  projectDuration,
  ratioValue,
  setPhotoDuration,
  setTrim,
} from '../editor/project';
import { applyTemplate, templates } from '../templates/catalog';
import type { MediaItem, Ratio, StoryProject } from '../types/story';

type Tool = 'Media' | 'Duration' | 'Frame' | 'Style' | 'Export' | null;
export function EditorScreen({
  project,
  onChange,
  onBack,
  onAdd,
  onExport,
  busy,
}: {
  project: StoryProject;
  onChange: (project: StoryProject) => void;
  onBack: () => void;
  onAdd: () => void;
  onExport: () => void;
  busy: boolean;
}) {
  const { width, height } = useWindowDimensions();
  const [selected, setSelected] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [seek, setSeek] = useState(0);
  const [tool, setTool] = useState<Tool>(null);
  const [full, setFull] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [custom, setCustom] = useState('3');
  const [trimStart, setTrimStart] = useState('0');
  const [trimEnd, setTrimEnd] = useState('');
  const total = projectDuration(project);
  const item = project.media[Math.min(selected, project.media.length - 1)];
  const ratio = ratioValue(project.ratio);
  const previewHeight = Math.min(height * 0.43, (width - 64) / ratio);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state !== 'active') {
        setPlaying(false);
      }
    });
    return () => subscription.remove();
  }, []);
  function update(next: StoryProject) {
    setPlaying(false);
    setSeek(0);
    setPosition(0);
    setPreviewError('');
    onChange(next);
  }
  function updateItem(next: MediaItem) {
    update({
      ...project,
      media: project.media.map(m => (m.id === next.id ? next : m)),
    });
  }
  function select(index: number) {
    setSelected(index);
    setPlaying(false);
    const time = project.media
      .slice(0, index)
      .reduce((sum, m) => sum + mediaDuration(m), 0);
    setSeek(time === seek ? time + 0.001 : time);
    setPosition(time);
  }
  function openTool(next: Tool) {
    setPlaying(false);
    if (item) {
      setCustom(String(item.durationMs / 1000));
      setTrimStart(String(item.trimStartMs / 1000));
      setTrimEnd(String(item.trimEndMs / 1000));
    }
    setTool(next);
  }
  function applyDuration(all: boolean) {
    try {
      const ms = Number(custom) * 1000;
      update({
        ...project,
        media: project.media.map(m =>
          all || m.id === item?.id ? setPhotoDuration(m, ms) : m,
        ),
      });
    } catch (error) {
      Alert.alert('Duration', (error as Error).message);
    }
  }
  function onProgress(ms: number, ended: boolean) {
    setPosition(Math.min(ms, total));
    if (ended) {
      setPlaying(false);
    }
  }
  const preview = (
    <StoryPreview
      project={project}
      playing={playing}
      seekMs={seek}
      onProgress={onProgress}
      onError={message => {
        setPreviewError(message);
        setPlaying(false);
      }}
    />
  );
  const playback = (
    <View style={styles.playback}>
      <Chip
        label={playing ? 'Ⅱ Pause' : '▶ Play'}
        onPress={() => setPlaying(!playing)}
      />
      <Text style={styles.time}>
        {formatTime(position)}{' '}
        <Text style={shared.caption}>/ {formatTime(total)}</Text>
      </Text>
      <Chip
        label={full ? 'Close' : '⛶'}
        onPress={() => {
          setPlaying(false);
          setFull(!full);
        }}
      />
    </View>
  );
  return (
    <View style={shared.screen}>
      <View style={styles.header}>
        <Chip label="‹" onPress={onBack} />
        <TextInput
          accessibilityLabel="Project name"
          value={project.name}
          maxLength={60}
          onChangeText={name => onChange({ ...project, name })}
          style={styles.projectName}
        />
        <Chip
          label="Export ↗"
          onPress={() => openTool('Export')}
          disabled={!item}
        />
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.canvasArea}>
          <View
            style={[
              styles.canvas,
              { width: previewHeight * ratio, height: previewHeight },
            ]}
          >
            {item && !full ? (
              preview
            ) : (
              <Text style={shared.caption}>Add a moment to begin</Text>
            )}
          </View>
          <Text style={styles.canvasLabel}>
            {project.ratio} CANVAS · {project.media.length} MOMENTS
          </Text>
        </View>
        {!!previewError && (
          <Text accessibilityRole="alert" style={styles.error}>
            {previewError}
          </Text>
        )}
        {playback}
        <Pressable
          accessibilityRole="adjustable"
          accessibilityLabel="Story seek bar"
          accessibilityValue={{
            min: 0,
            max: Math.round(total / 1000),
            now: Math.round(position / 1000),
          }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={event => {
            setPlaying(false);
            setSeek(
              Math.max(
                0,
                Math.min(
                  total - 1,
                  position +
                    (event.nativeEvent.actionName === 'increment'
                      ? 1000
                      : -1000),
                ),
              ),
            );
          }}
          onPress={event => {
            setPlaying(false);
            setSeek(
              Math.max(
                0,
                Math.min(
                  total - 1,
                  (event.nativeEvent.locationX / (width - 40)) * total,
                ),
              ),
            );
          }}
          style={styles.seekTouch}
        >
          <View style={styles.seekTrack}>
            <View
              style={[
                styles.seekFill,
                {
                  width: `${
                    total ? Math.min(100, (position / total) * 100) : 0
                  }%`,
                },
              ]}
            />
          </View>
        </Pressable>
        <FlatList
          horizontal
          data={project.media}
          showsHorizontalScrollIndicator={false}
          keyExtractor={m => m.id}
          contentContainerStyle={styles.timeline}
          renderItem={({ item: m, index }) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Select moment ${index + 1}`}
              accessibilityState={{ selected: index === selected }}
              onPress={() => select(index)}
              style={[
                styles.timelineItem,
                index === selected && styles.timelineSelected,
              ]}
            >
              <MediaThumb
                uri={m.thumbnail}
                video={m.kind === 'video'}
                style={styles.timelineThumb}
              />
              <Text style={styles.timelineLabel}>
                {index + 1} · {(mediaDuration(m) / 1000).toFixed(1)}s
              </Text>
            </Pressable>
          )}
          ListFooterComponent={
            <Pressable
              onPress={onAdd}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel="Add media"
              style={styles.addMedia}
            >
              <Text style={shared.title}>+</Text>
            </Pressable>
          }
        />
        <Text style={styles.hint}>Select a moment to make it yours.</Text>
      </ScrollView>
      <View style={styles.toolbar}>
        {(['Media', 'Duration', 'Frame', 'Style'] as const).map(
          (name, index) => (
            <Pressable
              accessibilityRole="button"
              disabled={!item}
              key={name}
              style={styles.tool}
              onPress={() => openTool(name)}
            >
              <Text style={styles.toolGlyph}>
                {['▧', '◷', '⌑', '✧'][index]}
              </Text>
              <Text style={styles.toolText}>{name}</Text>
            </Pressable>
          ),
        )}
      </View>
      {tool && (
        <Sheet
          title={tool === 'Export' ? 'Make it a story' : tool}
          onClose={() => setTool(null)}
        >
          {tool === 'Media' && item && (
            <>
              <Text style={shared.body}>
                Moment {selected + 1} · {item.name}
              </Text>
              <View style={shared.wrap}>
                <Chip
                  label="← Earlier"
                  disabled={selected === 0}
                  onPress={() => {
                    update({
                      ...project,
                      media: moveMedia(project.media, selected, selected - 1),
                    });
                    setSelected(selected - 1);
                  }}
                />
                <Chip
                  label="Later →"
                  disabled={selected >= project.media.length - 1}
                  onPress={() => {
                    update({
                      ...project,
                      media: moveMedia(project.media, selected, selected + 1),
                    });
                    setSelected(selected + 1);
                  }}
                />
                <Chip
                  label="Duplicate"
                  disabled={project.media.length >= 100}
                  onPress={() => {
                    const media = [...project.media];
                    media.splice(selected + 1, 0, { ...item, id: makeId() });
                    update({ ...project, media });
                  }}
                />
                <Chip
                  label="Remove"
                  onPress={() => {
                    update({
                      ...project,
                      media: project.media.filter(m => m.id !== item.id),
                    });
                    setSelected(Math.max(0, selected - 1));
                    setTool(null);
                  }}
                />
              </View>
              {item.kind === 'video' && (
                <Chip
                  label={
                    item.muted ? 'Original audio: muted' : 'Original audio: on'
                  }
                  selected={!item.muted}
                  onPress={() => updateItem({ ...item, muted: !item.muted })}
                />
              )}
              <Button
                label="+ Add photos or videos"
                secondary
                disabled={busy}
                onPress={() => {
                  setTool(null);
                  onAdd();
                }}
              />
            </>
          )}
          {tool === 'Duration' &&
            item &&
            (item.kind === 'photo' ? (
              <>
                <Text style={shared.body}>Give this moment a little time.</Text>
                <View style={shared.wrap}>
                  {[2, 3, 5].map(seconds => (
                    <Chip
                      key={seconds}
                      label={`${seconds} sec`}
                      selected={item.durationMs === seconds * 1000}
                      onPress={() => {
                        setCustom(String(seconds));
                        updateItem(setPhotoDuration(item, seconds * 1000));
                      }}
                    />
                  ))}
                </View>
                <TextInput
                  accessibilityLabel="Photo duration in seconds"
                  keyboardType="decimal-pad"
                  value={custom}
                  onChangeText={setCustom}
                  style={shared.input}
                />
                <Text style={shared.caption}>Seconds · 0.5–60 per photo</Text>
                <Button
                  label="Apply to this photo"
                  onPress={() => applyDuration(false)}
                />
                <Button
                  label="Apply to all photos"
                  secondary
                  onPress={() => applyDuration(true)}
                />
              </>
            ) : (
              <>
                <Text style={shared.body}>
                  Keep the best part of your clip.
                </Text>
                <Text style={shared.caption}>Start time in seconds</Text>
                <TextInput
                  accessibilityLabel="Trim start seconds"
                  keyboardType="decimal-pad"
                  value={trimStart}
                  onChangeText={setTrimStart}
                  style={shared.input}
                />
                <Text style={shared.caption}>
                  End time in seconds · source{' '}
                  {(item.sourceDurationMs / 1000).toFixed(2)}s
                </Text>
                <TextInput
                  accessibilityLabel="Trim end seconds"
                  keyboardType="decimal-pad"
                  value={trimEnd}
                  onChangeText={setTrimEnd}
                  style={shared.input}
                />
                <Button
                  label="Apply trim"
                  onPress={() => {
                    try {
                      updateItem(
                        setTrim(
                          item,
                          Number(trimStart) * 1000,
                          Number(trimEnd) * 1000,
                        ),
                      );
                    } catch (error) {
                      Alert.alert('Trim', (error as Error).message);
                    }
                  }}
                />
              </>
            ))}
          {tool === 'Frame' && item && (
            <>
              <Text style={shared.label}>CANVAS RATIO</Text>
              <View style={shared.wrap}>
                {(['9:16', '4:5', '1:1', '16:9'] as Ratio[]).map(r => (
                  <Chip
                    key={r}
                    label={r}
                    selected={project.ratio === r}
                    onPress={() => update({ ...project, ratio: r })}
                  />
                ))}
              </View>
              <Text style={shared.label}>THIS MOMENT</Text>
              <View style={shared.wrap}>
                <Chip
                  label="Fit · show everything"
                  selected={item.fit === 'fit'}
                  onPress={() => updateItem({ ...item, fit: 'fit' })}
                />
                <Chip
                  label="Fill · crop to canvas"
                  selected={item.fit === 'fill'}
                  onPress={() => updateItem({ ...item, fit: 'fill' })}
                />
              </View>
              <Text style={shared.caption}>
                Fit preserves the whole image with black space where needed.
                Fill crops the edges to cover your canvas.
              </Text>
            </>
          )}
          {tool === 'Style' && (
            <>
              <Text style={shared.label}>BETWEEN MOMENTS</Text>
              <View style={shared.wrap}>
                <Chip
                  label="Simple cut"
                  selected={project.transition === 'none'}
                  onPress={() => update({ ...project, transition: 'none' })}
                />
                <Chip
                  label="Fade through black"
                  selected={project.transition === 'fade'}
                  onPress={() => update({ ...project, transition: 'fade' })}
                />
              </View>
              {project.transition === 'fade' && (
                <View style={shared.wrap}>
                  {[200, 300, 500].map(ms => (
                    <Chip
                      key={ms}
                      label={`${ms / 1000}s fade`}
                      selected={project.fadeMs === ms}
                      onPress={() => update({ ...project, fadeMs: ms })}
                    />
                  ))}
                </View>
              )}
              <Text style={shared.label}>ORIGINAL STYLE PRESETS</Text>
              {templates.map(template => (
                <Button
                  key={template.id}
                  label={template.name}
                  secondary
                  onPress={() => update(applyTemplate(project, template))}
                />
              ))}
              <Text style={shared.caption}>
                Presets set framing, photo durations, and transitions. They do
                not add the sample card lettering to your story.
              </Text>
            </>
          )}
          {tool === 'Export' && (
            <>
              <Text style={shared.body}>
                {formatTime(total)} of your moments. Ready to share.
              </Text>
              <Text style={shared.label}>RESOLUTION</Text>
              <View style={shared.wrap}>
                {([1080, 720, 480] as const).map(resolution => (
                  <Chip
                    key={resolution}
                    label={`${resolution}p`}
                    selected={project.exportSettings.resolution === resolution}
                    onPress={() =>
                      update({
                        ...project,
                        exportSettings: {
                          ...project.exportSettings,
                          resolution,
                        },
                      })
                    }
                  />
                ))}
              </View>
              <Text style={shared.label}>QUALITY</Text>
              <View style={shared.wrap}>
                {(['high', 'recommended', 'small'] as const).map(quality => (
                  <Chip
                    key={quality}
                    label={
                      {
                        high: 'High',
                        recommended: 'Recommended',
                        small: 'Smaller file',
                      }[quality]
                    }
                    selected={project.exportSettings.quality === quality}
                    onPress={() =>
                      update({
                        ...project,
                        exportSettings: { ...project.exportSettings, quality },
                      })
                    }
                  />
                ))}
              </View>
              <Text style={shared.label}>FRAME RATE</Text>
              <View style={shared.wrap}>
                {([30, 24] as const).map(fps => (
                  <Chip
                    key={fps}
                    label={`${fps} FPS`}
                    selected={project.exportSettings.fps === fps}
                    onPress={() =>
                      update({
                        ...project,
                        exportSettings: { ...project.exportSettings, fps },
                      })
                    }
                  />
                ))}
              </View>
              <Text style={shared.caption}>
                MP4 · {project.ratio} · Processed on this device. Output size is
                capped to source resolution and may adjust to your device’s
                encoder.
              </Text>
              <Button
                label="Create my story  ↗"
                onPress={() => {
                  setTool(null);
                  onExport();
                }}
              />
            </>
          )}
        </Sheet>
      )}
      {full && (
        <Modal
          visible
          onRequestClose={() => {
            setPlaying(false);
            setFull(false);
          }}
        >
          <SafeAreaView style={shared.screen}>
            <View style={styles.fullCanvas}>
              <View
                style={{
                  width: Math.min(width, (height - 160) * ratio),
                  aspectRatio: ratio,
                }}
              >
                {preview}
              </View>
            </View>
            {playback}
          </SafeAreaView>
        </Modal>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  header: { flexDirection: 'row', padding: 16, gap: 10, alignItems: 'center' },
  projectName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: colors.ink,
    textAlign: 'center',
    minWidth: 0,
  },
  content: { paddingVertical: 8, gap: 6 },
  canvasArea: { alignItems: 'center', gap: 12 },
  canvas: {
    backgroundColor: '#000',
    borderRadius: 12,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  canvasLabel: { fontSize: 9, letterSpacing: 1.5, color: colors.muted },
  playback: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 24,
  },
  time: {
    fontSize: 13,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
    color: colors.ink,
  },
  seekTouch: { height: 32, marginHorizontal: 20, justifyContent: 'center' },
  seekTrack: {
    height: 4,
    backgroundColor: '#DDE0D1',
    borderRadius: 2,
    overflow: 'hidden',
  },
  seekFill: { height: 4, backgroundColor: colors.ink },
  timeline: { paddingHorizontal: 20, gap: 10 },
  timelineItem: {
    padding: 3,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: colors.surface,
    gap: 4,
  },
  timelineSelected: { borderColor: colors.ink, backgroundColor: colors.lime },
  timelineThumb: { width: 64, height: 70, borderRadius: 10 },
  timelineLabel: {
    fontSize: 10,
    color: colors.ink,
    textAlign: 'center',
    paddingBottom: 3,
  },
  addMedia: {
    width: 56,
    height: 106,
    borderRadius: 16,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hint: {
    fontSize: 11,
    color: colors.muted,
    textAlign: 'center',
    marginTop: 12,
  },
  toolbar: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingVertical: 14,
  },
  tool: { flex: 1, alignItems: 'center', minHeight: 50, gap: 5 },
  toolGlyph: { fontSize: 25, color: colors.ink },
  toolText: { fontSize: 11, fontWeight: '600', color: colors.ink },
  error: {
    color: colors.danger,
    fontSize: 12,
    padding: 16,
    textAlign: 'center',
  },
  fullCanvas: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
