import { useCart } from '@/hooks/use-cart';
import { Button } from './ui/button';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { Input } from './ui/input';

export function CartItem({ item }) {
  const { updateQuantity, removeFromCart } = useCart();

  const handleQuantityChange = (e) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value)) {
      updateQuantity(item.id, value);
    }
  };

  return (
    <div className="flex items-start gap-4">
      <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-md border">
        <img
          src={item.image}
          alt={item.name}
          className="object-cover w-full h-full"
        />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-base leading-tight break-words">{item.name}</h3>
        <p className="text-muted-foreground text-sm">₱{item.price.toFixed(2)}</p>
        <div className="mt-2 flex items-center gap-2">
          <Button
            size="icon"
            variant="outline"
            className="h-8 w-8"
            onClick={() => updateQuantity(item.id, item.quantity - 1)}
          >
            <Minus className="h-4 w-4" />
            <span className="sr-only">Decrease quantity</span>
          </Button>
          <Input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={item.quantity}
            onChange={handleQuantityChange}
            className="h-8 w-12 text-center"
            aria-label="Item quantity"
          />
          <Button
            size="icon"
            variant="outline"
            className="h-8 w-8"
            onClick={() => updateQuantity(item.id, item.quantity + 1)}
            disabled={item.quantity >= item.stock}
          >
            <Plus className="h-4 w-4" />
            <span className="sr-only">Increase quantity</span>
          </Button>
        </div>
        {item.quantity >= item.stock && (
          <p className="text-xs text-destructive mt-1">Max stock reached</p>
        )}
      </div>
      <div className="flex flex-col items-end gap-2">
        <p className="font-semibold text-right">₱{(item.price * item.quantity).toFixed(2)}</p>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          onClick={() => removeFromCart(item.id)}
        >
          <Trash2 className="h-4 w-4" />
          <span className="sr-only">Remove item</span>
        </Button>
      </div>
    </div>
  );
}