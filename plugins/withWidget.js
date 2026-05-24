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

/** iOS source directory (relative to this plugin file) */
const WIDGET_SRC_DIR = path.join(__dirname, "..", "widgets", "ios");

/** Android source directory */
const ANDROID_SRC_DIR  = path.join(__dirname, "..", "widgets", "android");
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
      const iosRoot = mod.modRequest.platformProjectRoot; // e.g. /build/ios
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
        const src = path.join(WIDGET_SRC_DIR, file);
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
      function cp(src, dest) {
        ensureDir(path.dirname(dest));
        if (fs.existsSync(src)) {
          fs.copyFileSync(src, dest);
        } else {
          console.warn(`[withWidget/android] source not found: ${src}`);
        }
      }

      // Kotlin sources
      for (const kt of [
        "BlackpineWidgetProvider.kt",
        "BlackpineWidgetModule.kt",
        "BlackpineWidgetPackage.kt",
      ]) {
        cp(path.join(ANDROID_SRC_DIR, kt), path.join(javaDir, kt));
      }

      // XML resources
      cp(
        path.join(ANDROID_SRC_DIR, "res", "xml", "blackpine_widget_info.xml"),
        path.join(resDir, "xml", "blackpine_widget_info.xml"),
      );
      cp(
        path.join(ANDROID_SRC_DIR, "res", "layout", "blackpine_widget.xml"),
        path.join(resDir, "layout", "blackpine_widget.xml"),
      );
      cp(
        path.join(ANDROID_SRC_DIR, "res", "drawable", "widget_bg.xml"),
        path.join(resDir, "drawable", "widget_bg.xml"),
      );

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
