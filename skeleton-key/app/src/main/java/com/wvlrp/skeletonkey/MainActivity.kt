package com.wvlrp.mobilelive

import android.Manifest
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.widget.Button
import android.widget.TextView

class MainActivity : Activity() {
    private lateinit var status: TextView
    private val requestCode = 41
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        status=findViewById(R.id.status)
        findViewById<Button>(R.id.liveButton).setOnClickListener {
            val p=mutableListOf(Manifest.permission.CAMERA,Manifest.permission.RECORD_AUDIO)
            if(Build.VERSION.SDK_INT>=33)p.add(Manifest.permission.POST_NOTIFICATIONS)
            val missing=p.filter{checkSelfPermission(it)!=PackageManager.PERMISSION_GRANTED}
            if(missing.isNotEmpty()) requestPermissions(missing.toTypedArray(),requestCode) else startLive()
        }
        findViewById<Button>(R.id.stopButton).setOnClickListener {
            stopService(Intent(this,LiveService::class.java));status.text="OFFLINE"
        }
    }
    override fun onRequestPermissionsResult(code:Int,permissions:Array<out String>,results:IntArray){
        super.onRequestPermissionsResult(code,permissions,results)
        if(code==requestCode && results.isNotEmpty() && results.all{it==PackageManager.PERMISSION_GRANTED}) startLive()
        else status.text="Camera + microphone permission required"
    }
    private fun startLive(){
        val i=Intent(this,LiveService::class.java)
        if(Build.VERSION.SDK_INT>=26)startForegroundService(i) else startService(i)
        status.text="LIVE — safe to switch apps"
    }
}
