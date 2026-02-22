
import { useUser } from '../firebase/auth/use-user';
import { Button } from '../components/ui/button';
import { signOutUser } from '../firebase/auth/auth';
import { useNavigate } from 'react-router-dom';
import { ProfileForm } from '../components/ProfileForm';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { ChangePasswordForm } from '../components/ChangePasswordForm';
import { BecomeSellerSection } from '../components/BecomeSellerSection';
import { ViewRecoveryCodesModal } from '../components/ViewRecoveryCodesModal';
import { useEffect, useState } from 'react';
import { Key } from 'lucide-react';

export default function ProfilePage() {
    const { user, loading } = useUser();
    const navigate = useNavigate();
    const [showRecoveryCodes, setShowRecoveryCodes] = useState(false);

    useEffect(() => {
        if (!loading && !user) {
            navigate('/login');
        }
    }, [user, loading, navigate]);

    const handleLogout = async () => {
        await signOutUser();
        // Use window.location.href to ensure proper navigation
        window.location.href = '/';
    };
    
    if (loading || !user) {
        return (
            <div className="container mx-auto px-4 py-12 max-w-2xl">
                <h1 className="text-3xl font-bold mb-8 font-headline">My Profile</h1>
                <ProfileForm />
            </div>
        )
    }

    return (
        <div className="container mx-auto px-4 py-12 max-w-2xl">
            <h1 className="text-3xl font-bold mb-8 font-headline">My Profile</h1>
            <div className="space-y-8">
                <ProfileForm />
                <ChangePasswordForm />
                {user.roles?.includes('buyer') && <BecomeSellerSection />}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Key className="h-5 w-5" />
                            Recovery Codes
                        </CardTitle>
                        <CardDescription>View and manage your account recovery codes.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                            Your recovery codes can be used to access your account if you forget your password.
                        </p>
                        <Button onClick={() => setShowRecoveryCodes(true)} variant="outline">
                            View Recovery Codes
                        </Button>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Log Out</CardTitle>
                        <CardDescription>End your current session.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={handleLogout} variant="destructive">
                            Log Out
                        </Button>
                    </CardContent>
                </Card>
                <ViewRecoveryCodesModal
                    open={showRecoveryCodes}
                    onOpenChange={setShowRecoveryCodes}
                />
            </div>
        </div>
    );
}
