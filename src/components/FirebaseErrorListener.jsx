
import { useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { useToast } from '@/hooks/use-toast';

export function FirebaseErrorListener() {
    const { toast } = useToast();

    useEffect(() => {
        const handleError = (error) => {
            console.error(error); // Keep console error for debugging
            
            // In Vite, `import.meta.env.DEV` is true during development
            if (import.meta.env.DEV) {
                toast({
                    variant: 'destructive',
                    title: 'Firestore Permission Error',
                    description: error.message,
                    duration: 10000,
                });
            } else {
                 toast({
                    variant: 'destructive',
                    title: 'Error',
                    description: 'An unexpected error occurred. Please try again.',
                });
            }
        };

        errorEmitter.on('permission-error', handleError);

        // This component is mounted once, so no cleanup is needed
        // as the errorEmitter should persist for the app's lifetime.
    }, [toast]);

    return null; // This component does not render anything
}
