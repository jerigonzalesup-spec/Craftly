# Craftly Android App - Setup Guide

## Project Overview

Craftly Android is a mobile application for a multi-vendor e-commerce marketplace specializing in handmade crafts. The app is built using **Kotlin** with **XML layouts** and follows the **MVVM (Model-View-ViewModel) architecture** pattern.

**Supported User Roles:** Buyer and Seller (Admin features excluded)

---

## Technology Stack

### Core Technologies
- **Language:** Kotlin
- **UI Framework:** Android XML Layouts + Material Design 3
- **Architecture:** MVVM with Repository Pattern
- **Target SDK:** 34 (Android 14)
- **Minimum SDK:** 24 (Android 7.0)
- **Build Tool:** Gradle with Version Catalogs

### Key Dependencies

#### Networking & API
- **Retrofit 2** - REST API client
- **OkHttp 4** - HTTP client with logging interceptor
- **Gson** - JSON serialization/deserialization

#### Firebase
- **Firebase Authentication** - User authentication
- **Cloud Firestore** - Real-time database
- **Firebase Storage** - Image and file storage
- **Firebase Cloud Messaging** - Push notifications (future)

#### Local Data & Caching
- **Room Database** - Local SQLite database for cart and cache
- **SharedPreferences** - Session management

#### State Management & Async
- **Kotlin Coroutines** - Async operations
- **LiveData & ViewModel** - UI state management
- **Lifecycle Components** - Fragment and Activity lifecycle management

#### UI & Media
- **Material Components 3** - Material Design components
- **Coil** - Image loading and caching
- **AndroidX Fragment & Navigation** - Fragment Management

#### Dependency Injection
- **Hilt** - Dependency injection framework (setup ready)

---

## Project Structure

```
craftly-android/
├── gradle/                              # Gradle configurations
├── app/
│   ├── build.gradle.kts                # App-level build configuration
│   ├── proguard-rules.pro              # ProGuard rules
│   ├── src/
│   │   ├── main/
│   │   │   ├── AndroidManifest.xml     # App manifest with permissions
│   │   │   ├── java/com/craftly/app/
│   │   │   │   ├── CraftlyApplication.kt       # App entry point
│   │   │   │   ├── common/
│   │   │   │   │   └── Constants.kt           # API & Firebase config
│   │   │   │   ├── data/
│   │   │   │   │   ├── local/
│   │   │   │   │   │   ├── CraftlyDatabase.kt       # Room database
│   │   │   │   │   │   └── Entities.kt             # Cart & Product cache entities
│   │   │   │   │   ├── model/
│   │   │   │   │   │   └── Models.kt               # Data classes (User, Product, Order, etc.)
│   │   │   │   │   ├── remote/
│   │   │   │   │   │   ├── ApiService.kt           # Retrofit API interface
│   │   │   │   │   │   ├── RetrofitClient.kt       # Retrofit setup
│   │   │   │   │   │   └── AuthInterceptor.kt      # OkHttp interceptor for X-User-ID
│   │   │   │   │   └── repository/
│   │   │   │   │       ├── CartRepository.kt       # Cart operations
│   │   │   │   │       └── Repositories.kt         # Product, Order, User repositories
│   │   │   │   ├── presentation/
│   │   │   │   │   ├── auth/
│   │   │   │   │   │   ├── LoginActivity.kt        # Login screen
│   │   │   │   │   │   ├── RegisterActivity.kt     # Registration screen
│   │   │   │   │   │   └── AuthManager.kt          # Session management
│   │   │   │   │   ├── ui/
│   │   │   │   │   │   ├── MainActivity.kt         # Main navigation hub
│   │   │   │   │   │   ├── HomeFragment.kt         # Home/Browse products
│   │   │   │   │   │   ├── SearchFragment.kt       # Search products
│   │   │   │   │   │   ├── CartFragment.kt         # Shopping cart
│   │   │   │   │   │   ├── OrdersFragment.kt       # Order history
│   │   │   │   │   │   └── ProfileFragment.kt      # User profile
│   │   │   │   │   └── common/
│   │   │   │   │       └── ViewModelFactory.kt     # ViewModel factory for DI
│   │   │   ├── res/
│   │   │   │   ├── layout/
│   │   │   │   │   ├── activity_main.xml           # Main activity layout
│   │   │   │   │   ├── activity_login.xml          # Login screen
│   │   │   │   │   ├── activity_register.xml       # Registration screen
│   │   │   │   │   ├── fragment_home.xml           # Home screen
│   │   │   │   │   ├── fragment_search.xml         # Search screen
│   │   │   │   │   ├── fragment_cart.xml           # Cart screen
│   │   │   │   │   ├── fragment_orders.xml         # Orders screen
│   │   │   │   │   └── fragment_profile.xml        # Profile screen
│   │   │   │   ├── menu/
│   │   │   │   │   └── bottom_nav_menu.xml         # Bottom navigation menu
│   │   │   │   ├── values/
│   │   │   │   │   ├── strings.xml                 # All string resources
│   │   │   │   │   ├── colors.xml                  # Color palette (Material Design 3)
│   │   │   │   │   └── themes.xml                  # App theme
│   │   │   │   ├── drawable/                       # Drawable resources
│   │   │   │   └── mipmap/                         # App icons
│   │   │   └── xml/
│   │   │       ├── backup_rules.xml
│   │   │       └── data_extraction_rules.xml
│   │   ├── androidTest/                             # Instrumented tests
│   │   └── test/                                    # Unit tests
│   └── src/main/res/
├── build.gradle.kts                    # Root build configuration
├── settings.gradle.kts                 # Project settings
├── gradle.properties                   # Gradle properties
└── README.md
```

