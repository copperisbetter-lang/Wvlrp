package com.wvlrp.mobilelive

import android.app.*
import android.content.Intent
import android.content.pm.ServiceInfo
import android.graphics.Bitmap
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.drawable.GradientDrawable
import android.hardware.display.DisplayManager
import android.hardware.display.VirtualDisplay
import android.media.Image
import android.media.ImageReader
import android.media.projection.MediaProjection
import android.media.projection.MediaProjectionManager
import android.os.Build
import android.os.Environment
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.provider.Settings
import android.util.Log
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.widget.TextView
import com.pedro.common.ConnectChecker
import com.pedro.common.VideoCodec
import com.pedro.library.base.recording.RecordController
import com.pedro.library.whip.WhipStream
import java.io.File
import java.io.FileOutputStream
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import kotlin.math.abs

class LiveService : Service(), ConnectChecker {
    companion object {
        const val CHANNEL = "wvlrp_mobile_live"
        const val ID = 987
        const val ACTION_STATUS = "com.wvlrp.mobilelive.STATUS"
        const val ACTION_MILEAGE = "com.wvlrp.mobilelive.MILEAGE"
        const val ACTION_SAVE_LAST_HOUR = "com.wvlrp.mobilelive.SAVE_LAST_HOUR"
        const val EXTRA_PROJECTION_RESULT_CODE = "projectionResultCode"
        const val EXTRA_PROJECTION_DATA = "projectionData"
        const val ENDPOINT = "https://158-101-120-6.sslip.io/webrtc/mobile/whip"
        private const val SEGMENT_MS = 5L * 60L * 1000L
        private const val MAX_SEGMENTS = 12
    }

    private var stream: WhipStream? = null
    private var stopping = false
    private var connected = false
    private var currentSegment: File? = null
    private var currentSegmentStartMs = 0L
    private var mileageTracker: MileageTracker? = null
    private var impactDetector: ImpactDetector? = null
    private var currentShiftMiles = 0.0
    private var currentWeekMiles = 0.0
    private var protecting = false

    private var mediaProjection: MediaProjection? = null
    private var imageReader: ImageReader? = null
    private var virtualDisplay: VirtualDisplay? = null

    private var overlayView: TextView? = null
    private var overlayParams: WindowManager.LayoutParams? = null
    private var windowManager: WindowManager? = null

    private val handler = Handler(Looper.getMainLooper())
    private val rotateRunnable = Runnable { rotateSegment() }

    private val projectionCallback = object : MediaProjection.Callback() {
        override fun onStop() {
            releaseCaptureSurfaces()
            removeSnapOverlay()
            if (!stopping && stream != null) {
                status("LIVE • SNAP permission ended • rolling recording continues")
            }
        }
    }

    override fun onCreate() {
        super.onCreate()
        if (Build.VERSION.SDK_INT >= 26) {
            val c = NotificationChannel(
                CHANNEL,
                "WVLRP Mobile Live",
                NotificationManager.IMPORTANCE_LOW
            )
            c.description = "WVLRP camera, microphone, rolling recording, SNAP, mileage, and impact protection"
            getSystemService(NotificationManager::class.java).createNotificationChannel(c)
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_SAVE_LAST_HOUR) {
            if (stream == null) {
                status("NOT LIVE — there is no rolling video to save")
            } else {
                protectLastHour()
            }
            return START_STICKY
        }

        @Suppress("DEPRECATION")
        val projectionData = intent?.getParcelableExtra<Intent>(EXTRA_PROJECTION_DATA)
        val projectionResultCode =
            intent?.getIntExtra(EXTRA_PROJECTION_RESULT_CODE, Activity.RESULT_CANCELED)
                ?: Activity.RESULT_CANCELED

        val hasProjectionGrant =
            projectionData != null && projectionResultCode == Activity.RESULT_OK

        promote("Starting WVLRP Mobile Live…", hasProjectionGrant)

        if (hasProjectionGrant && mediaProjection == null) {
            setupScreenCapture(projectionResultCode, projectionData!!)
        }

        if (stream == null) {
            startSessionTrackers()
            startBroadcast()
        }
        return START_STICKY
    }

