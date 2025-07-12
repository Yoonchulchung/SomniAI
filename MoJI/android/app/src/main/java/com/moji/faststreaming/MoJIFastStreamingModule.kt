package com.moji.faststreaming

import android.util.Log
import com.facebook.react.bridge.Promise    
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class MoJIFastStreamingModule(ctx: ReactApplicationContext) : ReactContextBaseJavaModule(ctx) {
    override fun getName(): String {
        return NAME
    }

    companion object {
        const val NAME = "MoJIFastStreaming"
        
        init {
            System.loadLibrary("moji-fast-streaming")
        }
    }

    @ReactMethod
    fun install(promise:Promise): Boolean {

        try {
            val ok = nativeInstall()

            promise.resolve(ok)
        } catch (e: Exception) {
            Log.e(NAME, "Error during installation", e)
            promise.reject("INSTALL_ERROR", "Failed to install MoJIFastStreaming", e)
            return false
        }

        return false
    }

    private external fun nativeInstall(): Boolean
}