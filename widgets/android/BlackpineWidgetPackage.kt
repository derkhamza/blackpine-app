package com.blackpine.cabinet

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

/** Registers BlackpineWidgetModule with the React Native runtime. */
class BlackpineWidgetPackage : ReactPackage {
    override fun createNativeModules(
        context: ReactApplicationContext,
    ): List<NativeModule> = listOf(BlackpineWidgetModule(context))

    override fun createViewManagers(
        context: ReactApplicationContext,
    ): List<ViewManager<*, *>> = emptyList()
}
