package com.moji

import android.util.Log
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.brdige.ReactContext.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.turbomodule.core.interfaces.CallInvokerHolder

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

    private external fun nativeInstall(jsiRuntimeRef: Long, jsCallInvokerHolder?)

    @ReactMethod(isBlockingSynchronousMethod = true)
    ovveride fun install(): Boolean {
        val jsiRuntimeRef = reactApplicationContext.jsCallInvokerHolder.jsCallInvokerHolder

        try {

            if (jsiRuntimeRef == null) {
                Log.e(NAME, "JSI Runtime reference is null")
                return false
            }

            val jsiRuntimeRef = jsContext!!.get()
            val jsCallInvokerHolder = reactApplicationContext.jsCallInvokerHolder

            nativeInstall(jsiRuntimeRef, jsCallInvokerHolder)

            return true
        }
        catch (e: Exception) {
            Log.e(NAME, "Error during nativeInstall: ${e.message}")
            return false
        }

        return false
    }
}