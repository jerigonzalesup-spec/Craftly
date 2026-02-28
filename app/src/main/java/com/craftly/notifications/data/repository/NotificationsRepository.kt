package com.craftly.notifications.data.repository

import com.craftly.notifications.data.models.Notification
import com.craftly.notifications.data.remote.NotificationsApiService

class NotificationsRepository(private val apiService: NotificationsApiService) {

    suspend fun getNotifications(userId: String): Result<List<Notification>> = try {
        val response = apiService.getNotifications(userId)
        if (response.success) {
            Result.success(response.data?.notifications ?: emptyList())
        } else {
            Result.failure(Exception(response.error ?: "Failed to fetch notifications"))
        }
    } catch (e: Exception) {
        Result.failure(e)
    }

    suspend fun markAsRead(userId: String, notificationId: String): Result<Unit> = try {
        apiService.markAsRead(userId, notificationId)
        Result.success(Unit)
    } catch (e: Exception) {
        Result.failure(e)
    }

    suspend fun markAllAsRead(userId: String): Result<Unit> = try {
        apiService.markAllAsRead(userId)
        Result.success(Unit)
    } catch (e: Exception) {
        Result.failure(e)
    }

    suspend fun deleteNotification(userId: String, notificationId: String): Result<Unit> = try {
        apiService.deleteNotification(userId, notificationId)
        Result.success(Unit)
    } catch (e: Exception) {
        Result.failure(e)
    }
}
