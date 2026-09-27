package com.wvlrp.skeletonkey
import android.app.Activity
import android.os.*
import android.text.method.ScrollingMovementMethod
import android.view.Gravity
import android.widget.*
import java.io.ByteArrayOutputStream
import java.net.*
import java.nio.charset.StandardCharsets
import java.util.concurrent.Executors

class MainActivity : Activity() {
 private val host="192.168.1.26"; private val port=8888
 private val uid="7ZF544GA8T299IRWIJZZZCJE"
 private lateinit var log:TextView; private lateinit var button:Button
 private val io=Executors.newSingleThreadExecutor(); private val ui=Handler(Looper.getMainLooper())
 override fun onCreate(b:Bundle?){super.onCreate(b)
  val box=LinearLayout(this).apply{orientation=LinearLayout.VERTICAL;setPadding(28,28,28,28)}
  box.addView(TextView(this).apply{text="SKELETON KEY — C31W";textSize=26f;gravity=Gravity.CENTER})
  box.addView(TextView(this).apply{text="Known target only\n192.168.1.26:8888\nC31W • firmware 1.1.1.1_5.2.3.148\nUID "+uid;gravity=Gravity.CENTER})
  button=Button(this).apply{text="PROBE HUNTVISION :8888";setOnClickListener{probe()}};box.addView(button)
  log=TextView(this).apply{textSize=13f;movementMethod=ScrollingMovementMethod();setTextIsSelectable(true)}
  box.addView(ScrollView(this).apply{addView(log)},LinearLayout.LayoutParams(-1,0,1f));setContentView(box)
 }
 private fun line(s:String)=ui.post{log.append(s+"\n")}
 private fun sock()=Socket().apply{connect(InetSocketAddress(host,port),1200);soTimeout=1200}
 private fun probe(){button.isEnabled=false;log.text="";line("Target "+host+":"+port);line("No LAN sweep. No ONVIF assumptions. No password guessing.")
  io.execute{
   val open=try{sock().use{};true}catch(e:Exception){false};line(if(open)"TCP 8888: OPEN" else "TCP 8888: no connection")
   if(open){exchange(null,"Passive banner");exchange("GET / HTTP/1.0\r\nHost: "+host+"\r\nConnection: close\r\n\r\n".toByteArray(),"HTTP GET");exchange("HEAD / HTTP/1.0\r\nHost: "+host+"\r\nConnection: close\r\n\r\n".toByteArray(),"HTTP HEAD");exchange((uid+"\r\n").toByteArray(),"UID text");exchange(byteArrayOf(0,0,0,0),"4-byte zero")}
   line("Probe complete. Copy the full result back to Gator.");ui.post{button.isEnabled=true}
  }
 }
 private fun exchange(payload:ByteArray?,label:String){try{sock().use{s->
   if(payload!=null){s.getOutputStream().write(payload);s.getOutputStream().flush()}
   val out=ByteArrayOutputStream();val buf=ByteArray(4096)
   try{while(out.size()<16384){val n=s.getInputStream().read(buf);if(n<=0)break;out.write(buf,0,n);if(n<buf.size)break}}catch(e:Exception){}
   val data=out.toByteArray();line(label+": "+if(data.isEmpty())"no reply" else describe(data))
  }}catch(e:Exception){line(label+": "+e.javaClass.simpleName)}}
 private fun describe(data:ByteArray):String{
  val hex=data.take(256).joinToString(" "){"%02X".format(it.toInt() and 255)}
  val txt=String(data.take(1024).toByteArray(),StandardCharsets.ISO_8859_1).map{c->if(c.code in 32..126)c else '.'}.joinToString("")
  return "bytes="+data.size+" | text="+txt+" | hex="+hex
 }
}