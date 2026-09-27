package com.wvlrp.skeletonkey
import android.app.Activity
import android.os.Bundle
import android.text.method.ScrollingMovementMethod
import android.view.Gravity
import android.widget.*
import java.net.*
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicInteger

class MainActivity : Activity() {
 private lateinit var out:TextView; private lateinit var scan:Button
 private val ports=intArrayOf(80,81,443,554,8000,8080,8081,8899,9000,34567,37777,5000)
 private val pool=Executors.newFixedThreadPool(32)
 override fun onCreate(b:Bundle?){super.onCreate(b)
  val root=LinearLayout(this).apply{orientation=LinearLayout.VERTICAL;setPadding(28,32,28,24)}
  root.addView(TextView(this).apply{text="SKELETON KEY";textSize=28f;gravity=Gravity.CENTER})
  root.addView(TextView(this).apply{text="WVLRP Camera Discovery Probe\nLAN-only • no password guessing";textSize=14f;gravity=Gravity.CENTER})
  scan=Button(this).apply{text="SCAN MY NETWORK";setOnClickListener{startScan()}};root.addView(scan)
  out=TextView(this).apply{text="Ready. Connect this phone to the same Wi-Fi as the Huntvision C31W, then tap SCAN.\n";textSize=13f;movementMethod=ScrollingMovementMethod()}
  root.addView(ScrollView(this).apply{addView(out)},LinearLayout.LayoutParams(-1,0,1f));setContentView(root)}
 private fun log(s:String)=runOnUiThread{out.append(s+"\n")}
 private fun prefix():String?{val e=NetworkInterface.getNetworkInterfaces();while(e.hasMoreElements()){val n=e.nextElement();for(a in n.inetAddresses)if(!a.isLoopbackAddress&&a is Inet4Address&&a.isSiteLocalAddress){val p=a.hostAddress!!.split(".");if(p.size==4)return p.take(3).joinToString(".")}};return null}
 private fun startScan(){scan.isEnabled=false;out.text="";Thread{val pre=prefix();if(pre==null){log("No local Wi-Fi IPv4 address found.");done();return@Thread};log("Network: "+pre+".0/24");log("Sending ONVIF WS-Discovery probe…");wsDiscovery();log("Scanning common camera services…");val left=AtomicInteger(254)
  for(i in 1..254)pool.execute{val ip=pre+"."+i;val open=mutableListOf<Int>();for(p in ports)try{Socket().use{it.connect(InetSocketAddress(ip,p),140);open.add(p)}}catch(_:Exception){}
   if(open.isNotEmpty()){val labels=open.joinToString(", "){p->when(p){80,81,8080,8081->p.toString()+" HTTP";443->"443 HTTPS";554->"554 RTSP";8899->"8899 ONVIF?";34567,37777->p.toString()+" camera/DVR";else->p.toString()}};log("\nFOUND "+ip+"\n  Services: "+labels);if(554 in open)log("  ★ RTSP exposed — strong stream candidate");if(open.any{it==80||it==81||it==8080||it==8081})log("  ★ HTTP exposed — device/API candidate")}
   if(left.decrementAndGet()==0){log("\nScan complete.");done()}}}.start()}
 private fun wsDiscovery(){val xml="<?xml version=\"1.0\" encoding=\"UTF-8\"?><e:Envelope xmlns:e=\"http://www.w3.org/2003/05/soap-envelope\" xmlns:w=\"http://schemas.xmlsoap.org/ws/2004/08/addressing\" xmlns:d=\"http://schemas.xmlsoap.org/ws/2005/04/discovery\" xmlns:dn=\"http://www.onvif.org/ver10/network/wsdl\"><e:Header><w:MessageID>uuid:"+java.util.UUID.randomUUID()+"</w:MessageID><w:To>urn:schemas-xmlsoap-org:ws:2005:04:discovery</w:To><w:Action>http://schemas.xmlsoap.org/ws/2005/04/discovery/Probe</w:Action></e:Header><e:Body><d:Probe><d:Types>dn:NetworkVideoTransmitter</d:Types></d:Probe></e:Body></e:Envelope>"
  try{DatagramSocket().use{s->s.soTimeout=1800;val d=xml.toByteArray();s.send(DatagramPacket(d,d.size,InetAddress.getByName("239.255.255.250"),3702));val end=System.currentTimeMillis()+1800;while(System.currentTimeMillis()<end)try{val b=ByteArray(8192);val p=DatagramPacket(b,b.size);s.receive(p);val body=String(p.data,0,p.length);val x=Regex("<[^>]*XAddrs[^>]*>(.*?)</[^>]*XAddrs>").find(body)?.groupValues?.get(1);log("ONVIF reply: "+p.address.hostAddress+(if(x!=null)"\n  Endpoint: "+x else ""))}catch(_:SocketTimeoutException){break}}}catch(e:Exception){log("ONVIF discovery: "+e.message)}
 }
 private fun done()=runOnUiThread{scan.isEnabled=true}
}