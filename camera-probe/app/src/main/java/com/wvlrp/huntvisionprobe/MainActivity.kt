package com.wvlrp.huntvisionprobe

import android.app.Activity
import android.os.Bundle
import android.widget.*
import java.io.ByteArrayOutputStream
import java.net.InetSocketAddress
import java.net.Socket
import kotlin.concurrent.thread

class MainActivity:Activity(){
 private lateinit var output:TextView
 override fun onCreate(b:Bundle?){super.onCreate(b);setContentView(R.layout.activity_main);val ip=findViewById<EditText>(R.id.ip);val port=findViewById<EditText>(R.id.port);output=findViewById(R.id.output);findViewById<Button>(R.id.probe).setOnClickListener{output.text="Probing...\n";thread{probe(ip.text.toString().trim(),port.text.toString().toIntOrNull()?:8888)}}}
 private fun log(x:String)=runOnUiThread{output.append(x+"\n")}
 private fun probe(host:String,port:Int){
  val requests=listOf("RAW CONNECT" to null,"HTTP GET /" to ("GET / HTTP/1.1\r\nHost: "+host+"\r\nConnection: close\r\n\r\n").toByteArray(),"HTTP OPTIONS" to ("OPTIONS / HTTP/1.1\r\nHost: "+host+"\r\nConnection: close\r\n\r\n").toByteArray())
  for(pair in requests){log("\n=== "+pair.first+" "+host+":"+port+" ===");try{Socket().use{s->s.connect(InetSocketAddress(host,port),2500);s.soTimeout=2500;log("CONNECTED local="+s.localPort);pair.second?.let{s.getOutputStream().write(it);s.getOutputStream().flush()};val buf=ByteArray(8192);val all=ByteArrayOutputStream();try{while(all.size()<32768){val n=s.getInputStream().read(buf);if(n<=0)break;all.write(buf,0,n);if(n<buf.size)break}}catch(_:Exception){};val data=all.toByteArray();if(data.isEmpty())log("No immediate payload returned")else{log("BYTES="+data.size);log("TEXT:\n"+data.toString(Charsets.ISO_8859_1).replace(Regex("[^\\x09\\x0A\\x0D\\x20-\\x7E]"),"."));log("HEX:\n"+data.take(4096).joinToString(" "){"%02X".format(it.toInt() and 255)})}}}catch(e:Exception){log("ERROR "+e.javaClass.simpleName+": "+e.message)}}
  log("\nProbe finished. Long-press output to copy it back to Gator.")
 }
}
