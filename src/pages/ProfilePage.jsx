
import { useUser } from '../firebase/auth/use-user';
import { Button } from '../components/ui/button';
import { signOutUser } from '../firebase/auth/auth';
import { useNavigate } from 'react-router-dom';
import { ProfileForm } from '../components/ProfileForm';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { ChangePasswordForm } from '../components/ChangePasswordForm';
import { BecomeSellerSection } from '../components/BecomeSellerSection';
import { useEffect } from 'react';
import { LogOut } from 'lucide-react';

function getInitials(nameOrEmail = '') {
    const name = nameOrEmail.trim();
    if (!name) return '?';
    const parts = name.split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
}

export default function ProfilePage() {
    const { user, loading } = useUser();
    const navigate = useNavigate();

    useEffect(() => {
        if (!loading && !user) {
            navigate('/login');
        }
    }, [user, loading, navigate]);

    const handleLogout = async () => {
        await signOutUser();
        window.location.href = '/';
    };

    if (loading || !user) {
        return (
            <div className="container mx-auto px-4 py-12 max-w-3xl">
                <ProfileForm />
            </div>
        );
    }

    const displayName = user.displayName || user.email || '';
    const initials = getInitials(displayName);

    return (
        <div className="container mx-auto px-4 py-10 max-w-3xl">
            {/* Profile hero */}
            <div className="flex items-center gap-5 mb-8 p-6 bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl border border-amber-100">
                <div className="w-16 h-16 rounded-full bg-amber-500 flex items-center justify-center text-white text-xl font-bold shrink-0 shadow-sm select-none">
                    {initials}
                </div>
                <div className="flex-1 min-w-0">
                    <h1 className="text-2xl font-bold font-headline leading-tight truncate">
                        {user.displayName || 'My Account'}
                    </h1>
                    <p className="text-sm text-muted-foreground truncate mt-0.5">{user.email}</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                        {user.roles?.includes('buyer') && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full font-medium">
                                Buyer
                            </span>
                        )}
                        {user.roles?.includes('seller') && (
                            <span className="text-xs bg-amber-100 text-amber-700 px-2.5 py-0.5 rounded-full font-medium">
                                Seller
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <div className="space-y-8">
                <ProfileForm />
                <ChangePasswordForm />
                {user.roles?.includes('buyer') && <BecomeSellerSection />}
                <Card className="border-destructive/20">
                    <CardHeader>
                        <CardTitle className="text-destructive">Log Out</CardTitle>
                        <CardDescription>End your current session on this device.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={handleLogout} variant="destructive" className="gap-2">
                            <LogOut className="w-4 h-4" />
                            Log Out
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
