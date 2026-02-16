# Craftly Marketplace - Project Progress & Summary

## 📋 Original Purpose & Vision

**Project Goal**: Build a **Client-Server-Services Architecture** that wraps Firebase with an Express.js REST API, allowing both React web and future Kotlin Android apps to call the same API endpoints.

**Core Philosophy**:
- Backend API handles all Firebase Admin SDK operations (web and mobile apps can't use Admin SDK)
- Frontend stays thin with MVVM architecture
- API becomes the single source of truth for business logic
- Secure, scalable, and maintainable architecture

---

## ✅ Completed Features

### 1. **Authentication System** (COMPLETE)
- **Signup**: Users create accounts with email (whitelisted domains only), password, full name
- **Signin**: Users login with credentials, get stored in localStorage
- **Logout**: Clear session and redirect to home
- **Password Recovery**: Reset password feature
- **Password Hashing**: SHA-256 hashing on backend (no Firebase Auth SDK needed)
- **Firestore-only Auth**: No Firebase Auth SDK (solves permission issues)
- **Email Validation**:
  - ✅ Whitelisted domains only (gmail.com, yahoo.com, outlook.com, hotmail.com, aol.com, protonmail.com, icloud.com, mail.com, zoho.com)
  - ✅ Rejects @gmil.com, custom/fake domains
  - ✅ Frontend + Backend + Database-level validation
- **Name Validation**:
  - ✅ Only letters, spaces, hyphens, apostrophes
  - ✅ Rejects numbers (no "John123")
  - ✅ Frontend + Backend validation

**Files**: `authController.js`, `auth.js`, `use-user.jsx`, `LoginPage.jsx`, `RegisterPage.jsx`

---

### 2. **User Profile System** (COMPLETE)
- **Profile Storage**: Store user personal/shipping details in Firestore
- **Profile Page**: Full `ProfileForm.jsx` with sections:
  - Account Information (Full Name, Email)
  - Contact Information (Phone number with PH validation)
  - Shipping Address (Street address with house number requirement, Barangay with autocomplete)
  - City/Postal Code/Country fields
- **Auto-Fill Checkout**: When placing orders, form pre-fills with saved profile data
- **Profile Update**: Changes to profile instantly reflect in checkout
- **Barangay Autocomplete**: Shows matching Dagupan barangays as user types

**Files**: `ProfileForm.jsx`, `profileController.js`, `profileRoutes.js`, `userProfileService.js`, `dagupanBarangays.js`

---

### 3. **Products System** (COMPLETE)
- **Product Display**: Shows 14 products from Firestore
- **Product Details**: View individual product info and reviews
- **Product Listing**: Full catalog with filtering
- **Stock Management**: Track product quantities (used during order creation)
- **Seller Info**: Display seller details on product pages

**Files**: `productsController.js`, `ProductPage.jsx`, `ProductsPage.jsx`, `Marketplace.jsx`

---

### 4. **Favorites System** (COMPLETE)
- **Add to Favorites**: Toggle favorite status on products
- **View Favorites**: Dedicated page showing all favorited products
- **Favorite Persistence**: Stored in Firestore, syncs across devices
- **Real-time Updates**: UI updates immediately when favorite status changes

**Files**: `favoritesController.js`, `MyFavoritesPage.jsx`, `favoritesService.js`

---

### 5. **Shopping Cart** (COMPLETE)
- **Add to Cart**: Add products with quantity selection
- **View Cart**: See all items in cart with total price
- **Update Quantity**: Change item quantities
- **Remove Items**: Delete items from cart
- **Cart Persistence**: Syncs to API after each change
- **Cart Subtotal**: Display running total

**Files**: `cartController.js`, `CartPage.jsx`, `useCart.jsx`, `cartService.js`

---

### 6. **Order Checkout & Management** (COMPLETE)
- **Checkout Form**:
  - Shipping method selection (local-delivery or store-pickup)
  - Payment method selection (COD or GCash)
  - Shipping address with validation
  - GCash receipt upload support
- **Order Creation**:
  - Save order to Firestore with all items, totals, delivery info
  - Update product stock after order
  - Create seller notifications
- **Order History**: View all orders placed by user
- **Order Details**: View specific order information
- **Order Status**: Track order status (pending, processing, shipped, delivered, cancelled)

**Files**: `ordersController.js`, `CheckoutForm.jsx`, `CheckoutPage.jsx`, `MyOrdersPage.jsx`, `OrderDetailsPage.jsx`, `ordersService.js`

---

### 7. **Input Validation & Security** (COMPLETE)
- **Frontend Validation**: Zod schemas on all forms
- **Backend Validation**: Comprehensive checks in all controllers
- **Database Rules**: Firestore security rules enforce constraints
- **Email Validation**:
  - Whitelisted domains only
  - Regex format checking
  - Both frontend and backend validation
  - Firestore rules enforce email domain whitelist
- **Name Validation**:
  - Only letters, spaces, hyphens, apostrophes
  - No numbers allowed
  - Frontend and backend validation
- **Phone Number Validation**:
  - PH format required (09xxxxxxxxx or +639xxxxxxxxx)
  - Minimum 10 digits
  - Both frontend and backend checks
- **Street Address Validation**:
  - Required for local-delivery orders
  - Must contain both number (house number) and letters (street name)
  - Minimum 5 characters
  - Firestore rules validate format
- **Barangay Validation**:
  - Required for local-delivery orders
  - Must be from Dagupan barangay list
  - Frontend suggests valid options
- **Order Data Validation**:
  - Items array must not be empty
  - Item quantities/prices must be positive
  - Total amount must match calculated sum
  - Shipping method must be valid enum
  - Payment method must be valid enum

**Files**: `CheckoutForm.jsx`, `ProfileForm.jsx`, `ordersController.js`, `authController.js`, `firestore.rules`

---

### 8. **Firestore Security Rules** (COMPLETE)
- **Created**: `firestore.rules` file with comprehensive validation
- **User Collection**:
  - Users can only read/write their own profiles
  - Email domain whitelist enforced
  - Password hash and role cannot be modified
- **Orders Collection**:
  - Email validation at database level
  - Phone number format checking
  - Street address format validation
  - Order structure validation
  - Users can only access their own orders
- **Products Collection**: Read-only for users
- **Favorites/Cart Collections**: User-scoped access

---

### 9. **API Architecture** (COMPLETE)
- **REST Endpoints**:
  - `/api/auth/signup` - Create account
  - `/api/auth/signin` - Login user
  - `/api/auth/recover-password` - Reset password
  - `/api/products` - Get all products
  - `/api/products/:id` - Get single product
  - `/api/favorites/:userId/add` - Add favorite
  - `/api/favorites/:userId/remove` - Remove favorite
  - `/api/favorites/:userId/list` - Get user's favorites
  - `/api/cart/:userId` - Get cart
  - `/api/cart/:userId/add` - Add item
  - `/api/cart/:userId/update` - Update quantity
  - `/api/cart/:userId/remove` - Remove item
  - `/api/orders` - Create order
  - `/api/orders/:userId` - Get user's orders
  - `/api/orders/:orderId/:userId` - Get single order
  - `/api/orders/:orderId/status` - Update order status
  - `/api/profile/:userId` - Get/update user profile
- **Error Handling**: Centralized `asyncHandler` and `ApiError` class
- **Authentication**: `x-user-id` header for authorization checks
- **Response Format**: Standard `{success, data, message}` format

**Files**: All controller files, `errorHandler.js`, `server.js`

---

### 10. **Session Management** (COMPLETE)
- **localStorage Storage**: User data stored in browser
- **Custom Events**: `craftly-user-changed` event for real-time component updates
- **Page Refresh Persistence**: Session survives page reload
- **Logout Cleanup**: Completely wipes session data
- **Cross-Component Sync**: All components stay synchronized without Firestore listeners

**Files**: `auth.js`, `use-user.jsx`

---

## ⏳ Features Still Needed (Pending)

### 1. **Seller System**
- [ ] Allow users to become sellers
- [ ] Seller dashboard
- [ ] List products for sale
- [ ] Manage inventory
- [ ] View orders for their products
- [ ] Handle order fulfillment
- [ ] Seller profile/shop page

### 2. **Review & Rating System**
- [ ] Submit reviews on purchased products
- [ ] Add star ratings (1-5)
- [ ] Upload review images
- [ ] List reviews on product pages
- [ ] Calculate average product rating
- [ ] Seller response to reviews

### 3. **Admin Panel**
- [ ] User management (view, ban, etc)
- [ ] Product moderation
- [ ] Order tracking and reports
- [ ] System analytics
- [ ] Revenue reports
- [ ] Flag inappropriate content

### 4. **Notifications System**
- [ ] Email notifications for order status
- [ ] SMS notifications (optional)
- [ ] In-app notification bell
- [ ] Notification history
- [ ] Notification preferences

### 5. **Payment Integration**
- [ ] GCash payment gateway integration
- [ ] Payment verification
- [ ] Receipt generation
- [ ] Refund handling
- [ ] Payment history

### 6. **Shipping/Delivery**
- [ ] Real delivery partner integration (optional)
- [ ] Shipping cost calculation by barangay
- [ ] Delivery tracking
- [ ] Delivery driver assignment
- [ ] Delivery proof (photo/signature)

### 7. **Search & Filter**
- [ ] Product search functionality
- [ ] Advanced filtering (price, category, rating)
- [ ] Search suggestions
- [ ] Sort options (newest, price, rating)

### 8. **Wishlist/Collections**
- [ ] Create custom wishlists
- [ ] Save for later
- [ ] Share wishlists

### 9. **Promotions & Coupons**
- [ ] Create discount codes
- [ ] Apply coupons at checkout
- [ ] Flash sales
- [ ] Promotional banners

### 10. **Mobile App (Android)**
- [ ] Kotlin Android app using same API endpoints
- [ ] Native app features
- [ ] Push notifications
- [ ] Offline mode

---

## 🏗️ Current Architecture

```
craftly-app/
├── Frontend (React)
│   ├── src/
│   │   ├── components/
│   │   │   ├── CheckoutForm.jsx ✅
│   │   │   ├── ProfileForm.jsx ✅
│   │   │   ├── LoginForm.jsx ✅
│   │   │   ├── [other components]
│   │   ├── pages/
│   │   │   ├── ProfilePage.jsx ✅
│   │   │   ├── CheckoutPage.jsx ✅
│   │   │   ├── MyOrdersPage.jsx ✅
│   │   │   ├── [other pages]
│   │   ├── services/
│   │   │   ├── user/userProfileService.js ✅
│   │   │   ├── orders/ordersService.js ✅
│   │   │   ├── cart/cartService.js ✅
│   │   │   ├── favorites/favoritesService.js ✅
│   │   ├── firebase/
│   │   │   ├── auth/auth.js ✅
│   │   │   ├── auth/use-user.jsx ✅
│   │   ├── lib/
│   │   │   ├── dagupanBarangays.js ✅
│
├── Backend (Express.js + Firebase)
│   ├── craftly-api/
│   │   ├── controllers/
│   │   │   ├── authController.js ✅
│   │   │   ├── ordersController.js ✅
│   │   │   ├── profileController.js ✅
│   │   │   ├── productsController.js ✅
│   │   │   ├── favoritesController.js ✅
│   │   │   ├── cartController.js ✅
│   │   ├── routes/
│   │   │   ├── authRoutes.js ✅
│   │   │   ├── ordersRoutes.js ✅
│   │   │   ├── profileRoutes.js ✅
│   │   │   ├── [other routes]
│   │   ├── middleware/
│   │   │   ├── errorHandler.js ✅
│   │   ├── server.js ✅
│   │   ├── config/firebase.js ✅
│
├── Firestore Database
│   ├── users/ ✅
│   ├── products/ ✅
│   ├── orders/ ✅
│   ├── favorites/{userId}/favorites/ ✅
│   ├── cart/{userId}/items/ ✅
│
├── Security
│   ├── firestore.rules ✅
```

---

## 🔐 Validation Layers

Every piece of user input is validated at **3 levels**:

### 1️⃣ **Frontend (Zod Schemas)**
- Immediate user feedback with error messages
- Client-side validation before API call

### 2️⃣ **Backend (Express Controllers)**
- Re-validates all data from API request
- Never trust client-side validation
- Comprehensive error responses

### 3️⃣ **Database (Firestore Rules)**
- Prevents direct database writes that bypass API
- Enforces data structure and constraints
- Last line of defense

**Example - Email Validation**:
```
Frontend: Regex check + whitelist domain suggestion
         ↓
Backend: Email domain whitelist validation
         ↓
Database: Firestore rules verify domain before write
```

---

## 📝 Session Continuity Notes

If this session ends and a new one begins:

1. **Check Firebase Configuration**: Ensure `firebaseConfig.js` has correct credentials
2. **Check API Server**: Must be running on `http://localhost:5000` (or check `.env`)
3. **Check Firestore Database**: All collections exist (users, products, orders, etc)
4. **Test Accounts Available**:
   - chloe@gmail.com (if still in database)
   - admin@craftly.com (if still in database)
   - jeremy@gmail.com (if still in database)
5. **Rules Deployed**: Run `firebase deploy --only firestore:rules` if `firestore.rules` changed
6. **Current Focus**: Was working on stricter validation (email domains, name validation)

---

## 🚀 How to Continue Development

1. **Start API Server**:
   ```bash
   cd craftly-api
   npm install  # if needed
   npm start    # runs on port 5000
   ```

2. **Start Frontend**:
   ```bash
   npm install  # if needed
   npm run dev  # Vite dev server
   ```

3. **Deploy Firestore Rules** (if changed):
   ```bash
   firebase deploy --only firestore:rules
   ```

4. **Test Features**:
   - Sign up with new account
   - Update profile with valid data
   - Place order with auto-filled shipping info
   - Verify validation catches bad data

---

## 📊 Key Implementation Details

### Email Validation Pattern
```javascript
// Only these domains allowed:
gmail.com, yahoo.com, outlook.com, hotmail.com,
aol.com, protonmail.com, icloud.com, mail.com, zoho.com

// Rejects: @gmil.com, @yaho.com, @custom.com, etc.
```

### Name Validation Pattern
```javascript
// Only letters, spaces, hyphens, apostrophes
/^[a-zA-Z\s'-]+$/

// Accepts: Jeremy, Mary Jane, O'Connor, Jean-Paul
// Rejects: John123, User999, Test@Name
```

### Street Address Validation
```javascript
// Must have:
// 1. At least one number (house/building number)
// 2. At least one letter (street name)
// 3. Minimum 5 characters

// Accepts: 123 Main St, 4B Makabayan Avenue
// Rejects: Main Street (no number), 12345 (no letters), 123 (too short)
```

### Order Requirements
```javascript
// For LOCAL-DELIVERY orders:
- streetAddress: REQUIRED (with house number + street name)
- barangay: REQUIRED (must be from Dagupan list)

// For STORE-PICKUP orders:
- streetAddress: NOT required
- barangay: NOT required
- Just need: fullName, email, contactNumber
```

---

## 🔍 Common Issues & Solutions

### Issue: "Email domain not supported"
- **Cause**: Using non-whitelisted email domain
- **Solution**: Use gmail.com, yahoo.com, outlook.com, etc.
- **Files**: Check whitelist in `authController.js` and `ordersController.js`

### Issue: "Full name must contain only letters"
- **Cause**: Name contains numbers (e.g., "John123")
- **Solution**: Use only letters, spaces, hyphens, apostrophes
- **Files**: Frontend validation in `CheckoutForm.jsx`, `ProfileForm.jsx`, backend in `authController.js`

### Issue: "Street address must include house/building number"
- **Cause**: Address missing number or letters
- **Solution**: Format like "123 Main Street" not just "Main Street"
- **Files**: `ordersController.js`, `CheckoutForm.jsx`, `ProfileForm.jsx`

### Issue: "Barangay is required for local delivery"
- **Cause**: Didn't select/enter barangay for local-delivery shipping
- **Solution**: Select from autocomplete suggestions or type valid Dagupan barangay
- **Files**: `CheckoutForm.jsx`, `ProfileForm.jsx`, `dagupanBarangays.js`

### Issue: "API not running"
- **Cause**: Backend server not started
- **Solution**: `cd craftly-api && npm start`
- **Check**: Server should log "Server running on port 5000"

### Issue: "Firestore rules errors"
- **Cause**: Rules not deployed or have syntax errors
- **Solution**: `firebase deploy --only firestore:rules`
- **Check**: Firebase console → Firestore → Rules tab

---

## 📋 Testing Checklist

Before marking features complete, test:

- [ ] **Signup**:
  - Valid email from whitelist → Success
  - Email from blocked domain (@gmil.com) → Rejected at frontend
  - Name with numbers (John123) → Rejected at frontend and backend
  - Password < 6 chars → Rejected

- [ ] **Profile Update**:
  - Update with valid street address (123 Main) → Saves
  - Update with invalid street (no number) → Error
  - Select barangay from autocomplete → Works
  - Change to unwhitelisted email → Backend rejects

- [ ] **Checkout**:
  - For local-delivery: Must enter street + barangay
  - For store-pickup: Street/barangay optional
  - Invalid email format → Error
  - Profile data auto-fills from saved profile

- [ ] **Orders**:
  - Order with correct shipping address → Succeeds
  - Order with invalid address format → Backend rejects
  - Stock updates after order created
  - Order appears in "My Orders" page

---

## 🎯 Next Logical Steps (When Ready)

1. **Seller System** - Allow users to sell products
2. **Reviews & Ratings** - Users can review products they bought
3. **Payment Integration** - Real GCash integration
4. **Admin Dashboard** - Manage platform
5. **Mobile App** - Android version using same API
6. **Notifications** - Email/SMS on order status changes
7. **Search & Filter** - Find products easily

---

**Last Updated**: February 15, 2026
**Session Status**: In Progress - Stricter Validation Implementation
**Next Session Focus**: Continue with next feature (Seller System or Reviews)
