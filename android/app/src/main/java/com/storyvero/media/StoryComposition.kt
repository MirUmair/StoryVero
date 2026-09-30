package com.storyvero.media

import android.net.Uri
import androidx.media3.common.C
import androidx.media3.common.Effect
import androidx.media3.common.MediaItem
import androidx.media3.common.util.UnstableApi
import androidx.media3.effect.Presentation
import androidx.media3.effect.RgbMatrix
import androidx.media3.transformer.Composition
import androidx.media3.transformer.EditedMediaItem
import androidx.media3.transformer.EditedMediaItemSequence
import androidx.media3.transformer.Effects
import org.json.JSONObject
import kotlin.math.min
import kotlin.math.roundToInt

/** One composition factory for both the editor player and the MP4 exporter. */
@UnstableApi
object StoryComposition {
    fun duration(item: JSONObject): Long = if (item.getString("kind") == "photo") item.getLong("durationMs")
        else item.getLong("trimEndMs") - item.getLong("trimStartMs")

    fun dimensions(project: JSONObject): Pair<Int, Int> {
        val ratio = project.getString("ratio").split(":").map { it.toFloat() }.let { it[0] / it[1] }
        val requested = project.getJSONObject("exportSettings").getInt("resolution")
        val media = project.getJSONArray("media")
        // Cap at the largest source's short side, avoiding unnecessary upscaling of small input.
        val source = (0 until media.length()).maxOf { i ->
            media.getJSONObject(i).let { min(it.getInt("width"), it.getInt("height")) }
        }
        val shortSide = min(requested, source).coerceAtLeast(2)
        fun even(n: Float) = ((n / 2).roundToInt() * 2).coerceAtLeast(2)
        return if (ratio <= 1) even(shortSide.toFloat()) to even(shortSide / ratio)
        else even(shortSide * ratio) to even(shortSide.toFloat())
    }

    fun build(project: JSONObject): Composition {
        require(project.getInt("version") == 1)
        require(project.getString("ratio") in setOf("9:16", "4:5", "1:1", "16:9"))
        require(project.getString("transition") in setOf("none", "fade"))
        require(project.getJSONArray("textLayers").length() == 0) { "Text rendering is not enabled yet" }
        val media = project.getJSONArray("media")
        require(media.length() in 1..100)
        val settings = project.getJSONObject("exportSettings")
        require(settings.getInt("resolution") in setOf(480, 720, 1080))
        val fps = settings.getInt("fps")
        require(fps in setOf(24, 30))
        val (width, height) = dimensions(project)
        val edited = (0 until media.length()).map { index ->
            val item = media.getJSONObject(index)
            val uri = Uri.parse(item.getString("uri"))
            require(uri.scheme in setOf("content", "file"))
            val photo = item.getString("kind") == "photo"
            require(item.getString("kind") in setOf("photo", "video"))
            val duration = duration(item)
            require(duration >= if (photo) 500 else 250)
            if (photo) require(duration <= 60000)
            val sourceMs = item.getLong("sourceDurationMs")
            val builder = MediaItem.Builder().setUri(uri)
            if (photo) builder.setImageDurationMs(duration)
            else {
                require(item.getLong("trimStartMs") >= 0 && item.getLong("trimEndMs") <= sourceMs)
                builder.setClippingConfiguration(MediaItem.ClippingConfiguration.Builder()
                    .setStartPositionMs(item.getLong("trimStartMs"))
                    .setEndPositionMs(item.getLong("trimEndMs")).build())
            }
            val layout = if (item.getString("fit") == "fill") Presentation.LAYOUT_SCALE_TO_FIT_WITH_CROP else Presentation.LAYOUT_SCALE_TO_FIT
            val effects = mutableListOf<Effect>(Presentation.createForWidthAndHeight(width, height, layout))
            if (project.getString("transition") == "fade" && media.length() > 1) {
                val fadeMs = project.getLong("fadeMs").coerceIn(0, min(1000, duration / 2))
                if (fadeMs > 0) effects.add(StoryFade(duration * 1000, fadeMs * 1000, index > 0, index < media.length() - 1))
            }
            EditedMediaItem.Builder(builder.build())
                .setDurationUs((if (photo) duration else sourceMs) * 1000)
                .setFrameRate(fps)
                .setRemoveAudio(photo || item.getBoolean("muted"))
                .setEffects(Effects(emptyList(), effects)).build()
        }
        // Include audio explicitly so silence is generated for photos and muted clips.
        val sequence = EditedMediaItemSequence.Builder(setOf(C.TRACK_TYPE_AUDIO, C.TRACK_TYPE_VIDEO)).addItems(edited).build()
        return Composition.Builder(sequence)
            .setHdrMode(Composition.HDR_MODE_TONE_MAP_HDR_TO_SDR_USING_OPEN_GL).build()
    }
}

/** Fade through black at a cut, without changing story timing or duplicating frames. */
@UnstableApi
class StoryFade(private val durationUs: Long, private val fadeUs: Long, private val fadeIn: Boolean, private val fadeOut: Boolean) : RgbMatrix {
    override fun getMatrix(presentationTimeUs: Long, useHdr: Boolean): FloatArray {
        val alpha = fadeValue(presentationTimeUs, durationUs, fadeUs, fadeIn, fadeOut)
        return floatArrayOf(alpha, 0f, 0f, 0f, 0f, alpha, 0f, 0f, 0f, 0f, alpha, 0f, 0f, 0f, 0f, 1f)
    }
}

fun fadeValue(time: Long, duration: Long, fade: Long, fadeIn: Boolean, fadeOut: Boolean): Float {
    if (fade <= 0) return 1f
    var value = 1f
    if (fadeIn) value = min(value, time.toFloat() / fade)
    if (fadeOut) value = min(value, (duration - time).toFloat() / fade)
    return value.coerceIn(0f, 1f)
}
