import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Alert,
  AppState,
  BackHandler,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HomeScreen } from '../screens/HomeScreen';
import { ArrangeScreen } from '../screens/ArrangeScreen';
import { EditorScreen } from '../screens/EditorScreen';
import { ExportScreen, ResultScreen } from '../screens/ExportScreen';
import { Button, Sheet } from '../components/ui';
import {
  createProject,
  emptyLibrary,
  makeId,
  parseLibrary,
} from '../editor/project';
import {
  engine,
  engineAvailable,
  errorMessage,
  exportStory,
  listenToExport,
} from '../media/engine';
import { Autosave } from '../storage/autosave';
import { applyTemplate } from '../templates/catalog';
import type { StoryTemplate } from '../templates/catalog';
import type {
  ExportState,
  Library,
  StoryExport,
  StoryProject,
} from '../types/story';
import { colors, shared } from '../theme/theme';

type Route =
  | { name: 'home' }
  | { name: 'arrange' | 'editor' | 'export'; projectId: string }
  | { name: 'result'; result: StoryExport };
export function StoryveroApp() {
  const [library, setLibrary] = useState<Library>(emptyLibrary);
  const libraryRef = useRef(library);
  const writable = useRef(false);
  const exporting = useRef(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [route, setRoute] = useState<Route>({ name: 'home' });
  const [exportState, setExportState] = useState<ExportState>({
    status: 'idle',
  });
  const [menuProject, setMenuProject] = useState<StoryProject | null>(null);
  const [rename, setRename] = useState('');
  const save = useMemo(
    () =>
      new Autosave<Library>(
        value => engine().saveLibrary(JSON.stringify(value)),
        error => setSaveError(errorMessage(error)),
      ),
    [],
  );
  useEffect(() => {
    let alive = true;
    if (!engineAvailable) {
      setLoading(false);
      return;
    }
    engine()
      .loadLibrary()
      .then(raw => {
        const restored = parseLibrary(raw);
        if (alive) {
          libraryRef.current = restored;
          setLibrary(restored);
          writable.current = true;
        }
      })
      .catch(error => {
        if (alive) {
          setSaveError(errorMessage(error));
        }
      })
      .finally(() => {
        if (alive) {
          setLoading(false);
        }
      });
    return () => {
      alive = false;
      void save.flush().catch(() => {});
    };
  }, [save]);
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state !== 'active') {
        void save.flush().catch(error => setSaveError(errorMessage(error)));
      }
    });
    return () => sub.remove();
  }, [save]);
  useEffect(
    () =>
      listenToExport(event =>
        setExportState(previous =>
          previous.status === 'processing'
            ? { status: 'processing', progress: event.progress }
            : previous,
        ),
      ),
    [],
  );
  const changeLibrary = useCallback(
    (update: (value: Library) => Library) => {
      const next = update(libraryRef.current);
      libraryRef.current = next;
      setLibrary(next);
      if (writable.current) {
        save.schedule(next);
      }
    },
    [save],
  );
  function updateProject(project: StoryProject) {
    const next = { ...project, updatedAt: Date.now() };
    changeLibrary(value => ({
      ...value,
      projects: value.projects.map(p => (p.id === next.id ? next : p)),
    }));
  }
  async function flush() {
    try {
      await save.flush();
      setSaveError('');
      return true;
    } catch (error) {
      setSaveError(errorMessage(error));
      return false;
    }
  }
  async function create(
    kind: 'all' | 'photo' | 'video',
    template?: StoryTemplate,
  ) {
    if (busy) {
      return;
    }
    if (!engineAvailable) {
      Alert.alert(
        'Android first',
        'Story creation and export are currently available on Android.',
      );
      return;
    }
    if (!writable.current) {
      Alert.alert(
        'Saved projects need attention',
        'Restart the app to retry loading your saved projects. The saved file has been preserved.',
      );
      return;
    }
    setBusy(true);
    try {
      const media = await engine().pickMedia(kind);
      if (!media.length) {
        return;
      }
      let next = createProject(media);
      if (template) {
        next = applyTemplate(next, template);
      }
      const project = next;
      changeLibrary(value => ({
        ...value,
        projects: [...value.projects, project],
      }));
      await flush();
      setRoute({ name: 'arrange', projectId: project.id });
    } catch (error) {
      Alert.alert('Could not add moments', errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  const project =
    'projectId' in route
      ? library.projects.find(p => p.id === route.projectId)
      : undefined;
  async function addMedia() {
    if (!project || busy) {
      return;
    }
    const id = project.id;
    setBusy(true);
    try {
      const media = await engine().pickMedia('all');
      const current = libraryRef.current.projects.find(p => p.id === id);
      if (current && media.length) {
        if (current.media.length + media.length > 100) {
          Alert.alert(
            'A little too many moments',
            'Keep each story to 100 moments or fewer.',
          );
          return;
        }
        updateProject({ ...current, media: [...current.media, ...media] });
      }
    } catch (error) {
      Alert.alert('Could not add moments', errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  async function startExport() {
    if (!project || exporting.current) {
      return;
    }
    exporting.current = true;
    if (!(await flush())) {
      exporting.current = false;
      return;
    }
    setExportState({ status: 'processing', progress: null });
    setRoute({ name: 'export', projectId: project.id });
    try {
      const result = await exportStory(project);
      changeLibrary(value => ({
        ...value,
        exports: [...value.exports, result],
      }));
      await flush();
      setExportState({ status: 'complete', result });
      setRoute({ name: 'result', result });
    } catch (error) {
      setExportState(
        (error as { code?: string }).code === 'E_CANCELLED'
          ? { status: 'cancelled' }
          : { status: 'failed', message: errorMessage(error) },
      );
    } finally {
      exporting.current = false;
    }
  }
  async function cancelExport() {
    try {
      await engine().cancelExport();
    } catch (error) {
      Alert.alert('Export', errorMessage(error));
    }
  }
  function goHome() {
    void flush();
    setRoute({ name: 'home' });
  }
  useEffect(() => {
    const listener = BackHandler.addEventListener('hardwareBackPress', () => {
      if (route.name === 'home') {
        void save.flush().catch(error => setSaveError(errorMessage(error)));
        return false;
      }
      if (route.name === 'export' && exportState.status === 'processing') {
        void engine().cancelExport();
        return true;
      }
      setRoute({ name: 'home' });
      void save.flush().catch(error => setSaveError(errorMessage(error)));
      return true;
    });
    return () => listener.remove();
  }, [route, exportState.status, save]);
  async function fileAction(action: () => Promise<unknown>) {
    try {
      await action();
    } catch (error) {
      Alert.alert('Your story', errorMessage(error));
    }
  }
  const result = route.name === 'result' ? route.result : undefined;
  return (
    <SafeAreaView style={shared.screen} edges={['top', 'bottom']}>
      {!!saveError && (
        <View style={styles.saveError}>
          <Text style={styles.saveErrorText}>{saveError}</Text>
          <Button
            label="Retry save"
            secondary
            onPress={() => {
              void flush();
            }}
            disabled={!writable.current}
          />
        </View>
      )}
      {route.name === 'home' && (
        <HomeScreen
          library={library}
          busy={busy}
          loading={loading}
          onCreate={create}
          onOpen={p => setRoute({ name: 'editor', projectId: p.id })}
          onProjectMenu={p => {
            setMenuProject(p);
            setRename(p.name);
          }}
          onExport={r => setRoute({ name: 'result', result: r })}
        />
      )}
      {route.name === 'arrange' && project && (
        <ArrangeScreen
          project={project}
          onChange={updateProject}
          onBack={goHome}
          onAdd={addMedia}
          onContinue={() => setRoute({ name: 'editor', projectId: project.id })}
          busy={busy}
        />
      )}
      {route.name === 'editor' && project && (
        <EditorScreen
          project={project}
          onChange={updateProject}
          onBack={goHome}
          onAdd={addMedia}
          onExport={startExport}
          busy={busy}
        />
      )}
      {route.name === 'export' && project && (
        <ExportScreen
          state={exportState}
          onCancel={cancelExport}
          onBack={() => setRoute({ name: 'editor', projectId: project.id })}
          onRetry={startExport}
        />
      )}
      {result && (
        <ResultScreen
          result={result}
          onPlay={() => {
            void fileAction(() => engine().playExport(result.uri));
          }}
          onShare={() => {
            void fileAction(() => engine().shareExport(result.uri));
          }}
          onSave={() => {
            void fileAction(async () => {
              if (await engine().saveExport(result.uri, result.filename)) {
                Alert.alert(
                  'Saved',
                  'Your story was saved to the location you chose.',
                );
              }
            });
          }}
          onEdit={() => {
            const p = library.projects.find(
              entry => entry.id === result.projectId,
            );
            if (p) {
              setRoute({ name: 'editor', projectId: p.id });
            } else {
              Alert.alert(
                'Project unavailable',
                'The original project has been deleted. Your exported video is still here.',
              );
            }
          }}
          onHome={goHome}
          onDelete={() =>
            Alert.alert(
              'Delete this export?',
              'This removes the exported file from Storyvero. Your project and original media are kept.',
              [
                { text: 'Keep', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: () => {
                    void fileAction(async () => {
                      await engine().deleteExport(result.uri);
                      changeLibrary(value => ({
                        ...value,
                        exports: value.exports.filter(e => e.id !== result.id),
                      }));
                      goHome();
                    });
                  },
                },
              ],
            )
          }
        />
      )}
      {menuProject && (
        <Sheet title="Your project" onClose={() => setMenuProject(null)}>
          <TextInput
            accessibilityLabel="Rename project"
            value={rename}
            onChangeText={setRename}
            maxLength={60}
            style={shared.input}
          />
          <Button
            label="Save name"
            onPress={() => {
              updateProject({
                ...menuProject,
                name: rename.trim() || 'My Story',
              });
              setMenuProject(null);
            }}
          />
          <Button
            label="Duplicate project"
            secondary
            onPress={() => {
              const copy = {
                ...menuProject,
                id: makeId(),
                name: `${menuProject.name} copy`,
                createdAt: Date.now(),
                updatedAt: Date.now(),
              };
              changeLibrary(value => ({
                ...value,
                projects: [...value.projects, copy],
              }));
              setMenuProject(null);
            }}
          />
          <Button
            label="Delete project"
            secondary
            onPress={() => {
              const id = menuProject.id;
              setMenuProject(null);
              Alert.alert(
                'Delete this project?',
                'Your original photos, videos, and exports will be kept.',
                [
                  { text: 'Keep', style: 'cancel' },
                  {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () =>
                      changeLibrary(value => ({
                        ...value,
                        projects: value.projects.filter(p => p.id !== id),
                      })),
                  },
                ],
              );
            }}
          />
        </Sheet>
      )}
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  saveError: { padding: 12, backgroundColor: '#F4DDDC', gap: 8 },
  saveErrorText: { fontSize: 12, color: colors.danger },
});
