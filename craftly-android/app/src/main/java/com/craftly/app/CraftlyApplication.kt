package com.craftly.app

import android.app.Application
import com.google.firebase.FirebaseApp

/**
 * Craftly Application Class
 */
class CraftlyApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        // Initialize Firebase
        FirebaseApp.initializeApp(this)
    }
}