---

## Firebase Configuration

### Project Details
- **Project ID:** studio-3437465512-f56c8
- **Project Name:** Craftly
- **Region:** Default

### Firebase Services Enabled
1. **Authentication** - Custom email/password authentication
2. **Firestore Database** - Real-time NoSQL database
3. **Cloud Storage** - File storage for images and receipts
4. **Cloud Messaging** - Push notifications (optional)

### Configuration
The Firebase configuration is defined in:
- `Constants.kt:15-21` - Firebase credentials hardcoded (for emulator/development)
- `CraftlyApplication.kt` - Automatic Firebase initialization on app startup

---

## API Configuration

### Base URL
- **Development (Emulator):** `http://10.0.2.2:5000`
- **Physical Device:** `http://<YOUR_MACHINE_IP>:5000`

Note: `10.0.2.2` is a special alias in Android emulator that refers to the host machine's localhost.

### Authentication
All API requests include an `X-User-ID` header (added by `AuthInterceptor.kt`):
```
X-User-ID: <current_user_id>
```

### API Endpoints
Refer to `ANDROID_REQUIREMENTS.md` for complete list of API endpoints organized by feature.

---

## Setup Instructions

### Prerequisites
- Android Studio 2023.1+
- JDK 11+
- Android SDK 34+
- Kotlin Plugin for Android Studio

### Clone & Open Project
```bash
cd craftly-app
# Open craftly-android folder in Android Studio
# Or from command line:
cd craftly-android
./gradlew build
```

### Configure Local Network (Physical Device Only)
If testing on a physical device:

1. Find your machine's IP address:
   - Windows: `ipconfig` (look for IPv4 Address)
   - Mac/Linux: `ifconfig` or `hostname -I`

2. Update `Constants.kt`:
   ```kotlin
   const val API_BASE_URL = "http://YOUR_IP:5000"
   ```

### Run the App
```bash
# Via Android Studio: Click "Run" or press Shift+F10
# Via command line:
./gradlew installDebug
adb shell am start -n com.craftly.app/.presentation.auth.LoginActivity
```

### Default Login (For Development)
Since backend login API integration is pending, use placeholder credentials for now.

---

## Architecture Overview

### MVVM Pattern

