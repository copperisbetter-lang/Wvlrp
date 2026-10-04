package com.wvlrp.mobilelive

import android.content.Context
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Bundle
import android.os.Looper
import java.io.File
import java.util.Calendar
import java.util.Locale

class MileageTracker(
    private val context: Context,
    private val onUpdate: (shiftMiles: Double, weekMiles: Double) -> Unit
) {
    private val locationManager =
        context.getSystemService(LocationManager::class.java)
    private val prefs =
        context.getSharedPreferences("wvlrp_mileage", Context.MODE_PRIVATE)

    private var active = false
    private var lastLocation: Location? = null
    private var shiftStartMs = 0L
    private var shiftMeters = 0.0
    private var weekMeters = 0.0
    private var weekKey = ""

    private val listener = object : LocationListener {
        override fun onLocationChanged(location: Location) {
            handleLocation(location)
        }

        override fun onProviderEnabled(provider: String) {}
        override fun onProviderDisabled(provider: String) {}

        @Deprecated("Legacy LocationListener callback")
        override fun onStatusChanged(provider: String?, status: Int, extras: Bundle?) {}
    }

    fun startNewShift() {
        if (active) return
        active = true
        shiftStartMs = System.currentTimeMillis()
        shiftMeters = 0.0
        lastLocation = null
        weekKey = currentWeekKey()
        weekMeters = prefs.getLong("week_mm_" + weekKey, 0L) / 1000.0
        emit()

        try {
            if (locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER)) {
                locationManager.requestLocationUpdates(
                    LocationManager.GPS_PROVIDER,
                    5_000L,
                    5f,
                    listener,
                    Looper.getMainLooper()
                )
            }
        } catch (_: SecurityException) {
        } catch (_: Exception) {
        }

        try {
            if (locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)) {
                locationManager.requestLocationUpdates(
                    LocationManager.NETWORK_PROVIDER,
                    8_000L,
                    10f,
                    listener,
                    Looper.getMainLooper()
                )
            }
        } catch (_: SecurityException) {
        } catch (_: Exception) {
        }
    }

    private fun handleLocation(location: Location) {
        if (!active) return
        if (location.accuracy <= 0f || location.accuracy > 80f) return

        val previous = lastLocation
        if (previous == null) {
            lastLocation = location
            return
        }

        val dtSeconds =
            ((location.elapsedRealtimeNanos - previous.elapsedRealtimeNanos) / 1_000_000_000.0)
                .coerceAtLeast(0.0)

        if (dtSeconds <= 0.0) {
            lastLocation = location
            return
        }

        val distance = previous.distanceTo(location).toDouble()
        val maxPlausibleDistance = dtSeconds * 60.0 + 200.0

        if (distance > maxPlausibleDistance) {
            lastLocation = location
            return
        }

        lastLocation = location
        if (distance < 2.0) return

        val newWeek = currentWeekKey()
        if (newWeek != weekKey) {
            weekKey = newWeek
            weekMeters = prefs.getLong("week_mm_" + weekKey, 0L) / 1000.0
        }

        shiftMeters += distance
        weekMeters += distance
        prefs.edit()
            .putLong("week_mm_" + weekKey, (weekMeters * 1000.0).toLong())
            .apply()

        emit()
    }

    private fun emit() {
        onUpdate(shiftMeters / METERS_PER_MILE, weekMeters / METERS_PER_MILE)
    }

    fun finalizeShift(root: File) {
        if (!active) return
        active = false
        try { locationManager.removeUpdates(listener) } catch (_: Exception) {}

        val endMs = System.currentTimeMillis()
        val dir = File(root, "Mileage").apply { mkdirs() }
        val file = File(dir, "shifts.csv")
        if (!file.exists()) {
            file.appendText("start_ms,end_ms,miles\n")
        }
        file.appendText(
            shiftStartMs.toString() + "," +
                endMs.toString() + "," +
                String.format(Locale.US, "%.3f", shiftMeters / METERS_PER_MILE) +
                "\n"
        )

        emit()
        lastLocation = null
    }

    private fun currentWeekKey(): String {
        val c = Calendar.getInstance()
        return c.get(Calendar.YEAR).toString() + "-" +
            String.format(Locale.US, "%02d", c.get(Calendar.WEEK_OF_YEAR))
    }

    companion object {
        private const val METERS_PER_MILE = 1609.344
    }
}
