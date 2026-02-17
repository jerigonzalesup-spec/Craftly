# Craftly Mobile App - Requirements Analysis & Implementation Plan

## 1. PROJECT REQUIREMENTS ASSESSMENT

### Web App (React) - Status ✅ COMPLETE
- ✅ React (JavaScript Library) - Using React 19 with Vite
- ✅ API (Express.js) - Running on `http://localhost:5000`
- ✅ Database (Firestore) - Using Google Cloud Firestore
- ⚠️ MVVM Architecture - Partially implemented (Component-based with Context API, not strict MVVM)

### Mobile App (Android) - Status 🔄 IN PROGRESS
- ✅ Kotlin - Set up
- ✅ XML Layouts - Using traditional Android layouts
- ✅ Same API - Will use `http://10.0.2.2:5000` (localhost for emulator)
- ✅ Same Database - Same Firestore project (studio-3437465512-f56c8)
- ✅ MVVM Architecture - Need to implement properly

**⚠️ IMPORTANT:** Neither project strictly follows MVVM. For Android, we need to implement proper MVVM with:
- ViewModel classes for each screen
- LiveData/StateFlow for reactive data
- Repository pattern for data access
- Use cases/ViewModels handling business logic

---

## 2. ANDROID APP SCOPE

### User Roles (Mobile Only)
- **Buyer** - Browse products, create orders, manage cart
- **Seller** - Manage products, view orders, update order status

**⚠️ NO ADMIN FEATURES ON MOBILE**

---

## 3. COMPLETE FEATURE LIST FOR ANDROID

### TIER 1: Core Features (Authentication & Basic Navigation)
1. **Authentication System**
   - Sign up with email, password, full name, role selection
   - Sign in with email and password
   - Password reset using recovery codes
   - Session management (SharedPreferences/Firebase Auth)
   - Logout functionality

2. **Main Navigation**
   - Bottom navigation with 5 tabs for buyers
   - Different bottom navigation for sellers
   - Switch between buyer/seller mode (if user has both roles)

---

### TIER 2: Buyer Features

3. **Home Screen**
   - Featured products carousel
   - Recent products list
   - Quick access to categories
   - Search bar

4. **Product Browsing**
   - Browse all active products
   - Filter by 8 categories:
     - Crafts, Accessories, Home Decor, Gifts, Jewelry, Clothing, Pottery, Art & Collectibles
   - Search by product name
   - Sort by: Newest, Price (Low-High), Price (High-Low)
   - View product details with images, description, price, stock, reviews, ratings

5. **Product Details Page**
   - Product images carousel
   - Product info (name, price, stock, category)
   - Seller name and profile link
   - Star rating and review count
   - Customer reviews list with ratings and comments
   - Add to cart button
   - Add to favorites button

6. **Shopping Cart**
   - View all cart items with images
   - Update quantities
   - Remove items
   - View cart total
   - Clear cart
   - Proceed to checkout button
   - Persist cart to local database (Room)

7. **Favorites**
   - View favorite products
   - Remove from favorites
   - Add to cart from favorites
   - Persist favorites locally

8. **Checkout Process**
   - Choose shipping method:
     - Local Delivery (₱50 fee)
     - Store Pickup (Free)
   - Validate seller supports chosen method (error if not)
   - Enter/confirm shipping address:
     - Full name, email, contact number
     - Street address (only for local delivery)
     - Barangay (from Dagupan list - 369 barangays)
     - Validation for all fields
   - Choose payment method:
     - Cash-on-Delivery (COD)
     - GCash (with receipt upload)
   - Review order summary with total
   - Place order button

9. **Order Management**
   - View all buyer's orders (list view with status badges)
   - View order details:
     - Order ID, date created
     - Items ordered (product name, quantity, price)
     - Total amount and delivery fee
     - Shipping address (or pickup location if selected)
     - Payment method and status
     - Order status with timestamps
     - Seller information (for pickup orders)
   - For GCash orders: Upload receipt image proof
   - Track order status changes

10. **User Profile**
    - View profile information
    - Edit profile (name, contact number, address, barangay)
    - Change password (with current password verification)
    - View recovery codes
    - Log out

11. **Seller Profile Viewing**
    - View seller public profile
    - See seller's shop name and address
    - See available delivery methods
    - View all seller's products
    - View seller's GCash name (during checkout)

12. **Notifications** (Optional for Tier 1-2)
    - Order confirmations
    - Order status updates
    - New review notifications

---

### TIER 3: Seller Features

13. **Seller Dashboard**
    - Overview with statistics:
      - Total products count
      - Total orders count
      - Revenue from paid orders
    - Recent orders list (top 5)
    - Low stock products (stock ≤ 5)
    - Quick stats overview

