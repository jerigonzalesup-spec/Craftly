import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCart } from '@/hooks/use-cart';
import { useToast } from "@/hooks/use-toast";
import { Minus, Plus, ShoppingCart, Zap, LogIn, Edit } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useUser } from '@/firebase/auth/use-user';
import { getImageUrl } from '@/lib/image-utils';


export function AddToCartForm({ product }) {
  const { user } = useUser();
  const [quantity, setQuantity] = useState(1);
  const { cartItems, addToCart } = useCart();
  const { toast } = useToast();
  const navigate = useNavigate();

  const itemInCart = useMemo(() => cartItems.find(item => item.id === product.id), [cartItems, product.id]);
  const availableStock = product.stock - (itemInCart?.quantity || 0);

  const executeAddToCart = (showToast = true) => {
    if (quantity > availableStock) {
        toast({
            variant: "destructive",
            title: "Not enough stock!",
            description: `Only ${availableStock} more items available.`,
        });
        return false;
    }

    const imageUrl = getImageUrl(product.images[0]);
    if (imageUrl) {
        addToCart({
          id: product.id,
          name: product.name,
          price: product.price,
          image: imageUrl,
          stock: product.stock,
          quantity: quantity,
          createdBy: product.createdBy,
        }, { showToast });

      return true;
    }
    return false;
  };
  
  const handleAddToCartClick = () => {
      if (executeAddToCart()) {
          setQuantity(1);
      }
  }

  const handleBuyNow = () => {
    if (executeAddToCart(false)) {
        navigate('/checkout');
    }
  };

  const updateQuantity = (newQuantity) => {
    const validatedQuantity = Math.max(1, Math.min(newQuantity, availableStock));
    setQuantity(validatedQuantity);
  };
  
  if (product.stock === 0) {
      return <p className="text-destructive font-semibold">Out of Stock</p>;
  }

  if (!user) {
    return (
        <div className="space-y-4">
            <p className="text-muted-foreground">You must be logged in to purchase items.</p>
            <Button asChild size="lg" className="w-full">
                <Link to="/login">
                    <LogIn className="mr-2 h-5 w-5" />
                    Log In or Register
                </Link>
            </Button>
        </div>
    );
  }

  if (user.uid === product.createdBy) {
      return (
          <div className="space-y-4">
              <p className="text-muted-foreground font-semibold">This is your product listing.</p>
              <Button asChild size="lg" className="w-full" variant="outline">
                  <Link to="/dashboard/my-products">
                      <Edit className="mr-2 h-5 w-5" />
                      Manage Product
                  </Link>
              </Button>
          </div>
      )
  }

  if (availableStock <= 0) {
    return <p className="text-primary font-semibold">All available stock is in your cart!</p>;
  }

  return (
    <div className="space-y-4">
        <div className="flex items-center gap-2">
            <p className="font-medium text-sm">Quantity:</p>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateQuantity(quantity - 1)} disabled={quantity <= 1}>
                <Minus className="h-4 w-4" />
            </Button>
            <Input
                type="number"
                min="1"
                max={availableStock}
                value={quantity}
                onChange={(e) => updateQuantity(parseInt(e.target.value) || 1)}
                className="w-16 h-8 text-center"
            />
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateQuantity(quantity + 1)} disabled={quantity >= availableStock}>
                <Plus className="h-4 w-4" />
            </Button>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-2">
            <Button size="lg" onClick={handleAddToCartClick} className="w-full sm:w-auto flex-1" disabled={availableStock <= 0}>
                <ShoppingCart className="mr-2 h-5 w-5" />
                Add to Cart
            </Button>
            <Button size="lg" onClick={handleBuyNow} className="w-full sm:w-auto flex-1" variant="secondary" disabled={availableStock <= 0}>
                <Zap className="mr-2 h-5 w-5" />
                Buy Now
            </Button>
        </div>
    </div>
  );
}