package com.craftly.app.data.api

import android.util.Log
import com.craftly.app.BuildConfig
import com.google.gson.Gson
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

object RetrofitClient {

    private val TAG = "RetrofitClient"
    private var retrofitInstance: Retrofit? = null

    /**
     * Get or create Retrofit instance
     */
    fun getRetrofitInstance(): Retrofit {
        if (retrofitInstance == null) {
            Log.d(TAG, "Creating new Retrofit instance")
            Log.d(TAG, "Base URL: ${BuildConfig.API_BASE_URL}")

            retrofitInstance = Retrofit.Builder()
                .baseUrl(BuildConfig.API_BASE_URL)
                .client(getOkHttpClient())
                .addConverterFactory(GsonConverterFactory.create(createGsonWithCustomDeserializers()))
                .build()

            Log.d(TAG, "Retrofit instance created successfully")
        }
        return retrofitInstance!!
    }

    /**
     * Create Gson instance with custom deserializers for Firestore timestamps
     */
    private fun createGsonWithCustomDeserializers(): Gson {
        Log.d(TAG, "Creating Gson with custom deserializers")
        return Gson().newBuilder()
            .registerTypeAdapter(Long::class.java, FirestoreTimestampDeserializer())
            .create()
    }

    /**
     * Create OkHttpClient with logging and timeout configuration
     */
    private fun getOkHttpClient(): OkHttpClient {
        Log.d(TAG, "Creating OkHttpClient with logging interceptor")

        val loggingInterceptor = HttpLoggingInterceptor { message ->
            Log.d(TAG, "HTTP: $message")
        }.apply {
            level = HttpLoggingInterceptor.Level.BODY
        }

        val client = OkHttpClient.Builder()
            .addInterceptor(loggingInterceptor)
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .build()

        Log.d(TAG, "OkHttpClient created with timeouts: 30s")
        return client
    }

    /**
     * Get API service instance
     */
    fun getApiService(): ApiService {
        Log.d(TAG, "Creating API service instance")
        return getRetrofitInstance().create(ApiService::class.java)
    }
}
