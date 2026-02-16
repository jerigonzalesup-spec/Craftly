
import { useCart } from '@/hooks/use-cart';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export default function OrderSummary({ deliveryFee }) {
  const { cartItems, cartTotal } = useCart();
  const total = cartTotal + deliveryFee;

  return (
    <Card className="sticky top-24">
      <CardHeader>
        <CardTitle>Order Summary</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {cartItems.length > 0 ? (
          cartItems.map((item) => (
            <div key={item.id} className="flex justify-between items-center gap-4">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="relative h-16 w-16 rounded-md overflow-hidden border flex-shrink-0">
                  <img src={item.image} alt={item.name} className="object-cover w-full h-full" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{item.name}</p>
                  <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                </div>
              </div>
              <p className="font-medium">₱{(item.price * item.quantity).toFixed(2)}</p>
            </div>
          ))
        ) : (
          <p className="text-muted-foreground">Your cart is empty.</p>
        )}
        <Separator />
        <div className="flex justify-between">
          <p className="text-muted-foreground">Subtotal</p>
          <p>₱{cartTotal.toFixed(2)}</p>
        </div>
        <div className="flex justify-between">
          <p className="text-muted-foreground">Shipping</p>
          <p>₱{deliveryFee.toFixed(2)}</p>
        </div>
        <Separator />
        <div className="flex justify-between font-bold text-lg">
          <p>Total</p>
          <p>₱{total.toFixed(2)}</p>
        </div>
      </CardContent>
    </Card>
  );
}
