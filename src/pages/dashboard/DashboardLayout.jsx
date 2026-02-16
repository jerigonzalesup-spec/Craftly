
import { useUser } from '@/firebase/auth/use-user';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useEffect } from 'react';
import { LayoutDashboard, Package, ListOrdered } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
    { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
    { href: '/dashboard/my-products', label: 'My Products', icon: Package },
    { href: '/dashboard/my-sales', label: 'My Sales', icon: ListOrdered },
];

function DashboardNav() {
    const location = useLocation();
    const pathname = location.pathname;

    return (
        <div className="border-b bg-card">
            <div className="container mx-auto px-4">
                <nav className="flex items-center gap-6 -mb-px">
                    {navItems.map((item) => (
                        <Link
                            key={item.label}
                            to={item.href}
                            className={cn(
                                "flex items-center gap-2 py-4 text-sm font-medium transition-colors border-b-2",
                                pathname === item.href ? "text-primary border-primary" : "text-muted-foreground hover:text-foreground border-transparent"
                            )}
                        >
                            <item.icon className="h-5 w-5" />
                            <span>{item.label}</span>
                        </Link>
                    ))}
                </nav>
            </div>
        </div>
    );
}

export default function DashboardLayout() {
    const { user, loading } = useUser();
    const navigate = useNavigate();

    useEffect(() => {
        if (!loading && (!user || user.role !== 'seller')) {
            navigate('/', { replace: true });
        }
    }, [user, loading, navigate]);

    if (loading || !user || user.role !== 'seller') {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-muted-foreground">Verifying seller access...</p>
                </div>
            </div>
        );
    }

    return (
        <div>
            <DashboardNav />
            <main className="bg-secondary/50 min-h-[calc(100vh-10rem)]">
                <Outlet />
            </main>
        </div>
    );
}
