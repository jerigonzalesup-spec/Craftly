import { useUser } from '@/firebase/auth/use-user';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useEffect } from 'react';
import { LayoutDashboard, FileText, Package, Users } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';


const navItems = [
    { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard, disabled: false },
    { href: '/admin/applications', label: 'Applications', icon: FileText, disabled: false },
    { href: '/admin/products', label: 'Products', icon: Package, disabled: false },
    { href: '/admin/users', label: 'Users', icon: Users, disabled: false },
];

function AdminNav({ user }) {
    const location = useLocation();
    const pathname = location.pathname;

    return (
        <aside className="w-60 flex-shrink-0 border-r bg-background p-4 hidden md:block">
            <div className="flex flex-col mb-8">
                <span className="text-3xl font-bold text-primary font-headline">Admin</span>
                <span className="text-xs text-muted-foreground truncate" title={user.displayName || user.email || ''}>
                    {user.displayName || user.email}
                </span>
            </div>
            <nav className="flex flex-col gap-2">
                {navItems.map((item) => (
                    <Link
                        key={item.label}
                        to={item.disabled ? '#' : item.href}
                        className={cn(
                            "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                            pathname === item.href ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                            item.disabled ? "text-muted-foreground cursor-not-allowed" : "text-foreground"
                        )}
                        aria-disabled={item.disabled}
                        tabIndex={item.disabled ? -1 : undefined}
                    >
                        <item.icon className="h-5 w-5" />
                        <span>{item.label}</span>
                    </Link>
                ))}
            </nav>
        </aside>
    );
}

export default function AdminLayout() {
    const { user, loading } = useUser();
    const navigate = useNavigate();

    useEffect(() => {
        if (!loading && (!user || user.role !== 'admin')) {
            navigate('/', { replace: true });
        }
    }, [user, loading, navigate]);

    if (loading || !user || user.role !== 'admin') {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-muted-foreground">Verifying admin access...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen">
            <AdminNav user={user} />
            <main className="flex-1 overflow-y-auto">
                <Outlet />
            </main>
        </div>
    );
}
