/**
 * Expo config plugin — Blackpine home-screen widget
 *
 * iOS side:
 *   • Adds App Group entitlement to the main app
 *   • Copies widget Swift/ObjC sources into ios/BlackpineWidget/
 *   • Adds a WidgetKit extension target to the Xcode project
 *
 * Android side:
 *   All Android files (Kotlin, XML, manifest) are already committed
 *   directly to android/ — no plugin work needed there.
 */

const {
  withXcodeProject,
  withEntitlementsPlist,
  withDangerousMod,
  withAndroidManifest,
  withMainApplication,
} = require("@expo/config-plugins");
const path = require("path");
const fs = require("fs");

// ─── Constants ────────────────────────────────────────────────────────────────

const APP_GROUP = "group.com.blackpine.cabinet";
const WIDGET_NAME = "BlackpineWidget";
const WIDGET_BUNDLE_ID = "com.blackpine.cabinet.widget";
const DEPLOYMENT_TARGET = "16.0";

const ANDROID_PKG_PATH = ["com", "blackpine", "cabinet"];

// ─── Step 1: Add App Group to main app entitlements ──────────────────────────

function withMainAppGroup(config) {
  return withEntitlementsPlist(config, (mod) => {
    const existing =
      mod.modResults["com.apple.security.application-groups"] ?? [];
    if (!existing.includes(APP_GROUP)) {
      mod.modResults["com.apple.security.application-groups"] = [
        ...existing,
        APP_GROUP,
      ];
    }
    return mod;
  });
}

// ─── Step 2: Write widget files into ios/ ────────────────────────────────────

function withWidgetFiles(config) {
  return withDangerousMod(config, [
    "ios",
    (mod) => {
      const projectRoot = mod.modRequest.projectRoot;
      const iosRoot = mod.modRequest.platformProjectRoot; // e.g. /build/ios
      const widgetSrcDir = path.join(projectRoot, "widgets", "ios");
      const widgetDir = path.join(iosRoot, WIDGET_NAME);

      fs.mkdirSync(widgetDir, { recursive: true });

      // Copy Swift / ObjC sources
      const sources = [
        "BlackpineWidget.swift",
        "BlackpineWidgetBundle.swift",
        "BlackpineWidgetBridge.swift",
        "BlackpineWidgetBridge.m",
      ];
      for (const file of sources) {
        const src = path.join(widgetSrcDir, file);
        if (fs.existsSync(src)) {
          fs.copyFileSync(src, path.join(widgetDir, file));
        } else {
          console.warn(`[withWidget] source not found: ${src}`);
        }
      }

      // Info.plist — minimal for a WidgetKit extension
      fs.writeFileSync(
        path.join(widgetDir, "Info.plist"),
        `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleDevelopmentRegion</key>
    <string>$(DEVELOPMENT_LANGUAGE)</string>
    <key>CFBundleDisplayName</key>
    <string>${WIDGET_NAME}</string>
    <key>CFBundleExecutable</key>
    <string>$(EXECUTABLE_NAME)</string>
    <key>CFBundleIdentifier</key>
    <string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>
    <key>CFBundleInfoDictionaryVersion</key>
    <string>6.0</string>
    <key>CFBundleName</key>
    <string>$(PRODUCT_NAME)</string>
    <key>CFBundlePackageType</key>
    <string>$(PRODUCT_BUNDLE_PACKAGE_TYPE)</string>
    <key>CFBundleShortVersionString</key>
    <string>$(MARKETING_VERSION)</string>
    <key>CFBundleVersion</key>
    <string>$(CURRENT_PROJECT_VERSION)</string>
    <key>NSExtension</key>
    <dict>
        <key>NSExtensionPointIdentifier</key>
        <string>com.apple.widgetkit-extension</string>
    </dict>
</dict>
</plist>
`
      );

      // Entitlements for widget extension
      fs.writeFileSync(
        path.join(widgetDir, `${WIDGET_NAME}.entitlements`),
        `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>com.apple.security.application-groups</key>
    <array>
        <string>${APP_GROUP}</string>
    </array>
</dict>
</plist>
`
      );

      return mod;
    },
  ]);
}

// ─── Step 3: Add Xcode widget extension target ────────────────────────────────

