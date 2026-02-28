package com.craftly.core.network

import com.squareup.moshi.FromJson
import com.squareup.moshi.JsonQualifier
import com.squareup.moshi.JsonReader
import com.squareup.moshi.JsonWriter
import com.squareup.moshi.ToJson
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

/**
 * Qualifier for date fields that may arrive as a plain string OR a Firestore
 * Timestamp object {"_seconds": ..., "_nanoseconds": ...}.
 */
@Retention(AnnotationRetention.RUNTIME)
@JsonQualifier
annotation class FlexibleDate

/**
 * Moshi adapter that handles the two backend date shapes:
 *   String  : "2025-12-01T10:00:00.000Z"  — returned as-is
 *   Object  : {"_seconds": 1700000000, "_nanoseconds": 0}  — converted to ISO string
 */
class FlexibleDateAdapter {

    @FromJson
    @FlexibleDate
    fun fromJson(reader: JsonReader): String {
        return when (reader.peek()) {
            JsonReader.Token.STRING -> reader.nextString() ?: ""
            JsonReader.Token.BEGIN_OBJECT -> {
                var seconds = 0L
                reader.beginObject()
                while (reader.hasNext()) {
                    when (reader.nextName()) {
                        "_seconds", "seconds" -> seconds = reader.nextLong()
                        else -> reader.skipValue()
                    }
                }
                reader.endObject()
                val sdf = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
                sdf.timeZone = TimeZone.getTimeZone("UTC")
                sdf.format(Date(seconds * 1000))
            }
            JsonReader.Token.NULL -> {
                reader.nextNull<Unit>()
                ""
            }
            else -> {
                reader.skipValue()
                ""
            }
        }
    }

    @ToJson
    fun toJson(writer: JsonWriter, @FlexibleDate value: String?) {
        writer.value(value)
    }
}
