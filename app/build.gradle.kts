plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    id("com.google.gms.google-services")
}

import java.io.ByteArrayOutputStream


android {
    namespace = "com.craftly"
    compileSdk {
        version = release(36)
    }

    lint {
        disable.add("PropertyEscape")
    }

    defaultConfig {
        applicationId = "com.craftly"
        minSdk = 24
        targetSdk = 36
        versionCode = 1
        versionName = "1.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }
    kotlinOptions {
        jvmTarget = "11"
    }
    buildFeatures {
        viewBinding = true
    }
}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.appcompat)
    implementation(libs.material)
    implementation(libs.androidx.activity)
    implementation(libs.androidx.constraintlayout)

    // Networking
    implementation(libs.retrofit)
    implementation(libs.retrofit.moshi)
    implementation(libs.okhttp)
    implementation(libs.okhttp.logging)
    implementation(libs.moshi)

    // Lifecycle & LiveData
    implementation(libs.lifecycle.viewmodel.ktx)
    implementation(libs.lifecycle.runtime.ktx)
    implementation(libs.lifecycle.livedata.ktx)
    implementation(libs.androidx.security.crypto)
    implementation("androidx.fragment:fragment-ktx:1.6.1")

    // Coroutines
    implementation(libs.kotlinx.coroutines.core)
    implementation(libs.kotlinx.coroutines.android)

    // Image Loading
    implementation(libs.glide)

    // Firebase & Google Sign-In
    implementation("com.google.firebase:firebase-auth-ktx:23.1.0")
    implementation("com.google.firebase:firebase-firestore-ktx:25.1.0")
    implementation(libs.play.services.auth)
    implementation(libs.firebase.firestore)
    implementation(libs.firebase.storage)
    implementation(libs.firebase.database)
    implementation("androidx.swiperefreshlayout:swiperefreshlayout:1.1.0")

    // OpenStreetMap — free map tiles, no API key required
    implementation("org.osmdroid:osmdroid-android:6.1.18")

    testImplementation(libs.junit)
    androidTestImplementation(libs.androidx.junit)
    androidTestImplementation(libs.androidx.espresso.core)
}

// Automatic adb reverse setup for USB debugging
afterEvaluate {
    tasks.register("setupAdbReverse") {
        doLast {
            // Get the ADB executable path from Android SDK
            val adb = android.adbExecutable.absolutePath
            println("Setting up adb reverse for port 5000...")

            // Get list of connected devices
            val devicesOutput = ByteArrayOutputStream()
            exec {
                commandLine(adb, "devices")
                standardOutput = devicesOutput
                isIgnoreExitValue = true
            }

            val devices = devicesOutput.toString().split("\n")
                .drop(1) // Skip header "List of devices attached"
                .filter { it.trim().isNotEmpty() && it.contains("device") }
                .map { it.split("\t")[0].trim() }

            if (devices.isNotEmpty()) {
                devices.forEach { device ->
                    println("Setting up adb reverse for device: $device")
                    exec {
                        commandLine(adb, "-s", device, "reverse", "tcp:5000", "tcp:5000")
                        isIgnoreExitValue = true
                    }
                }
                println("✓ adb reverse tcp:5000 tcp:5000 configured for ${devices.size} device(s)")
            } else {
                println("⚠️  No devices found online. adb reverse will be set up once device is connected.")
                // Try anyway without specifying device - it might work if device connects later
                exec {
                    commandLine(adb, "reverse", "tcp:5000", "tcp:5000")
                    isIgnoreExitValue = true
                }
            }
        }
    }

    // Run setupAdbReverse before installing debug APK
    tasks.named("installDebug") {
        dependsOn("setupAdbReverse")
    }
}
