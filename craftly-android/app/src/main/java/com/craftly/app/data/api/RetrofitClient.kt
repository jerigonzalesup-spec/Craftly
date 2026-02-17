package com.craftly.app.data.api

import com.craftly.app.BuildConfig
import com.google.gson.Gson
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

object RetrofitClient {

    private var retrofitInstance: Retrofit? = null

    /**
     * Get or create Retrofit instance
     */
    fun getRetrofitInstance(): Retrofit {
        if (retrofitInstance == null) {
            retrofitInstance = Retrofit.Builder()
                .baseUrl(BuildConfig.API_BASE_URL)
                .client(getOkHttpClient())
                .addConverterFactory(GsonConverterFactory.create(Gson()))
                .build()
        }
        return retrofitInstance!!
    }

    /**
     * Create OkHttpClient with logging and timeout configuration
     */
    private fun getOkHttpClient(): OkHttpClient {
        val loggingInterceptor = HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BODY
        }

        return OkHttpClient.Builder()
            .addInterceptor(loggingInterceptor)
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .build()
    }

    /**
     * Get API service instance
     */
    fun getApiService(): ApiService {
        return getRetrofitInstance().create(ApiService::class.java)
    }
}
