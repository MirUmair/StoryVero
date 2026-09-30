import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Button, Chip } from '../components/ui';
import { MediaThumb } from '../components/MediaThumb';
import { colors, shared } from '../theme/theme';
import {
  formatTime,
  mediaDuration,
  moveMedia,
  projectDuration,
} from '../editor/project';
import type { StoryProject } from '../types/story';
export function ArrangeScreen({
  project,
  onChange,
  onBack,
  onAdd,
  onContinue,
  busy,
}: {
  project: StoryProject;
  onChange: (project: StoryProject) => void;
  onBack: () => void;
  onAdd: () => void;
  onContinue: () => void;
  busy: boolean;
}) {
  return (
    <View style={shared.screen}>
      <View style={styles.header}>
        <Chip label="‹ Back" onPress={onBack} />
        <Text style={shared.heading}>Your moments</Text>
        <Text style={shared.caption}>{project.media.length} selected</Text>
      </View>
      <FlatList
        data={project.media}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.intro}>
            <Text style={shared.title}>A story in the making.</Text>
            <Text style={shared.body}>
              Put your moments in order. You can fine-tune each one in the
              editor.
            </Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <View style={styles.item}>
            <MediaThumb
              uri={item.thumbnail}
              video={item.kind === 'video'}
              style={styles.thumb}
            />
            <View style={styles.copy}>
              <Text style={shared.label}>
                MOMENT {String(index + 1).padStart(2, '0')}
              </Text>
              <Text numberOfLines={1} style={styles.name}>
                {item.name}
              </Text>
              <Text style={shared.caption}>
                {item.kind === 'photo' ? 'Photo' : 'Video'} ·{' '}
                {formatTime(mediaDuration(item))}
              </Text>
              <View style={shared.wrap}>
                <Chip
                  label="↑"
                  disabled={index === 0}
                  onPress={() =>
                    onChange({
                      ...project,
                      media: moveMedia(project.media, index, index - 1),
                    })
                  }
                />
                <Chip
                  label="↓"
                  disabled={index === project.media.length - 1}
                  onPress={() =>
                    onChange({
                      ...project,
                      media: moveMedia(project.media, index, index + 1),
                    })
                  }
                />
                <Chip
                  label="Remove"
                  onPress={() =>
                    onChange({
                      ...project,
                      media: project.media.filter(m => m.id !== item.id),
                    })
                  }
                />
              </View>
            </View>
          </View>
        )}
        ListFooterComponent={
          <Button
            label={busy ? 'Opening picker…' : '+ Add more moments'}
            secondary
            onPress={onAdd}
            disabled={busy}
          />
        }
      />
      <View style={styles.footer}>
        <View style={shared.between}>
          <Text style={shared.caption}>9:16 story · saved on your device</Text>
          <Text style={styles.name}>
            {formatTime(projectDuration(project))}
          </Text>
        </View>
        <Button
          label="Open editor  →"
          disabled={project.media.length === 0 || busy}
          onPress={onContinue}
        />
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  header: {
    padding: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  list: { padding: 22, gap: 14 },
  intro: { gap: 10, paddingBottom: 14 },
  item: {
    backgroundColor: colors.white,
    borderRadius: 22,
    padding: 12,
    flexDirection: 'row',
    gap: 14,
  },
  thumb: { width: 90, height: 136 },
  copy: { flex: 1, gap: 6 },
  name: { fontSize: 14, fontWeight: '700', color: colors.ink },
  footer: { padding: 20, gap: 14, backgroundColor: colors.paper },
});
