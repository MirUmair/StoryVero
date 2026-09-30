import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Button, Chip, EmptyState, Section } from '../components/ui';
import { MediaThumb } from '../components/MediaThumb';
import { colors, shared } from '../theme/theme';
import { formatTime, projectDuration } from '../editor/project';
import { templates } from '../templates/catalog';
import type { StoryTemplate } from '../templates/catalog';
import type { Library, StoryExport, StoryProject } from '../types/story';

interface Props {
  library: Library;
  busy: boolean;
  loading: boolean;
  onCreate: (kind: 'all' | 'photo' | 'video', template?: StoryTemplate) => void;
  onOpen: (project: StoryProject) => void;
  onProjectMenu: (project: StoryProject) => void;
  onExport: (result: StoryExport) => void;
}
export function HomeScreen({
  library,
  busy,
  loading,
  onCreate,
  onOpen,
  onProjectMenu,
  onExport,
}: Props) {
  return (
    <ScrollView
      style={shared.screen}
      contentContainerStyle={shared.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={shared.between}>
        <View style={shared.row}>
          <View style={styles.logo}>
            <View style={styles.logoCut} />
          </View>
          <Text style={styles.brand}>Storyvero</Text>
        </View>
        <View style={styles.offline}>
          <View style={styles.dot} />
          <Text style={styles.offlineText}>ON DEVICE</Text>
        </View>
      </View>
      <Animated.View entering={FadeInDown.duration(350)} style={styles.hero}>
        <View style={styles.heroCopy}>
          <Text style={shared.label}>A LITTLE MOMENT. A WHOLE STORY.</Text>
          <Text style={styles.heroTitle}>
            Turn moments{'\n'}into stories<Text style={styles.period}>.</Text>
          </Text>
          <Text style={styles.heroText}>
            Your photos. Your videos.{'\n'}Something worth sharing.
          </Text>
        </View>
        <View style={styles.art} pointerEvents="none">
          <View style={styles.artBack} />
          <View style={styles.artFront}>
            <View style={styles.artSun} />
            <View style={styles.artHill} />
            <Text style={styles.artText}>the good{'\n'}little things.</Text>
            <Text style={styles.artNumber}>01 / YOUR STORY</Text>
          </View>
          <View style={styles.spark}>
            <Text style={styles.sparkText}>✳</Text>
          </View>
        </View>
        <Button
          label={busy ? 'Opening your moments…' : '+  Create Story'}
          onPress={() => onCreate('all')}
          disabled={busy || loading}
        />
      </Animated.View>
      <View style={styles.quickRow}>
        {(
          [
            {
              kind: 'photo',
              title: 'Photo Story',
              glyph: '▧',
              tint: '#E9E7DA',
            },
            {
              kind: 'video',
              title: 'Video Status',
              glyph: '▷',
              tint: '#E5DFF2',
            },
            { kind: 'all', title: 'Slideshow', glyph: '▱', tint: '#E2EBCF' },
          ] as const
        ).map(action => (
          <Pressable
            key={action.title}
            accessibilityRole="button"
            disabled={busy || loading}
            onPress={() => onCreate(action.kind)}
            style={styles.quick}
          >
            <View style={[styles.quickIcon, { backgroundColor: action.tint }]}>
              <Text style={styles.quickGlyph}>{action.glyph}</Text>
            </View>
            <Text style={styles.quickText}>{action.title}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.section}>
        <Section title="Start with a feeling" detail="Original styles" />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontal}
        >
          {templates.map((template, i) => (
            <Pressable
              key={template.id}
              accessibilityRole="button"
              accessibilityLabel={`Use ${template.name} template`}
              disabled={busy || loading}
              onPress={() => onCreate('all', template)}
              style={styles.template}
            >
              <View
                style={[
                  styles.templateArt,
                  { backgroundColor: template.color },
                ]}
              >
                <Text style={styles.templateEyebrow}>
                  {template.category.toUpperCase()}
                </Text>
                <View
                  style={[styles.templateCircle, i === 1 && styles.square]}
                />
                <Text style={styles.templateTitle}>
                  {i === 0 ? 'stay in\nthe moment.' : 'less,\nbut better.'}
                </Text>
                <View style={styles.templateBottom}>
                  <Text style={styles.templateSmall}>STORYVERO</Text>
                  <Text style={styles.templateArrow}>↗</Text>
                </View>
              </View>
              <Text style={styles.cardTitle}>{template.name}</Text>
              <Text style={shared.caption}>
                {template.photoDurationMs / 1000}s per photo ·{' '}
                {template.transition === 'fade' ? 'soft fade' : 'simple cuts'}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
      <View style={styles.section}>
        <Section
          title="Your projects"
          detail={`${library.projects.length} saved`}
        />
        {loading ? (
          <ActivityIndicator color={colors.ink} />
        ) : library.projects.length === 0 ? (
          <EmptyState
            title="Your next story starts here"
            text="Pick a few moments. We’ll keep your edits saved as you go."
          />
        ) : (
          library.projects
            .slice()
            .sort((a, b) => b.updatedAt - a.updatedAt)
            .map(project => (
              <View key={project.id} style={styles.projectRow}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Continue ${project.name}`}
                  onPress={() => onOpen(project)}
                  style={styles.projectMain}
                >
                  <MediaThumb
                    uri={project.media[0]?.thumbnail}
                    style={styles.projectThumb}
                  />
                  <View style={styles.projectCopy}>
                    <Text numberOfLines={1} style={styles.cardTitle}>
                      {project.name}
                    </Text>
                    <Text style={shared.caption}>
                      {formatTime(projectDuration(project))} ·{' '}
                      {project.media.length} moments
                    </Text>
                    <Text style={shared.caption}>
                      Edited {new Date(project.updatedAt).toLocaleDateString()}
                    </Text>
                  </View>
                </Pressable>
                <Chip label="···" onPress={() => onProjectMenu(project)} />
              </View>
            ))
        )}
      </View>
      <View style={styles.section}>
        <Section title="Recent exports" detail="Ready to share" />
        {library.exports.length === 0 ? (
          <View style={styles.exportEmpty}>
            <Text style={shared.caption}>
              Finished stories will appear here.
            </Text>
          </View>
        ) : (
          library.exports
            .slice()
            .reverse()
            .map(result => (
              <Pressable
                key={result.id}
                onPress={() => onExport(result)}
                style={styles.projectRow}
                accessibilityRole="button"
              >
                <MediaThumb
                  uri={result.thumbnail}
                  video
                  style={styles.projectThumb}
                />
                <View style={styles.projectCopy}>
                  <Text numberOfLines={1} style={styles.cardTitle}>
                    {result.filename}
                  </Text>
                  <Text style={shared.caption}>
                    {formatTime(result.durationMs)} · {result.width} ×{' '}
                    {result.height}
                  </Text>
                  <Text style={shared.caption}>
                    {(result.sizeBytes / 1048576).toFixed(1)} MB ·{' '}
                    {new Date(result.createdAt).toLocaleDateString()}
                  </Text>
                </View>
                <Text style={styles.templateArrow}>↗</Text>
              </Pressable>
            ))
        )}
      </View>
      <View style={styles.privacy}>
        <Text style={styles.privacyIcon}>◈</Text>
        <Text style={styles.privacyText}>
          Your stories are created and processed{'\n'}on your device.
        </Text>
      </View>
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  logo: {
    width: 28,
    height: 32,
    backgroundColor: colors.ink,
    borderRadius: 9,
    transform: [{ rotate: '-9deg' }],
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoCut: {
    width: 10,
    height: 18,
    borderWidth: 2,
    borderColor: colors.lime,
    borderRadius: 4,
  },
  brand: {
    fontSize: 25,
    fontWeight: '800',
    color: colors.ink,
    letterSpacing: -1,
  },
  offline: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { height: 5, width: 5, borderRadius: 3, backgroundColor: '#718650' },
  offlineText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.muted,
    letterSpacing: 1,
  },
  hero: { gap: 20, paddingTop: 20 },
  heroCopy: { gap: 13 },
  heroTitle: {
    fontSize: 43,
    lineHeight: 47,
    letterSpacing: -2,
    fontWeight: '700',
    color: colors.ink,
  },
  period: { color: '#829C41' },
  heroText: { fontSize: 15, lineHeight: 22, color: colors.muted },
  art: {
    height: 210,
    backgroundColor: '#EDEEE6',
    borderRadius: 28,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  artBack: {
    position: 'absolute',
    backgroundColor: colors.lavender,
    width: 140,
    height: 200,
    borderRadius: 12,
    transform: [{ rotate: '-16deg' }, { translateX: -52 }, { translateY: 22 }],
    borderWidth: 5,
    borderColor: '#F9F8F4',
  },
  artFront: {
    backgroundColor: '#CBD099',
    width: 145,
    height: 212,
    borderRadius: 12,
    transform: [{ rotate: '10deg' }, { translateX: 31 }, { translateY: 18 }],
    overflow: 'hidden',
    padding: 17,
    borderWidth: 5,
    borderColor: '#F9F8F4',
  },
  artSun: {
    position: 'absolute',
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: '#F4F0CB',
    top: 20,
    right: -20,
  },
  artHill: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: '#A5AF7C',
    top: 130,
    left: -90,
  },
  artText: {
    color: '#3C4430',
    fontSize: 24,
    lineHeight: 25,
    fontWeight: '700',
    letterSpacing: -1,
    marginTop: 68,
  },
  artNumber: {
    fontSize: 6,
    letterSpacing: 1.2,
    color: '#3C4430',
    marginTop: 14,
  },
  spark: { position: 'absolute', right: 34, top: 25 },
  sparkText: { fontSize: 42, color: '#515847' },
  quickRow: { flexDirection: 'row', justifyContent: 'space-around' },
  quick: { alignItems: 'center', gap: 10, flex: 1 },
  quickIcon: {
    width: 56,
    height: 56,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickGlyph: { fontSize: 30, color: colors.ink },
  quickText: { fontSize: 12, fontWeight: '600', color: colors.ink },
  section: { gap: 16 },
  horizontal: { gap: 14 },
  template: { width: 190, gap: 5 },
  templateArt: {
    height: 232,
    padding: 19,
    borderRadius: 22,
    overflow: 'hidden',
    marginBottom: 6,
  },
  templateEyebrow: {
    fontSize: 8,
    letterSpacing: 2,
    fontWeight: '700',
    color: '#444B34',
  },
  templateCircle: {
    position: 'absolute',
    width: 165,
    height: 165,
    borderRadius: 90,
    borderColor: '#FFFFFF80',
    borderWidth: 1,
    top: 12,
    right: -62,
  },
  square: { borderRadius: 10, transform: [{ rotate: '25deg' }], top: 50 },
  templateTitle: {
    fontSize: 29,
    fontWeight: '600',
    letterSpacing: -1,
    lineHeight: 31,
    color: '#343B2B',
    marginTop: 62,
  },
  templateBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 'auto',
  },
  templateSmall: { fontSize: 6, letterSpacing: 1.5, color: '#444B34' },
  templateArrow: { fontSize: 24, color: colors.ink },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.ink },
  projectRow: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  projectMain: { flex: 1, flexDirection: 'row', gap: 12, alignItems: 'center' },
  projectThumb: { width: 54, height: 76 },
  projectCopy: { flex: 1, gap: 3 },
  exportEmpty: {
    padding: 22,
    borderRadius: 18,
    backgroundColor: colors.surface,
  },
  privacy: { alignItems: 'center', gap: 8, marginTop: 8 },
  privacyIcon: { fontSize: 21, color: colors.muted },
  privacyText: {
    fontSize: 12,
    color: colors.muted,
    lineHeight: 18,
    textAlign: 'center',
  },
});
