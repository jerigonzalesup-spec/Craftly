import { useUser } from '@/firebase/auth/use-user';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { LayoutDashboard, FileText, Package, Users, AlertTriangle, ShieldCheck, Menu, X } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const baseNavItems = [
    { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/applications', label: 'Applications', icon: FileText },
    { href: '/admin/products', label: 'Products', icon: Package },
    { href: '/admin/users', label: 'Users', icon: Users },
];

const superAdminNavItem = {
    href: '/admin/admins', label: 'Manage Admins', icon: ShieldCheck, superAdminOnly: true,
};

function AdminNav({ user, onClose }) {
    const location = useLocation();
    const pathname = location.pathname;
    const isSuperAdmin = user?.roles?.includes('superadmin');

    const navItems = isSuperAdmin ? [...baseNavItems, superAdminNavItem] : baseNavItems;

    return (
        <aside className="flex flex-col h-full bg-background p-4">
            <div className="flex items-center justify-between mb-8">
                <div className="flex flex-col">
                    <span className="text-2xl font-bold text-primary font-headline">Craftly Admin</span>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground truncate max-w-[140px]" title={user.displayName || user.email || ''}>
                            {user.displayName || user.email}
                        </span>
                        <Badge variant={isSuperAdmin ? 'destructive' : 'secondary'} className="text-[10px] px-1.5 py-0 shrink-0">
                            {isSuperAdmin ? 'Super Admin' : 'Admin'}
                        </Badge>
                    </div>
                </div>
                {onClose && (
                    <Button variant="ghost" size="icon" onClick={onClose} className="md:hidden">
                        <X className="h-5 w-5" />
                    </Button>
                )}
            </div>
            <nav className="flex flex-col gap-1">
                {navItems.map((item) => (
                    <Link
                        key={item.label}
                        to={item.href}
                        onClick={onClose}
                        className={cn(
                            "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                            pathname === item.href || pathname.startsWith(item.href + '/')
                                ? "bg-primary text-primary-foreground"
                                : "hover:bg-muted text-foreground",
                            item.superAdminOnly && "border-l-2 border-destructive/40"
                        )}
                    >
                        <item.icon className="h-4 w-4 shrink-0" />
                        <span>{item.label}</span>
                        {item.superAdminOnly && (
                            <span className="ml-auto text-[10px] text-muted-foreground">SA</span>
                        )}
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
    const [mobileOpen, setMobileOpen] = useState(false);

    useEffect(() => {
        if (!loading && (!user || !user.roles?.includes('admin'))) {
            navigate('/', { replace: true });
        }
    }, [user, loading, navigate]);

    // Listen for errors globally
    useEffect(() => {
        const handleError = (event) => {
            if (event.message?.includes('FIRESTORE') || event.message?.includes('Firestore')) {
                console.warn('⚠️ Firestore error detected, but continuing:', event.message);
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
            {/* Desktop sidebar */}
            <div className="w-60 flex-shrink-0 border-r hidden md:block">
                <AdminNav user={user} />
            </div>

            {/* Mobile overlay */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 md:hidden"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Mobile drawer */}
            <div className={cn(
                "fixed inset-y-0 left-0 z-50 w-64 border-r shadow-xl transition-transform duration-300 md:hidden",
                mobileOpen ? 'translate-x-0' : '-translate-x-full'
            )}>
                <AdminNav user={user} onClose={() => setMobileOpen(false)} />
            </div>

            <main className="flex-1 overflow-y-auto">
                {/* Mobile topbar */}
                <div className="flex items-center gap-3 border-b px-4 py-3 md:hidden">
                    <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)}>
                        <Menu className="h-5 w-5" />
                    </Button>
                    <span className="font-semibold text-primary font-headline">Craftly Admin</span>
                </div>

                {error && (
                    <div className="p-4 bg-destructive/10 text-destructive border border-destructive/20 rounded-md m-4 flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                            <h3 className="font-medium">Error Loading Page</h3>
                            <p className="text-sm mt-1">{error}</p>
                            <button onClick={() => setError(null)} className="text-sm text-destructive hover:underline mt-2">Dismiss</button>
                        </div>
                    </div>
                )}
                <Outlet context={{ setError }} />
            </main>
        </div>
    );
}
