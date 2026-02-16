
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
import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

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
      await signIn(values);
      toast({
        title: 'Login Successful',
        description: 'Welcome back!',
      });
      navigate('/');
    } catch (error) {
      console.error(error);
      let description = 'An error occurred during login. Please try again.';

      // Parse error message from API
      const errorMsg = error.message || '';

      if (errorMsg.toLowerCase().includes('invalid email or password')) {
        description = 'Incorrect email or password. Please check your credentials and try again.';
      } else if (errorMsg.toLowerCase().includes('email and password are required')) {
        description = 'Please enter both email and password.';
      } else if (errorMsg.toLowerCase().includes('invalid email address')) {
        description = 'Please enter a valid email address.';
      } else if (errorMsg.toLowerCase().includes('too many')) {
        description = 'Too many login attempts. Please try again later or reset your password.';
      } else if (errorMsg.toLowerCase().includes('server') || errorMsg.toLowerCase().includes('network')) {
        description = 'Server error. Please try again later.';
      } else if (errorMsg.length > 0) {
        // Use the actual error message if it's not empty
        description = errorMsg;
      }

      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: description,
      });
    }
  }

  return (
    <>
      <div className="flex flex-col space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome to Craftly
        </h1>
        <p className="text-sm text-muted-foreground">
          Enter your email and password to sign in
        </p>
      </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
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
                    <FormLabel>Password</FormLabel>
                    <Link
                        to="/forgot-password"
                        className="text-sm font-medium text-primary hover:underline"
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
                            className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground"
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
            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Logging in...' : 'Login'}
            </Button>
          </form>
        </Form>
        <p className="px-8 text-center text-sm text-muted-foreground">
          Don't have an account?{' '}
          <Link to="/register" className="underline underline-offset-4 hover:text-primary">
            Register
          </Link>
        </p>
    </>
  );
}