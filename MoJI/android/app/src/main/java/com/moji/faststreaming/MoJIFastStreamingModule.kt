package com.moji.faststreaming

import android.util.Log
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
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
    private external fun nativeInstall(jsiRuntimeRef: Long, jsCallInvokerHolder: CallInvokerHolder?)


    @ReactMethod(isBlockingSynchronousMethod = true)
    fun install(promise: Promise): Boolean {
        val jsContext = reactApplicationContext.javaScriptContextHolder

        if (jsContext == null) {
            Log.e(NAME, "React Application Context was null!")
            return false
          }

        try {
            val jsiRuntimeRef = jsContext!!.get()
            val jsCallInvokerHolder = reactApplicationContext.catalystInstance.jsCallInvokerHolder
            nativeInstall(jsiRuntimeRef, jsCallInvokerHolder)

            return true
        } catch (e: Exception) {
            Log.e(NAME, "Error during installation", e)
        }
        
        return false
    }

}
