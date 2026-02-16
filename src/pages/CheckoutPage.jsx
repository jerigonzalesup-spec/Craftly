
import { useState } from "react";
import { CheckoutForm } from "../components/CheckoutForm";
import OrderSummary from "../components/OrderSummary";
import { LOCAL_DELIVERY_FEE } from "../lib/data";

export default function CheckoutPage() {
  const [shippingMethod, setShippingMethod] = useState('local-delivery');

  const deliveryFee = shippingMethod === 'local-delivery' ? LOCAL_DELIVERY_FEE : 0;

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight font-headline">Checkout</h1>
      </header>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div className="lg:col-span-1">
          <CheckoutForm 
            shippingMethod={shippingMethod} 
            setShippingMethod={setShippingMethod}
            deliveryFee={deliveryFee}
          />
        </div>
        <div className="lg:col-span-1">
          <OrderSummary deliveryFee={deliveryFee} />
        </div>
      </div>
    </div>
  );
}
