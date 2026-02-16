https://github.com/jerigonzalesup-spec/Craftly.git

# Craftly Backend API

This is a simple Node.js/Express API that wraps Firebase for the Craftly marketplace.

## Setup Instructions

### Step 1: Get Firebase Service Account Credentials

1. Go to **Firebase Console** → https://console.firebase.google.com
2. Select your project: **studio-3437465512-f56c8**
3. Go to **Project Settings** (gear icon) → **Service Accounts** tab
4. Click **Generate New Private Key**
5. A JSON file will download - save it somewhere safe
6. Copy the entire JSON content

### Step 2: Add Firebase Credentials to .env

Open `craftly-api/.env` and paste your JSON:

```env
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"...rest of your JSON..."}
```

**⚠️ Important:** Keep this file SECRET! Never commit `.env` to git (it's in .gitignore)

### Step 3: Install Dependencies

```bash
cd craftly-api
npm install
```

This installs:
- `express` - Web server
- `cors` - Cross-origin requests
- `dotenv` - Environment variables
- `firebase-admin` - Firebase backend SDK

### Step 4: Run the API

```bash
npm run dev
```

You should see:
```
✅ Craftly API Server Running!
📍 URL: http://localhost:5000
🏥 Health Check: http://localhost:5000/health
📦 Products: http://localhost:5000/api/products
```

## Testing the API

### Test 1: Health Check

```bash
curl http://localhost:5000/health
```

Should return:
```json
{
  "success": true,
  "message": "Craftly API is running",
  "timestamp": "2025-02-15T10:00:00.000Z"
}
```

### Test 2: Get All Products

```bash
curl http://localhost:5000/api/products
```

Should return:
```json
{
  "success": true,
  "data": [
    {
      "id": "product123",
      "name": "Product Name",
      "price": 1000,
      ...
    }
  ]
}
```

### Using Postman (Recommended)

1. Open Postman
2. Create a new request
3. Method: `GET`
4. URL: `http://localhost:5000/api/products`
5. Click Send

## API Endpoints

### Products

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/products` | Get all active products |
| GET | `/api/products/:id` | Get single product |
| POST | `/api/products` | Create new product |
| PUT | `/api/products/:id` | Update product |
| DELETE | `/api/products/:id` | Delete product |

## Environment Variables

```env
PORT=5000                      # API port
NODE_ENV=development           # dev or production
CORS_ORIGIN=http://localhost:5173  # Your web app URL
FIREBASE_SERVICE_ACCOUNT_JSON  # Your Firebase credentials (JSON)
FIREBASE_PROJECT_ID            # Firebase project ID
```

## Troubleshooting

### Firebase credentials not working?

1. Check `.env` file exists
2. Verify JSON is valid (use https://jsonlint.com/)
3. Check `.env` is not in `.gitignore` accidentally

### Port 5000 already in use?

Change in `.env`:
```env
PORT=5001
```

### CORS errors?

Update `.env`:
```env
CORS_ORIGIN=http://localhost:5173
```

(Or whatever port your React app runs on)

## Next Steps

1. ✅ API is running? Great!
2. Update web app services to call this API
3. Test web app calls the API
4. Build Android app to use the same API

## Structure

```
craftly-api/
├── server.js           # Main server
├── package.json        # Dependencies
├── .env                # Credentials (secret!)
├── config/
│   └── firebase.js     # Firebase setup
├── middleware/
│   └── errorHandler.js # Error handling
├── controllers/
│   └── productController.js  # Business logic
└── routes/
    └── productRoutes.js      # API routes
```
