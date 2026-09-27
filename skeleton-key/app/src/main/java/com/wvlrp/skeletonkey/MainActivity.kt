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
 private val deepTargets=mapOf("192.168.1.12" to 8080,"192.168.1.26" to 8888,"192.168.1.64" to 9000)
 private val count=AtomicInteger()
 override fun onCreate(b:Bundle?){super.onCreate(b);val box=LinearLayout(this).apply{orientation=LinearLayout.VERTICAL;setPadding(28,28,28,28)}
 box.addView(TextView(this).apply{text="SKELETON KEY";textSize=28f;gravity=Gravity.CENTER})
 box.addView(TextView(this).apply{text="WVLRP Camera Discovery Probe\nLAN-only • no password guessing";gravity=Gravity.CENTER})
 scan=Button(this).apply{text="SCAN + DEEP PROBE";setOnClickListener{startScan()}};box.addView(scan)
 log=TextView(this).apply{textSize=13f;movementMethod=ScrollingMovementMethod();setTextIsSelectable(true)}
 box.addView(ScrollView(this).apply{addView(log)},LinearLayout.LayoutParams(-1,0,1f));setContentView(box)}
 private fun line(s:String)=main.post{log.append(s+"\n")}
 private fun startScan(){scan.isEnabled=false;log.text="";count.set(0);line("Known ICAM35L60 excluded: .35, .118, .237");line("Deep targets: .12:8080, .26:8888, .64:9000");line("Scanning 192.168.1.0/24 ...");val left=AtomicInteger(254)
  for(i in 1..254)pool.execute{val ip="192.168.1."+i;if(ip !in excluded)probe(ip);if(left.decrementAndGet()==0)main.post{scan.isEnabled=true;line("\nDone. Candidates: "+count.get())}}}
 private fun probe(ip:String){val open=mutableListOf<Int>();for(p in ports)try{Socket().use{it.connect(InetSocketAddress(ip,p),180);open.add(p)}}catch(_:Exception){}
  if(open.isEmpty())return;val fp=mutableListOf<String>();if(80 in open)http(ip,80)?.let{fp.add(it)};if(8080 in open)http(ip,8080)?.let{fp.add(it)}
  if(554 in open||8554 in open)rtsp(ip,if(554 in open)554 else 8554)?.let{fp.add(it)}
  deepTargets[ip]?.takeIf{it in open}?.let{p->deep(ip,p).forEach{fp.add(it)}}
  val joined=fp.joinToString(" ").lowercase();val consumer=listOf("chromecast","google tv","android tv","roku","webos","tizen","airplay","iphone","ipad").any{joined.contains(it)}
  if(consumer)return;count.incrementAndGet();line("\n"+ip);line("Services: "+open.joinToString(", "));fp.forEach{line(it)}
  if(deepTargets.containsKey(ip))line("★ DEEP TARGET") else if(open.any{it in intArrayOf(8080,8888,9000,34567,37777,49152)})line("★ Priority fingerprint candidate")}
 private fun http(ip:String,p:Int):String?=request(ip,p,"HEAD / HTTP/1.0\r\nHost: $ip\r\nConnection: close\r\n\r\n","HTTP $p")
 private fun rtsp(ip:String,p:Int):String?=request(ip,p,"OPTIONS rtsp://$ip:$p/ RTSP/1.0\r\nCSeq: 1\r\nUser-Agent: SkeletonKey\r\n\r\n","RTSP $p")
 private fun deep(ip:String,p:Int):List<String>{val out=mutableListOf<String>();listOf(
  "GET / HTTP/1.0\r\nHost: $ip\r\nConnection: close\r\n\r\n" to "GET",
  "OPTIONS / HTTP/1.0\r\nHost: $ip\r\nConnection: close\r\n\r\n" to "HTTP OPTIONS",
  "OPTIONS rtsp://$ip:$p/ RTSP/1.0\r\nCSeq: 7\r\nUser-Agent: SkeletonKey\r\n\r\n" to "RTSP OPTIONS"
 ).forEach{(q,n)->request(ip,p,q,"DEEP $p $n")?.let(out::add)}
 rawBanner(ip,p)?.let{out.add("DEEP $p banner: $it")};return out}
 private fun request(ip:String,p:Int,q:String,label:String):String?=try{Socket().use{s->s.connect(InetSocketAddress(ip,p),350);s.soTimeout=700;s.getOutputStream().write(q.toByteArray());s.getOutputStream().flush();val buf=ByteArray(1200);val n=s.getInputStream().read(buf);if(n>0)"$label: "+String(buf,0,n).replace("\r"," ").replace("\n"," | ").take(900) else null}}catch(_:Exception){null}
 private fun rawBanner(ip:String,p:Int):String?=try{Socket().use{s->s.connect(InetSocketAddress(ip,p),350);s.soTimeout=500;val b=ByteArray(256);val n=s.getInputStream().read(b);if(n>0)b.take(n).joinToString(" "){String.format("%02x",it)} else null}}catch(_:Exception){null}
}