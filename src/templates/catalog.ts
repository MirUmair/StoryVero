import type { StoryProject } from '../types/story';
export interface StoryTemplate {
  id: string;
  name: string;
  category: 'Minimal' | 'Memories';
  description: string;
  color: string;
  photoDurationMs: number;
  ratio: StoryProject['ratio'];
  transition: StoryProject['transition'];
  fit: 'fit' | 'fill';
}
// Original settings-only templates. Every setting is consumed by the native engine.
export const templates: StoryTemplate[] = [
  {
    id: 'slow-moments',
    name: 'Slow moments',
    category: 'Memories',
    description: 'A little room to remember.',
    color: '#D6DA9B',
    photoDurationMs: 3000,
    ratio: '9:16',
    transition: 'fade',
    fit: 'fill',
  },
  {
    id: 'clean-cut',
    name: 'Clean cut',
    category: 'Minimal',
    description: 'Your moments, full frame.',
    color: '#BFB4F5',
    photoDurationMs: 2000,
    ratio: '9:16',
    transition: 'none',
    fit: 'fit',
  },
];
export function applyTemplate(
  project: StoryProject,
  template: StoryTemplate,
): StoryProject {
  return {
    ...project,
    ratio: template.ratio,
    transition: template.transition,
    media: project.media.map(item => ({
      ...item,
      fit: template.fit,
      durationMs:
        item.kind === 'photo' ? template.photoDurationMs : item.durationMs,
    })),
  };
}
export function parseTemplate(value: unknown): StoryTemplate {
  const t = value as StoryTemplate;
  if (
    !t ||
    typeof t.id !== 'string' ||
    typeof t.name !== 'string' ||
    !['Minimal', 'Memories'].includes(t.category) ||
    !['none', 'fade'].includes(t.transition) ||
    !['fit', 'fill'].includes(t.fit) ||
    !['9:16', '4:5', '1:1', '16:9'].includes(t.ratio) ||
    !Number.isFinite(t.photoDurationMs) ||
    t.photoDurationMs < 500 ||
    t.photoDurationMs > 60000
  ) {
    throw new Error('Invalid template.');
  }
  return t;
}