    private fun promote(message: String, includeProjection: Boolean = mediaProjection != null) {
        val open = PendingIntent.getActivity(
            this, 0, Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )
        val save = PendingIntent.getService(
            this, 1, Intent(this, LiveService::class.java).setAction(ACTION_SAVE_LAST_HOUR),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        val n = Notification.Builder(this, CHANNEL)
            .setContentTitle("WVLRP Mobile Live")
            .setContentText(message)
            .setSmallIcon(android.R.drawable.presence_video_online)
            .setOngoing(true)
            .setContentIntent(open)
            .addAction(android.R.drawable.ic_menu_save, "SAVE LAST HOUR", save)
            .build()

        if (Build.VERSION.SDK_INT >= 30) {
            var types =
                ServiceInfo.FOREGROUND_SERVICE_TYPE_CAMERA or
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE or
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION
            if (includeProjection) {
                types = types or ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION
            }
            startForeground(ID, n, types)
        } else if (Build.VERSION.SDK_INT >= 29) {
            var types = ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION
            if (includeProjection) {
                types = types or ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION
            }
            startForeground(ID, n, types)
        } else {
            startForeground(ID, n)
        }
    }

    private fun startBroadcast() {
        try {
            val w = WhipStream(applicationContext, this)
            stream = w

            // VP8 + Opus is native to WHIP/WebRTC and also lets Android mux the
            // same encoded A/V into the local WebM rolling recorder.
            w.setVideoCodec(VideoCodec.VP8)
            w.setRecordController(WebmRecordController())

            val video = w.prepareVideo(
                1280, 720,
                2_000_000,
                30,
                2,
                90
            )
            val audio = w.prepareAudio(
                48_000,
                false,
                64_000,
                true,
                true
            )

            if (!video || !audio) {
                fail("Phone encoder could not be prepared")
                return
            }

            w.getStreamClient().setReTries(20)
            status("CONNECTING")
            w.startStream(ENDPOINT)
            startNewSegment()
        } catch (e: Exception) {
            fail(e.message ?: "Unable to start camera")
        }
    }

    private fun recordingRoot(): File {
        val base = getExternalFilesDir(Environment.DIRECTORY_MOVIES) ?: filesDir
        return File(base, "WVLRP").apply { mkdirs() }
    }

    private fun ringDir(): File = File(recordingRoot(), "Rolling").apply { mkdirs() }
    private fun savedDir(): File = File(recordingRoot(), "Saved").apply { mkdirs() }
    private fun screenshotDir(): File = File(recordingRoot(), "Screenshots").apply { mkdirs() }

    private fun startNewSegment() {
        val w = stream ?: return
        if (Build.VERSION.SDK_INT < 29) {
            status("LIVE • local audio recording requires Android 10+")
            return
        }

        try {
            val startedAt = System.currentTimeMillis()
            val file = File(ringDir(), "wvlrp_" + startedAt + ".webm")
            currentSegment = file
            currentSegmentStartMs = startedAt

            w.startRecord(file.absolutePath, RecordController.RecordTracks.ALL) { recordStatus ->
                if (recordStatus == RecordController.Status.RECORDING && connected) {
                    status("LIVE • ROLLING LAST 60 MIN • SNAP READY")
                }
            }

            pruneRing()
            handler.removeCallbacks(rotateRunnable)
            handler.postDelayed(rotateRunnable, SEGMENT_MS)
        } catch (e: Exception) {
            Log.e("WVLRP-MobileLive", "Rolling recorder failed", e)
            status("LIVE • RECORDING ERROR: " + (e.message ?: "unknown"))
        }
    }

    private fun rotateSegment() {
        val w = stream ?: return
        try {
            if (w.isRecording) w.stopRecord()
        } catch (e: Exception) {
            Log.e("WVLRP-MobileLive", "Could not finalize rolling segment", e)
        }
        currentSegment = null
        currentSegmentStartMs = 0L
        startNewSegment()
    }

    private fun ringFiles(): List<File> =
        ringDir().listFiles()
            ?.filter { it.isFile && it.extension.equals("webm", ignoreCase = true) }
            ?.sortedBy { it.lastModified() }
            ?: emptyList()

    private fun pruneRing() {
        val files = ringFiles().toMutableList()
        while (files.size > MAX_SEGMENTS) {
            val oldest = files.removeAt(0)
            if (oldest != currentSegment) oldest.delete()
        }
    }

    private fun protectLastHour(reason: String = "manual") {
        if (protecting) return
        val w = stream ?: return
        protecting = true
        handler.removeCallbacks(rotateRunnable)

        try {
            try {
                if (w.isRecording) w.stopRecord()
            } catch (e: Exception) {
                Log.e("WVLRP-MobileLive", "Could not finalize segment before save", e)
            }

            currentSegment = null
            currentSegmentStartMs = 0L

            val clips = ringFiles().takeLast(MAX_SEGMENTS)
            if (clips.isEmpty()) {
                status("LIVE • nothing recorded yet")
                startNewSegment()
                return
            }

            val stamp = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(Date())
            val prefix = if (reason.startsWith("impact")) "impact_" else "saved_"
            val eventDir = File(savedDir(), prefix + stamp).apply { mkdirs() }

            copySnapshotsToEvent(eventDir, clips)

            var saved = 0
            clips.forEachIndexed { index, source ->
                val target = File(
                    eventDir,
                    String.format(Locale.US, "%02d_%s", index + 1, source.name)
                )
                val moved = source.renameTo(target)
                if (moved) {
                    saved++
                } else {
                    try {
                        source.copyTo(target, overwrite = true)
                        if (source.delete()) saved++
                    } catch (e: Exception) {
                        Log.e("WVLRP-MobileLive", "Could not preserve " + source.name, e)
                    }
                }
            }

            if (reason.startsWith("impact")) {
                status("IMPACT DETECTED • SAVED LAST HOUR • " + saved + " clips")
                promote("IMPACT SAVE complete • live + rolling recorder restarted")
            } else {
                status("SAVED LAST HOUR • " + saved + " clip" + if (saved == 1) "" else "s")
                promote("LIVE — last hour protected • rolling recorder restarted")
            }

            startNewSegment()
        } finally {
            protecting = false
        }
    }

    private fun copySnapshotsToEvent(eventDir: File, clips: List<File>) {
        val oldestStart = clips.firstOrNull()
            ?.nameWithoutExtension
            ?.removePrefix("wvlrp_")
            ?.toLongOrNull()
            ?: (System.currentTimeMillis() - 60L * 60L * 1000L)

        val now = System.currentTimeMillis()
        val targetDir = File(eventDir, "Screenshots").apply { mkdirs() }

        screenshotDir().listFiles()
            ?.filter { it.isFile && it.extension.equals("png", ignoreCase = true) }
            ?.forEach { png ->
                val ts = png.nameWithoutExtension.removePrefix("snap_").toLongOrNull()
                    ?: return@forEach
                if (ts in oldestStart..now) {
                    try {
                        png.copyTo(File(targetDir, png.name), overwrite = true)
                        val sidecar = File(png.parentFile, png.nameWithoutExtension + ".txt")
                        if (sidecar.exists()) {
                            sidecar.copyTo(File(targetDir, sidecar.name), overwrite = true)
                        }
                    } catch (e: Exception) {
                        Log.e("WVLRP-MobileLive", "Could not copy SNAP into event", e)
                    }
                }
            }

        val timeline = File(recordingRoot(), "timeline.csv")
        if (timeline.exists()) {
            try { timeline.copyTo(File(eventDir, "timeline.csv"), overwrite = true) } catch (_: Exception) {}
        }
    }

    private fun startSessionTrackers() {
        if (mileageTracker == null) {
            val tracker = MileageTracker(this) { shiftMiles, weekMiles ->
                currentShiftMiles = shiftMiles
                currentWeekMiles = weekMiles
                broadcastMileage()
            }
            mileageTracker = tracker
            tracker.startNewShift()
        }

        if (impactDetector == null) {
            val detector = ImpactDetector(this) { gForce ->
                handler.post {
                    status(
                        "IMPACT " +
                            String.format(Locale.US, "%.1f", gForce) +
                            "g • PROTECTING LAST HOUR"
                    )
                    protectLastHour("impact")
                }
            }
            impactDetector = detector
            detector.start()
        }
    }

    private fun stopSessionTrackers() {
        mileageTracker?.finalizeShift(recordingRoot())
        mileageTracker = null
        impactDetector?.stop()
        impactDetector = null
    }

    private fun broadcastMileage() {
        sendBroadcast(
            Intent(ACTION_MILEAGE)
                .setPackage(packageName)
                .putExtra("shiftMiles", currentShiftMiles)
                .putExtra("weekMiles", currentWeekMiles)
        )
    }

    private fun setupScreenCapture(resultCode: Int, data: Intent) {
        try {
            val manager = getSystemService(MediaProjectionManager::class.java)
            val projection = manager.getMediaProjection(resultCode, data)
            mediaProjection = projection
            projection.registerCallback(projectionCallback, handler)

            val dm = resources.displayMetrics
            val width = dm.widthPixels.coerceAtLeast(1)
            val height = dm.heightPixels.coerceAtLeast(1)
            val density = dm.densityDpi

            val reader = ImageReader.newInstance(
                width,
                height,
                PixelFormat.RGBA_8888,
                2
            )
            imageReader = reader

            virtualDisplay = projection.createVirtualDisplay(
                "WVLRP-SNAP",
                width,
                height,
                density,
                DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR,
                reader.surface,
                null,
                null
            )

            showSnapOverlay()
        } catch (e: Exception) {
            Log.e("WVLRP-MobileLive", "SNAP screen capture setup failed", e)
            status("SNAP SETUP ERROR: " + (e.message ?: "unknown"))
            releaseCaptureSurfaces()
        }
    }

    private fun showSnapOverlay() {
        if (Build.VERSION.SDK_INT >= 23 && !Settings.canDrawOverlays(this)) return
        if (overlayView != null) return

        val wm = getSystemService(WINDOW_SERVICE) as WindowManager
        windowManager = wm

        val button = TextView(this).apply {
            text = "SNAP"
            setTextColor(Color.WHITE)
            textSize = 13f
            gravity = Gravity.CENTER
            setPadding(dp(14), dp(10), dp(14), dp(10))
            background = GradientDrawable().apply {
                shape = GradientDrawable.RECTANGLE
                cornerRadius = dp(24).toFloat()
                setColor(Color.argb(225, 18, 80, 48))
                setStroke(dp(1), Color.argb(180, 255, 255, 255))
            }
            elevation = dp(8).toFloat()
        }

        val params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.TOP or Gravity.END
            x = dp(14)
            y = dp(220)
        }

        overlayView = button
        overlayParams = params

        var downRawX = 0f
        var downRawY = 0f
        var startX = 0
        var startY = 0

        button.setOnTouchListener { _, event ->
            when (event.actionMasked) {
                MotionEvent.ACTION_DOWN -> {
                    downRawX = event.rawX
                    downRawY = event.rawY
                    startX = params.x
                    startY = params.y
                    true
                }

                MotionEvent.ACTION_MOVE -> {
                    params.x = startX - (event.rawX - downRawX).toInt()
                    params.y = startY + (event.rawY - downRawY).toInt()
                    try { wm.updateViewLayout(button, params) } catch (_: Exception) {}
                    true
                }

                MotionEvent.ACTION_UP -> {
                    val moved =
                        abs(event.rawX - downRawX) + abs(event.rawY - downRawY) > dp(18)
                    if (!moved) requestSnapshot()
                    true
                }

                else -> false
            }
        }

        try {
            wm.addView(button, params)
        } catch (e: Exception) {
            Log.e("WVLRP-MobileLive", "Could not show SNAP overlay", e)
            overlayView = null
            overlayParams = null
        }
    }

