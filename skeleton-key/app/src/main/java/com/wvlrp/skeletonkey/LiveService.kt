package com.wvlrp.mobilelive

import android.app.*
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import android.util.Log
import com.pedro.common.ConnectChecker
import com.pedro.library.whip.WhipStream

class LiveService : Service(), ConnectChecker {
    companion object {
        const val CHANNEL = "wvlrp_mobile_live"
        const val ID = 987
        const val ACTION_STATUS = "com.wvlrp.mobilelive.STATUS"
        const val ENDPOINT = "https://wvlrp.com/webrtc/mobile/whip"
    }
    private var stream: WhipStream? = null
    private var stopping = false

    override fun onCreate() {
        super.onCreate()
        if (Build.VERSION.SDK_INT >= 26) {
            val c = NotificationChannel(CHANNEL, "WVLRP Mobile Live", NotificationManager.IMPORTANCE_LOW)
            c.description = "WVLRP camera and microphone broadcast"
            getSystemService(NotificationManager::class.java).createNotificationChannel(c)
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        promote("Starting WVLRP Mobile Live…")
        if (stream == null) startBroadcast()
        return START_STICKY
    }

    private fun promote(message: String) {
        val open = PendingIntent.getActivity(this, 0, Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
        val n = Notification.Builder(this, CHANNEL)
            .setContentTitle("WVLRP Mobile Live")
            .setContentText(message)
            .setSmallIcon(android.R.drawable.presence_video_online)
            .setOngoing(true).setContentIntent(open).build()
        if (Build.VERSION.SDK_INT >= 30) {
            startForeground(ID, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_CAMERA or ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE)
        } else startForeground(ID, n)
    }

    private fun startBroadcast() {
        try {
            val w = WhipStream(applicationContext, this)
            stream = w
            val video = w.prepareVideo(720, 1280, 30, 2_000_000, 90)
            val audio = w.prepareAudio(64_000, false, 48_000, true, true)
            if (!video || !audio) {
                fail("Phone encoder could not be prepared")
                return
            }
            w.getStreamClient().setReTries(20)
            status("CONNECTING")
            w.startStream(ENDPOINT)
        } catch (e: Exception) {
            fail(e.message ?: "Unable to start camera")
        }
    }

    fun stopBroadcast() {
        stopping = true
        try { stream?.stopStream() } catch (_: Exception) {}
        try { stream?.release() } catch (_: Exception) {}
        stream = null
        status("OFFLINE")
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    override fun onDestroy() {
        if (!stopping) {
            try { stream?.stopStream() } catch (_: Exception) {}
            try { stream?.release() } catch (_: Exception) {}
        }
        stream = null
        super.onDestroy()
    }

    private fun status(s: String) {
        sendBroadcast(Intent(ACTION_STATUS).setPackage(packageName).putExtra("status", s))
    }
    private fun fail(reason: String) {
        Log.e("WVLRP-MobileLive", reason)
        status("ERROR: $reason")
        stopBroadcast()
    }

    override fun onConnectionStarted(url: String) { status("CONNECTING") }
    override fun onConnectionSuccess() {
        promote("LIVE — camera + mic are broadcasting")
        status("LIVE")
    }
    override fun onConnectionFailed(reason: String) {
        val w = stream ?: return
        if (!stopping && w.getStreamClient().reTry(3000, reason, null)) {
            status("RECONNECTING")
        } else fail(reason)
    }
    override fun onNewBitrate(bitrate: Long) { status("LIVE • " + (bitrate / 1000) + " kbps") }
    override fun onDisconnect() { if (!stopping) status("DISCONNECTED") }
    override fun onAuthError() { fail("Broadcast authorization failed") }
    override fun onAuthSuccess() {}
    override fun onBind(intent: Intent?): IBinder? = null
}