14. **Product Management**
    - Create new product:
      - Name, description, category, price, stock
      - Upload/select images
      - Validation for all fields
    - Edit own products
    - Delete own products
    - View all own products (active only)
    - Archive products (soft delete)
    - Sort by newest, best sellers, low stock

15. **Shop Profile Setup**
    - Set shop name and address
    - Set shop barangay
    - Configure delivery methods:
      - Allow local delivery (checkbox)
      - Allow store pickup (checkbox)
    - Add GCash payment details:
      - GCash account name
      - GCash phone number
    - Update profile information

16. **Seller Order Management**
    - View all orders containing own products
    - View order details:
      - Buyer information
      - Items from this seller
      - Shipping address
      - Payment method and status
      - Order status
    - Update order status: pending → processing → shipped → delivered
    - View buyer contact information

---

## 4. API ENDPOINTS NEEDED FOR ANDROID

### Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/signin` - Login
- `POST /api/auth/change-password` - Change password
- `POST /api/auth/recover-password` - Password recovery
- `POST /api/auth/verify-recovery-code-and-reset` - Reset with recovery code

### Products
- `GET /api/products` - Get all products (paginated, with filters)
- `GET /api/products/:id` - Get single product
- `POST /api/products` (Seller) - Create product
- `PUT /api/products/:id` (Seller) - Update product
- `DELETE /api/products/:id` (Seller) - Delete product

### Cart (Local - Room Database)
- All operations local to device for offline support

### Orders
- `POST /api/orders` - Create order
- `GET /api/orders/:userId` - Get user's orders
- `GET /api/orders/:orderId/details` - Get order details
- `GET /api/orders/seller/:sellerId` - Get seller's orders
- `POST /api/orders/:orderId/status` - Update order status

### User Profile
- `GET /api/profile/:userId` - Get profile
- `POST /api/profile/:userId` - Update profile

### Reviews
- `POST /api/reviews/submit` - Submit review
- `GET /api/reviews/:productId` - Get product reviews

### Favorites (Local - Room Database)
- All operations local to device

### Notifications (Optional)
- `GET /api/notifications/:userId` - Get notifications
- `PUT /api/notifications/:userId/:notificationId/mark-as-read` - Mark read

### File Upload
- Receipt images to Firebase Storage (for GCash proof)
- Product images to Firebase Storage (for sellers)

---

## 5. DATA MODELS FOR ANDROID

### User
```kotlin
data class User(
  val uid: String,
  val fullName: String,
  val email: String,
  val role: String,  // buyer or seller
  val contactNumber: String,
  val streetAddress: String,
  val barangay: String,
  val city: String,
  val postalCode: String,
  val country: String,
  val shopName: String?,     // For sellers
  val shopAddress: String?,  // For sellers
  val shopBarangay: String?, // For sellers
  val allowShipping: Boolean,
  val allowPickup: Boolean,
  val gcashName: String?,
  val gcashNumber: String?,
  val createdAt: Long,
  val updatedAt: Long
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
  val createdBy: String,     // Seller ID
  val status: String,        // active or archived
  val rating: Double,
  val reviewCount: Int,
  val createdAt: Long
)
```

### Order
```kotlin
data class Order(
  val orderId: String,
  val items: List<OrderItem>,
  val totalAmount: Double,
  val shippingMethod: String,     // local-delivery or store-pickup
  val shippingAddress: ShippingAddress,
  val deliveryFee: Double,
  val paymentMethod: String,      // cod or gcash
  val paymentStatus: String,      // unpaid, pending, paid
  val orderStatus: String,        // pending, processing, shipped, delivered, cancelled
  val receiptImageUrl: String?,
  val buyerId: String,
  val createdAt: Long,
  val updatedAt: Long
)

data class OrderItem(
  val productId: String,
  val productName: String,
  val quantity: Int,
  val price: Double,
  val image: String,
  val sellerId: String
)

data class ShippingAddress(
  val fullName: String,
  val email: String,
  val contactNumber: String,
  val streetAddress: String,
  val barangay: String,
  val city: String,
  val postalCode: String,
  val country: String
)
```

### CartItem (Local)
```kotlin
data class CartItem(
  val id: String,
  val productId: String,
  val name: String,
  val price: Double,
  val quantity: Int,
  val image: String,
  val sellerId: String,
  val stock: Int
)
```

### Review
```kotlin
data class Review(
  val rating: Int,      // 1-5
  val comment: String,  // 10-500 chars
  val userId: String,
  val userName: String,
  val createdAt: Long
)
```

---

## 6. NEXT STEPS FOR ANDROID DEVELOPMENT

### Phase 1: Core Setup & Auth (Currently Starting)
- [x] Create project structure with MVVM architecture
- [x] Setup build.gradle with all dependencies
- [x] Create Constants.kt with Firebase and API config
- [x] Create data models (Models.kt)
- [x] Setup Retrofit for API calls
- [x] Setup AuthInterceptor for X-User-ID header
- [x] Create AuthManager for session management
- [x] Setup Room Database for cart/favorites/cache
- [ ] Setup Firebase Authentication
- [ ] Implement Login/Register screens with API integration
- [ ] Implement Password Recovery screen
- [ ] Setup proper ViewModels for auth screens

