
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Link, useNavigate } from 'react-router-dom';
import { useUser } from '@/firebase/auth/use-user';
import { signOutUser } from '@/firebase/auth/auth';
import { Skeleton } from './ui/skeleton';
import { User, LogOut, Package, LayoutDashboard, ShieldCheck, Heart } from 'lucide-react';
import { getInitials } from '@/lib/utils';

export function UserNav() {
  const { user, loading } = useUser();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOutUser();
    navigate('/');
    window.location.reload(); // Force a refresh to clear all state
  };
  
  if (loading) {
    return <Skeleton className="h-10 w-10 rounded-full" />;
  }

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost">
            <Link to="/login">Login</Link>
        </Button>
        <Button asChild>
            <Link to="/register">Register</Link>
        </Button>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Avatar className="h-10 w-10">
            <AvatarImage src={user.photoURL || ''} alt={user.displayName || 'User'} />
            <AvatarFallback>{getInitials(user.displayName || user.email) || 'U'}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.displayName || user.email}</p>
            <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {user.role === 'admin' ? (
             <DropdownMenuItem asChild>
                <Link to="/admin/dashboard">
                    <ShieldCheck className="mr-2 h-4 w-4" />
                    <span>Admin Dashboard</span>
                </Link>
            </DropdownMenuItem>
        ) : (
            <>
                {user.role === 'seller' && (
                    <DropdownMenuItem asChild>
                        <Link to="/dashboard">
                            <LayoutDashboard className="mr-2 h-4 w-4" />
                            <span>Seller Dashboard</span>
                        </Link>
                    </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild>
                <Link to="/profile">
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/my-favorites">
                      <Heart className="mr-2 h-4 w-4" />
                      <span>My Favorites</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                <Link to="/my-orders">
                    <Package className="mr-2 h-4 w-4" />
                    <span>My Orders</span>
                </Link>
                </DropdownMenuItem>
            </>
        )}
       
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
