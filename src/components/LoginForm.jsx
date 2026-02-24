
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useNavigate, Link } from 'react-router-dom';
import { signIn } from '@/firebase/auth/auth';
import { useToast } from '@/hooks/use-toast';
import { convertApiErrorMessage } from '@/lib/errorMessages';
import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import GoogleLoginButton from '@/components/GoogleLoginButton';

const formSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
});

export function LoginForm() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  async function onSubmit(values) {
    try {
      const userData = await signIn(values);
      toast({
        title: 'Login Successful',
        description: 'Welcome back!',
      });

      // Check user role and redirect accordingly
      if (userData.roles?.includes('admin')) {
        navigate('/admin/dashboard');
      } else if (userData.roles?.includes('seller')) {
        navigate('/dashboard');
      } else {
        navigate('/');
      }
    } catch (error) {
      console.error(error);
      // Use the error message utility to convert technical errors to user-friendly messages
      const errorMsg = error.message || '';
      const description = convertApiErrorMessage({ error: errorMsg });

      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: description,
      });
    }
  }

  return (
    <>
      <div className="flex flex-col space-y-2 text-center mb-6 animate-fade-in-up">
        <h1 className="text-3xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-red-400">
          Welcome to Craftly
        </h1>
        <p className="text-sm text-muted-foreground">
          Enter your email and password to sign in
        </p>
      </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground">Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="you@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel className="text-foreground">Password</FormLabel>
                    <Link
                        to="/forgot-password"
                        className="text-sm font-medium text-amber-400 hover:text-red-400 transition-colors duration-200"
                    >
                        Forgot password?
                    </Link>
                  </div>
                  <FormControl>
                    <div className="relative">
                        <Input type={showPassword ? "text" : "password"} placeholder="••••••••" {...field} className="pr-10" />
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors duration-200"
                            onClick={() => setShowPassword(prev => !prev)}
                        >
                            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                            <span className="sr-only">{showPassword ? 'Hide password' : 'Show password'}</span>
                        </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full bg-gradient-to-r from-amber-600 to-red-500 hover:from-amber-700 hover:to-red-600 text-white shadow-lg shadow-amber-600/50 hover:shadow-amber-600/75 transition-all duration-300" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Logging in...' : 'Login'}
            </Button>
          </form>
        </Form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300 dark:border-gray-700"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white dark:bg-slate-900 text-gray-600 dark:text-white">Or continue with</span>
          </div>
        </div>

        <GoogleLoginButton />
        <p className="mt-8 px-8 text-center text-sm text-muted-foreground animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          Don't have an account?{' '}
          <Link to="/register" className="text-amber-400 hover:text-red-400 underline underline-offset-4 transition-colors duration-200">
            Register
          </Link>
        </p>
    </>
  );
}