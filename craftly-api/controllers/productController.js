import { getFirestore } from '../config/firebase.js';
import { ApiError, asyncHandler } from '../middleware/errorHandler.js';

const db = getFirestore();

/**
 * GET /api/products
 * Fetch all active products, optionally filtered by createdBy
 * Query params: createdBy (seller ID), status (default: active)
 */
export const getAllProducts = asyncHandler(async (req, res) => {
  const { createdBy, status = 'active' } = req.query;

  console.log(`📦 Fetching products... ${createdBy ? `(createdBy: ${createdBy})` : '(all active)'}`);

  try {
    let query = db.collection('products');

    // Filter by status
    query = query.where('status', '==', status);

    // Filter by createdBy if provided
    if (createdBy) {
      query = query.where('createdBy', '==', createdBy);
    }

    const snapshot = await query.get();

    const products = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    console.log(`✅ Found ${products.length} products`);

    res.status(200).json({
      success: true,
      data: products,
    });
  } catch (error) {
    console.error('❌ Error fetching products:', error);
    throw new ApiError(`Failed to fetch products: ${error.message}`, 500);
  }
});

/**
 * GET /api/products/:id
 * Fetch single product by ID
 */
export const getProductById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    throw new ApiError('Product ID is required', 400);
  }

  console.log(`📦 Fetching product: ${id}`);

  try {
    const doc = await db.collection('products').doc(id).get();

    if (!doc.exists) {
      throw new ApiError('Product not found', 404);
    }

    const product = {
      id: doc.id,
      ...doc.data(),
    };

    console.log(`✅ Product found: ${product.name}`);

    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    if (error.message === 'Product not found') {
      throw error;
    }
    console.error(`❌ Error fetching product ${id}:`, error);
    throw new ApiError(`Failed to fetch product: ${error.message}`, 500);
  }
});

/**
 * POST /api/products (Protected)
 * Create new product
 * Note: Requires authentication token in future
 */
export const createProduct = asyncHandler(async (req, res) => {
  const { name, description, category, price, stock, images } = req.body;

  // Validation
  if (!name || !description || !category || price === undefined || stock === undefined) {
    throw new ApiError('Missing required fields: name, description, category, price, stock', 400);
  }

  // For now, we'll use a placeholder userId
  // In production, this would come from verified JWT token
  const userId = req.headers['x-user-id'] || 'test-user';

  console.log(`📦 Creating product: ${name} by user ${userId}`);

  try {
    const newProduct = {
      name,
      description,
      category,
      price: parseFloat(price),
      stock: parseInt(stock),
      images: images || [],
      createdBy: userId,
      status: 'active',
      rating: 0,
      reviewCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const docRef = await db.collection('products').add(newProduct);

    console.log(`✅ Product created with ID: ${docRef.id}`);

    res.status(201).json({
      success: true,
      data: {
        id: docRef.id,
        ...newProduct,
      },
    });
  } catch (error) {
    console.error(`❌ Error creating product:`, error);
    throw new ApiError(`Failed to create product: ${error.message}`, 500);
  }
});

/**
 * PUT /api/products/:id (Protected)
 * Update product
 */
export const updateProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.headers['x-user-id'] || 'test-user';

  if (!id) {
    throw new ApiError('Product ID is required', 400);
  }

  console.log(`📦 Updating product: ${id}`);

  try {
    const doc = await db.collection('products').doc(id).get();

    if (!doc.exists) {
      throw new ApiError('Product not found', 404);
    }

    // Verify ownership (in production, verify via JWT)
    if (doc.data().createdBy !== userId && userId !== 'admin') {
      throw new ApiError('You do not have permission to update this product', 403);
    }

    const updateData = {
      ...req.body,
      updatedAt: new Date().toISOString(),
    };

    await db.collection('products').doc(id).update(updateData);

    console.log(`✅ Product ${id} updated`);

    res.status(200).json({
      success: true,
      data: {
        id,
        ...updateData,
      },
    });
  } catch (error) {
    if (error.message.includes('permission') || error.message === 'Product not found') {
      throw error;
    }
    console.error(`❌ Error updating product ${id}:`, error);
    throw new ApiError(`Failed to update product: ${error.message}`, 500);
  }
});

/**
 * DELETE /api/products/:id (Protected)
 * Delete product
 */
export const deleteProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.headers['x-user-id'] || 'test-user';

  if (!id) {
    throw new ApiError('Product ID is required', 400);
  }

  console.log(`📦 Deleting product: ${id}`);

  try {
    const doc = await db.collection('products').doc(id).get();

    if (!doc.exists) {
      throw new ApiError('Product not found', 404);
    }

    // Verify ownership
    if (doc.data().createdBy !== userId && userId !== 'admin') {
      throw new ApiError('You do not have permission to delete this product', 403);
    }

    await db.collection('products').doc(id).delete();

    console.log(`✅ Product ${id} deleted`);

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully',
      data: { id },
    });
  } catch (error) {
    if (error.message.includes('permission') || error.message === 'Product not found') {
      throw error;
    }
    console.error(`❌ Error deleting product ${id}:`, error);
    throw new ApiError(`Failed to delete product: ${error.message}`, 500);
  }
});
