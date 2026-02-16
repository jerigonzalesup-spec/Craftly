# Craftly - Implementation Plan to Meet Requirements
## From Current State to Complete Shared Architecture

---

## EXECUTIVE SUMMARY

**Current:** Web app with MVVM + Firebase (client-side services)
**Needed:** Web + Android with shared API + shared database
**Work Required:**
- Week 1: Build backend API
- 2-3 days: Minimal web refactor
- Week 4: Build Android app

**Total effort:** 5-6 weeks for full implementation

---

## PHASE 1: CREATE BACKEND API (Week 1)

### Step 1.1: Initialize Node.js API

```bash
# In your project root
mkdir craftly-api
cd craftly-api
npm init -y

# Install dependencies
npm install express cors dotenv firebase-admin
npm install nodemon --save-dev
```

### Step 1.2: Create Project Structure

```
craftly-api/
├── .env                  # Firebase credentials
├── .gitignore
├── package.json
├── server.js             # Main server
├── config/
│   └── firebase.js       # Firebase init
├── middleware/
│   ├── authMiddleware.js
│   └── errorHandler.js
├── routes/
│   ├── auth.js
│   ├── products.js
│   ├── cart.js
│   ├── orders.js
│   ├── reviews.js
│   └── favorites.js
└── controllers/
    ├── authController.js
    ├── productController.js
    ├── cartController.js
    ├── orderController.js
    ├── reviewController.js
    └── favoritesController.js
```

### Step 1.3: Create Main Server (craftly-api/server.js)

```javascript
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Import routes
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const cartRoutes = require('./routes/cart');
const orderRoutes = require('./routes/orders');
const reviewRoutes = require('./routes/reviews');
const favoritesRoutes = require('./routes/favorites');

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/favorites', favoritesRoutes);

// Error handling
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ success: false, error: err.message });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

### Step 1.4: Setup Firebase (craftly-api/config/firebase.js)

```javascript
const admin = require('firebase-admin');

// Initialize with service account
const serviceAccount = {
  type: process.env.FIREBASE_TYPE,
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: process.env.FIREBASE_AUTH_URI,
  token_uri: process.env.FIREBASE_TOKEN_URI,
  auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
  client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const auth = admin.auth();

module.exports = { admin, db, auth };
```

### Step 1.5: Create Auth Middleware (craftly-api/middleware/authMiddleware.js)

```javascript
const { auth } = require('../config/firebase');

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ success: false, error: 'No token provided' });
    }

    const decodedToken = await auth.verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    res.status(401).json({ success: false, error: 'Invalid token' });
  }
};

module.exports = authMiddleware;
```

### Step 1.6: Create Product Routes (craftly-api/routes/products.js)

```javascript
const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const authMiddleware = require('../middleware/authMiddleware');

// Public routes
router.get('/', productController.getAllProducts);
router.get('/:id', productController.getProduct);

// Protected routes
router.post('/', authMiddleware, productController.createProduct);
router.put('/:id', authMiddleware, productController.updateProduct);
router.delete('/:id', authMiddleware, productController.deleteProduct);

module.exports = router;
```

### Step 1.7: Create Product Controller (craftly-api/controllers/productController.js)

```javascript
const { db } = require('../config/firebase');

