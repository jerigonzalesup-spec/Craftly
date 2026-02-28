import { Link } from 'react-router-dom';
import CraftlyLogo from './CraftlyLogo';
import { CartSheet } from './CartSheet';
import { UserNav } from './UserNav';
import { useUser } from '@/firebase/auth/use-user';
import { Skeleton } from './ui/skeleton';
import { NotificationSheet } from './NotificationSheet';
import { useTheme } from '@/context/ThemeContext';
import { Moon, Sun } from 'lucide-react';
import { Button } from './ui/button';

export default function Header() {
  const { user, loading } = useUser();
  const { theme, toggleTheme, mounted } = useTheme();

  const isAdmin = user && user.roles?.includes('admin');
  const isBuyerOrSeller = user && (user.roles?.includes('buyer') || user.roles?.includes('seller'));

  return (
    <header className="bg-background/80 sticky top-0 z-40 w-full border-b border-input backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2.5 hover:opacity-85 transition-opacity duration-200 group">
          <CraftlyLogo size={34} />
          <span className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-red-500 font-headline">
            Craftly
          </span>
        </Link>
        <div className="flex items-center gap-4">
           {loading ? (
            <div className="flex items-center gap-4">
              <Skeleton className="h-6 w-20 bg-input" />
              <Skeleton className="h-10 w-10 rounded-full bg-input" />
            </div>
           ) : isAdmin ? (
              // Admin gets only UserNav (no products/cart/notifications)
              <>
                {mounted && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleTheme}
                    className="text-muted-foreground hover:text-foreground transition-colors duration-200"
                  >
                    {theme === 'dark' ? (
                      <Sun className="h-5 w-5" />
                    ) : (
                      <Moon className="h-5 w-5" />
                    )}
                    <span className="sr-only">Toggle theme</span>
                  </Button>
                )}
                <UserNav />
              </>
           ) : isBuyerOrSeller ? (
            <>
              <nav className="hidden md:flex items-center gap-6">
                <Link to="/products" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-200 relative group">
                  Products
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-amber-600 to-red-500 group-hover:w-full transition-all duration-300" />
                </Link>
                <Link to="/about" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-200 relative group">
                  About Us
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-amber-600 to-red-500 group-hover:w-full transition-all duration-300" />
                </Link>
              </nav>
              {mounted && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleTheme}
                  className="text-muted-foreground hover:text-foreground transition-colors duration-200"
                >
                  {theme === 'dark' ? (
                    <Sun className="h-5 w-5" />
                  ) : (
                    <Moon className="h-5 w-5" />
                  )}
                  <span className="sr-only">Toggle theme</span>
                </Button>
              )}
              <NotificationSheet />
              <CartSheet />
              <UserNav />
            </>
           ) : (
            <>
            <nav className="hidden md:flex items-center gap-6">
                <Link to="/products" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-200 relative group">
                  Products
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-amber-600 to-red-500 group-hover:w-full transition-all duration-300" />
                </Link>
                <Link to="/about" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-200 relative group">
                  About Us
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-amber-600 to-red-500 group-hover:w-full transition-all duration-300" />
                </Link>
              </nav>
              {mounted && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleTheme}
                  className="text-muted-foreground hover:text-foreground transition-colors duration-200"
                >
                  {theme === 'dark' ? (
                    <Sun className="h-5 w-5" />
                  ) : (
                    <Moon className="h-5 w-5" />
                  )}
                  <span className="sr-only">Toggle theme</span>
                </Button>
              )}
            <UserNav />
            </>
           )}
        </div>
      </div>
    </header>
  );
}