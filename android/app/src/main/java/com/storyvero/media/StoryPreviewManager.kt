package com.storyvero.media

import android.view.TextureView
import android.widget.FrameLayout
import android.os.Handler
import android.os.Looper
import androidx.media3.common.Player
import androidx.media3.common.PlaybackException
import androidx.media3.common.util.UnstableApi
import androidx.media3.transformer.CompositionPlayer
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.UIManagerHelper
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.uimanager.events.Event
import org.json.JSONObject

@UnstableApi
class StoryPreviewManager : SimpleViewManager<StoryPreviewView>() {
    override fun getName() = "StoryPreview"
    override fun createViewInstance(context: ThemedReactContext) = StoryPreviewView(context)
    @ReactProp(name = "project") fun setProject(view: StoryPreviewView, json: String?) { view.setProject(json) }
    @ReactProp(name = "playing") fun setPlaying(view: StoryPreviewView, playing: Boolean) { view.setPlaying(playing) }
    @ReactProp(name = "seekMs") fun seek(view: StoryPreviewView, ms: Double) { view.seek(ms.toLong()) }
    override fun onDropViewInstance(view: StoryPreviewView) { view.dispose(); super.onDropViewInstance(view) }
    override fun getExportedCustomDirectEventTypeConstants(): MutableMap<String, Any> = mutableMapOf(
        "topStoryProgress" to mapOf("registrationName" to "onStoryProgress"),
        "topStoryError" to mapOf("registrationName" to "onStoryError")
    )
}

private class StoryEvent(surfaceId: Int, viewId: Int, private val name: String, private val data: WritableMap) : Event<StoryEvent>(surfaceId, viewId) {
    override fun getEventName() = name
    override fun getEventData() = data
}

@UnstableApi
class StoryPreviewView(private val react: ThemedReactContext) : FrameLayout(react), LifecycleEventListener {
    private val texture = TextureView(react)
    private val handler = Handler(Looper.getMainLooper())
    private var player: CompositionPlayer? = null
    private var projectJson: String? = null
    private var pendingPlaying = false
    private var pendingSeek = 0L
    private var disposed = false
    private val ticker = object : Runnable {
        override fun run() {
            player?.let {
                emit("topStoryProgress", Arguments.createMap().apply {
                    putDouble("positionMs", it.currentPosition.toDouble())
                    putBoolean("ended", it.playbackState == Player.STATE_ENDED)
                    putBoolean("playing", it.isPlaying)
                })
            }
            if (!disposed) handler.postDelayed(this, 100)
        }
    }
    init {
        setBackgroundColor(android.graphics.Color.BLACK)
        addView(texture, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT))
        react.addLifecycleEventListener(this)
        handler.post(ticker)
    }
    // React Native lays out the container; this child needs its own exact layout pass.
    override fun onLayout(changed: Boolean, left: Int, top: Int, right: Int, bottom: Int) {
        texture.layout(0, 0, right - left, bottom - top)
    }
    fun setProject(json: String?) {
        if (json == projectJson) return
        projectJson = json
        rebuild()
    }
    private fun rebuild() {
        player?.release(); player = null
        val json = projectJson ?: return
        if (disposed) return
        try {
            val composition = StoryComposition.build(JSONObject(json))
            player = CompositionPlayer.Builder(react).build().also {
                it.setVideoTextureView(texture)
                it.addListener(object : Player.Listener {
                    override fun onPlayerError(error: PlaybackException) {
                        emit("topStoryError", Arguments.createMap().apply { putString("message", "This preview could not be played. Check your media or try a smaller resolution.") })
                    }
                })
                it.setComposition(composition)
                it.prepare()
                if (pendingSeek > 0) it.seekTo(pendingSeek)
                it.playWhenReady = pendingPlaying
            }
        } catch (error: Exception) {
            emit("topStoryError", Arguments.createMap().apply { putString("message", "This story could not be previewed. Check that the selected media is still on your device.") })
        }
    }
    fun setPlaying(playing: Boolean) {
        pendingPlaying = playing
        player?.let {
            if (playing && it.playbackState == Player.STATE_ENDED) it.seekTo(0)
            it.playWhenReady = playing
        }
    }
    fun seek(ms: Long) { pendingSeek = ms.coerceAtLeast(0); player?.seekTo(pendingSeek) }
    private fun emit(name: String, data: WritableMap) {
        if (id == -1 || disposed) return
        UIManagerHelper.getEventDispatcherForReactTag(react, id)?.dispatchEvent(StoryEvent(UIManagerHelper.getSurfaceId(react), id, name, data))
    }
    fun dispose() {
        disposed = true
        handler.removeCallbacks(ticker)
        player?.release(); player = null
        react.removeLifecycleEventListener(this)
    }
    override fun onHostPause() { pendingPlaying = false; player?.pause() }
    override fun onHostResume() {}
    override fun onHostDestroy() { dispose() }
}
