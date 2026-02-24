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

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

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

  // Verification step states
  const [verificationStep, setVerificationStep] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');
  const [pendingFormData, setPendingFormData] = useState(null);
  const [verificationAttempts, setVerificationAttempts] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);

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

      const email = `${values.username}@gmail.com`;
      const fullName = `${values.firstName} ${values.lastName}`;

      // Step 1: Send verification code
      const response = await fetch(`${API_URL}/api/auth/send-verification-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, firstName: values.firstName, lastName: values.lastName, fullName }),
      });

      const json = await response.json();

      if (!response.ok) {
        const description = convertApiErrorMessage({ error: json.error || json.message || 'Failed to send verification code' });
        toast({
          variant: 'destructive',
          title: 'Error',
          description: description,
        });
        return;
      }

      // Save form data and show verification step
      setPendingEmail(email);
      setPendingFormData(values);
      setVerificationStep(true);
      setVerificationCode('');
      setVerificationAttempts(0);

      toast({
        title: 'Verification Code Sent',
        description: `Check your Gmail inbox for the 6-digit verification code`,
      });
    } catch (error) {
      console.error('❌ Error sending verification code:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to send verification code',
      });
    }
  }

  async function onVerifyCode() {
    if (!verificationCode || verificationCode.length !== 6) {
      toast({
        variant: 'destructive',
        title: 'Invalid Code',
        description: 'Please enter a valid 6-digit code',
      });
      return;
    }

    setIsVerifying(true);

    try {
      console.log('🔐 Verifying email code...');

      const response = await fetch(`${API_URL}/api/auth/verify-email-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: pendingEmail,
          code: verificationCode,
          password: pendingFormData.password,
          fullName: `${pendingFormData.firstName} ${pendingFormData.lastName}`,
          firstName: pendingFormData.firstName,
          lastName: pendingFormData.lastName,
        }),
      });

      const json = await response.json();

      if (!response.ok) {
        setVerificationAttempts(verificationAttempts + 1);
        const description = convertApiErrorMessage({ error: json.error || json.message || 'Verification failed' });

        if (json.error?.includes('expired')) {
          toast({
            variant: 'destructive',
            title: 'Code Expired',
            description: 'The verification code has expired. Please request a new one.',
          });
          setVerificationStep(false);
          setVerificationCode('');
        } else if (verificationAttempts >= 4) {
          toast({
            variant: 'destructive',
            title: 'Too Many Attempts',
            description: 'Too many failed attempts. Please request a new code.',
          });
          setVerificationStep(false);
          setVerificationCode('');
        } else {
          toast({
            variant: 'destructive',
            title: 'Invalid Code',
            description: description,
          });
        }
        setIsVerifying(false);
        return;
      }

      // Success! Save user and redirect
      if (json.data) {
        const userData = {
          uid: json.data.uid,
          email: json.data.email,
          displayName: json.data.displayName,
          roles: json.data.roles || [json.data.role] || ['buyer'],
          role: json.data.role,
        };
        localStorage.setItem('craftly_user', JSON.stringify(userData));
        localStorage.setItem('craftly_user_id', userData.uid);
        localStorage.setItem('user_roles', JSON.stringify(userData.roles));

        window.dispatchEvent(new CustomEvent('craftly-user-changed', { detail: userData }));

        toast({
          title: 'Account Created Successfully',
          description: 'Welcome to Craftly! Your account has been created.',
        });

        setTimeout(() => {
          navigate('/');
        }, 500);
      }
    } catch (error) {
      console.error('❌ Verification error:', error);
      toast({
        variant: 'destructive',
        title: 'Verification Failed',
        description: error.message || 'An error occurred during verification',
      });
      setVerificationAttempts(verificationAttempts + 1);
    } finally {
      setIsVerifying(false);
    }
  }

  // Verification step UI
  if (verificationStep) {
    return (
      <>
        <div className="flex flex-col space-y-2 text-center mb-6 animate-fade-in-up">
          <h1 className="text-3xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-red-400">
            Verify Your Email
          </h1>
          <p className="text-sm text-muted-foreground">
            We sent a 6-digit code to {pendingEmail}
          </p>
        </div>

        <div className="space-y-4 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <div>
            <label className="text-sm font-medium">Verification Code</label>
            <Input
              placeholder="000000"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.slice(0, 6).replace(/\D/g, ''))}
              maxLength="6"
              type="text"
              inputMode="numeric"
              className="text-center text-2xl tracking-widest mt-2"
            />
            <p className="text-xs text-amber-600 mt-2">
              Code expires in 2 minutes • Attempt {verificationAttempts + 1} of 5
            </p>
          </div>

          <Button
            onClick={onVerifyCode}
            disabled={verificationCode.length !== 6 || isVerifying}
            className="w-full bg-gradient-to-r from-amber-600 to-red-500 hover:from-amber-700 hover:to-red-600 text-white shadow-lg shadow-amber-600/50 transition-all duration-300"
          >
            {isVerifying ? 'Verifying...' : 'Verify & Create Account'}
          </Button>

          <Button
            variant="outline"
            onClick={() => {
              setVerificationStep(false);
              setVerificationCode('');
              setPendingEmail('');
              setPendingFormData(null);
              setVerificationAttempts(0);
            }}
            className="w-full"
            disabled={isVerifying}
          >
            Back to Registration
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs text-amber-400 hover:text-red-400"
            onClick={() => {
              // Resend code
              onSubmit(pendingFormData);
              setVerificationAttempts(0);
            }}
            disabled={isVerifying}
          >
            Didn't receive code? Resend
          </Button>
        </div>
      </>
    );
  }

  // Registration form  UI
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
              {form.formState.isSubmitting ? 'Sending Code...' : 'Create Account'}
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
