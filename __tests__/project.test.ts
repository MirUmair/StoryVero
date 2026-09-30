import {
  canvasSize,
  createProject,
  emptyLibrary,
  exportFilename,
  layerVisible,
  mediaDuration,
  moveMedia,
  parseLibrary,
  projectDuration,
  setPhotoDuration,
  setTrim,
  splitSegments,
  validateProject,
} from '../src/editor/project';
import {
  applyTemplate,
  parseTemplate,
  templates,
} from '../src/templates/catalog';
import type { MediaItem } from '../src/types/story';
const photo: MediaItem = {
  id: 'photo',
  uri: 'content://media/1',
  thumbnail: 'content://media/1',
  name: 'Moment',
  kind: 'photo',
  width: 1080,
  height: 1920,
  sourceDurationMs: 0,
  durationMs: 3000,
  trimStartMs: 0,
  trimEndMs: 0,
  fit: 'fit',
  muted: false,
};
const video: MediaItem = {
  ...photo,
  id: 'video',
  kind: 'video',
  sourceDurationMs: 10000,
  trimStartMs: 1500,
  trimEndMs: 6500,
};
test('mixed project duration follows photo time and trimmed video', () => {
  expect(projectDuration(createProject([photo, video]))).toBe(8000);
  expect(mediaDuration(setPhotoDuration(photo, 2000))).toBe(2000);
  expect(setPhotoDuration(video, 2000)).toBe(video);
  expect(() => setPhotoDuration(photo, NaN)).toThrow();
  expect(() => setPhotoDuration(photo, 0)).toThrow();
  expect(() => setPhotoDuration(photo, 60001)).toThrow();
});
test('ordering moves an item without mutating or losing entries', () => {
  const source = ['a', 'b', 'c'];
  expect(moveMedia(source, 0, 2)).toEqual(['b', 'c', 'a']);
  expect(source).toEqual(['a', 'b', 'c']);
  expect(moveMedia(source, -1, 2)).toBe(source);
  expect(moveMedia(source, 1, 3)).toBe(source);
});
test('trim rejects inverted, short, nonfinite and out of source ranges', () => {
  expect(mediaDuration(setTrim(video, 1000, 8000))).toBe(7000);
  for (const [start, end] of [
    [-1, 3000],
    [0, 11000],
    [2000, 1000],
    [0, 200],
    [NaN, 1000],
  ]) {
    expect(() => setTrim(video, start, end)).toThrow();
  }
});
test('split planning covers every millisecond exactly once in order', () => {
  expect(splitSegments(65000, 30000)).toEqual([
    { startMs: 0, endMs: 30000 },
    { startMs: 30000, endMs: 60000 },
    { startMs: 60000, endMs: 65000 },
  ]);
  expect(splitSegments(60000, 30000)).toHaveLength(2);
  expect(() => splitSegments(1000, 0)).toThrow();
});
test('canvas dimensions preserve ratio and have even encoded dimensions', () => {
  expect(canvasSize('9:16', 1080)).toEqual({ width: 1080, height: 1920 });
  expect(canvasSize('16:9', 720)).toEqual({ width: 1280, height: 720 });
  expect(canvasSize('4:5', 480)).toEqual({ width: 480, height: 600 });
  expect(canvasSize('1:1', 721)).toEqual({ width: 722, height: 722 });
});
test('template data is validated and applies only its documented settings', () => {
  const project = createProject([photo, video]);
  expect(parseTemplate(templates[0])).toEqual(templates[0]);
  const result = applyTemplate(project, templates[1]);
  expect(result.media[0].durationMs).toBe(2000);
  expect(result.media[1].trimStartMs).toBe(1500);
  expect(project.media[0].durationMs).toBe(3000);
  expect(() =>
    parseTemplate({ ...templates[0], transition: 'fake' }),
  ).toThrow();
});
test('project serialization round trips and corrupt data is rejected', () => {
  const library = {
    ...emptyLibrary(),
    projects: [createProject([photo, video])],
  };
  expect(parseLibrary(JSON.stringify(library))).toEqual(library);
  expect(parseLibrary(null)).toEqual(emptyLibrary());
  expect(() => parseLibrary('{')).toThrow();
  expect(() =>
    parseLibrary(JSON.stringify({ ...library, version: 10 })),
  ).toThrow();
  expect(
    validateProject({
      ...library.projects[0],
      media: [{ ...photo, uri: 'https://cloud/media' }],
    }),
  ).toBe(false);
  expect(
    validateProject({
      ...library.projects[0],
      exportSettings: { resolution: -1 },
    }),
  ).toBe(false);
});
test('text timing uses an exclusive end and filenames are safe and ordered', () => {
  const layer = {
    id: 't',
    text: 'Hi',
    x: 0,
    y: 0,
    size: 30,
    color: '#FFFFFF',
    startMs: 1000,
    endMs: 3000,
  };
  expect(layerVisible(layer, 999)).toBe(false);
  expect(layerVisible(layer, 1000)).toBe(true);
  expect(layerVisible(layer, 3000)).toBe(false);
  expect(exportFilename('../my story', 0)).toBe(
    'Storyvero_mystory_Part_01.mp4',
  );
  expect(exportFilename('id', 9)).toBe('Storyvero_id_Part_10.mp4');
});
