package com.craftly.core.utils

import java.net.SocketTimeoutException
import java.net.UnknownHostException

/**
 * Converts raw exceptions into short, user-friendly messages.
 * Never expose technical stack traces or API error strings to users.
 */
object ErrorMapper {

    fun friendlyMessage(e: Throwable): String {
        val msg = e.message?.lowercase() ?: ""

        return when {
            // Network / connectivity
            e is UnknownHostException -> "No internet connection. Please check your network."
            e is SocketTimeoutException -> "Request timed out. Please try again."
            msg.contains("unable to resolve host") -> "No internet connection. Please check your network."
            msg.contains("timeout") -> "Request timed out. Please try again."
            msg.contains("network") || msg.contains("connect") -> "Connection error. Please check your internet."

            // Auth
            msg.contains("not logged in") || msg.contains("unauthorized") || msg.contains("401") ->
                "Please log in to continue."
            msg.contains("forbidden") || msg.contains("403") ->
                "You don't have permission to do this."

            // Not found
            msg.contains("not found") || msg.contains("404") ->
                "The item you're looking for doesn't exist."

            // Server
            msg.contains("500") || msg.contains("server error") || msg.contains("internal") ->
                "Something went wrong on our end. Please try again."

            // Image / upload
            msg.contains("upload") || msg.contains("image") ->
                "Failed to upload image. Please try a different file."

            // Default
            else -> "Something went wrong. Please try again."
        }
    }

    fun friendlyMessage(msg: String): String = friendlyMessage(Exception(msg))
}
