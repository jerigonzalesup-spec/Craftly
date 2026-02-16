
import { RegisterForm } from '../components/RegisterForm';
import placeholderImages from '../lib/placeholder-images.json';

export default function RegisterPage() {
  return (
    <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2">
      <div className="hidden lg:flex items-center justify-center bg-muted relative overflow-hidden h-screen">
        <img
          src={placeholderImages.registerArt.src}
          alt="Handmade pottery"
          className="w-full h-full object-cover"
          data-ai-hint={placeholderImages.registerArt.hint}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
      </div>
      <div className="flex items-center justify-center p-8 sm:p-12 min-h-screen">
        <div className="w-full max-w-md">
            <RegisterForm />
        </div>
      </div>
    </div>
  );
}
