package com.wvlrp.skeletonkey

import android.app.Activity
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.text.method.ScrollingMovementMethod
import android.view.Gravity
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.OutputStreamWriter
import java.net.DatagramPacket
import java.net.DatagramSocket
import java.net.InetAddress
import java.net.InetSocketAddress
import java.net.Socket
import java.net.SocketTimeoutException
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicInteger

class MainActivity : Activity() {
    private lateinit var log: TextView
    private lateinit var scan: Button
    private val pool = Executors.newFixedThreadPool(24)
    private val main = Handler(Looper.getMainLooper())

    private val excluded = setOf("192.168.1.35", "192.168.1.118", "192.168.1.237")
    private val targets = setOf("192.168.1.12", "192.168.1.26", "192.168.1.64")
    private val ports = intArrayOf(80, 443, 554, 8000, 8080, 8554, 8888, 9000, 34567, 37777, 49152)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val box = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(28, 28, 28, 28)
        }
        box.addView(TextView(this).apply {
            text = "SKELETON KEY"
            textSize = 28f
            gravity = Gravity.CENTER
        })
        box.addView(TextView(this).apply {
            text = "WVLRP Camera Discovery Probe" + System.lineSeparator() + "LAN-only - no password guessing"
            gravity = Gravity.CENTER
        })
        scan = Button(this).apply {
            text = "SCAN + DEEP PROBE"
            setOnClickListener { startScan() }
        }
        box.addView(scan)
        log = TextView(this).apply {
            textSize = 13f
            movementMethod = ScrollingMovementMethod()
            setTextIsSelectable(true)
        }
        box.addView(ScrollView(this).apply { addView(log) }, LinearLayout.LayoutParams(-1, 0, 1f))
        setContentView(box)
    }

    private fun line(value: String) {
        main.post { log.append(value + System.lineSeparator()) }
    }

    private fun startScan() {
        scan.isEnabled = false
        log.text = ""
        line("Known cameras excluded: .35, .118, .237")
        line("Scanning 192.168.1.0/24")
        pool.execute { ssdpDiscovery() }
        val remaining = AtomicInteger(254)
        for (i in 1..254) {
            pool.execute {
                val ip = "192.168.1." + i
                if (ip !in excluded) probe(ip)
                if (remaining.decrementAndGet() == 0) {
                    main.post {
                        scan.isEnabled = true
                        line("Scan complete")
                    }
                }
            }
        }
    }

    private fun probe(ip: String) {
        val open = mutableListOf<Int>()
        for (port in ports) {
            try {
                Socket().use { socket ->
                    socket.connect(InetSocketAddress(ip, port), 180)
                    open.add(port)
                }
            } catch (_: Exception) {
            }
        }
        if (open.isEmpty()) return
        line("")
        line(ip + " services: " + open.joinToString(", "))

        if (80 in open) httpHead(ip, 80)?.let { line(it) }
        if (8080 in open) httpHead(ip, 8080)?.let { line(it) }
        if (554 in open) rtspOptions(ip, 554)?.let { line(it) }
        if (8554 in open) rtspOptions(ip, 8554)?.let { line(it) }

        if (ip in targets) {
            line("TARGETED DEEP PROBE + SNAPSHOT SEARCH")
            deepProbe(ip, open)
        }
    }

    private fun deepProbe(ip: String, open: List<Int>) {
        val paths = listOf(
            "/", "/onvif/device_service", "/description.xml", "/rootDesc.xml",
            "/api/device", "/api/device/info", "/device/info", "/system/info",
            "/snapshot.jpg", "/snapshot.jpeg", "/image.jpg", "/jpg/image.jpg",
            "/cgi-bin/snapshot.cgi", "/cgi-bin/currentpic.cgi", "/tmpfs/auto.jpg",
            "/Streaming/channels/1/picture", "/ISAPI/Streaming/channels/101/picture"
        )
        for (port in listOf(80, 8000, 8080, 8888, 9000, 49152)) {
            if (port !in open) continue
            for (path in paths) {
                httpGet(ip, port, path)?.let { result ->
                    if (!result.contains("404 Not Found", ignoreCase = true)) {
                        line("DEEP " + port + " " + path + ": " + result)
                    }
                }
            }
        }
    }

    private fun httpHead(ip: String, port: Int): String? {
        val request = listOf(
            "HEAD / HTTP/1.0",
            "Host: " + ip,
            "Connection: close",
            "",
            ""
        ).joinToString(System.lineSeparator())
        return exchange(ip, port, request, 8)?.let { "HTTP " + port + ": " + it }
    }

    private fun httpGet(ip: String, port: Int, path: String): String? {
        val request = listOf(
            "GET " + path + " HTTP/1.0",
            "Host: " + ip,
            "User-Agent: SkeletonKey/1.0",
            "Connection: close",
            "",
            ""
        ).joinToString(System.lineSeparator())
        return exchange(ip, port, request, 14)
    }

    private fun rtspOptions(ip: String, port: Int): String? {
        val request = listOf(
            "OPTIONS rtsp://" + ip + ":" + port + "/ RTSP/1.0",
            "CSeq: 1",
            "",
            ""
        ).joinToString(System.lineSeparator())
        return exchange(ip, port, request, 10)?.let { "RTSP " + port + ": " + it }
    }

    private fun exchange(ip: String, port: Int, request: String, maxLines: Int): String? {
        return try {
            Socket().use { socket ->
                socket.connect(InetSocketAddress(ip, port), 350)
                socket.soTimeout = 650
                OutputStreamWriter(socket.getOutputStream()).use { writer ->
                    writer.write(request)
                    writer.flush()
                }
                val reader = BufferedReader(InputStreamReader(socket.getInputStream()))
                val lines = mutableListOf<String>()
                repeat(maxLines) {
                    val row = reader.readLine() ?: return@repeat
                    lines.add(row)
                }
                lines.joinToString(" | ").take(700)
            }
        } catch (_: Exception) {
            null
        }
    }

    private fun ssdpDiscovery() {
        try {
            DatagramSocket().use { socket ->
                socket.soTimeout = 1000
                val request = listOf(
                    "M-SEARCH * HTTP/1.1",
                    "HOST: 239.255.255.250:1900",
                    "MAN: \"ssdp:discover\"",
                    "MX: 1",
                    "ST: ssdp:all",
                    "",
                    ""
                ).joinToString(System.lineSeparator()).toByteArray()
                socket.send(DatagramPacket(request, request.size, InetAddress.getByName("239.255.255.250"), 1900))
                val until = System.currentTimeMillis() + 2200
                while (System.currentTimeMillis() < until) {
                    try {
                        val buffer = ByteArray(2048)
                        val packet = DatagramPacket(buffer, buffer.size)
                        socket.receive(packet)
                        val host = packet.address.hostAddress ?: continue
                        if (host !in excluded) {
                            val response = String(packet.data, 0, packet.length)
                                .replace(System.lineSeparator(), " ")
                                .take(500)
                            line("SSDP " + host + ": " + response)
                        }
                    } catch (_: SocketTimeoutException) {
                    }
                }
            }
        } catch (_: Exception) {
            line("SSDP discovery unavailable")
        }
    }
}
