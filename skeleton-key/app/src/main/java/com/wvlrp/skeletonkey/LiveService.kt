package com.wvlrp.mobilelive

import android.app.*
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.Environment
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.util.Log
import com.pedro.common.ConnectChecker
import com.pedro.common.VideoCodec
import com.pedro.library.base.recording.RecordController
import com.pedro.library.whip.WhipStream
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class LiveService : Service(), ConnectChecker {
    companion object {
        const val CHANNEL = "wvlrp_mobile_live"
        const val ID = 987
        const val ACTION_STATUS = "com.wvlrp.mobilelive.STATUS"
        const val ACTION_SAVE_LAST_HOUR = "com.wvlrp.mobilelive.SAVE_LAST_HOUR"
        const val ENDPOINT = "https://wvlrp.com/webrtc/mobile/whip"
        private const val SEGMENT_MS = 5L * 60L * 1000L
        private const val MAX_SEGMENTS = 12
    }

    private var stream: WhipStream? = null
    private var stopping = false
    private var connected = false
    private var currentSegment: File? = null
    private val handler = Handler(Looper.getMainLooper())
    private val rotateRunnable = Runnable { rotateSegment() }

    override fun onCreate() {
        super.onCreate()
        if (Build.VERSION.SDK_INT >= 26) {
            val c = NotificationChannel(CHANNEL, "WVLRP Mobile Live", NotificationManager.IMPORTANCE_LOW)
            c.description = "WVLRP camera, microphone, and rolling local recording"
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

        promote("Starting WVLRP Mobile Live…")
        if (stream == null) startBroadcast()
        return START_STICKY
    }

    private fun promote(message: String) {
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
            startForeground(
                ID, n,
                ServiceInfo.FOREGROUND_SERVICE_TYPE_CAMERA or
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE
            )
        } else {
            startForeground(ID, n)
        }
    }

    private fun startBroadcast() {
        try {
            val w = WhipStream(applicationContext, this)
            stream = w

            // VP8 + Opus is native to WHIP/WebRTC and lets Android also mux the
            // same encoded audio/video into a local WebM rolling recorder.
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
        return File(base, "WVLRP")
    }

    private fun ringDir(): File = File(recordingRoot(), "Rolling").apply { mkdirs() }
    private fun savedDir(): File = File(recordingRoot(), "Saved").apply { mkdirs() }

    private fun startNewSegment() {
        val w = stream ?: return
        if (Build.VERSION.SDK_INT < 29) {
            status("LIVE • local audio recording requires Android 10+")
            return
        }
        try {
            val file = File(ringDir(), "wvlrp_" + System.currentTimeMillis() + ".webm")
            currentSegment = file
            w.startRecord(file.absolutePath, RecordController.RecordTracks.ALL) { recordStatus ->
                if (recordStatus == RecordController.Status.RECORDING && connected) {
                    status("LIVE • ROLLING LAST 60 MIN")
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

    private fun protectLastHour() {
        val w = stream ?: return
        handler.removeCallbacks(rotateRunnable)

        try {
            if (w.isRecording) w.stopRecord()
        } catch (e: Exception) {
            Log.e("WVLRP-MobileLive", "Could not finalize segment before save", e)
        }
        currentSegment = null

        val clips = ringFiles().takeLast(MAX_SEGMENTS)
        if (clips.isEmpty()) {
            status("LIVE • nothing recorded yet")
            startNewSegment()
            return
        }

        val stamp = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(Date())
        val eventDir = File(savedDir(), "saved_" + stamp).apply { mkdirs() }
        var saved = 0

        clips.forEachIndexed { index, source ->
            val target = File(eventDir, String.format(Locale.US, "%02d_%s", index + 1, source.name))
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

        status("SAVED LAST HOUR • " + saved + " clip" + if (saved == 1) "" else "s")
        promote("LIVE — last hour protected • rolling recorder restarted")
        startNewSegment()
    }

    fun stopBroadcast() {
        stopping = true
        handler.removeCallbacks(rotateRunnable)
        try { stream?.release() } catch (_: Exception) {}
        stream = null
        connected = false
        currentSegment = null
        status("OFFLINE")
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    override fun onDestroy() {
        handler.removeCallbacks(rotateRunnable)
        if (!stopping) {
            try { stream?.release() } catch (_: Exception) {}
        }
        stream = null
        connected = false
        currentSegment = null
        super.onDestroy()
    }

    private fun status(s: String) {
        sendBroadcast(Intent(ACTION_STATUS).setPackage(packageName).putExtra("status", s))
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
        promote("LIVE — camera + mic • rolling last 60 minutes locally")
        status("LIVE • ROLLING LAST 60 MIN")
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
        if (connected) status("LIVE • " + (bitrate / 1000) + " kbps • ROLLING 60 MIN")
    }

    override fun onDisconnect() {
        connected = false
        if (!stopping) status("DISCONNECTED • LOCAL RECORDING CONTINUES")
    }

    override fun onAuthError() { fail("Broadcast authorization failed") }
    override fun onAuthSuccess() {}
    override fun onBind(intent: Intent?): IBinder? = null
}
