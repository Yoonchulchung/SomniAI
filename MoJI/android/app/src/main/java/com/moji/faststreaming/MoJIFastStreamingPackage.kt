package com.faststreaming

import android.util.Log
import com.facebook.react.bridge.ReactPackage

class MoJIFastStreamingPackage : ReactPackage {

    ovveride fun createNativeModules(reactContext : ReactApplicationContext) : List<NativeModule> {
        return listOf(MoJIFastStreamingModule(reactContext))
    }

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return emptyList()
    }
    
}