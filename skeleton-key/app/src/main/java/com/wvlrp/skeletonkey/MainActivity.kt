package com.wvlrp.huntvisionprobe

import android.app.Activity
import android.net.wifi.WifiManager
import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.ProgressBar
import android.widget.TextView
import java.io.ByteArrayOutputStream
import java.net.*
import java.nio.charset.StandardCharsets
import java.util.UUID
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

class MainActivity : Activity() {
    private lateinit var output: TextView
    private lateinit var progress: ProgressBar
    private val pool = Executors.newFixedThreadPool(40)
    private val commonPorts = intArrayOf(80, 81, 443, 554, 8000, 8080, 8888, 8899, 5000, 34567, 37777)
    private val knownTarget = "192.168.1.26"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState); setContentView(R.layout.activity_main)
        output = findViewById(R.id.output); progress = findViewById(R.id.progress)
        findViewById<Button>(R.id.scanButton).setOnClickListener { startScan() }
    }
    private fun log(s: String) = runOnUiThread { output.append(s + "\n") }
    private fun startScan() {
        output.text = ""; progress.visibility = View.VISIBLE
        Thread {
            log("WVLRP Camera Probe v0.2 — Huntvision Deep Probe")
            log("Local-network diagnostics for cameras you own/control.\n")
            inspect(knownTarget, true)
            val found = linkedSetOf<String>(); found.addAll(wsDiscovery())
            val prefix = localPrefix()
            if (prefix != null) {
                val jobs = (1..254).map { n -> pool.submit {
                    val ip = "$prefix$n"; if (isAlive(ip)) synchronized(found) { found.add(ip) }
                }}
                jobs.forEach { runCatching { it.get(2500, TimeUnit.MILLISECONDS) } }
            }
            found.remove(knownTarget)
            found.sorted().forEach { inspect(it, false) }
            log("\nFINISHED — send the output for $knownTarget, especially port 8888.")
            runOnUiThread { progress.visibility = View.GONE }
        }.start()
    }
    private fun localPrefix(): String? {
        val wm = applicationContext.getSystemService(WIFI_SERVICE) as WifiManager
        @Suppress("DEPRECATION") val ip = wm.connectionInfo.ipAddress
        if (ip == 0) return null
        return "${ip and 0xff}.${ip shr 8 and 0xff}.${ip shr 16 and 0xff}."
    }
    private fun isAlive(ip: String): Boolean {
        if (runCatching { InetAddress.getByName(ip).isReachable(180) }.getOrDefault(false)) return true
        return commonPorts.any { portOpen(ip, it, 90) }
    }
    private fun portOpen(ip: String, port: Int, timeout: Int = 350): Boolean = try {
        Socket().use { it.connect(InetSocketAddress(ip, port), timeout) }; true
    } catch (_: Exception) { false }
    private fun inspect(ip: String, deep: Boolean) {
        val ports = commonPorts.filter { portOpen(ip, it, if (deep) 700 else 250) }
        if (ports.isEmpty()) { if (deep) log("$ip: no tested TCP ports answered."); return }
        log("\n$ip  OPEN TCP: ${ports.joinToString(", ")}")
        if (554 in ports) log("  RTSP service reachable on port 554; stream path/auth unknown")
        ports.filter { it in setOf(80,81,8000,8080,8888,8899) }.forEach { p ->
            val h = httpProbe(ip, p, "/"); if (h.isNotBlank()) log("  HTTP probe :$p -> ${clean(h).take(500)}")
        }
        if (deep && 8888 in ports) deep8888(ip)
    }
    private fun deep8888(ip: String) {
        log("  >>> HUNTVISION DEEP PROBE $ip:8888 <<<")
        val requests = listOf(
            "PASSIVE" to null,
            "HTTP GET" to "GET / HTTP/1.1\r\nHost: $ip\r\nConnection: close\r\n\r\n".toByteArray(),
            "HTTP OPTIONS" to "OPTIONS / HTTP/1.1\r\nHost: $ip\r\nConnection: close\r\n\r\n".toByteArray(),
            "HTTP device-info" to "GET /device-info HTTP/1.1\r\nHost: $ip\r\nConnection: close\r\n\r\n".toByteArray()
        )
        requests.forEach { (name, bytes) ->
            val data = tcpExchange(ip, 8888, bytes)
            if (data.isEmpty()) log("    $name: connected; no payload returned")
            else {
                log("    $name: ${data.size} bytes")
                log("      TEXT: ${printable(data).take(900)}")
                log("      HEX : ${hex(data).take(1200)}")
                extractUrls(data).forEach { log("      FOUND URL: $it") }
            }
        }
    }
    private fun tcpExchange(ip: String, port: Int, request: ByteArray?): ByteArray = try {
        Socket().use { s ->
            s.soTimeout = 900; s.connect(InetSocketAddress(ip, port), 700)
            if (request != null) { s.getOutputStream().write(request); s.getOutputStream().flush() }
            val out = ByteArrayOutputStream(); val buf = ByteArray(2048)
            val end = System.currentTimeMillis() + 1400
            while (System.currentTimeMillis() < end && out.size() < 8192) {
                try { val n = s.getInputStream().read(buf); if (n <= 0) break; out.write(buf,0,n) }
                catch (_: SocketTimeoutException) { break }
            }
            out.toByteArray()
        }
    } catch (_: Exception) { byteArrayOf() }
    private fun httpProbe(ip: String, port: Int, path: String): String = try {
        val b = tcpExchange(ip, port, "HEAD $path HTTP/1.0\r\nHost: $ip\r\n\r\n".toByteArray())
        String(b, StandardCharsets.ISO_8859_1)
    } catch (_: Exception) { "" }
    private fun printable(b: ByteArray) = b.joinToString("") { v -> val x=v.toInt() and 0xff; if (x in 32..126 || x==10 || x==13 || x==9) x.toChar().toString() else "." }.replace("\r","\\r").replace("\n","\\n")
    private fun hex(b: ByteArray) = b.joinToString(" ") { "%02X".format(it.toInt() and 0xff) }
    private fun clean(s: String) = s.replace("\r", " ").replace("\n", " | ").replace(Regex("\\s+"), " ")
    private fun extractUrls(b: ByteArray): List<String> {
        val s = String(b, StandardCharsets.ISO_8859_1)
        return Regex("(?i)(?:https?|rtsp)://[^\\s\\u0000\\\"'<>]+").findAll(s).map { it.value }.distinct().toList()
    }
    private fun wsDiscovery(): Set<String> {
        val ips = linkedSetOf<String>()
        val lock = (applicationContext.getSystemService(WIFI_SERVICE) as WifiManager).createMulticastLock("wvlrp-onvif").apply { setReferenceCounted(false); acquire() }
        try {
            val id = UUID.randomUUID()
            val xml = """<?xml version="1.0" encoding="UTF-8"?><e:Envelope xmlns:e="http://www.w3.org/2003/05/soap-envelope" xmlns:w="http://schemas.xmlsoap.org/ws/2004/08/addressing" xmlns:d="http://schemas.xmlsoap.org/ws/2005/04/discovery" xmlns:dn="http://www.onvif.org/ver10/network/wsdl"><e:Header><w:MessageID>urn:uuid:$id</w:MessageID><w:To>urn:schemas-xmlsoap-org:ws:2005:04:discovery</w:To><w:Action>http://schemas.xmlsoap.org/ws/2005/04/discovery/Probe</w:Action></e:Header><e:Body><d:Probe><d:Types>dn:NetworkVideoTransmitter</d:Types></d:Probe></e:Body></e:Envelope>"""
            DatagramSocket().use { sock ->
                sock.soTimeout = 600; val data = xml.toByteArray(StandardCharsets.UTF_8)
                sock.send(DatagramPacket(data, data.size, InetAddress.getByName("239.255.255.250"), 3702))
                val end = System.currentTimeMillis() + 1800
                while (System.currentTimeMillis() < end) try {
                    val buf = ByteArray(8192); val packet = DatagramPacket(buf, buf.size); sock.receive(packet)
                    ips.add(packet.address.hostAddress ?: continue)
                } catch (_: SocketTimeoutException) { break }
            }
        } catch (e: Exception) { log("Discovery note: ${e.message}") }
        finally { if (lock.isHeld) lock.release() }
        return ips
    }
}