```
┌─────────────────────────────────────────┐
│         UI Layer (View)                 │
│  Activities & Fragments (.xml layouts)  │
└──────────────┬──────────────────────────┘
               │ (Observe LiveData)
┌──────────────▼──────────────────────────┐
│      ViewModel Layer (ViewModel)        │
│   - Holds UI state (LiveData)           │
│   - Handles user interactions           │
│   - Calls repositories                  │
└──────────────┬──────────────────────────┘
               │ (Calls methods)
┌──────────────▼──────────────────────────┐
│        Model Layer (Repository)         │
│  - Abstracts data sources               │
│  - Manages API calls & local DB         │
│  - Returns Result<T> sealed class       │
└──────────────┬──────────────────────────┘
               │
        ┌──────┴──────┐
        │             │
   ┌────▼─────┐  ┌───▼──────┐
   │ API/REST │  │Room DB & │
   │ (Retrofit)  │SharedPref│
   └──────────┘  └──────────┘
```

### Data Flow
1. **View (Fragment)** displays data and captures user input
2. **ViewModel** observes user actions and calls repositories
3. **Repository** fetches data from API or local database
4. **API/Database** returns data wrapped in `Result<T>` sealed class
5. **ViewModel** updates LiveData
6. **View** observes LiveData changes and updates UI

### Key MVVM Components

#### Result Sealed Class
```kotlin
sealed class Result<out T> {
    data class Success<T>(val data: T) : Result<T>()
    data class Error<T>(val exception: Exception) : Result<T>()
    object Loading : Result<Nothing>()
}
```

---

## Data Models

### User
```kotlin
data class User(
  val uid: String,
  val fullName: String,
  val email: String,
  val role: String,              // "buyer" or "seller"
  val contactNumber: String,
  val streetAddress: String,
  val barangay: String,
  val shopName: String?,         // For sellers
  val shopAddress: String?,
  val allowShipping: Boolean,
  val allowPickup: Boolean,
  val gcashName: String?,
  val gcashNumber: String?
)
```

### Product
```kotlin
data class Product(
  val id: String,
  val name: String,
  val description: String,
  val price: Double,
  val stock: Int,
  val images: List<String>,
  val category: String,
  val createdBy: String,         // Seller ID
  val rating: Double,
  val reviewCount: Int
)
```

### Order
```kotlin
data class Order(
  val orderId: String,
  val items: List<OrderItem>,
  val totalAmount: Double,
  val shippingMethod: String,    // "local-delivery" or "store-pickup"
  val shippingAddress: ShippingAddress,
  val deliveryFee: Double,
  val paymentMethod: String,     // "cod" or "gcash"
  val paymentStatus: String,     // "unpaid", "pending", "paid"
  val orderStatus: String,       // "pending", "processing", "shipped", "delivered"
  val buyerId: String
)
```

### CartItem (Local)
```kotlin
@Entity(tableName = "cart_items")
data class CartItemEntity(
  @PrimaryKey val id: String,
  val productId: String,
  val name: String,
  val price: Double,
  val quantity: Int,
  val image: String,
  val sellerId: String,
  val stock: Int
)
```

---

## Session Management

### Login Flow
```
User clicks Login
     ↓
Validate email & password
     ↓
Call API: POST /api/auth/signin
     ↓
On success:
  - Save session via AuthManager.saveSession()
  - Store userId, email, role, token in SharedPreferences
  - Navigate to MainActivity
     ↓
On failure:
  - Show error toast
  - Keep user on LoginActivity
```

### Logout Flow
```
User clicks Logout
     ↓
Call AuthManager.logout()
     ↓
Clear SharedPreferences
     ↓
Navigate to LoginActivity
```

### Session Verification
```
App startup
     ↓
Check AuthManager.isLoggedIn()
     ↓
If logged in → Load MainActivity
If not → Load LoginActivity
```

---

## Local Database (Room)

### Purpose
- Cache cart items locally for offline support
- Store product cache (future optimization)
- Persist favorites list

### Entities

#### CartItemEntity
- **Table:** `cart_items`
- **Primary Key:** `id`
- Used by `CartRepository` for CRUD operations
- Auto-calculated totals and counts

#### ProductCacheEntity
- **Table:** `products_cache`
- **Purpose:** Cache products for offline browsing
- **Expiration:** 24 hours (configurable)

### Usage Example
```kotlin
// Get all cart items
val cartItems = cartRepository.getCartItems()

// Add item to cart
cartRepository.addToCart(item)

// Clear cart
cartRepository.clearCart()

// Get cart total
val total = cartRepository.getCartTotal()
```

