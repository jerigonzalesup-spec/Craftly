package com.craftly.core.network

import com.squareup.moshi.Json
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

data class FirestoreTimestamp(
    @Json(name = "_seconds")
    val seconds: Long = 0,
    @Json(name = "_nanoseconds")
    val nanoseconds: Long = 0
) {
    fun toIsoString(): String {
        return try {
            val milliseconds = seconds * 1000 + nanoseconds / 1_000_000
            val sdf = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
            sdf.format(Date(milliseconds))
        } catch (e: Exception) {
            ""
        }
    }

    override fun toString(): String = toIsoString()
}

