package com.blackpine.cabinet

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import org.json.JSONObject

/**
 * React Native bridge module — registered as "BlackpineWidget".
 *
 * Receives a JSON payload from widgetBridge.ts, persists each field to
 * SharedPreferences, then refreshes all active widget instances immediately.
 *
 * Expected JSON shape (mirrors widgetBridge.ts WidgetData):
 * {
 *   "todayCount":   number,   // non-cancelled appointments today
 *   "nextApptTime": string|null,  // "HH:MM" or null
 *   "monthRecettes": number,  // RECETTE total this month (MAD)
 *   "monthNet":     number,   // recettes − charges (MAD)
 *   "taxDaysLeft":  number|null,
 *   "taxLabel":     string|null,
 *   "updatedAt":    string
 * }
 */
class BlackpineWidgetModule(
    private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "BlackpineWidget"

    @ReactMethod
    fun updateData(json: String) {
        val prefs = reactContext.getSharedPreferences("BlackpineWidgetData", 0).edit()

        try {
            val obj = JSONObject(json)
            prefs.putString("todayCount",    obj.optInt("todayCount", 0).toString())
            prefs.putString("nextApptTime",  obj.optString("nextApptTime", ""))
            prefs.putString("monthRecettes", obj.optInt("monthRecettes", 0).toString())
            prefs.putString("monthNet",      obj.optInt("monthNet",      0).toString())
            prefs.putString("taxLabel",      obj.optString("taxLabel", ""))
            prefs.putInt("taxDaysLeft",      obj.optInt("taxDaysLeft",    -1))
        } catch (_: Exception) {
            // Malformed JSON — keep whatever was stored before
        }

        prefs.apply()

        // Immediately refresh all active widget instances
        val manager = AppWidgetManager.getInstance(reactContext)
        val ids     = manager.getAppWidgetIds(
            ComponentName(reactContext, BlackpineWidgetProvider::class.java),
        )
        for (id in ids) {
            BlackpineWidgetProvider.updateAppWidget(reactContext, manager, id)
        }
    }
}