function withWidgetTarget(config) {
  return withXcodeProject(config, (mod) => {
    const proj = mod.modResults;

    // Guard: skip if target already exists (idempotency)
    const existingTargets = proj.pbxNativeTargetSection();
    const alreadyAdded = Object.values(existingTargets).some(
      (t) => t && typeof t === "object" && t.name === WIDGET_NAME
    );
    if (alreadyAdded) {
      return mod;
    }

    // ── Add the extension target ──────────────────────────────────────────────
    // addTarget returns { uuid, pbxNativeTarget }
    const widgetTarget = proj.addTarget(
      WIDGET_NAME,
      "app_extension",
      WIDGET_NAME,
      WIDGET_BUNDLE_ID
    );

    // ── Add build phases ──────────────────────────────────────────────────────
    // Sources
    proj.addBuildPhase(
      [
        `${WIDGET_NAME}/BlackpineWidget.swift`,
        `${WIDGET_NAME}/BlackpineWidgetBundle.swift`,
        `${WIDGET_NAME}/BlackpineWidgetBridge.swift`,
        `${WIDGET_NAME}/BlackpineWidgetBridge.m`,
      ],
      "PBXSourcesBuildPhase",
      "Sources",
      widgetTarget.uuid
    );

    // Resources (Info.plist is referenced via build setting, not a resource)
    proj.addBuildPhase(
      [],
      "PBXResourcesBuildPhase",
      "Resources",
      widgetTarget.uuid
    );

    // Frameworks
    proj.addBuildPhase(
      [],
      "PBXFrameworksBuildPhase",
      "Frameworks",
      widgetTarget.uuid
    );

    // ── Link frameworks ───────────────────────────────────────────────────────
    proj.addFramework("WidgetKit.framework", {
      target: widgetTarget.uuid,
      link: true,
    });
    proj.addFramework("SwiftUI.framework", {
      target: widgetTarget.uuid,
      link: true,
    });

    // ── Apply build settings to all configurations of the new target ──────────
    const buildSettings = {
      ALWAYS_EMBED_SWIFT_STANDARD_LIBRARIES: "NO",
      CLANG_ENABLE_MODULES: "YES",
      CODE_SIGN_ENTITLEMENTS: `${WIDGET_NAME}/${WIDGET_NAME}.entitlements`,
      CODE_SIGN_STYLE: "Automatic",
      CURRENT_PROJECT_VERSION: "1",
      GENERATE_INFOPLIST_FILE: "NO",
      INFOPLIST_FILE: `${WIDGET_NAME}/Info.plist`,
      IPHONEOS_DEPLOYMENT_TARGET: DEPLOYMENT_TARGET,
      MARKETING_VERSION: "1.0",
      PRODUCT_BUNDLE_IDENTIFIER: WIDGET_BUNDLE_ID,
      PRODUCT_NAME: "$(TARGET_NAME)",
      SKIP_INSTALL: "YES",
      SWIFT_EMIT_LOC_STRINGS: "YES",
      SWIFT_VERSION: "5.0",
      TARGETED_DEVICE_FAMILY: '"1,2"',
    };

    const configListUuid =
      widgetTarget.pbxNativeTarget.buildConfigurationList;
    const configList = proj.pbxXCConfigurationListSection()[configListUuid];

    if (configList && configList.buildConfigurations) {
      for (const { value: confUuid } of configList.buildConfigurations) {
        const conf = proj.pbxXCBuildConfigurationSection()[confUuid];
        if (conf && conf.buildSettings) {
          Object.assign(conf.buildSettings, buildSettings);
        }
      }
    }

    // ── Embed widget extension in the main app ────────────────────────────────
    // Find the main app target
    const mainTargetUuid = proj.getFirstTarget().uuid;
    proj.addBuildPhase(
      [`${WIDGET_NAME}.appex`],
      "PBXCopyFilesBuildPhase",
      "Embed Foundation Extensions",
      mainTargetUuid,
      proj.productType("app_extension"),
      "$(CONTENTS_FOLDER_PATH)/PlugIns"
    );

    // Add target dependency from main → widget
    proj.addTargetDependency(mainTargetUuid, [widgetTarget.uuid]);

    return mod;
  });
}

// ─── Android: Phase A — copy Kotlin + XML into generated android/ tree ────────

// ─── Android widget file contents — embedded so no external file copy needed ──

