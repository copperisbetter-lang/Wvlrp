package com.wvlrp.mobilelive

import android.app.*
import android.content.Intent
import android.os.IBinder
import android.content.pm.ServiceInfo
import android.os.Build

class LiveService: Service(){
    companion object { const val CHANNEL="wvlrp_mobile_live"; const val ID=987 }
    override fun onCreate(){
        super.onCreate()
        if(Build.VERSION.SDK_INT>=26){
            val c=NotificationChannel(CHANNEL,"WVLRP Mobile Live",NotificationManager.IMPORTANCE_LOW)
            c.description="Keeps WVLRP Mobile Live running while camera and microphone are active"
            getSystemService(NotificationManager::class.java).createNotificationChannel(c)
        }
    }
    override fun onStartCommand(intent:Intent?,flags:Int,startId:Int):Int{
        val open=PendingIntent.getActivity(this,0,Intent(this,MainActivity::class.java),PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
        val n=Notification.Builder(this,CHANNEL).setContentTitle("WVLRP Mobile Live").setContentText("LIVE service is running — tap to return").setSmallIcon(android.R.drawable.presence_video_online).setOngoing(true).setContentIntent(open).build()
        if(Build.VERSION.SDK_INT>=29) startForeground(ID,n,ServiceInfo.FOREGROUND_SERVICE_TYPE_CAMERA or ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE) else startForeground(ID,n)
        // Streaming transport is connected to WVLRP's Mobile Live ingest in the next service layer.
        return START_STICKY
    }
    override fun onBind(intent:Intent?):IBinder?=null
}
