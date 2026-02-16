
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { Suspense } from "react";

function ConfirmationContent() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId');

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <Card className="w-full max-w-lg text-center shadow-lg">
        <CardHeader className="items-center">
            <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
            <CardTitle className="text-3xl font-bold">Thank You for Your Order!</CardTitle>
            <CardDescription className="text-base">
                Your order has been successfully placed.
            </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
            {orderId && <p className="text-muted-foreground">Your Order ID is: <span className="font-mono text-foreground">{orderId}</span></p>}
            <p>You can view your order details and status in your profile.</p>
            <div className="flex flex-col sm:flex-row gap-4 mt-4">
                <Button asChild size="lg">
                    <Link to="/">Continue Shopping</Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                    <Link to="/my-orders">View My Orders</Link>
                </Button>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function OrderConfirmationPage() {
    return (
        <div className="container mx-auto px-4 py-8">
            <Suspense fallback={<div>Loading...</div>}>
                <ConfirmationContent />
            </Suspense>
        </div>
    )
}