exports.getAllProducts = async (req, res) => {
  try {
    const snapshot = await db
      .collection('products')
      .where('status', '==', 'active')
      .get();

    const products = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json({ success: true, data: products });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getProduct = async (req, res) => {
  try {
    const doc = await db.collection('products').doc(req.params.id).get();

    if (!doc.exists) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    res.json({ success: true, data: { id: doc.id, ...doc.data() } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.createProduct = async (req, res) => {
  try {
    const { name, description, category, price, stock, images } = req.body;
    const userId = req.user.uid;

    const newProduct = {
      name,
      description,
      category,
      price,
      stock,
      images,
      createdBy: userId,
      status: 'active',
      rating: 0,
      reviewCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const docRef = await db.collection('products').add(newProduct);

    res.json({ success: true, data: { id: docRef.id, ...newProduct } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.uid;

    // Verify ownership
    const doc = await db.collection('products').doc(id).get();
    if (doc.data().createdBy !== userId) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const updateData = {
      ...req.body,
      updatedAt: new Date().toISOString(),
    };

    await db.collection('products').doc(id).update(updateData);

    res.json({ success: true, data: { id, ...updateData } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.uid;

    const doc = await db.collection('products').doc(id).get();
    if (doc.data().createdBy !== userId) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    await db.collection('products').doc(id).delete();

    res.json({ success: true, data: { id } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
```

### Step 1.8: Create .env file (craftly-api/.env)

```env
PORT=5000
NODE_ENV=development

# Firebase Service Account
FIREBASE_TYPE=service_account
FIREBASE_PROJECT_ID=studio-3437465512-f56c8
FIREBASE_PRIVATE_KEY_ID=your_key_id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your_client_id
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token
FIREBASE_AUTH_PROVIDER_X509_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
FIREBASE_CLIENT_X509_CERT_URL=your_cert_url
```

### Step 1.9: Update package.json scripts

```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  }
}
```

### Step 1.10: Test API

```bash
cd craftly-api
npm run dev

# Test with curl or Postman:
curl http://localhost:5000/api/products
```

---

## PHASE 2: REFACTOR WEB APP (2-3 Days)

### Step 2.1: Update Service Layer

**File: `src/services/products/productService.js`**

**Change FROM (Firebase Direct):**
```javascript
export class ProductService {
  constructor(firestore) {
    this.firestore = firestore;
  }

  subscribeToActiveProducts(onSuccess, onError) {
    const q = query(
      collection(this.firestore, 'products'),
      where('status', '==', 'active')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const products = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      onSuccess(products);
    }, (error) => {
      onError(error);
    });
    return unsubscribe;
  }
}
```

**Change TO (API Calls):**
```javascript
export class ProductService {
  static async getAllProducts() {
    try {
      const response = await fetch('/api/products');
      const data = await response.json();
      if (!data.success) throw new Error(data.error);
      return data.data;
    } catch (error) {
      console.error('Error fetching products:', error);
      throw error;
    }
  }

  static async getProduct(id) {
    try {
      const response = await fetch(`/api/products/${id}`);
      const data = await response.json();
      if (!data.success) throw new Error(data.error);
      return data.data;
    } catch (error) {
      console.error('Error fetching product:', error);
      throw error;
    }
  }

  static async createProduct(productData) {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(productData)
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error);
      return data.data;
    } catch (error) {
      console.error('Error creating product:', error);
      throw error;
    }
  }

  static async updateProduct(id, productData) {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/products/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(productData)
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error);
      return data.data;
    } catch (error) {
      console.error('Error updating product:', error);
      throw error;
    }
  }

  static async deleteProduct(id) {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error);
      return data;
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
  }
}
```

### Step 2.2: Update ViewModel to Use New Service

**File: `src/hooks/useProductsViewModel.js`**

**Change FROM (Real-time listener):**
```javascript
useEffect(() => {
  if (!firestore) return;
  setLoading(true);
  const unsubscribe = productService.subscribeToActiveProducts(
    (loadedProducts) => {
      setProducts(loadedProducts);
      setLoading(false);
    },
    (err) => {
      setError(err);
      setLoading(false);
    }
  );
  return () => unsubscribe();
}, [firestore, productService]);
```

**Change TO (API call):**
```javascript
useEffect(() => {
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const data = await ProductService.getAllProducts();
      setProducts(data);
      setError(null);
    } catch (err) {
      setError(err);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  fetchProducts();
  // Call API every 30 seconds to refresh
  const interval = setInterval(fetchProducts, 30000);
  return () => clearInterval(interval);
}, []);
```

### Step 2.3: Update Authentication Service

Similar pattern - change from Firebase SDK to API calls:
```javascript
// Before: createUserWithEmailAndPassword(auth, email, password)
// After: fetch('/api/auth/register', { ... })
```

### Step 2.4: Setup CORS in Web App

**File: `vite.config.js` (if using Vite)**

```javascript
export default {
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        rewrite: (path) => path
      }
    }
  }
}
```

### Step 2.5: Test Web App

```bash
# Terminal 1: Start API server
cd craftly-api
npm run dev

# Terminal 2: Start web app
npm run dev

# Test in browser
```

---

## PHASE 3: BUILD ANDROID APP (Weeks 4-7)

### Step 3.1: Create Android Project

1. Open Android Studio
2. Create new project (Kotlin)
3. Add dependencies to `build.gradle`

### Step 3.2: Similar structure as Node.js API

```
app/src/main/java/com/example/craftly/
├── data/
│   ├── api/
│   │   ├── ApiService.kt
│   │   └── ApiClient.kt
│   ├── repository/
│   │   └── ProductRepository.kt
│   └── model/
│       └── Product.kt
├── ui/
│   ├── screens/
│   │   ├── products/
│   │   │   ├── ProductsFragment.kt (View)
│   │   │   ├── ProductsViewModel.kt (ViewModel)
│   │   │   └── fragment_products.xml
│   │   └── ...
│   └── ...
└── MainActivity.kt
```

### Step 3.3: Same API endpoints

```kotlin
interface ApiService {
    @GET("api/products")
    suspend fun getAllProducts(): ApiResponse<List<Product>>

    @GET("api/products/{id}")
    suspend fun getProduct(@Path("id") id: String): ApiResponse<Product>

    @POST("api/products")
    suspend fun createProduct(@Body product: Product): ApiResponse<Product>

    // ... same endpoints as web
}
```

---

## SUMMARY OF CHANGES

### Web App Changes:
```
MINIMAL CHANGES:
✅ Services layer: Firebase → API calls (50 lines each file)
✅ ViewModels: Real-time → API calls (20 lines change)
❌ Components: NO CHANGES
❌ Context: NO CHANGES
❌ Hooks: NO CHANGES

Total change: ~10-15% of code
```

### New Backend:
```
NEW FILES:
✅ craftly-api/ (complete new directory)
   - Node.js server (~200 lines)
   - Controllers (~300 lines)
   - Routes (~200 lines)

Total new code: ~700 lines
```

### Android App:
```
NEW PROJECT:
✅ All new Android app (~2000+ lines)
   - Same MVVM pattern
   - Same API calls
   - Different UI (XML instead of React)
```

---

## IMPLEMENTATION CHECKLIST

### Week 1: Backend API
- [ ] Initialize Node.js project
- [ ] Set up Firebase configuration
- [ ] Create product endpoints
- [ ] Create auth endpoints
- [ ] Create other endpoints (orders, cart, etc.)
- [ ] Test all endpoints with Postman
- [ ] Deploy to Heroku/Cloud Run

### Days 1-3: Web Refactor
- [ ] Update ProductService
- [ ] Update AuthService
- [ ] Update other services
- [ ] Update ViewModels
- [ ] Test web app works with API
- [ ] Fix any issues

### Weeks 4-7: Android App
- [ ] Create Android project
- [ ] Set up Retrofit
- [ ] Create API Service interface
- [ ] Create Repository pattern
- [ ] Create ViewModels
- [ ] Build fragments and activities
- [ ] Implement all features
- [ ] Test on emulator and device

---

## DEPLOYMENT

### Backend API:
```bash
# Deploy to Heroku
heroku create craftly-api
git push heroku main
```

Or Firebase Cloud Functions:
```bash
firebase deploy --only functions
```

### Web App:
```bash
# Still deploy to Vercel/Netlify same as before
npm run build
```

### Android App:
```bash
# Create release APK and submit to Google Play Store
```

---

## ADVANTAGES OF THIS APPROACH

✅ **Meets Requirements:**
- Same API for web and Android
- Same database (Firestore)
- MVVM on both platforms

✅ **Minimal Web Refactor:**
- Only services layer changes
- Components stay the same
- ViewModels stay mostly the same

✅ **Reusable:**
- Backend logic in one place
- Both front-ends use same endpoints
- Easy to maintain and update

✅ **Scalable:**
- Can add more clients (iOS, desktop, etc.)
- Clear separation of concerns
- Professional architecture

✅ **Fast Development:**
- Web refactor: 2-3 days
- Android: Standard MVVM pattern
- Can work in parallel

---

## NEXT STEPS

1. **Start Phase 1:** Build backend API
2. **Test extensively:** Make sure API works
3. **Do Phase 2:** Minimal web refactor
4. **Start Phase 3:** Android development
5. **Parallel:** While building Android, fix missing features (emails, payments, payouts)

You're in good shape - just need to add the API layer!

