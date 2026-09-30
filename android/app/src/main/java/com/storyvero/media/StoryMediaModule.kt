package com.storyvero.media

import android.app.Activity
import android.content.ClipData
import android.content.Intent
import android.net.Uri
import android.os.Handler
import android.os.Looper
import android.util.AtomicFile
import android.view.WindowManager
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.FileProvider
import androidx.media3.common.MimeTypes
import androidx.media3.common.util.UnstableApi
import androidx.media3.transformer.*
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import org.json.JSONObject
import java.io.File
import java.util.UUID
import java.util.concurrent.Executors

@UnstableApi
class StoryMediaModule(private val context: ReactApplicationContext) : ReactContextBaseJavaModule(context), LifecycleEventListener {
    private val io = Executors.newSingleThreadExecutor()
    private val main = Handler(Looper.getMainLooper())
    private val files = StoryFiles(context)
    private val library = AtomicFile(File(context.filesDir, "story-library.json"))
    private val picker = ActivityResultContracts.PickMultipleVisualMedia(50)
    private var pickPromise: Promise? = null
    private var savePromise: Promise? = null
    private var saveSource: File? = null
    private var exportPromise: Promise? = null
    private var transformer: Transformer? = null
    private var output: File? = null
    private var generation = 0

    init {
        context.addLifecycleEventListener(this)
        io.execute { files.cleanAbandoned() }
        context.addActivityEventListener(object : BaseActivityEventListener() {
            override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, data: Intent?) {
                if (requestCode == PICK_MEDIA) {
                    val promise = pickPromise ?: return
                    pickPromise = null
                    val uris = picker.parseResult(resultCode, data)
                    io.execute {
                        try {
                            val array = Arguments.createArray()
                            uris.forEach { uri ->
                                // A persistent grant is required for autosaved projects to reopen reliably.
                                context.contentResolver.takePersistableUriPermission(uri, Intent.FLAG_GRANT_READ_URI_PERMISSION)
                                array.pushMap(jsonMap(files.metadata(uri)))
                            }
                            promise.resolve(array)
                        } catch (error: Exception) { promise.reject("E_MEDIA", "This media cannot be opened or kept for later editing.", error) }
                    }
                } else if (requestCode == SAVE_EXPORT) {
                    val promise = savePromise ?: return
                    val source = saveSource
                    savePromise = null; saveSource = null
                    val uri = data?.data
                    if (resultCode != Activity.RESULT_OK || uri == null || source == null) { promise.resolve(false); return }
                    io.execute {
                        try {
                            context.contentResolver.openOutputStream(uri, "w").use { out ->
                                requireNotNull(out)
                                source.inputStream().use { it.copyTo(out) }
                            }
                            promise.resolve(true)
                        } catch (error: Exception) {
                            runCatching { android.provider.DocumentsContract.deleteDocument(context.contentResolver, uri) }
                            promise.reject("E_SAVE", "Could not save this story.", error)
                        }
                    }
                }
            }
        })
    }

    override fun getName() = "StoryMedia"

    @ReactMethod fun pickMedia(kind: String, promise: Promise) = main.post {
        val activity = context.currentActivity
        if (pickPromise != null) { promise.reject("E_BUSY", "The picker is already open."); return@post }
        if (activity == null) { promise.reject("E_MEDIA", "Open Storyvero and try again."); return@post }
        val type = when (kind) {
            "photo" -> ActivityResultContracts.PickVisualMedia.ImageOnly
            "video" -> ActivityResultContracts.PickVisualMedia.VideoOnly
            else -> ActivityResultContracts.PickVisualMedia.ImageAndVideo
        }
        try {
            pickPromise = promise
            activity.startActivityForResult(picker.createIntent(activity, PickVisualMediaRequest(type)), PICK_MEDIA)
        } catch (error: Exception) { pickPromise = null; promise.reject("E_MEDIA", "The media picker is unavailable.", error) }
    }.let { Unit }

    @ReactMethod fun loadLibrary(promise: Promise) = io.execute {
        try {
            promise.resolve(if (library.baseFile.exists() || File(library.baseFile.path + ".bak").exists()) library.openRead().bufferedReader().use { it.readText() } else null)
        } catch (error: Exception) { promise.reject("E_SAVE", "Saved projects could not be read. They have not been overwritten.", error) }
    }

    @ReactMethod fun saveLibrary(json: String, promise: Promise) = io.execute {
        var stream: java.io.FileOutputStream? = null
        try {
            require(JSONObject(json).getInt("version") == 1)
            stream = library.startWrite()
            stream.write(json.toByteArray(Charsets.UTF_8))
            library.finishWrite(stream)
            promise.resolve(null)
        } catch (error: Exception) { library.failWrite(stream); promise.reject("E_SAVE", "Your latest changes could not be saved.", error) }
    }

    @ReactMethod fun exportStory(json: String, promise: Promise) = main.post {
        if (exportPromise != null) { promise.reject("E_BUSY", "An export is already running."); return@post }
        exportPromise = promise
        val token = ++generation
        val id = UUID.randomUUID().toString()
        val pending = File(files.temporary, "story-$id.mp4")
        output = pending
        io.execute {
            try {
                val project = JSONObject(json)
                val media = project.getJSONArray("media")
                var duration = 0L
                for (i in 0 until media.length()) {
                    val item = media.getJSONObject(i)
                    context.contentResolver.openAssetFileDescriptor(Uri.parse(item.getString("uri")), "r").use { requireNotNull(it) }
                    duration += StoryComposition.duration(item)
                }
                val estimatedBytes = duration / 1000 * 2_000_000L + 32_000_000
                if (files.exports.usableSpace < estimatedBytes) throw LowStorageException()
                main.post {
                    if (generation != token) return@post
                    try {
                        val composition = StoryComposition.build(project)
                        val resolution = project.getJSONObject("exportSettings").getInt("resolution")
                        val quality = project.getJSONObject("exportSettings").getString("quality")
                        val bitrate = (resolution * resolution * when (quality) { "high" -> 9; "small" -> 3; else -> 6 }).coerceAtLeast(800_000)
                        val encoder = DefaultEncoderFactory.Builder(context).setEnableFallback(true)
                            .setRequestedVideoEncoderSettings(VideoEncoderSettings.Builder().setBitrate(bitrate).build()).build()
                        transformer = Transformer.Builder(context).setVideoMimeType(MimeTypes.VIDEO_H264)
                            .setAudioMimeType(MimeTypes.AUDIO_AAC).setPortraitEncodingEnabled(true)
                            .setUsePlatformDiagnostics(false).setEncoderFactory(encoder)
                            .addListener(object : Transformer.Listener {
                                override fun onCompleted(composition: Composition, result: ExportResult) {
                                    if (generation != token) return
                                    transformer = null
                                    io.execute {
                                        var destination: File? = null
                                        try {
                                            val name = "Storyvero_$id.mp4"
                                            destination = File(files.exports, name)
                                            check(pending.renameTo(destination))
                                            val uri = Uri.fromFile(destination)
                                            val metadata = files.metadata(uri)
                                            val map = Arguments.createMap().apply {
                                                putString("id", id); putString("projectId", project.getString("id"))
                                                putString("uri", uri.toString()); putString("filename", name)
                                                putString("thumbnail", metadata.getString("thumbnail"))
                                                putDouble("createdAt", System.currentTimeMillis().toDouble())
                                                putDouble("durationMs", metadata.getLong("sourceDurationMs").toDouble())
                                                putInt("width", metadata.getInt("width")); putInt("height", metadata.getInt("height"))
                                                putDouble("sizeBytes", destination.length().toDouble())
                                            }
                                            main.post {
                                                if (generation != token) { io.execute { destination.delete() }; return@post }
                                                val completion = exportPromise
                                                clearExport()
                                                completion?.resolve(map)
                                            }
                                        } catch (error: Exception) {
                                            destination?.delete()
                                            main.post { failExport(token, error) }
                                        }
                                    }
                                }
                                override fun onError(composition: Composition, result: ExportResult, error: ExportException) { failExport(token, error) }
                            }).build()
                        context.currentActivity?.window?.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
                        transformer!!.start(composition, pending.absolutePath)
                        pollProgress(token)
                    } catch (error: Exception) { failExport(token, error) }
                }
            } catch (error: Exception) { main.post { failExport(token, error) } }
        }
    }.let { Unit }

    private fun pollProgress(token: Int) {
        if (generation != token || exportPromise == null) return
        val holder = ProgressHolder()
        val state = transformer?.getProgress(holder)
        val event = Arguments.createMap()
        if (state == Transformer.PROGRESS_STATE_AVAILABLE) event.putInt("progress", holder.progress) else event.putNull("progress")
        if (context.hasActiveReactInstance()) context.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java).emit("StoryExportProgress", event)
        main.postDelayed({ pollProgress(token) }, 300)
    }

    private fun clearExport() {
        transformer = null; exportPromise = null; output = null
        context.currentActivity?.window?.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
    }
    private fun failExport(token: Int, error: Exception) {
        if (token != generation) return
        transformer?.cancel()
        val file = output
        val promise = exportPromise
        clearExport()
        io.execute { file?.delete() }
        promise?.reject(if (error is LowStorageException) "E_STORAGE" else "E_EXPORT", "Could not create the story.", error)
    }
    @ReactMethod fun cancelExport(promise: Promise) = main.post {
        cancelActive()
        promise.resolve(null)
    }.let { Unit }
    private fun cancelActive() {
        ++generation
        transformer?.cancel()
        val file = output
        val promise = exportPromise
        clearExport()
        io.execute { file?.delete() }
        promise?.reject("E_CANCELLED", "Export cancelled.")
    }

    @ReactMethod fun shareExport(uri: String, promise: Promise) = openExport(uri, true, promise)
    @ReactMethod fun playExport(uri: String, promise: Promise) = openExport(uri, false, promise)
    private fun openExport(uri: String, share: Boolean, promise: Promise) = main.post {
        try {
            val file = files.ownedExport(uri)
            val content = FileProvider.getUriForFile(context, "${context.packageName}.files", file)
            val intent = if (share) Intent(Intent.ACTION_SEND).apply { type = "video/mp4"; putExtra(Intent.EXTRA_STREAM, content) }
                else Intent(Intent.ACTION_VIEW).setDataAndType(content, "video/mp4")
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            intent.clipData = ClipData.newRawUri("Storyvero story", content)
            val activity = context.currentActivity ?: throw IllegalStateException()
            activity.startActivity(if (share) Intent.createChooser(intent, "Share your story") else intent)
            promise.resolve(null)
        } catch (error: IllegalArgumentException) { promise.reject("E_MISSING", "The story file is missing.", error) }
        catch (error: Exception) { promise.reject("E_SHARE", "No compatible app is available.", error) }
    }.let { Unit }

    @ReactMethod fun saveExport(uri: String, filename: String, promise: Promise) = main.post {
        if (savePromise != null) { promise.reject("E_BUSY", "A save is already running."); return@post }
        try {
            saveSource = files.ownedExport(uri)
            val activity = context.currentActivity ?: throw IllegalStateException()
            savePromise = promise
            activity.startActivityForResult(Intent(Intent.ACTION_CREATE_DOCUMENT).apply {
                type = "video/mp4"; addCategory(Intent.CATEGORY_OPENABLE); putExtra(Intent.EXTRA_TITLE, filename)
            }, SAVE_EXPORT)
        } catch (error: Exception) { savePromise = null; saveSource = null; promise.reject("E_SAVE", "Could not save this story.", error) }
    }.let { Unit }

    @ReactMethod fun deleteExport(uri: String, promise: Promise) = io.execute {
        try { check(files.ownedExport(uri).delete()); promise.resolve(null) }
        catch (error: Exception) { promise.reject("E_MISSING", "The file is no longer available.", error) }
    }
    @ReactMethod fun addListener(name: String) { /* Required by NativeEventEmitter. */ }
    @ReactMethod fun removeListeners(count: Double) { /* No per-listener native resources. */ }
    override fun onHostResume() {}
    override fun onHostPause() {}
    override fun onHostDestroy() { cancelActive() }
    override fun invalidate() {
        main.post { cancelActive(); io.shutdown() }
        context.removeLifecycleEventListener(this)
        super.invalidate()
    }
    companion object { private const val PICK_MEDIA = 7101; private const val SAVE_EXPORT = 7102 }
    private class LowStorageException : Exception()
}

internal fun jsonMap(json: JSONObject): WritableMap = Arguments.createMap().apply {
    json.keys().forEach { key -> when (val value = json.get(key)) {
        is Boolean -> putBoolean(key, value)
        is Number -> putDouble(key, value.toDouble())
        is String -> putString(key, value)
        else -> putNull(key)
    } }
}
