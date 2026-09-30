import React, { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { colors } from '../theme/theme';
export function MediaThumb({
  uri,
  style,
  video,
}: {
  uri?: string;
  style?: StyleProp<ViewStyle>;
  video?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <View style={[styles.frame, style]}>
      {uri && !failed ? (
        <Image
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <Text style={styles.placeholder}>✧</Text>
      )}
      {video && (
        <View style={styles.badge}>
          <Text style={styles.play}>▶</Text>
        </View>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  frame: {
    backgroundColor: colors.lavender,
    overflow: 'hidden',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: { fontSize: 30, color: colors.ink },
  badge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: '#252721AA',
    borderRadius: 6,
    padding: 4,
  },
  play: { color: 'white', fontSize: 9 },
});
