
import { useEffect, useState } from 'react';
import {
  collection,
  onSnapshot,
  query,
  orderBy,
} from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import { useUser } from '@/firebase/auth/use-user';
import { useToast } from '@/hooks/use-toast';
import { StarRating } from './StarRating';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormMessage } from './ui/form';
import { Textarea } from './ui/textarea';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { getInitials } from '@/lib/utils';

const reviewFormSchema = z.object({
  comment: z.string().min(10, 'Comment must be 10-500 characters.').max(500, 'Comment must be 10-500 characters.'),
});

export function ProductReviews({ productId, productCreatorId, productName }) {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm({
    resolver: zodResolver(reviewFormSchema),
    defaultValues: { comment: '' },
  });

  const userHasReviewed = user ? reviews.some((r) => r.id === user.uid) : false;

  useEffect(() => {
    if (!firestore) return;
    setLoading(true);
    const reviewsColRef = collection(firestore, `products/${productId}/reviews`);
    const q = query(reviewsColRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetchedReviews = snapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() })
        );
        setReviews(fetchedReviews);
        setLoading(false);
      },
      (error) => {
        if (error.code !== 'permission-denied') {
            console.error('Error fetching reviews:', error);
            toast({
              variant: 'destructive',
              title: 'Could not load reviews',
            });
        }
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [firestore, productId, toast]);

  const onSubmit = async (data) => {
    if (!user || !firestore) {
      return toast({ variant: 'destructive', title: 'You must be logged in.' });
    }
    if (rating === 0) {
      return toast({ variant: 'destructive', title: 'Please select a star rating.' });
    }

    setSubmitting(true);

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

      const response = await fetch(`${API_URL}/api/reviews/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId,
          productCreatorId,
          productName,
          userId: user.uid,
          userName: user.displayName || 'Anonymous',
          rating,
          comment: data.comment,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to submit review');
      }

      toast({
        title: 'Review submitted!',
        description: 'Thank you for your feedback.'
      });
      form.reset();
      setRating(0);
    } catch (error) {
      console.error('Error submitting review:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to submit review',
        description: error.message || 'Please try again',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold font-headline">Customer Reviews</h2>
      
      {user && !userHasReviewed && (
        <Card>
            <CardHeader>
                <CardTitle>Leave a Review</CardTitle>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-2">
                        <p className="font-medium">Your Rating</p>
                        <StarRating rating={rating} onRatingChange={setRating} />
                    </div>
                    <FormField
                        control={form.control}
                        name="comment"
                        render={({ field }) => (
                        <FormItem>
                            <Textarea placeholder="Share your thoughts on this product..." {...field} rows={4} />
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <Button type="submit" disabled={submitting || form.formState.isSubmitting}>
                        {submitting ? 'Submitting...' : 'Submit Review'}
                    </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
      )}

      {user && userHasReviewed && (
        <p className="text-center text-muted-foreground bg-accent p-4 rounded-md">You've already reviewed this product. Thank you!</p>
      )}

      <div className="space-y-6">
        {loading && <p>Loading reviews...</p>}
        {!loading && reviews.length === 0 && (
          <p className="text-muted-foreground">No reviews yet. Be the first to leave one!</p>
        )}
        {reviews.map((review) => (
          <div key={review.id} className="flex gap-4 border-b pb-6">
            <Avatar>
              <AvatarFallback>{getInitials(review.userName) || 'A'}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <p className="font-semibold">{review.userName}</p>
                <p className="text-xs text-muted-foreground">
                  {review.createdAt ? (
                    typeof review.createdAt === 'string'
                      ? formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })
                      : formatDistanceToNow(review.createdAt.toDate(), { addSuffix: true })
                  ) : ''}
                </p>
              </div>
              <div className="my-1">
                <StarRating rating={review.rating} readOnly size="sm" />
              </div>
              <p className="text-sm text-muted-foreground">{review.comment}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
