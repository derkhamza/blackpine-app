package com.blackpine.cabinet

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.widget.RemoteViews

/**
 * AppWidgetProvider for the Blackpine Cabinet home-screen widget.
 *
 * Data is read from SharedPreferences ("BlackpineWidgetData") which is
 * kept up-to-date by BlackpineWidgetModule whenever the JS layer pushes
 * a new payload via widgetBridge.ts.
 *
 * SharedPreferences keys (all String unless noted):
 *   todayCount    — appointment count today
 *   nextApptTime  — "HH:MM" or "" if none remaining
 *   monthRecettes — RECETTE total this month
 *   monthNet      — net result this month
 *   taxLabel      — e.g. "IR 31/03" or ""
 *   taxDaysLeft   — Int: days until next deadline, -1 if unknown
 */
class BlackpineWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray,
    ) {
        for (id in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, id)
        }
    }

    companion object {
        private const val PREFS_NAME = "BlackpineWidgetData"

        fun updateAppWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            widgetId: Int,
        ) {
            val prefs         = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val todayCount    = prefs.getString("todayCount",    "0")  ?: "0"
            val nextApptTime  = prefs.getString("nextApptTime",  "")   ?: ""
            val monthRecettes = prefs.getString("monthRecettes", "0")  ?: "0"
            val taxLabel      = prefs.getString("taxLabel",      "")   ?: ""
            val taxDaysLeft   = prefs.getInt("taxDaysLeft",      -1)

            // Build "next appointment" label
            val nextLabel = when {
                nextApptTime.isNotEmpty() -> "Prochain RDV : $nextApptTime"
                else                     -> "Aucun RDV restant"
            }

            // Build optional tax-deadline pill (shown only when relevant)
            val taxLine = when {
                taxLabel.isNotEmpty() && taxDaysLeft in 0..30 ->
                    "⚠ $taxLabel dans $taxDaysLeft j"
                taxLabel.isNotEmpty() && taxDaysLeft > 0 ->
                    "$taxLabel dans $taxDaysLeft j"
                else -> ""
            }

            val views = RemoteViews(context.packageName, R.layout.blackpine_widget)
            views.setTextViewText(R.id.widget_appt_count, todayCount)
            views.setTextViewText(R.id.widget_revenue,    "$monthRecettes MAD")
            views.setTextViewText(R.id.widget_next_appt,  if (taxLine.isNotEmpty()) taxLine else nextLabel)

            // Tap widget → open the app
            val launchIntent = context.packageManager
                .getLaunchIntentForPackage(context.packageName)
            if (launchIntent != null) {
                val pi = PendingIntent.getActivity(
                    context, 0, launchIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
                )
                views.setOnClickPendingIntent(R.id.widget_root, pi)
            }

            appWidgetManager.updateAppWidget(widgetId, views)
        }
    }
}
