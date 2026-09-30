import type {
  Library,
  MediaItem,
  Ratio,
  StoryProject,
  TextLayer,
} from '../types/story';

export const makeId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
export const emptyLibrary = (): Library => ({
  version: 1,
  projects: [],
  exports: [],
});
export function createProject(
  media: MediaItem[],
  name = 'My Story',
): StoryProject {
  const now = Date.now();
  return {
    version: 1,
    id: makeId(),
    name,
    createdAt: now,
    updatedAt: now,
    ratio: '9:16',
    media,
    transition: 'fade',
    fadeMs: 300,
    textLayers: [],
    exportSettings: { resolution: 1080, fps: 30, quality: 'recommended' },
  };
}
export function mediaDuration(item: MediaItem): number {
  return item.kind === 'photo'
    ? item.durationMs
    : Math.max(0, item.trimEndMs - item.trimStartMs);
}
export const projectDuration = (project: Pick<StoryProject, 'media'>) =>
  project.media.reduce((total, item) => total + mediaDuration(item), 0);
export function moveMedia<T>(items: T[], from: number, to: number): T[] {
  if (from < 0 || to < 0 || from >= items.length || to >= items.length) {
    return items;
  }
  const result = [...items];
  result.splice(to, 0, result.splice(from, 1)[0]);
  return result;
}
export function setPhotoDuration(item: MediaItem, ms: number): MediaItem {
  if (!Number.isFinite(ms) || ms < 500 || ms > 60000) {
    throw new Error('Choose a photo duration between 0.5 and 60 seconds.');
  }
  return item.kind === 'photo' ? { ...item, durationMs: Math.round(ms) } : item;
}
export function setTrim(
  item: MediaItem,
  start: number,
  end: number,
): MediaItem {
  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    start < 0 ||
    end > item.sourceDurationMs ||
    end - start < 250
  ) {
    throw new Error('Choose a valid trim range of at least 0.25 seconds.');
  }
  return {
    ...item,
    trimStartMs: Math.round(start),
    trimEndMs: Math.round(end),
  };
}
export function ratioValue(ratio: Ratio): number {
  const [w, h] = ratio.split(':').map(Number);
  return w / h;
}
export function canvasSize(
  ratio: Ratio,
  shortSide: number,
): { width: number; height: number } {
  const r = ratioValue(ratio);
  const even = (n: number) => Math.max(2, Math.round(n / 2) * 2);
  return r <= 1
    ? { width: even(shortSide), height: even(shortSide / r) }
    : { width: even(shortSide * r), height: even(shortSide) };
}
export function splitSegments(durationMs: number, segmentMs: number) {
  if (
    !Number.isFinite(durationMs) ||
    !Number.isFinite(segmentMs) ||
    durationMs <= 0 ||
    segmentMs < 1000
  ) {
    throw new Error('Invalid split duration.');
  }
  return Array.from({ length: Math.ceil(durationMs / segmentMs) }, (_, i) => ({
    startMs: i * segmentMs,
    endMs: Math.min((i + 1) * segmentMs, durationMs),
  }));
}
export const layerVisible = (layer: TextLayer, timeMs: number) =>
  timeMs >= layer.startMs && timeMs < layer.endMs;
export const exportFilename = (id: string, part?: number) =>
  `Storyvero_${id.replace(/[^a-zA-Z0-9_-]/g, '')}${
    part === undefined ? '' : `_Part_${String(part + 1).padStart(2, '0')}`
  }.mp4`;
export function formatTime(ms: number) {
  const seconds = Math.floor(ms / 1000);
  return `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
}
const finite = (n: unknown): n is number =>
  typeof n === 'number' && Number.isFinite(n);
export function validateProject(value: unknown): value is StoryProject {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const p = value as StoryProject;
  return (
    p.version === 1 &&
    typeof p.id === 'string' &&
    typeof p.name === 'string' &&
    finite(p.createdAt) &&
    finite(p.updatedAt) &&
    ['9:16', '4:5', '1:1', '16:9'].includes(p.ratio) &&
    ['none', 'fade'].includes(p.transition) &&
    finite(p.fadeMs) &&
    p.fadeMs >= 0 &&
    p.fadeMs <= 1000 &&
    Array.isArray(p.media) &&
    p.media.length <= 100 &&
    p.media.every(
      m =>
        !!m &&
        typeof m.id === 'string' &&
        /^(content|file):\/\//.test(m.uri) &&
        typeof m.name === 'string' &&
        typeof m.thumbnail === 'string' &&
        ['photo', 'video'].includes(m.kind) &&
        ['fit', 'fill'].includes(m.fit) &&
        typeof m.muted === 'boolean' &&
        finite(m.width) &&
        m.width > 0 &&
        finite(m.height) &&
        m.height > 0 &&
        finite(m.sourceDurationMs) &&
        (m.kind === 'photo'
          ? finite(m.durationMs) && m.durationMs >= 500 && m.durationMs <= 60000
          : finite(m.trimStartMs) &&
            finite(m.trimEndMs) &&
            m.trimStartMs >= 0 &&
            m.trimEndMs <= m.sourceDurationMs &&
            m.trimEndMs - m.trimStartMs >= 250),
    ) &&
    Array.isArray(p.textLayers) &&
    p.textLayers.every(
      l =>
        !!l &&
        typeof l.id === 'string' &&
        typeof l.text === 'string' &&
        finite(l.startMs) &&
        finite(l.endMs) &&
        l.endMs > l.startMs,
    ) &&
    !!p.exportSettings &&
    [480, 720, 1080].includes(p.exportSettings.resolution) &&
    [24, 30].includes(p.exportSettings.fps) &&
    ['high', 'recommended', 'small'].includes(p.exportSettings.quality)
  );
}
export function parseLibrary(raw: string | null): Library {
  if (!raw) {
    return emptyLibrary();
  }
  let value: Library;
  try {
    value = JSON.parse(raw) as Library;
  } catch {
    throw new Error(
      'Saved projects could not be read. Your saved file has been preserved.',
    );
  }
  if (
    !value ||
    value.version !== 1 ||
    !Array.isArray(value.projects) ||
    !value.projects.every(validateProject) ||
    !Array.isArray(value.exports) ||
    !value.exports.every(
      e =>
        !!e &&
        typeof e.id === 'string' &&
        typeof e.projectId === 'string' &&
        typeof e.filename === 'string' &&
        typeof e.thumbnail === 'string' &&
        typeof e.uri === 'string' &&
        e.uri.startsWith('file://') &&
        [e.durationMs, e.width, e.height, e.sizeBytes, e.createdAt].every(
          finite,
        ),
    )
  ) {
    throw new Error(
      'Saved projects could not be read. Your saved file has been preserved.',
    );
  }
  return value;
}
