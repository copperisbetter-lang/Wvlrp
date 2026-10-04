package com.wvlrp.mobilelive

import android.Manifest
import android.app.Activity
import android.content.*
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.widget.Button
import android.widget.TextView

class MainActivity : Activity() {
    private lateinit var status: TextView
    private lateinit var saveButton: Button
    private val requestCode = 41

    private val receiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            val s = intent?.getStringExtra("status") ?: return
            status.text = s
            saveButton.isEnabled =
                !s.startsWith("OFFLINE") &&
                !s.startsWith("ERROR") &&
                !s.startsWith("NOT LIVE")
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        status = findViewById(R.id.status)
        saveButton = findViewById(R.id.saveButton)

        findViewById<Button>(R.id.liveButton).setOnClickListener { requestAndStart() }

        findViewById<Button>(R.id.stopButton).setOnClickListener {
            stopService(Intent(this, LiveService::class.java))
            status.text = "OFFLINE"
            saveButton.isEnabled = false
        }

        saveButton.setOnClickListener {
            startService(
                Intent(this, LiveService::class.java)
                    .setAction(LiveService.ACTION_SAVE_LAST_HOUR)
            )
            status.text = "PROTECTING ROLLING VIDEO…"
        }
    }

    override fun onStart() {
        super.onStart()
        val f = IntentFilter(LiveService.ACTION_STATUS)
        if (Build.VERSION.SDK_INT >= 33) {
            registerReceiver(receiver, f, RECEIVER_NOT_EXPORTED)
        } else {
            @Suppress("DEPRECATION")
            registerReceiver(receiver, f)
        }
    }

    override fun onStop() {
        try { unregisterReceiver(receiver) } catch (_: Exception) {}
        super.onStop()
    }

    private fun requestAndStart() {
        val p = mutableListOf(Manifest.permission.CAMERA, Manifest.permission.RECORD_AUDIO)
        if (Build.VERSION.SDK_INT >= 33) p.add(Manifest.permission.POST_NOTIFICATIONS)

        val missing = p.filter { checkSelfPermission(it) != PackageManager.PERMISSION_GRANTED }
        if (missing.isNotEmpty()) {
            requestPermissions(missing.toTypedArray(), requestCode)
        } else {
            startLive()
        }
    }

    override fun onRequestPermissionsResult(
        code: Int,
        permissions: Array<out String>,
        results: IntArray
    ) {
        super.onRequestPermissionsResult(code, permissions, results)
        if (code == requestCode && results.isNotEmpty() && results.all { it == PackageManager.PERMISSION_GRANTED }) {
            startLive()
        } else {
            status.text = "Camera + microphone permission required"
        }
    }

    private fun startLive() {
        val i = Intent(this, LiveService::class.java)
        if (Build.VERSION.SDK_INT >= 26) startForegroundService(i) else startService(i)
        status.text = "CONNECTING"
        saveButton.isEnabled = true
    }
}