### Phase 2: Buyer - Product Browsing & Cart
- [ ] Create ProductListViewModel
- [ ] Create ProductDetailViewModel
- [ ] Create HomeFragment & ProductListFragment UI
- [ ] Implement product filtering by category
- [ ] Implement product search
- [ ] Implement product sorting
- [ ] Create ProductDetailFragment with reviews
- [ ] Create CartViewModel
- [ ] Create CartFragment UI
- [ ] Implement add/remove/update cart items
- [ ] Implement favorites functionality

### Phase 3: Buyer - Checkout & Orders
- [ ] Create CheckoutViewModel
- [ ] Create CheckoutFragment with address validation
- [ ] Implement delivery method selection with seller validation
- [ ] Implement payment method selection
- [ ] Create order details screen
- [ ] Implement order history screen
- [ ] Implement receipt image upload for GCash
- [ ] Implement order status tracking

### Phase 4: Buyer - Profile & Reviews
- [ ] Create UserProfileViewModel
- [ ] Create ProfileFragment for editing profile
- [ ] Implement password change
- [ ] Display recovery codes
- [ ] Create ReviewListFragment
- [ ] Implement review submission

### Phase 5: Seller - Dashboard & Products
- [ ] Create SellerDashboardFragment with statistics
- [ ] Create ProductManagementFragment
- [ ] Implement product creation form
- [ ] Implement product editing
- [ ] Implement product deletion/archiving
- [ ] Create low stock alert display

### Phase 6: Seller - Shop Setup & Orders
- [ ] Create ShopProfileFragment for setup
- [ ] Implement shop profile editing
- [ ] Create SellerOrdersFragment
- [ ] Implement order status updates
- [ ] Implement order detail viewing

### Phase 7: Polish & Testing
- [ ] Error handling and retry logic
- [ ] Loading states and skeleton loaders
- [ ] Empty state displays
- [ ] Navigation optimization
- [ ] Unit tests
- [ ] UI/UX polish
- [ ] Performance optimization

---

## 7. KEY DIFFERENCES FROM WEB

1. **Offline Support:** Cart/Favorites stored locally in Room DB
2. **Image Handling:** Use Coil for image loading with caching
3. **Navigation:** Bottom tab navigation instead of React Router
4. **Forms:** Use Android validation instead of Zod
5. **State Management:** ViewModels + LiveData instead of Context API
6. **Authentication:** SharedPreferences for session instead of localStorage
7. **Real-time Updates:** May need to implement polling or FCM for notifications

---

## 8. ESTIMATED FEATURE MATRIX

| Feature | Category | Priority | Difficulty | Time Est |
|---------|----------|----------|-----------|----------|
| Authentication | Core | P1 | Medium | High |
| Product Browsing | Buyer | P1 | Easy | Medium |
| Shopping Cart | Buyer | P1 | Easy | Medium |
| Checkout | Buyer | P1 | Hard | High |
| Order Management | Buyer | P1 | Medium | Medium |
| User Profile | Buyer | P2 | Easy | Low |
| Reviews | Buyer | P2 | Medium | Medium |
| Favorites | Buyer | P3 | Easy | Low |
| Seller Dashboard | Seller | P1 | Medium | Medium |
| Product Management | Seller | P1 | Hard | High |
| Shop Profile | Seller | P1 | Medium | Medium |
| Seller Orders | Seller | P1 | Medium | Medium |
| Notifications | Both | P3 | Medium | Medium |

---

## 9. ARCHITECTURE DECISIONS

### MVVM Pattern Implementation
- **View:** Fragments/Activities handling UI display
- **ViewModel:** Manages UI logic, holds LiveData, calls repositories
- **Model:** Data classes and Repositories handling business logic
- **Repository:** Abstracts data source (API, Room, SharedPreferences)
- **Local DB:** Room for cart, favorites, caching

### Dependency Injection
- Use View Model Factory for now
- Can upgrade to Hilt if complexity increases

### Error Handling
- Sealed Result class (Success, Error, Loading)
- Try-catch in repositories
- Error messages displayed via Toast/Snackbar

### Navigation
- Fragment-based with Bottom Navigation
- Intent-based for authentication flows and deep linking

---

## CONCLUSION

Craftly is ready for Android implementation. The web app meets the core requirements (React, API, Database). The Android app will:
1. Use the same API endpoints (`http://10.0.2.2:5000` on emulator)
2. Use the same Firestore database
3. Implement proper MVVM architecture
4. Support Buyer & Seller roles (no Admin)
5. Include all core e-commerce features

We have established the project structure and are ready to build authentication and product browsing features.