const WIDGET_PROVIDER_KT = `package com.blackpine.cabinet

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.widget.RemoteViews

class BlackpineWidgetProvider : AppWidgetProvider() {
    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (id in appWidgetIds) updateAppWidget(context, appWidgetManager, id)
    }
    companion object {
        private const val PREFS_NAME = "BlackpineWidgetData"
        fun updateAppWidget(context: Context, appWidgetManager: AppWidgetManager, widgetId: Int) {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val todayCount    = prefs.getString("todayCount",    "0")  ?: "0"
            val nextApptTime  = prefs.getString("nextApptTime",  "")   ?: ""
            val monthRecettes = prefs.getString("monthRecettes", "0")  ?: "0"
            val taxLabel      = prefs.getString("taxLabel",      "")   ?: ""
            val taxDaysLeft   = prefs.getInt("taxDaysLeft",      -1)
            val nextLabel = if (nextApptTime.isNotEmpty()) "Prochain RDV : \$nextApptTime" else "Aucun RDV restant"
            val taxLine = when {
                taxLabel.isNotEmpty() && taxDaysLeft in 0..30 -> "⚠ \$taxLabel dans \$taxDaysLeft j"
                taxLabel.isNotEmpty() && taxDaysLeft > 0 -> "\$taxLabel dans \$taxDaysLeft j"
                else -> ""
            }
            val views = RemoteViews(context.packageName, R.layout.blackpine_widget)
            views.setTextViewText(R.id.widget_appt_count, todayCount)
            views.setTextViewText(R.id.widget_revenue,    "\$monthRecettes MAD")
            views.setTextViewText(R.id.widget_next_appt,  if (taxLine.isNotEmpty()) taxLine else nextLabel)
            val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
            if (launchIntent != null) {
                val pi = PendingIntent.getActivity(context, 0, launchIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
                views.setOnClickPendingIntent(R.id.widget_root, pi)
            }
            appWidgetManager.updateAppWidget(widgetId, views)
        }
    }
}
`;

const WIDGET_MODULE_KT = `package com.blackpine.cabinet

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import org.json.JSONObject

class BlackpineWidgetModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    override fun getName(): String = "BlackpineWidget"
    @ReactMethod
    fun updateData(json: String) {
        val prefs = reactContext.getSharedPreferences("BlackpineWidgetData", 0).edit()
        try {
            val obj = JSONObject(json)
            prefs.putString("todayCount",    obj.optInt("todayCount", 0).toString())
            prefs.putString("nextApptTime",  obj.optString("nextApptTime", ""))
            prefs.putString("monthRecettes", obj.optInt("monthRecettes", 0).toString())
            prefs.putString("monthNet",      obj.optInt("monthNet", 0).toString())
            prefs.putString("taxLabel",      obj.optString("taxLabel", ""))
            prefs.putInt("taxDaysLeft",      obj.optInt("taxDaysLeft", -1))
        } catch (_: Exception) {}
        prefs.apply()
        val manager = AppWidgetManager.getInstance(reactContext)
        val ids = manager.getAppWidgetIds(ComponentName(reactContext, BlackpineWidgetProvider::class.java))
        for (id in ids) BlackpineWidgetProvider.updateAppWidget(reactContext, manager, id)
    }
}
`;

const WIDGET_PACKAGE_KT = `package com.blackpine.cabinet

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class BlackpineWidgetPackage : ReactPackage {
    override fun createNativeModules(context: ReactApplicationContext): List<NativeModule> = listOf(BlackpineWidgetModule(context))
    override fun createViewManagers(context: ReactApplicationContext): List<ViewManager<*, *>> = emptyList()
}
`;

const WIDGET_INFO_XML = `<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider
    xmlns:android="http://schemas.android.com/apk/res/android"
    android:minWidth="250dp"
    android:minHeight="110dp"
    android:targetCellWidth="3"
    android:targetCellHeight="2"
    android:updatePeriodMillis="1800000"
    android:initialLayout="@layout/blackpine_widget"
    android:widgetCategory="home_screen"
    android:previewImage="@mipmap/ic_launcher"
    android:resizeMode="horizontal|vertical"
    android:description="@string/app_name" />
`;

const WIDGET_LAYOUT_XML = `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout
    xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@+id/widget_root"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="@drawable/widget_bg"
    android:orientation="vertical"
    android:padding="16dp"
    android:gravity="center_vertical">
    <TextView android:layout_width="wrap_content" android:layout_height="wrap_content"
        android:text="BLACKPINE CABINET" android:textColor="#99FFFFFF"
        android:textSize="8sp" android:letterSpacing="0.18" android:textAllCaps="false" />
    <View android:layout_width="match_parent" android:layout_height="1dp"
        android:background="#33FFFFFF" android:layout_marginTop="8dp" android:layout_marginBottom="8dp" />
    <LinearLayout android:layout_width="match_parent" android:layout_height="wrap_content"
        android:orientation="horizontal" android:weightSum="2">
        <LinearLayout android:layout_width="0dp" android:layout_height="wrap_content"
            android:layout_weight="1" android:orientation="vertical">
            <TextView android:id="@+id/widget_appt_count" android:layout_width="wrap_content"
                android:layout_height="wrap_content" android:text="0"
                android:textColor="#FFFFFF" android:textSize="30sp" android:textStyle="bold" />
            <TextView android:layout_width="wrap_content" android:layout_height="wrap_content"
                android:text="consultations" android:textColor="#99FFFFFF" android:textSize="9sp" />
        </LinearLayout>
        <LinearLayout android:layout_width="0dp" android:layout_height="wrap_content"
            android:layout_weight="1" android:orientation="vertical" android:gravity="center_vertical">
            <TextView android:id="@+id/widget_revenue" android:layout_width="wrap_content"
                android:layout_height="wrap_content" android:text="0 MAD"
                android:textColor="#D4AF37" android:textSize="20sp" android:textStyle="bold" />
            <TextView android:layout_width="wrap_content" android:layout_height="wrap_content"
                android:text="ce mois" android:textColor="#99FFFFFF" android:textSize="9sp" />
        </LinearLayout>
    </LinearLayout>
    <TextView android:id="@+id/widget_next_appt" android:layout_width="match_parent"
        android:layout_height="wrap_content" android:text="Aucun RDV prévu"
        android:textColor="#CCFFFFFF" android:textSize="10sp" android:layout_marginTop="8dp"
        android:maxLines="1" android:ellipsize="end" />
</LinearLayout>
`;

