import { NativeEventEmitter, NativeModules, Platform } from 'react-native';
import type { MediaItem, StoryExport, StoryProject } from '../types/story';

interface NativeEngine {
  pickMedia(kind: 'all' | 'photo' | 'video'): Promise<MediaItem[]>;
  loadLibrary(): Promise<string | null>;
  saveLibrary(json: string): Promise<void>;
  exportStory(json: string): Promise<StoryExport>;
  cancelExport(): Promise<void>;
  shareExport(uri: string): Promise<void>;
  playExport(uri: string): Promise<void>;
  saveExport(uri: string, filename: string): Promise<boolean>;
  deleteExport(uri: string): Promise<void>;
  addListener(name: string): void;
  removeListeners(count: number): void;
}
const native: NativeEngine | undefined = NativeModules.StoryMedia;
export const engineAvailable = Platform.OS === 'android' && !!native;
export function engine(): NativeEngine {
  if (!native || !engineAvailable) {
    throw new Error('Story creation is currently available on Android.');
  }
  return native;
}
export const exportStory = (project: StoryProject) =>
  engine().exportStory(JSON.stringify(project));
export function listenToExport(
  listener: (event: { progress: number | null }) => void,
) {
  if (!native) {
    return () => {};
  }
  const subscription = new NativeEventEmitter(native).addListener(
    'StoryExportProgress',
    event => listener(event as { progress: number | null }),
  );
  return () => subscription.remove();
}
export function errorMessage(error: unknown) {
  const code = (error as { code?: string })?.code;
  const messages: Record<string, string> = {
    E_MEDIA:
      'This media could not be opened. It may be missing, damaged, or stored only in the cloud. Choose a local photo or video.',
    E_EXPORT:
      'Your story could not be exported. Try 720p or a shorter selection. Your project is saved.',
    E_STORAGE: 'There is not enough free space. Free up storage and try again.',
    E_MISSING: 'This file is no longer available on your device.',
    E_BUSY: 'Another operation is still running. Please try again shortly.',
    E_SHARE: 'No compatible app is available to open this file.',
    E_SAVE: 'The file could not be saved. Check storage and try again.',
  };
  return code && messages[code]
    ? messages[code]
    : error instanceof Error
    ? error.message
    : 'Something went wrong. Please try again.';
}
