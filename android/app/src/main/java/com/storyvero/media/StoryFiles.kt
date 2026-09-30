package com.storyvero.media

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.media.MediaMetadataRetriever
import android.net.Uri
import android.provider.OpenableColumns
import java.io.File
import java.security.MessageDigest
import java.util.UUID
import org.json.JSONObject

class StoryFiles(private val context: Context) {
    val exports = File(context.filesDir, "exports").apply { mkdirs() }
    val temporary = File(context.cacheDir, "story-exports").apply { mkdirs() }
    private val thumbnails = File(context.cacheDir, "story-thumbnails").apply { mkdirs() }

    fun cleanAbandoned() {
        temporary.listFiles()?.filter { isTemporaryExport(it.name) }?.forEach { it.delete() }
        // Thumbnails are disposable and bounded; source assets are never touched.
        thumbnails.listFiles()?.sortedByDescending { it.lastModified() }?.drop(200)?.forEach { it.delete() }
    }

    fun ownedExport(uri: String): File {
        val parsed = Uri.parse(uri)
        require(parsed.scheme == "file")
        val file = File(requireNotNull(parsed.path)).canonicalFile
        require(file.parentFile == exports.canonicalFile && file.extension == "mp4")
        require(file.exists())
        return file
    }

    fun metadata(uri: Uri): JSONObject {
        val resolver = context.contentResolver
        val mime = resolver.getType(uri) ?: if (uri.toString().endsWith(".mp4")) "video/mp4" else "image/jpeg"
        require(mime.startsWith("image/") || mime.startsWith("video/"))
        var name = "Moment"
        resolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)?.use {
            if (it.moveToFirst()) name = it.getString(0) ?: name
        }
        val photo = mime.startsWith("image/")
        var width: Int
        var height: Int
        var duration = 0L
        var thumb = uri.toString()
        if (photo) {
            val options = BitmapFactory.Options().apply { inJustDecodeBounds = true }
            resolver.openInputStream(uri).use { input -> requireNotNull(input); BitmapFactory.decodeStream(input, null, options) }
            width = options.outWidth
            height = options.outHeight
        } else {
            val retriever = MediaMetadataRetriever()
            try {
                retriever.setDataSource(context, uri)
                width = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_WIDTH)?.toInt() ?: 0
                height = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_HEIGHT)?.toInt() ?: 0
                val rotation = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_ROTATION)?.toInt() ?: 0
                if (rotation % 180 != 0) { val swap = width; width = height; height = swap }
                duration = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION)?.toLong() ?: 0
                require(duration >= 250)
                thumb = thumbnail(uri, retriever)
            } finally { retriever.release() }
        }
        require(width > 0 && height > 0)
        return JSONObject().put("id", UUID.randomUUID().toString()).put("uri", uri.toString())
            .put("thumbnail", thumb).put("name", name).put("kind", if (photo) "photo" else "video")
            .put("width", width).put("height", height).put("sourceDurationMs", duration)
            .put("durationMs", if (photo) 3000 else duration).put("trimStartMs", 0).put("trimEndMs", duration)
            .put("muted", false).put("fit", "fit")
    }

    fun thumbnail(uri: Uri, existing: MediaMetadataRetriever? = null): String {
        val hash = MessageDigest.getInstance("SHA-256").digest(uri.toString().toByteArray()).joinToString("") { "%02x".format(it) }
        val file = File(thumbnails, "$hash.jpg")
        if (!file.exists()) {
            val retriever = existing ?: MediaMetadataRetriever().apply { setDataSource(context, uri) }
            try {
                val frame = if (android.os.Build.VERSION.SDK_INT >= 27) retriever.getScaledFrameAtTime(0, MediaMetadataRetriever.OPTION_CLOSEST_SYNC, 240, 320)
                    else retriever.getFrameAtTime(0, MediaMetadataRetriever.OPTION_CLOSEST_SYNC)
                frame?.let {
                    val scale = minOf(240f / it.width, 320f / it.height, 1f)
                    val small = Bitmap.createScaledBitmap(it, (it.width * scale).toInt().coerceAtLeast(1), (it.height * scale).toInt().coerceAtLeast(1), true)
                    file.outputStream().use { out -> small.compress(Bitmap.CompressFormat.JPEG, 75, out) }
                    if (small !== it) small.recycle()
                    it.recycle()
                }
            } finally { if (existing == null) retriever.release() }
        }
        return if (file.exists()) Uri.fromFile(file).toString() else ""
    }
}

fun isTemporaryExport(name: String) = name.matches(Regex("story-[a-zA-Z0-9-]+\\.mp4"))