---

## Error Handling

### Result Wrapper Pattern
All API calls return `Result<T>`:
```kotlin
when (val result = productRepository.getProducts()) {
    is Result.Success -> {
        // Update UI with products
    }
    is Result.Error -> {
        // Show error message: result.exception.message
    }
    is Result.Loading -> {
        // Show loading spinner
    }
}
```

### Common Error Scenarios
- Network errors → Show "Network error. Please check your connection."
- API errors → Parse error response and show API message
- Validation errors → Show specific field validation errors
- Authentication errors → Clear session and redirect to login

---

## Next Steps (Development Roadmap)

### Phase 1: Authentication & Navigation ← NOW
- [x] Project structure and setup
- [x] Data models and API service
- [x] Authentication screens (UI) - basic placeholders
- [x] Session management
- [ ] Integrate login/register with API
- [ ] Password recovery screen
- [ ] Handle Firebase Auth (optional)

### Phase 2: Buyer Features - Product Browsing
- [ ] Implement ProductListViewModel with filtering
- [ ] Build search and category filtering
- [ ] Implement product sorting (price, newest)
- [ ] Create product detail screen with reviews

### Phase 3: Buyer Features - Shopping Cart
- [ ] Implement CartViewModel
- [ ] Add/remove/update cart items
- [ ] Persist cart to Room database
- [ ] Calculate totals

### Phase 4: Buyer Features - Checkout & Orders
- [ ] Build checkout screen with address validation
- [ ] Implement delivery method selection with seller validation
- [ ] Implement payment method selection
- [ ] Create order confirmation
- [ ] Build order history and tracking

### Phase 5: Seller Features
- [ ] Seller dashboard with statistics
- [ ] Product management (CRUD)
- [ ] Shop profile setup
- [ ] Order management

### Phase 6: Polish & Testing
- [ ] Error handling and user feedback
- [ ] Loading states and empty states
- [ ] Unit tests
- [ ] UI/UX improvements
- [ ] Performance optimization

---

## Troubleshooting

### Common Issues

#### Build Fails with "Cannot find symbol ApiService"
- Ensure all Retrofit models are in `data/model/Models.kt`
- Check that `build.gradle.kts` includes Retrofit and Gson dependencies

#### Emulator Can't Reach API at `10.0.2.2:5000`
- Verify backend is running on `http://localhost:5000`
- Check firewall settings
- Try with physical device using your machine's IP

#### SharedPreferences Returns Null
- Ensure `AuthManager.saveSession()` was called after successful login
- Check that `KEY_USER_ID` matches in save/retrieve methods

#### Room Database Migration Errors
- Clear app data: Settings → Apps → Craftly → Storage → Clear Cache/Data
- Or uninstall and reinstall the app

#### Firebase/Firestore Not Initializing
- Verify `CraftlyApplication` is declared in `AndroidManifest.xml`
- Check Firebase credentials in `Constants.kt`
- Ensure internet permission is granted

---

## Resources & Documentation

- **Android Documentation:** https://developer.android.com/docs
- **Kotlin Documentation:** https://kotlinlang.org/docs
- **Retrofit 2:** https://square.github.io/retrofit/
- **Room Database:** https://developer.android.com/training/data-storage/room
- **Material Design 3:** https://m3.material.io/
- **Firebase for Android:** https://firebase.google.com/docs/android/setup

---

## Important Reminders

✅ **DO:**
- Commit changes with meaningful messages
- Test on both emulator and physical device
- Handle errors gracefully with user-friendly messages
- Use proper naming conventions (PascalCase for classes, camelCase for variables)
- Comment complex business logic
- Keep UIs responsive (use Coroutines for long operations)

❌ **DON'T:**
- Store sensitive data in SharedPreferences without encryption
- Hardcode API URLs in activities (use Constants)
- Ignore compilation warnings
- Make blocking calls on main thread
- Commit API keys or secrets
- Make large bulky layouts (keep them modular)

---

## Support & Questions

For issues or questions about the Android setup:
1. Check this guide first
2. Review Android debugging with Logcat
3. Check the web app's API implementation for reference
4. Consult Android Studio's built-in documentation

Good luck with development! 🚀
