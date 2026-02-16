
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ShoppingCart, BaggageClaim } from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import { Separator } from "./ui/separator";
import { CartItem } from "./CartItem";
import { ScrollArea } from "./ui/scroll-area";
import { Link } from "react-router-dom";
import { useMemo } from "react";

export function CartSheet() {
  const { cartItems, cartTotal } = useCart();
  const itemCount = useMemo(() => cartItems.reduce((sum, item) => sum + item.quantity, 0), [cartItems]);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <ShoppingCart className="h-5 w-5" />
          {itemCount > 0 && (
            <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              {itemCount}
            </span>
          )}
          <span className="sr-only">Open cart</span>
        </Button>
      </SheetTrigger>
      <SheetContent className="flex flex-col">
        <SheetHeader>
          <SheetTitle>Shopping Cart ({itemCount} items)</SheetTitle>
        </SheetHeader>
        <Separator className="my-4" />
        {cartItems.length > 0 ? (
          <>
            <ScrollArea className="flex-1 -mx-6">
                <div className="px-6 flex flex-col gap-6 py-4">
                    {cartItems.map((item) => (
                        <CartItem key={item.id} item={item} />
                    ))}
                </div>
            </ScrollArea>
            
            <SheetFooter className="mt-auto">
                <div className="w-full space-y-4">
                  <Separator />
                  <div className="flex justify-between font-semibold text-base">
                    <span>Subtotal</span>
                    <span>₱{cartTotal.toFixed(2)}</span>
                  </div>
                   <SheetTrigger asChild>
                      <Button asChild size="lg" className="w-full">
                        <Link to="/checkout">Checkout</Link>
                      </Button>
                  </SheetTrigger>
                  <p className="text-xs text-muted-foreground text-center">
                    Shipping and taxes calculated at checkout.
                  </p>
                </div>
            </SheetFooter>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
            <BaggageClaim className="h-24 w-24 text-muted" />
            <h3 className="font-semibold text-xl">Your cart is empty</h3>
            <p className="text-muted-foreground">
              Looks like you haven't added anything to your cart yet.
            </p>
            <SheetTrigger asChild>
                <Button asChild>
                    <Link to="/products">Start Shopping</Link>
                </Button>
            </SheetTrigger>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}