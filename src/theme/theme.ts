import { StyleSheet } from 'react-native';
export const colors = {
  paper: '#F7F6F2',
  ink: '#252721',
  muted: '#777A70',
  line: '#E6E7DE',
  lime: '#D9EE88',
  lavender: '#D9D0F4',
  white: '#FFFFFF',
  surface: '#EEEEE7',
  danger: '#A33E42',
};
export const shared = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  content: { padding: 24, paddingBottom: 40, gap: 24 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  between: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.8,
    color: colors.ink,
  },
  heading: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.4,
    color: colors.ink,
  },
  body: { fontSize: 15, lineHeight: 22, color: colors.ink },
  caption: { fontSize: 12, lineHeight: 18, color: colors.muted },
  label: {
    fontSize: 11,
    letterSpacing: 1.7,
    fontWeight: '700',
    color: colors.muted,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    fontSize: 16,
    color: colors.ink,
    minHeight: 50,
  },
  card: {
    backgroundColor: colors.white,
    padding: 20,
    borderRadius: 24,
    gap: 12,
  },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
