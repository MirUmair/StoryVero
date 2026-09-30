export type Ratio = '9:16' | '4:5' | '1:1' | '16:9';
export type Transition = 'none' | 'fade';
export interface MediaItem {
  id: string;
  uri: string;
  thumbnail: string;
  name: string;
  kind: 'photo' | 'video';
  width: number;
  height: number;
  sourceDurationMs: number;
  durationMs: number;
  trimStartMs: number;
  trimEndMs: number;
  muted: boolean;
  fit: 'fit' | 'fill';
}
export interface TextLayer {
  id: string;
  text: string;
  x: number;
  y: number;
  size: number;
  color: string;
  startMs: number;
  endMs: number;
}
export interface StoryProject {
  version: 1;
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  ratio: Ratio;
  media: MediaItem[];
  transition: Transition;
  fadeMs: number;
  textLayers: TextLayer[];
  exportSettings: {
    resolution: 480 | 720 | 1080;
    fps: 24 | 30;
    quality: 'high' | 'recommended' | 'small';
  };
}
export interface StoryExport {
  id: string;
  projectId: string;
  uri: string;
  thumbnail: string;
  filename: string;
  createdAt: number;
  durationMs: number;
  width: number;
  height: number;
  sizeBytes: number;
}
export interface Library {
  version: 1;
  projects: StoryProject[];
  exports: StoryExport[];
}
export type ExportState =
  | { status: 'idle' }
  | { status: 'processing'; progress: number | null }
  | { status: 'complete'; result: StoryExport }
  | { status: 'cancelled' }
  | { status: 'failed'; message: string };