    private fun requestSnapshot() {
        val button = overlayView
        button?.visibility = View.INVISIBLE

        // Give Android one frame to redraw DoorDash/Maps without our button.
        handler.postDelayed({
            captureLatestScreen(0)
        }, 90)
    }

    private fun captureLatestScreen(attempt: Int) {
        val reader = imageReader
        if (reader == null) {
            restoreSnapOverlay()
            status("LIVE • SNAP unavailable")
            return
        }

        val image = try { reader.acquireLatestImage() } catch (_: Exception) { null }
        if (image == null) {
            if (attempt < 3) {
                handler.postDelayed({ captureLatestScreen(attempt + 1) }, 80)
            } else {
                restoreSnapOverlay()
                status("LIVE • SNAP missed — tap again")
            }
            return
        }

        Thread {
            saveSnapshotImage(image)
        }.start()
    }

    private fun saveSnapshotImage(image: Image) {
        try {
            val plane = image.planes[0]
            val buffer = plane.buffer
            buffer.rewind()

            val pixelStride = plane.pixelStride
            val rowStride = plane.rowStride
            val rowPadding = rowStride - pixelStride * image.width
            val paddedWidth = image.width + rowPadding / pixelStride

            val padded = Bitmap.createBitmap(
                paddedWidth,
                image.height,
                Bitmap.Config.ARGB_8888
            )
            padded.copyPixelsFromBuffer(buffer)

            val clean = Bitmap.createBitmap(
                padded,
                0,
                0,
                image.width,
                image.height
            )

            val capturedAt = System.currentTimeMillis()
            val file = File(screenshotDir(), "snap_" + capturedAt + ".png")
            FileOutputStream(file).use { out ->
                clean.compress(Bitmap.CompressFormat.PNG, 100, out)
            }

            if (clean !== padded) clean.recycle()
            padded.recycle()

            appendTimelineTag(capturedAt, file)

            status("SNAP SAVED • " + file.name)
        } catch (e: Exception) {
            Log.e("WVLRP-MobileLive", "Could not save SNAP image", e)
            status("LIVE • SNAP ERROR: " + (e.message ?: "unknown"))
        } finally {
            try { image.close() } catch (_: Exception) {}
            handler.post { restoreSnapOverlay() }
        }
    }

