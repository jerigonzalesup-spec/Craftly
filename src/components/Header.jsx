import { Link } from 'react-router-dom';
import { CartSheet } from './CartSheet';
import { UserNav } from './UserNav';
import { useUser } from '@/firebase/auth/use-user';
import { Skeleton } from './ui/skeleton';
import { NotificationSheet } from './NotificationSheet';

export default function Header() {
  const { user, loading } = useUser();
  
  const isBuyerOrSeller = user && (user.role === 'buyer' || user.role === 'seller');

  return (
    <header className="bg-background/80 sticky top-0 z-40 w-full border-b backdrop-blur">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="text-2xl font-bold text-foreground font-headline">
          Craftly
        </Link>
        <div className="flex items-center gap-4">
           {loading ? (
            <div className="flex items-center gap-4">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-10 w-10 rounded-full" />
            </div>
           ) : isBuyerOrSeller ? (
            <>
              <nav className="hidden md:flex items-center gap-6">
                <Link to="/products" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
                  Products
                </Link>
                <Link to="/about" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
                  About Us
                </Link>
              </nav>
              <NotificationSheet />
              <CartSheet />
              <UserNav />
            </>
           ) : user && user.role === 'admin' ? (
              <UserNav />
           ) : (
            <>
            <nav className="hidden md:flex items-center gap-6">
                <Link to="/products" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
                  Products
                </Link>
                <Link to="/about" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
                  About Us
                </Link>
              </nav>
            <UserNav />
            </>
           )}
        </div>
      </div>
    </header>
  );
}