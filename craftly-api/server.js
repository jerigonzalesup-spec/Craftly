import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initializeFirebaseAdmin } from './config/firebase.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import productRoutes from './routes/productRoutes.js';
import favoritesRoutes from './routes/favoritesRoutes.js';
import cartRoutes from './routes/cartRoutes.js';
import authRoutes from './routes/authRoutes.js';
import ordersRoutes from './routes/ordersRoutes.js';
import profileRoutes from './routes/profileRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import reviewsRoutes from './routes/reviewsRoutes.js';
import notificationsRoutes from './routes/notificationsRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import imagesRoutes from './routes/images.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

console.log('🚀 Starting Craftly API...');
console.log(`📍 Environment: ${NODE_ENV}`);

// ===========================
// MIDDLEWARE
// ===========================

// CORS configuration - supports comma-separated list of allowed origins
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

const corsOriginCheck = (origin, callback) => {
  // Allow requests with no origin (mobile apps, Postman, curl, etc.)
  if (!origin) return callback(null, true);

  // Allow wildcard entry - reflect the origin back (required when credentials: true)
  if (allowedOrigins.includes('*')) {
    return callback(null, origin);
  }

  // Allow any localhost origin in development
  if (NODE_ENV === 'development' && origin.startsWith('http://localhost')) {
    return callback(null, true);
  }

  // Allow Firebase Hosting URLs (*.web.app / *.firebaseapp.com)
  if (origin.endsWith('.web.app') || origin.endsWith('.firebaseapp.com')) {
    return callback(null, true);
  }

  // Allow Railway URLs
  if (origin.endsWith('.up.railway.app')) {
    return callback(null, true);
  }

  // Allow if origin is in the list
  if (allowedOrigins.includes(origin)) {
    return callback(null, true);
  }

  callback(new Error('Not allowed by CORS'));
};

app.use(cors({
  origin: corsOriginCheck,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-User-ID'],
}));

// Body parser with increased limits for file uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// ===========================
// INITIALIZE FIREBASE
// ===========================

try {
  initializeFirebaseAdmin();
  console.log('✅ Firebase initialized successfully');
} catch (error) {
  console.error('❌ Failed to initialize Firebase:', error.message);
  process.exit(1);
}

// ===========================
// HEALTH CHECK
// ===========================

app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Craftly API is running',
    timestamp: new Date().toISOString(),
  });
});

// ===========================
// API ROUTES
// ===========================

// Products
app.use('/api/products', productRoutes);

// Images (file upload)
app.use('/api/images', imagesRoutes);

// Favorites
app.use('/api/favorites', favoritesRoutes);

// Cart
app.use('/api/cart', cartRoutes);

// Auth
app.use('/api/auth', authRoutes);

// Orders
app.use('/api/orders', ordersRoutes);

// Profile
app.use('/api/profile', profileRoutes);

// Admin
app.use('/api/admin', adminRoutes);

// Reviews
app.use('/api/reviews', reviewsRoutes);

// Notifications
app.use('/api/notifications', notificationsRoutes);

// Dashboard
app.use('/api/dashboard', dashboardRoutes);

// ===========================
// ERROR HANDLING
// ===========================

// 404 handler
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

// ===========================
// START SERVER
// ===========================

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n✅ Craftly API Server Running!`);
  console.log(`📍 URL: http://localhost:${PORT}`);
  console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
  console.log(`📦 Products: http://localhost:${PORT}/api/products`);
  console.log(`\n⚠️  Make sure Firebase credentials are set in .env`);
  console.log('='.repeat(50));
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down gracefully...');
  process.exit(0);
});
