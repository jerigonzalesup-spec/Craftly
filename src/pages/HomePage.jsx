
import { useUser } from '../firebase/auth/use-user';
import { LandingPage } from './LandingPage';
import { Marketplace } from '../components/Marketplace';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function HomePage() {
  const { user, loading } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    // If loading is finished, we have the user object, and that user's role is admin
    if (!loading && user?.role === 'admin') {
      // Redirect them away from the public home page.
      navigate('/admin/dashboard', { replace: true });
    }
  }, [user, loading, navigate]); // Reruns whenever user or loading state changes

  // While loading or if the user is an admin (and waiting for redirect), show a loader.
  // This prevents the marketplace from flashing on screen for an admin.
  if (loading || user?.role === 'admin') {
    return (
        <div className="flex h-[calc(100vh-4rem)] w-full flex-col items-center justify-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Please wait...</p>
        </div>
    )
  }

  if (!user) {
    // User is not logged in, show the public landing page
    return <LandingPage />;
  }

  // User is logged in (but not an admin), show the marketplace.
  return <Marketplace user={user} />;
}
