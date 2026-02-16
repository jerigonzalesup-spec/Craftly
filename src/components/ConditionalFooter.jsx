
import { useUser } from '@/firebase/auth/use-user';
import { useLocation } from 'react-router-dom';
import Footer from '@/components/Footer';

export function ConditionalFooter() {
    const { user, loading } = useUser();
    const location = useLocation();

    // Only show footer on landing page
    if (loading || location.pathname !== '/') {
        return null;
    }

    return <Footer />;
}
