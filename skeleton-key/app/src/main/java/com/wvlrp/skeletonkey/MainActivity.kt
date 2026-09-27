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
 private val ports=intArrayOf(80,443,554,8000,8080,8554,8888,9000,34567,37777,49152)\n private val deepTargets=setOf("192.168.1.12","192.168.1.26","192.168.1.64")
 private val count=AtomicInteger()
 override fun onCreate(b:Bundle?){super.onCreate(b);val box=LinearLayout(this).apply{orientation=LinearLayout.VERTICAL;setPadding(28,28,28,28)}
 box.addView(TextView(this).apply{text="SKELETON KEY";textSize=28f;gravity=Gravity.CENTER})
 box.addView(TextView(this).apply{text="WVLRP Camera Discovery Probe\nLAN-only • no password guessing";gravity=Gravity.CENTER})
 scan=Button(this).apply{text="SCAN + DEEP PROBE";setOnClickListener{startScan()}};box.addView(scan)
 log=TextView(this).apply{textSize=13f;movementMethod=ScrollingMovementMethod();setTextIsSelectable(true)}
 box.addView(ScrollView(this).apply{addView(log)},LinearLayout.LayoutParams(-1,0,1f));setContentView(box)}
 private fun line(s:String)=main.post{log.append(s+"\n")}
 private fun startScan(){scan.isEnabled=false;log.text="";count.set(0);line("Known ICAM35L60 excluded: .35, .118, .237");line("Scanning 192.168.1.0/24 ...");pool.execute{udpDiscovery()};val left=AtomicInteger(254)
  for(i in 1..254)pool.execute{val ip="192.168.1."+i;if(ip !in excluded)probe(ip);if(left.decrementAndGet()==0)main.post{scan.isEnabled=true;line("\nDone. Candidates: "+count.get())}}}
 private fun probe(ip:String){val open=mutableListOf<Int>();for(p in ports)try{Socket().use{it.connect(InetSocketAddress(ip,p),180);open.add(p)}}catch(_:Exception){}
  if(open.isEmpty())return;val fp=mutableListOf<String>();if(80 in open)http(ip,80)?.let{fp.add(it)};if(8080 in open)http(ip,8080)?.let{fp.add(it)}
  if(554 in open||8554 in open)rtsp(ip,if(554 in open)554 else 8554)?.let{fp.add(it)}
  val joined=fp.joinToString(" ").lowercase();val consumer=listOf("chromecast","google tv","android tv","roku","webos","tizen","airplay","iphone","ipad").any{joined.contains(it)}
  if(consumer)return;count.incrementAndGet();line("\n"+ip);line("Services: "+open.joinToString(", "));fp.forEach{line(it)}
  if(open.any{it in intArrayOf(8080,8888,9000,34567,37777,49152)})line("★ Priority fingerprint candidate"); if(ip in deepTargets){line("★★ TARGETED DEEP PROBE + SNAPSHOT SEARCH");deepCameraProbe(ip,open)} else if(open.containsAll(listOf(80,443,8000,49152))){line("★★ CAMERA-LIKE 80/443/8000/49152 TARGET");deepCameraProbe(ip,open)} else if(open.any{it in intArrayOf(8000,49152)}){deepCameraProbe(ip,open)}}
 private fun deepCameraProbe(ip:String,open:List<Int>){
  line("DEEP PROBE "+ip+" — read-only fingerprinting")
  val paths=listOf("/","/onvif/device_service","/onvif/Device_service","/device_service","/ISAPI/System/deviceInfo","/System/deviceInfo","/doc/page/login.asp","/web/","/upnp/","/description.xml","/rootDesc.xml","/api/device","/api/device/info","/device/info","/system/info","/snapshot.jpg","/snapshot.jpeg","/image.jpg","/jpg/image.jpg","/cgi-bin/snapshot.cgi","/cgi-bin/snapshot.cgi?channel=1","/cgi-bin/currentpic.cgi","/tmpfs/auto.jpg","/Streaming/channels/1/picture","/ISAPI/Streaming/channels/101/picture")
  for(p in listOf(80,443,8000,8080,8888,9000,49152))if(p in open)for(path in paths)deepHttp(ip,p,path)?.let{r->if(!r.contains("404 Not Found",true))line("DEEP "+p+" "+path+": "+r)}
  for(p in listOf(8000,49152))if(p in open)rawBanner(ip,p)?.let{line("DEEP "+p+" BANNER: "+it)}
  if(554 in open)rtsp(ip,554)?.let{line("DEEP RTSP: "+it)}
 }
 private fun udpDiscovery(){
  line("UDP discovery: SSDP/UPnP")
  try{DatagramSocket().use{d->d.soTimeout=1200;val q="M-SEARCH * HTTP/1.1\r\nHOST: 239.255.255.250:1900\r\nMAN: \"ssdp:discover\"\r\nMX: 1\r\nST: ssdp:all\r\n\r\n".toByteArray();d.send(DatagramPacket(q,q.size,InetAddress.getByName("239.255.255.250"),1900));val end=System.currentTimeMillis()+2500;while(System.currentTimeMillis()<end)try{val b=ByteArray(2048);val p=DatagramPacket(b,b.size);d.receive(p);val host=p.address.hostAddress ?: continue;if(host !in excluded){val s=String(p.data,0,p.length).replace("\r"," ").replace("\n"," ").take(500);line("UDP "+host+": "+s);val z=s.lowercase();if(listOf("ivy","huntvision","c31w","onvif","upnp").any{z.contains(it)})line("★★ IVY/HUNTVISION/CAMERA DISCOVERY FINGERPRINT")}}catch(_:SocketTimeoutException){}}}catch(e:Exception){line("UDP discovery unavailable")}
 }
 private fun deepHttp(ip:String,p:Int,path:String):String?=try{Socket().use{s->s.connect(InetSocketAddress(ip,p),350);s.soTimeout=650;OutputStreamWriter(s.getOutputStream()).apply{write("GET "+path+" HTTP/1.0\r\nHost: "+ip+"\r\nUser-Agent: SkeletonKey/0.5\r\nConnection: close\r\n\r\n");flush()};val br=BufferedReader(InputStreamReader(s.getInputStream()));val a=mutableListOf<String>();repeat(14){br.readLine()?.let(a::add)};a.joinToString(" | ").take(700)}}catch(_:Exception){null}
 private fun rawBanner(ip:String,p:Int):String?=try{Socket().use{s->s.connect(InetSocketAddress(ip,p),350);s.soTimeout=450;val b=ByteArray(256);val n=s.getInputStream().read(b);if(n>0)b.copyOf(n).joinToString(" "){String.format("%02x", it.toInt() and 0xff)}.take(600) else null}}catch(_:Exception){null}
 private fun http(ip:String,p:Int):String?=try{Socket().use{s->s.connect(InetSocketAddress(ip,p),250);s.soTimeout=450;OutputStreamWriter(s.getOutputStream()).apply{write("HEAD / HTTP/1.0\r\nHost: "+ip+"\r\n\r\n");flush()};val br=BufferedReader(InputStreamReader(s.getInputStream()));val a=mutableListOf<String>();repeat(8){br.readLine()?.let(a::add)};"HTTP "+p+": "+a.joinToString(" | ").take(400)}}catch(_:Exception){null}
 private fun rtsp(ip:String,p:Int):String?=try{Socket().use{s->s.connect(InetSocketAddress(ip,p),250);s.soTimeout=500;OutputStreamWriter(s.getOutputStream()).apply{write("OPTIONS rtsp://"+ip+":"+p+"/ RTSP/1.0\r\nCSeq: 1\r\n\r\n");flush()};val br=BufferedReader(InputStreamReader(s.getInputStream()));val a=mutableListOf<String>();repeat(10){br.readLine()?.let(a::add)};"RTSP "+p+": "+a.joinToString(" | ").take(500)}}catch(_:Exception){null}
}