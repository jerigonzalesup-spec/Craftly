package com.craftly.auth.domain.models

object RoleNames {
    const val BUYER = "buyer"
    const val SELLER = "seller"

    /**
     * Check if user has a specific role
     */
    fun hasRole(userRoles: List<String>, role: String): Boolean {
        return userRoles.contains(role)
    }

    /**
     * Check if user is a buyer
     */
    fun isBuyer(userRoles: List<String>): Boolean {
        return hasRole(userRoles, BUYER)
    }

    /**
     * Check if user is a seller
     */
    fun isSeller(userRoles: List<String>): Boolean {
        return hasRole(userRoles, SELLER)
    }

    /**
     * Check if user can sell (is a seller)
     */
    fun canSell(userRoles: List<String>): Boolean {
        return isSeller(userRoles)
    }

    /**
     * Check if user can buy (is a buyer)
     */
    fun canBuy(userRoles: List<String>): Boolean {
        return isBuyer(userRoles)
    }
}
