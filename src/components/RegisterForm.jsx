
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
import { signUp } from '@/firebase/auth/auth';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

const formSchema = z.object({
  fullName: z.string().min(2, { message: 'Full name must be at least 2 characters.' }),
  username: z.string().min(3, { message: 'Username must be at least 3 characters.' })
    .regex(/^[a-zA-Z0-9._-]+$/, { message: 'Username can only contain letters, numbers, dots, hyphens, and underscores.' })
    .refine(val => !val.includes('@'), { message: 'Username cannot contain @ symbol.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
});

export function RegisterForm() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: '',
      username: '',
      password: '',
    },
  });

  async function onSubmit(values) {
    try {
      console.log('🚀 Registration form submitted with values:', values);

      const emailData = {
        ...values,
        email: `${values.username}@gmail.com`
      };
      delete emailData.username;

      console.log('📧 Calling signUp API with:', emailData);
      console.log('🌐 API URL:', import.meta.env.VITE_API_URL);

      const result = await signUp(emailData);

      console.log('📊 Full signup result:', result);
      console.log('📊 Recovery codes:', result.recoveryCodes);

      // Registration successful - set flag to show warning on homepage
      localStorage.setItem('craftly_needs_download_codes', 'true');

      toast({
        title: 'Registration Successful',
        description: 'Welcome! Your account has been created. Check the homepage for your recovery codes warning.',
      });
      navigate('/');
    } catch (error) {
      console.error('❌ Signup error:', error);
      let description = 'An error occurred during registration. Please try again.';

      // Parse error message from API
      const errorMsg = error.message || '';

      if (errorMsg.toLowerCase().includes('email already in use')) {
        description = 'This email is already registered. Please login instead or use a different email.';
      } else if (errorMsg.toLowerCase().includes('full name must contain only letters')) {
        description = 'Full name can only contain letters, spaces, hyphens, and apostrophes.';
      } else if (errorMsg.toLowerCase().includes('password must be at least 6')) {
        description = 'Password must be at least 6 characters long.';
      } else if (errorMsg.toLowerCase().includes('invalid email')) {
        description = 'Please enter a valid email address.';
      } else if (errorMsg.toLowerCase().includes('email domain not supported')) {
        description = 'Email domain is not supported. Please use gmail.com or other common providers.';
      } else if (errorMsg.toLowerCase().includes('required')) {
        description = 'Please fill in all required fields.';
      } else if (errorMsg.length > 0) {
        // Use the actual error message if it's not empty
        description = errorMsg;
      }

      toast({
        variant: 'destructive',
        title: 'Registration Failed',
        description: description,
      });
    }
  }

  return (
    <>
      <div className="flex flex-col space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Create an account
        </h1>
        <p className="text-sm text-muted-foreground">
          Enter your details below to create your account
        </p>
      </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
             <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Jeremy Cruz" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Gmail Username</FormLabel>
                  <FormControl>
                    <div className="flex items-center">
                      <Input
                        placeholder="yourname"
                        {...field}
                        autoComplete="off"
                      />
                      <span className="ml-2 text-muted-foreground whitespace-nowrap">@gmail.com</span>
                    </div>
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
                  <FormLabel>Password</FormLabel>
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
              {form.formState.isSubmitting ? 'Creating Account...' : 'Create Account'}
            </Button>
          </form>
        </Form>
        <p className="px-8 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link to="/login" className="underline underline-offset-4 hover:text-primary">
                Login
            </Link>
        </p>
    </>
  );
}