    private fun appendTimelineTag(capturedAt: Long, screenshot: File) {
        val segmentName = currentSegment?.name ?: ""
        val offsetMs =
            if (currentSegmentStartMs > 0L) (capturedAt - currentSegmentStartMs).coerceAtLeast(0L)
            else -1L

        val timeline = File(recordingRoot(), "timeline.csv")
        if (!timeline.exists()) {
            timeline.appendText(
                "timestamp_ms,event,segment,segment_offset_ms,screenshot\n"
            )
        }

        timeline.appendText(
            capturedAt.toString() + ",SNAP," +
                csv(segmentName) + "," +
                offsetMs.toString() + "," +
                csv(screenshot.name) + "\n"
        )

        val sidecar = File(screenshot.parentFile, screenshot.nameWithoutExtension + ".txt")
        sidecar.writeText(
            "WVLRP SNAP\n" +
                "timestamp_ms=" + capturedAt + "\n" +
                "segment=" + segmentName + "\n" +
                "segment_offset_ms=" + offsetMs + "\n"
        )
    }

    private fun csv(value: String): String =
        "\"" + value.replace("\"", "\"\"") + "\""

    private fun restoreSnapOverlay() {
        overlayView?.visibility = View.VISIBLE
    }

    private fun removeSnapOverlay() {
        val v = overlayView ?: return
        try { windowManager?.removeView(v) } catch (_: Exception) {}
        overlayView = null
        overlayParams = null
        windowManager = null
    }

