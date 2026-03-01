
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Providers and Components
import { FirebaseClientProvider } from './firebase/client-provider';
import { FavoritesProvider } from './context/FavoritesProvider';
import { CartProvider } from './context/CartProvider';
import { ThemeProvider } from './context/ThemeContext';
import Header from './components/Header';
import { ConditionalFooter } from './components/ConditionalFooter';
import { Toaster } from './components/ui/toaster';

// Page Imports
import HomePage from './pages/HomePage';
import AboutPage from './pages/AboutPage';
import ProductsPage from './pages/ProductsPage';
import ProductPage from './pages/ProductPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import ProfilePage from './pages/ProfilePage';
import MyFavoritesPage from './pages/MyFavoritesPage';
import MyOrdersPage from './pages/MyOrdersPage';
import OrderDetailsPage from './pages/OrderDetailsPage';
import CheckoutPage from './pages/CheckoutPage';
import OrderConfirmationPage from './pages/OrderConfirmationPage';
import SellerProfilePage from './pages/SellerProfilePage';
import MessagesPage from './pages/MessagesPage';
import ChatPage from './pages/ChatPage';

// Admin Pages
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboardPage from './pages/admin/DashboardPage';
import AdminApplicationsPage from './pages/admin/ApplicationsPage';
import AdminProductsPage from './pages/admin/ProductsPage';
import AdminUsersPage from './pages/admin/UsersPage';

// Seller Dashboard Pages
import DashboardLayout from './pages/dashboard/DashboardLayout';
import SellerOverviewPage from './pages/dashboard/OverviewPage';
import MyProductsPage from './pages/dashboard/MyProductsPage';
import MySalesPage from './pages/dashboard/MySalesPage';


function App() {
  return (
    <FirebaseClientProvider>
      <FavoritesProvider>
        <CartProvider>
          <ThemeProvider>
            <Router>
              <div className="flex min-h-screen flex-col">
                <Header />
                <main className="flex-1">
                  <Routes>
                    {/* Public and User Routes */}
                    <Route path="/" element={<HomePage />} />
                    <Route path="/about" element={<AboutPage />} />
                    <Route path="/products" element={<ProductsPage />} />
                    <Route path="/products/:id" element={<ProductPage />} />
                    <Route path="/seller/:sellerId" element={<SellerProfilePage />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />
                    <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                    <Route path="/reset-password" element={<ResetPasswordPage />} />
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="/my-favorites" element={<MyFavoritesPage />} />
                    <Route path="/my-orders" element={<MyOrdersPage />} />
                    <Route path="/orders/:orderId" element={<OrderDetailsPage />} />
                    <Route path="/checkout" element={<CheckoutPage />} />
                    <Route path="/order-confirmation" element={<OrderConfirmationPage />} />
                    <Route path="/messages" element={<MessagesPage />} />
                    <Route path="/messages/:conversationId" element={<ChatPage />} />

                    {/* Admin Routes */}
                    <Route element={<AdminLayout />}>
                      <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
                      <Route path="/admin/applications" element={<AdminApplicationsPage />} />
                      <Route path="/admin/products" element={<AdminProductsPage />} />
                      <Route path="/admin/users" element={<AdminUsersPage />} />
                    </Route>

                    {/* Seller Dashboard Routes */}
                    <Route element={<DashboardLayout />}>
                      <Route path="/dashboard" element={<SellerOverviewPage />} />
                      <Route path="/dashboard/my-products" element={<MyProductsPage />} />
                      <Route path="/dashboard/my-sales" element={<MySalesPage />} />
                    </Route>

                  </Routes>
                </main>
                <ConditionalFooter />
              </div>
              <Toaster />
            </Router>
          </ThemeProvider>
        </CartProvider>
      </FavoritesProvider>
    </FirebaseClientProvider>
  );
}

export default App;
