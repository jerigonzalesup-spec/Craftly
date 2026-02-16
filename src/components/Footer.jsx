import { Link } from 'react-router-dom';
import { Facebook, Instagram, Twitter } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-secondary border-t">
      <div className="container mx-auto px-4 py-2">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="col-span-1 md:col-span-2">
            <h3 className="text-base font-bold font-headline">Craftly</h3>
            <p className="text-muted-foreground text-xs max-w-sm line-clamp-2">
              Your home for discovering and supporting local artisans in Dagupan City.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-xs mb-1">Quick Links</h4>
            <ul className="space-y-0.5 text-xs">
              <li><Link to="/products" className="text-muted-foreground hover:text-foreground transition-colors">Products</Link></li>
              <li><Link to="/about" className="text-muted-foreground hover:text-foreground transition-colors">About</Link></li>
              <li><Link to="/register" className="text-muted-foreground hover:text-foreground transition-colors">Sell</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-xs mb-1">Follow</h4>
            <div className="flex gap-2">
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors"><Twitter className="h-3.5 w-3.5" /></a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors"><Instagram className="h-3.5 w-3.5" /></a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors"><Facebook className="h-3.5 w-3.5" /></a>
            </div>
          </div>
        </div>
        <div className="border-t border-border mt-2 pt-1 text-center text-xs text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Craftly. All Rights Reserved.</p>
        </div>
      </div>
    </footer>
  );
}