    private fun releaseCaptureSurfaces() {
        try { virtualDisplay?.release() } catch (_: Exception) {}
        virtualDisplay = null
        try { imageReader?.close() } catch (_: Exception) {}
        imageReader = null
    }

    private fun shutdownProjection() {
        releaseCaptureSurfaces()
        removeSnapOverlay()
        val projection = mediaProjection
        mediaProjection = null
        try { projection?.stop() } catch (_: Exception) {}
    }

    private fun dp(value: Int): Int =
        (value * resources.displayMetrics.density).toInt().coerceAtLeast(1)

    fun stopBroadcast() {
        stopping = true
        handler.removeCallbacks(rotateRunnable)
        stopSessionTrackers()
        shutdownProjection()
        try { stream?.release() } catch (_: Exception) {}
        stream = null
        connected = false
        currentSegment = null
        currentSegmentStartMs = 0L
        status("OFFLINE")
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    override fun onDestroy() {
        stopping = true
        handler.removeCallbacks(rotateRunnable)
        stopSessionTrackers()
        shutdownProjection()
        try { stream?.release() } catch (_: Exception) {}
        stream = null
        connected = false
        currentSegment = null
        currentSegmentStartMs = 0L
        super.onDestroy()
    }

    private fun status(s: String) {
        sendBroadcast(
            Intent(ACTION_STATUS)
                .setPackage(packageName)
                .putExtra("status", s)
        )
    }

    private fun fail(reason: String) {
        Log.e("WVLRP-MobileLive", reason)
        status("ERROR: " + reason)
        stopBroadcast()
    }

    override fun onConnectionStarted(url: String) {
        connected = false
        status("CONNECTING")
    }

    override fun onConnectionSuccess() {
        connected = true
        promote(
            if (mediaProjection != null) {
                "LIVE — camera + mic • rolling 60 min • SNAP ready"
            } else {
                "LIVE — camera + mic • rolling 60 min"
            }
        )
        status(
            if (mediaProjection != null) {
                "LIVE • ROLLING LAST 60 MIN • SNAP READY"
            } else {
                "LIVE • ROLLING LAST 60 MIN"
            }
        )
    }

    override fun onConnectionFailed(reason: String) {
        val w = stream ?: return
        connected = false
        if (!stopping && w.getStreamClient().reTry(3000, reason, null)) {
            status("RECONNECTING • LOCAL RECORDING CONTINUES")
        } else {
            fail(reason)
        }
    }

    override fun onNewBitrate(bitrate: Long) {
        if (connected) {
            status(
                "LIVE • " + (bitrate / 1000) +
                    " kbps • ROLLING 60 MIN" +
                    if (mediaProjection != null) " • SNAP" else ""
            )
        }
    }

    override fun onDisconnect() {
        connected = false
        if (!stopping) status("DISCONNECTED • LOCAL RECORDING CONTINUES")
    }

    override fun onAuthError() { fail("Broadcast authorization failed") }
    override fun onAuthSuccess() {}
    override fun onBind(intent: Intent?): IBinder? = null
}
