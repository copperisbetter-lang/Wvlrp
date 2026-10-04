package com.wvlrp.mobilelive

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.SystemClock
import kotlin.math.sqrt

class ImpactDetector(
    context: Context,
    private val onImpact: (gForce: Double) -> Unit
) : SensorEventListener {
    private val sensorManager =
        context.getSystemService(SensorManager::class.java)
    private val accelerometer =
        sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)

    private var running = false
    private var armedAfterMs = 0L
    private var lastTriggerMs = 0L

    fun start() {
        if (running || accelerometer == null) return
        running = sensorManager.registerListener(
            this,
            accelerometer,
            SensorManager.SENSOR_DELAY_GAME
        )
        armedAfterMs = SystemClock.elapsedRealtime() + 10_000L
    }

    fun stop() {
        if (!running) return
        sensorManager.unregisterListener(this)
        running = false
    }

    override fun onSensorChanged(event: SensorEvent) {
        if (!running || event.sensor.type != Sensor.TYPE_ACCELEROMETER) return
        if (SystemClock.elapsedRealtime() < armedAfterMs) return

        val x = event.values[0].toDouble()
        val y = event.values[1].toDouble()
        val z = event.values[2].toDouble()
        val g = sqrt(x * x + y * y + z * z) / SensorManager.GRAVITY_EARTH

        val now = SystemClock.elapsedRealtime()
        if (g >= IMPACT_THRESHOLD_G && now - lastTriggerMs >= IMPACT_COOLDOWN_MS) {
            lastTriggerMs = now
            onImpact(g)
        }
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}

    companion object {
        private const val IMPACT_THRESHOLD_G = 3.5
        private const val IMPACT_COOLDOWN_MS = 60_000L
    }
}
