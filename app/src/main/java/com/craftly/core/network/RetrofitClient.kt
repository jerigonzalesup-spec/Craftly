package com.craftly.core.network

import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import com.craftly.auth.data.remote.AuthApiService
import com.craftly.products.data.remote.ProductApiService
import com.craftly.profile.data.remote.ProfileApiService
import com.craftly.cart.data.remote.CartApiService
import com.craftly.orders.data.remote.OrdersApiService
import com.craftly.favorites.data.remote.FavoritesApiService
import java.util.concurrent.TimeUnit

object RetrofitClient {
    private var retrofit: Retrofit? = null

    private fun getRetrofit(): Retrofit {
        if (retrofit == null) {
            val logging = HttpLoggingInterceptor().apply {
                level = HttpLoggingInterceptor.Level.BODY
            }

            val okHttpClient = OkHttpClient.Builder()
                .addInterceptor(logging)
                .connectTimeout(30, TimeUnit.SECONDS)
                .readTimeout(30, TimeUnit.SECONDS)
                .writeTimeout(30, TimeUnit.SECONDS)
                .build()

            val moshi = Moshi.Builder()
                .add(KotlinJsonAdapterFactory())
                .build()

            retrofit = Retrofit.Builder()
                .baseUrl(NetworkConfig.getBaseUrl())
                .client(okHttpClient)
                .addConverterFactory(MoshiConverterFactory.create(moshi).withNullSerialization())
                .build()
        }
        return retrofit!!
    }

    fun create(): AuthApiService {
        return getRetrofit().create(AuthApiService::class.java)
    }

    fun createProductApiService(): ProductApiService {
        return getRetrofit().create(ProductApiService::class.java)
    }

    fun createProfileApiService(): ProfileApiService {
        return getRetrofit().create(ProfileApiService::class.java)
    }

    fun createCartApiService(): CartApiService {
        return getRetrofit().create(CartApiService::class.java)
    }

    fun createOrdersApiService(): OrdersApiService {
        return getRetrofit().create(OrdersApiService::class.java)
    }

    fun createFavoritesApiService(): FavoritesApiService {
        return getRetrofit().create(FavoritesApiService::class.java)
    }

    fun reset() {
        retrofit = null
    }
}

