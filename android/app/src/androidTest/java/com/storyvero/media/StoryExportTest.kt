package com.storyvero.media

import android.graphics.Bitmap
import android.graphics.Color
import android.media.MediaExtractor
import android.media.MediaFormat
import android.media.MediaMetadataRetriever
import android.net.Uri
import android.os.Handler
import android.os.Looper
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import androidx.media3.common.util.UnstableApi
import com.facebook.react.bridge.Callback
import com.facebook.react.bridge.PromiseImpl
import com.facebook.react.bridge.BridgeReactContext
import com.facebook.react.bridge.ReadableMap
import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import java.io.File
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import kotlin.math.abs

/** Exercises the actual bridge, Media3 encoder, muxer, metadata reader and cleanup. */
@RunWith(AndroidJUnit4::class)
@UnstableApi
class StoryExportTest {
    private val instrumentation = InstrumentationRegistry.getInstrumentation()
    private val context = instrumentation.targetContext

    private fun photo(name: String, color: Int, width: Int, height: Int, duration: Int = 1000): JSONObject {
        val folder = File(context.filesDir, "qa-input").apply { mkdirs() }
        val file = File(folder, "$name.jpg")
        val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
        bitmap.eraseColor(color)
        file.outputStream().use { bitmap.compress(Bitmap.CompressFormat.JPEG, 95, it) }
        bitmap.recycle()
        return StoryFiles(context).metadata(Uri.fromFile(file)).put("durationMs", duration).put("fit", "fill")
    }

    private fun project(items: List<JSONObject>, transition: String = "fade", resolution: Int = 480, fps: Int = 30): JSONObject = JSONObject()
        .put("version", 1).put("id", "qa-project").put("name", "QA story").put("ratio", "9:16")
        .put("media", JSONArray(items)).put("transition", transition).put("fadeMs", 300)
        .put("textLayers", JSONArray()).put("exportSettings", JSONObject().put("resolution", resolution).put("fps", fps).put("quality", "recommended"))

    private fun runExport(project: JSONObject, cancel: Boolean = false, expectedError: String? = null): Map<String, Any?>? {
        val done = CountDownLatch(1)
        var result: Map<String, Any?>? = null
        var failure: String? = null
        lateinit var module: StoryMediaModule
        instrumentation.runOnMainSync {
            module = StoryMediaModule(BridgeReactContext(context))
            val promise = PromiseImpl(Callback { args ->
                result = (args[0] as ReadableMap).toHashMap(); done.countDown()
            }, Callback { args -> failure = (args[0] as ReadableMap).toHashMap().toString(); done.countDown() })
            module.exportStory(project.toString(), promise)
            if (cancel) Handler(Looper.getMainLooper()).postDelayed({ module.cancelExport(PromiseImpl(Callback {}, Callback {})) }, 350)
        }
        assertTrue("Export timed out", done.await(150, TimeUnit.SECONDS))
        instrumentation.runOnMainSync { module.invalidate() }
        if (cancel || expectedError != null) {
            assertTrue("Expected failure, got $failure", failure?.contains(expectedError ?: "E_CANCELLED") == true)
            // The IO queue must get a chance to remove incomplete output.
            val until = System.currentTimeMillis() + 3000
            while (StoryFiles(context).temporary.listFiles()?.isNotEmpty() == true && System.currentTimeMillis() < until) Thread.sleep(50)
            assertTrue(StoryFiles(context).temporary.listFiles()?.isEmpty() != false)
            return null
        }
        assertNull("Native export failed: $failure", failure)
        assertNotNull(result)
        return result
    }

    private fun inspect(result: Map<String, Any?>, expectedDuration: Long): MediaMetadataRetriever {
        val file = File(Uri.parse(result["uri"] as String).path!!)
        assertTrue(file.length() > 1000)
        val retriever = MediaMetadataRetriever().apply { setDataSource(file.path) }
        val duration = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION)!!.toLong()
        assertTrue("Duration $duration != $expectedDuration", abs(duration - expectedDuration) < 160)
        val extractor = MediaExtractor()
        try {
            extractor.setDataSource(file.path)
            val mimes = (0 until extractor.trackCount).map { extractor.getTrackFormat(it).getString(MediaFormat.KEY_MIME) }
            assertTrue("H264 track missing: $mimes", mimes.contains("video/avc"))
            assertTrue("AAC track missing: $mimes", mimes.contains("audio/mp4a-latm"))
        } finally { extractor.release() }
        val frame = retriever.getFrameAtTime(500000, MediaMetadataRetriever.OPTION_CLOSEST)
        assertNotNull("Export must actually decode", frame)
        assertTrue(abs(frame!!.width.toFloat() / frame.height - 9f / 16) < 0.02)
        frame.recycle()
        return retriever
    }

    private fun pixel(retriever: MediaMetadataRetriever, ms: Long): Int {
        val frame = retriever.getFrameAtTime(ms * 1000, MediaMetadataRetriever.OPTION_CLOSEST)!!
        val color = frame.getPixel(frame.width / 2, frame.height / 2)
        frame.recycle()
        return color
    }

    @Test fun slideshowActuallyFadesAndPreservesOrderAndTiming() {
        val red = photo("portrait-red", Color.RED, 720, 1280)
        val blue = photo("landscape-blue", Color.BLUE, 1280, 720)
        val result = runExport(project(listOf(red, blue)))!!
        val retriever = inspect(result, 2000)
        try {
            val first = pixel(retriever, 400)
            val fadeOut = pixel(retriever, 967)
            val second = pixel(retriever, 1500)
            assertTrue("First moment should be red", Color.red(first) > 180 && Color.blue(first) < 50)
            assertTrue("The exported fade must darken frames", Color.red(fadeOut) < Color.red(first) / 2)
            assertTrue("Second moment should be blue", Color.blue(second) > 180 && Color.red(second) < 50)
        } finally { retriever.release() }
    }

    @Test fun singlePhotoThenMixedTrimmedVideosExportPlayableMp4() {
        val green = photo("green-1080", Color.GREEN, 1080, 1920, 1500)
        val single = runExport(project(listOf(green), "none", 720, 24))!!
        inspect(single, 1500).release()
        val video = StoryFiles(context).metadata(Uri.parse(single["uri"] as String)).put("trimStartMs", 250).put("trimEndMs", 1250)
        val yellow = photo("landscape-yellow", Color.YELLOW, 1920, 1080, 1000)
        val mutedVideo = JSONObject(video.toString()).put("id", "second-video").put("muted", true)
        val mixed = runExport(project(listOf(video, yellow, mutedVideo)))!!
        inspect(mixed, 3000).release()
        val videos = runExport(project(listOf(video, mutedVideo), "none"))!!
        inspect(videos, 2000).release()
    }

    @Test fun cancellationAndMissingInputPreserveOriginalsAndCleanTemporaryFiles() {
        val source = photo("keep-original", Color.MAGENTA, 720, 1280, 60000)
        runExport(project(listOf(source)), cancel = true)
        assertTrue(File(Uri.parse(source.getString("uri")).path!!).exists())
        val missing = JSONObject(source.toString()).put("uri", "file:///missing-storyvero-test.jpg")
        runExport(project(listOf(missing)), expectedError = "E_EXPORT")
    }
}
