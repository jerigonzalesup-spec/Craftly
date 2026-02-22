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
import { convertApiErrorMessage } from '@/lib/errorMessages';
import { useState } from 'react';
import { Eye, EyeOff, Check, X } from 'lucide-react';

const formSchema = z.object({
  firstName: z.string().min(2, { message: 'First name must be at least 2 characters.' })
    .regex(/^[a-zA-Z\s'-]+$/, { message: 'First name must contain only letters, spaces, hyphens, and apostrophes.' }),
  lastName: z.string().min(2, { message: 'Last name must be at least 2 characters.' })
    .regex(/^[a-zA-Z\s'-]+$/, { message: 'Last name must contain only letters, spaces, hyphens, and apostrophes.' }),
  username: z.string().min(3, { message: 'Username must be at least 3 characters.' })
    .regex(/^[a-zA-Z0-9._-]+$/, { message: 'Username can only contain letters, numbers, dots, hyphens, and underscores.' })
    .refine(val => !val.includes('@'), { message: 'Username cannot contain @ symbol.' }),
  password: z.string()
    .min(8, { message: 'Password must be at least 8 characters.' })
    .regex(/[A-Z]/, { message: 'Password must include at least 1 uppercase letter.' })
    .regex(/[a-z]/, { message: 'Password must include at least 1 lowercase letter.' })
    .regex(/[0-9]/, { message: 'Password must include at least 1 number.' })
    .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, { message: 'Password must include at least 1 special character (!@#$%^&*).' }),
});

export function RegisterForm() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({
    hasUpper: false,
    hasLower: false,
    hasNumber: false,
    hasSpecial: false,
    hasLength: false,
  });

  const handlePasswordChange = (value) => {
    setPasswordStrength({
      hasUpper: /[A-Z]/.test(value),
      hasLower: /[a-z]/.test(value),
      hasNumber: /[0-9]/.test(value),
      hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value),
      hasLength: value.length >= 8,
    });
  };

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      username: '',
      password: '',
    },
  });

  async function onSubmit(values) {
    try {
      console.log('🚀 Registration form submitted with values:', values);

      const emailData = {
        firstName: values.firstName,
        lastName: values.lastName,
        fullName: `${values.firstName} ${values.lastName}`,
        email: `${values.username}@gmail.com`,
        password: values.password
      };

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
      // Use the error message utility to convert technical errors to user-friendly messages
      const errorMsg = error.message || '';
      const description = convertApiErrorMessage({ error: errorMsg });

      toast({
        variant: 'destructive',
        title: 'Registration Failed',
        description: description,
      });
    }
  }

  return (
    <>
      <div className="flex flex-col space-y-2 text-center mb-6 animate-fade-in-up">
        <h1 className="text-3xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-red-400">
          Create an account
        </h1>
        <p className="text-sm text-muted-foreground">
          Enter your details below to create your account
        </p>
      </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Jeremy" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Gonzales" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Gmail</FormLabel>
                  <FormControl>
                    <div className="relative flex items-center">
                      <Input
                        placeholder="yourname"
                        {...field}
                        autoComplete="off"
                        className="pr-20"
                      />
                      <span className="absolute right-3 text-muted-foreground whitespace-nowrap text-sm pointer-events-none">@gmail.com</span>
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
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            handlePasswordChange(e.target.value);
                          }}
                          className="pr-10"
                        />
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
                  <div className="mt-2 text-xs space-y-1">
                    <div className={`flex items-center gap-1.5 ${passwordStrength.hasLength ? 'text-green-500' : 'text-muted-foreground'}`}>
                      {passwordStrength.hasLength ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                      <span>8+ characters</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${passwordStrength.hasUpper ? 'text-green-500' : 'text-muted-foreground'}`}>
                      {passwordStrength.hasUpper ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                      <span>1 uppercase letter</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${passwordStrength.hasLower ? 'text-green-500' : 'text-muted-foreground'}`}>
                      {passwordStrength.hasLower ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                      <span>1 lowercase letter</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${passwordStrength.hasNumber ? 'text-green-500' : 'text-muted-foreground'}`}>
                      {passwordStrength.hasNumber ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                      <span>1 number</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${passwordStrength.hasSpecial ? 'text-green-500' : 'text-muted-foreground'}`}>
                      {passwordStrength.hasSpecial ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                      <span>1 special char (!@#$%^&*)</span>
                    </div>
                  </div>
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full bg-gradient-to-r from-amber-600 to-red-500 hover:from-amber-700 hover:to-red-600 text-white shadow-lg shadow-amber-600/50 hover:shadow-amber-600/75 transition-all duration-300" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Creating Account...' : 'Create Account'}
            </Button>
          </form>
        </Form>
        <p className="mt-8 px-8 text-center text-sm text-muted-foreground animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            Already have an account?{' '}
            <Link to="/login" className="text-amber-400 hover:text-red-400 underline underline-offset-4 transition-colors duration-200">
                Login
            </Link>
        </p>
    </>
  );
}
