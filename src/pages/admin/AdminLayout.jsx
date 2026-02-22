import { useUser } from '@/firebase/auth/use-user';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { LayoutDashboard, FileText, Package, Users, AlertTriangle } from 'lucide-react';
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
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!loading && (!user || !user.roles?.includes('admin'))) {
            navigate('/', { replace: true });
        }
    }, [user, loading, navigate]);

    // Listen for errors globally
    useEffect(() => {
        const handleError = (event) => {
            // Only catch Firestore-related errors
            if (event.message?.includes('FIRESTORE') || event.message?.includes('Firestore')) {
                console.warn('⚠️ Firestore error detected, but continuing:', event.message);
                // Don't crash - continue serving the page
                event.preventDefault();
            }
        };

        window.addEventListener('error', handleError);
        return () => window.removeEventListener('error', handleError);
    }, []);

    if (loading || !user || !user.roles?.includes('admin')) {
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
                {error && (
                    <div className="p-4 bg-destructive/10 text-destructive border border-destructive/20 rounded-md m-4 flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                            <h3 className="font-medium">Error Loading Page</h3>
                            <p className="text-sm mt-1">{error}</p>
                            <button
                                onClick={() => setError(null)}
                                className="text-sm text-destructive hover:underline mt-2"
                            >
                                Dismiss
                            </button>
                        </div>
                    </div>
                )}
                <Outlet context={{ setError }} />
            </main>
        </div>
    );
}
