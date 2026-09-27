package com.wvlrp.skeletonkey
import android.app.Activity
import android.os.*
import android.text.method.ScrollingMovementMethod
import android.view.Gravity
import android.widget.*
import java.io.*
import java.net.*
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicInteger

class MainActivity:Activity(){
 private lateinit var log:TextView; private lateinit var scan:Button
 private val pool=Executors.newFixedThreadPool(32); private val main=Handler(Looper.getMainLooper())
 private val excluded=setOf("192.168.1.35","192.168.1.118","192.168.1.237")
 private val ports=intArrayOf(80,443,554,8000,8080,8554,8888,9000,34567,37777,49152)
 private val count=AtomicInteger()
 override fun onCreate(b:Bundle?){super.onCreate(b);val box=LinearLayout(this).apply{orientation=LinearLayout.VERTICAL;setPadding(28,28,28,28)}
 box.addView(TextView(this).apply{text="SKELETON KEY";textSize=28f;gravity=Gravity.CENTER})
 box.addView(TextView(this).apply{text="WVLRP Camera Discovery Probe\nLAN-only • no password guessing";gravity=Gravity.CENTER})
 scan=Button(this).apply{text="SCAN FOR UNKNOWN CAMERAS";setOnClickListener{startScan()}};box.addView(scan)
 log=TextView(this).apply{textSize=13f;movementMethod=ScrollingMovementMethod();setTextIsSelectable(true)}
 box.addView(ScrollView(this).apply{addView(log)},LinearLayout.LayoutParams(-1,0,1f));setContentView(box)}
 private fun line(s:String)=main.post{log.append(s+"\n")}
 private fun startScan(){scan.isEnabled=false;log.text="";count.set(0);line("Known ICAM35L60 excluded: .35, .118, .237");line("Scanning 192.168.1.0/24 ...");val left=AtomicInteger(254)
  for(i in 1..254)pool.execute{val ip="192.168.1."+i;if(ip !in excluded)probe(ip);if(left.decrementAndGet()==0)main.post{scan.isEnabled=true;line("\nDone. Candidates: "+count.get())}}}
 private fun probe(ip:String){val open=mutableListOf<Int>();for(p in ports)try{Socket().use{it.connect(InetSocketAddress(ip,p),180);open.add(p)}}catch(_:Exception){}
  if(open.isEmpty())return;val fp=mutableListOf<String>();if(80 in open)http(ip,80)?.let{fp.add(it)};if(8080 in open)http(ip,8080)?.let{fp.add(it)}
  if(554 in open||8554 in open)rtsp(ip,if(554 in open)554 else 8554)?.let{fp.add(it)}
  val joined=fp.joinToString(" ").lowercase();val consumer=listOf("chromecast","google tv","android tv","roku","webos","tizen","airplay","iphone","ipad").any{joined.contains(it)}
  if(consumer)return;count.incrementAndGet();line("\n"+ip);line("Services: "+open.joinToString(", "));fp.forEach{line(it)}
  if(open.any{it in intArrayOf(8080,8888,9000,34567,37777,49152)})line("★ Priority fingerprint candidate")}
 private fun http(ip:String,p:Int):String?=try{Socket().use{s->s.connect(InetSocketAddress(ip,p),250);s.soTimeout=450;OutputStreamWriter(s.getOutputStream()).apply{write("HEAD / HTTP/1.0\r\nHost: "+ip+"\r\n\r\n");flush()};val br=BufferedReader(InputStreamReader(s.getInputStream()));val a=mutableListOf<String>();repeat(8){br.readLine()?.let(a::add)};"HTTP "+p+": "+a.joinToString(" | ").take(400)}}catch(_:Exception){null}
 private fun rtsp(ip:String,p:Int):String?=try{Socket().use{s->s.connect(InetSocketAddress(ip,p),250);s.soTimeout=500;OutputStreamWriter(s.getOutputStream()).apply{write("OPTIONS rtsp://"+ip+":"+p+"/ RTSP/1.0\r\nCSeq: 1\r\n\r\n");flush()};val br=BufferedReader(InputStreamReader(s.getInputStream()));val a=mutableListOf<String>();repeat(10){br.readLine()?.let(a::add)};"RTSP "+p+": "+a.joinToString(" | ").take(500)}}catch(_:Exception){null}
}