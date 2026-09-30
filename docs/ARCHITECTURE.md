# Storyvero — Android story milestone

This implementation extends the existing React Native 0.87.1 project. React, React Native, Kotlin, SDK levels, Gradle wrapper, Hermes, and the new architecture were retained. The original app was the React Native welcome screen, with no application navigation, custom modules, media assets, or editor to migrate.

## Boundaries

- `src/navigation`: typed home / arrange / editor / export / result routes and Android back behavior.
- `src/types`, `src/editor`: versioned edit metadata, durations, trim validation, ordering, ratios, future text timing and split planning.
- `src/storage`: debounced serial autosave with retry and lifecycle flushing. Android writes with `AtomicFile` in app-private storage. Invalid libraries are preserved and editing is blocked until loading succeeds.
- `src/media`: typed bridge. No video buffers, base64, encoding, filesystem copying, or network requests in JavaScript.
- `src/player`: native preview surface. The editor and exporter use `StoryComposition.build`.
- `src/templates`: original, data-driven settings presets. These set photo duration, ratio, transition, and fit/fill. Card lettering is illustrative UI, not a rendered text layer.
- `src/services`: inactive ad service and FREE/PRO types. No ad SDK, analytics, billing, production identifiers, or subscription implementation.
- `android/.../media`: reusable metadata, thumbnails, media picker, preview, export, sharing, and app-owned file operations. This layer is a candidate for later extraction across CompressFlow / Clipvero / Storyvero; their repositories have not been modified.

## Media pipeline

AndroidX Photo Picker (`PickMultipleVisualMedia`) selects images/videos, falling back to the system document picker where appropriate. Persistent URI read grants retain access across restarts. No broad storage or microphone permission is requested. A revoked/deleted/cloud-only item must be reselected; user originals are never copied into projects.

`MediaMetadataRetriever` inspects video duration/orientation and generates cached small JPEG thumbnails; images are inspected without decoding a full bitmap. Thumbnails can be evicted and are not original media.

Media3 1.11.1 builds a single sequence of `EditedMediaItem` instances. Images get an explicit duration and video gets clipping metadata. An audio track is requested explicitly to generate silence through images/muted clips. Presentation effects fit or center-crop without stretching. The RGB fade effect darkens the end of one item and reveals the next from black; it is **not** an overlapping cross-dissolve. Fade durations clamp to half the item duration, and cuts do not shorten the timeline.

`CompositionPlayer` previews the same composition as `Transformer`. Player events drive current time; Transformer progress drives the export percentage. Unknown progress displays a spinner. CompositionPlayer is an experimental Media3 API and requires device validation.

Transformer encodes H.264/AAC in MP4 through Android codecs, off the JavaScript thread. Resolution is capped against source dimensions, encoder fallback is allowed, and result metadata is read from the completed file. HDR is tone-mapped to SDR. Selected 24/30 FPS also caps video rate; Original FPS remains pending.

Exports first go into `cache/story-exports/story-<UUID>.mp4`, then move into app-private `files/exports`. Cancel/error removes incomplete output. Startup only removes files matching that generated temporary naming convention within that directory. A narrow `FileProvider` grants temporary read access for ACTION_SEND/ACTION_VIEW. Save to Files uses ACTION_CREATE_DOCUMENT and copies only when explicitly requested. App-private exports are removed if Storyvero is uninstalled; Save to Files keeps a user-owned copy.

Export keeps the screen awake. It does not start a background service; users are instructed to keep Storyvero open. Process/activity destruction cancels or abandons the temporary job; the saved project survives. The next launch cleans abandoned temporary output. There is no automatic upload.

## Extension contracts

Add text, music, stickers, backgrounds, and transformations to the versioned project model and **both** preview/export composition construction before exposing controls. Text metadata exists as a future contract, but the native engine explicitly rejects populated text layers until rendering is implemented. Likewise, split planning is tested but sequential split export is not exposed.

Voice-over will need a separate local audio track source and recording lifecycle; microphone permission must only be introduced with a working recorder. Ads must stay limited to home, browsing, or result placements. Neither has a user-facing placeholder.

## Primary references

- [Media3 release notes](https://developer.android.com/jetpack/androidx/releases/media3)
- [CompositionPlayer](https://developer.android.com/media/media3/transformer/compositionplayer)
- [Multi-asset editing](https://developer.android.com/media/media3/transformer/multi-asset)
- [Android Photo Picker](https://developer.android.com/training/data-storage/shared/photo-picker)
- [Reanimated compatibility](https://docs.swmansion.com/react-native-reanimated/docs/guides/compatibility/)
