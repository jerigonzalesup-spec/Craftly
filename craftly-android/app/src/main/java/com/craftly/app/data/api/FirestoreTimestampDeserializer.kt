package com.craftly.app.data.api

import android.util.Log
import com.google.gson.JsonDeserializationContext
import com.google.gson.JsonDeserializer
import com.google.gson.JsonElement
import java.lang.reflect.Type

/**
 * Custom Gson deserializer for Firestore Timestamp objects
 * Handles both:
 * - Plain timestamps: 1234567890
 * - Firestore objects: {"_seconds": 1234567890, "_nanoseconds": 969000000}
 */
class FirestoreTimestampDeserializer : JsonDeserializer<Long> {

    private val TAG = "FirestoreTimestampDeserializer"

    override fun deserialize(
        json: JsonElement?,
        typeOfT: Type?,
        context: JsonDeserializationContext?
    ): Long {
        return when {
            // If it's a plain number (simple timestamp in milliseconds or seconds)
            json?.isJsonPrimitive == true -> {
                try {
                    json.asLong
                } catch (e: Exception) {
                    Log.w(TAG, "Failed to parse primitive long: ${e.message}")
                    0L
                }
            }

            // If it's a Firestore timestamp object with _seconds
            json?.isJsonObject == true -> {
                try {
                    val obj = json.asJsonObject
                    val seconds = if (obj.has("_seconds")) {
                        obj.get("_seconds").asLong
                    } else {
                        0L
                    }

                    // Convert Firestore seconds timestamp to milliseconds
                    Log.d(TAG, "Parsed Firestore timestamp: seconds=$seconds, converted to milliseconds=${seconds * 1000}")
                    seconds * 1000
                } catch (e: Exception) {
                    Log.w(TAG, "Failed to parse Firestore timestamp object: ${e.message}")
                    0L
                }
            }

            // Default case
            else -> {
                Log.w(TAG, "Unexpected JSON type: ${json?.javaClass?.simpleName}")
                0L
            }
        }
    }
}
