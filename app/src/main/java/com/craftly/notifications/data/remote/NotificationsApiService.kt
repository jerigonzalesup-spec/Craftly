package com.craftly.notifications.data.remote

import com.craftly.notifications.data.models.NotificationsResponse
import com.craftly.notifications.data.models.SimpleSuccessResponse
import retrofit2.http.DELETE
import retrofit2.http.Header
import retrofit2.http.PUT
import retrofit2.http.Path

interface NotificationsApiService {

    @retrofit2.http.GET("/api/notifications/{userId}")
    suspend fun getNotifications(
        @Path("userId") userId: String
    ): NotificationsResponse

    @PUT("/api/notifications/{userId}/{notificationId}/mark-as-read")
    suspend fun markAsRead(
        @Path("userId") userId: String,
        @Path("notificationId") notificationId: String
    ): SimpleSuccessResponse

    @PUT("/api/notifications/{userId}/mark-all-as-read")
    suspend fun markAllAsRead(
        @Path("userId") userId: String
    ): SimpleSuccessResponse

    @DELETE("/api/notifications/{userId}/{notificationId}")
    suspend fun deleteNotification(
        @Path("userId") userId: String,
        @Path("notificationId") notificationId: String
    ): SimpleSuccessResponse
}