const WIDGET_BG_XML = `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
    <solid android:color="#CC0A4E7E" />
    <corners android:radius="20dp" />
</shape>
`;

function withAndroidWidgetFiles(config) {
  return withDangerousMod(config, [
    "android",
    (mod) => {
      const androidRoot = mod.modRequest.platformProjectRoot; // …/android/
      const javaDir = path.join(
        androidRoot, "app", "src", "main", "java", ...ANDROID_PKG_PATH,
      );
      const resDir = path.join(androidRoot, "app", "src", "main", "res");

      function ensureDir(d) {
        if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
      }
      function write(dest, content) {
        ensureDir(path.dirname(dest));
        fs.writeFileSync(dest, content, "utf8");
      }

      // Kotlin sources — embedded inline
      write(path.join(javaDir, "BlackpineWidgetProvider.kt"), WIDGET_PROVIDER_KT);
      write(path.join(javaDir, "BlackpineWidgetModule.kt"),   WIDGET_MODULE_KT);
      write(path.join(javaDir, "BlackpineWidgetPackage.kt"),  WIDGET_PACKAGE_KT);

      // XML resources — embedded inline
      write(path.join(resDir, "xml",      "blackpine_widget_info.xml"), WIDGET_INFO_XML);
      write(path.join(resDir, "layout",   "blackpine_widget.xml"),      WIDGET_LAYOUT_XML);
      write(path.join(resDir, "drawable", "widget_bg.xml"),             WIDGET_BG_XML);

      return mod;
    },
  ]);
}

// ─── Android: Phase B — register <receiver> in AndroidManifest.xml ────────────

function withAndroidWidgetManifest(config) {
  return withAndroidManifest(config, (mod) => {
    const app = mod.modResults.manifest.application[0];
    if (!app.receiver) app.receiver = [];

    const alreadyAdded = app.receiver.some(
      (r) => r.$?.["android:name"] === ".BlackpineWidgetProvider",
    );
    if (alreadyAdded) return mod;

    app.receiver.push({
      $: {
        "android:name":     ".BlackpineWidgetProvider",
        "android:exported": "true",
        "android:label":    "@string/app_name",
      },
      "intent-filter": [
        {
          action: [
            { $: { "android:name": "android.appwidget.action.APPWIDGET_UPDATE" } },
          ],
        },
      ],
      "meta-data": [
        {
          $: {
            "android:name":     "android.appwidget.provider",
            "android:resource": "@xml/blackpine_widget_info",
          },
        },
      ],
    });

    return mod;
  });
}

// ─── Android: Phase C — add BlackpineWidgetPackage to MainApplication.kt ────────

function withAndroidWidgetMainApp(config) {
  return withMainApplication(config, (mod) => {
    let src = mod.modResults.contents;
    const call = "packages.add(BlackpineWidgetPackage())";

    if (!src.includes(call)) {
      // Insert before "return packages" inside getPackages()
      // Both class and its package are in com.blackpine.cabinet — no import needed.
      src = src.replace(
        /([ \t]+)(return packages\b)/,
        `$1${call}\n$1$2`,
      );
      mod.modResults.contents = src;
    }

    return mod;
  });
}

// ─── Compose ─────────────────────────────────────────────────────────────────

module.exports = function withWidget(config) {
  // iOS WidgetKit extension
  config = withMainAppGroup(config);
  config = withWidgetFiles(config);
  config = withWidgetTarget(config);

  // Android AppWidget
  config = withAndroidWidgetFiles(config);
  config = withAndroidWidgetManifest(config);
  config = withAndroidWidgetMainApp(config);

  return config;
};
