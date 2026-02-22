
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { usePasswordRecoveryViewModel } from '@/hooks/usePasswordRecoveryViewModel';
import { Link } from 'react-router-dom';
import { AlertCircle, Loader2, CheckCircle, ArrowLeft } from 'lucide-react';

// Validation schemas
const emailSchema = z.object({
  email: z.string()
    .min(1, { message: 'Email is required.' })
    .email({ message: 'Please enter a valid email address.' }),
});

const codeSchema = z.object({
  code: z.string()
    .length(6, { message: 'Code must be 6 digits.' })
    .regex(/^\d+$/, { message: 'Code must contain only numbers.' }),
});

const passwordSchema = z.object({
  newPassword: z.string()
    .min(6, { message: 'Password must be at least 6 characters.' })
    .max(128, { message: 'Password must not exceed 128 characters.' }),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export function ForgotPasswordForm() {
  const {
    step,
    email,
    code,
    loading,
    error,
    sendResetCode,
    verifyCode,
    setCode,
    resetPasswordWithCode,
    setNewPassword,
    setConfirmPassword,
    resetForm,
  } = usePasswordRecoveryViewModel();

  // Email form
  const emailForm = useForm({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: '' },
  });

  // Code form
  const codeForm = useForm({
    resolver: zodResolver(codeSchema),
    defaultValues: { code: '' },
  });

  // Password form
  const passwordForm = useForm({
    resolver: zodResolver(passwordSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  async function onEmailSubmit(values) {
    await sendResetCode(values.email);
  }

  async function onCodeSubmit(values) {
    await verifyCode(values.code);
  }

  async function onPasswordSubmit(values) {
    await resetPasswordWithCode(values.newPassword, values.confirmPassword);
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Reset Your Password</CardTitle>
        <CardDescription>
          {step === 'email' && 'Enter your email to receive a password reset code'}
          {step === 'code' && 'Enter the 6-digit code you received'}
          {step === 'password' && 'Enter your new password'}
          {step === 'success' && 'Your password has been reset'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Step 1: Email */}
        {step === 'email' && (
          <Form {...emailForm}>
            <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-6">
              <FormField
                control={emailForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input 
                        type="email" 
                        placeholder="you@example.com" 
                        {...field} 
                        disabled={loading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...</> : 'Send Reset Code'}
              </Button>
              <div className="text-center text-sm">
                <Link to="/login" className="text-blue-600 hover:underline">
                  Back to Login
                </Link>
              </div>
            </form>
          </Form>
        )}

        {/* Step 2: Code Verification */}
        {step === 'code' && (
          <Form {...codeForm}>
            <form onSubmit={codeForm.handleSubmit(onCodeSubmit)} className="space-y-6">
              <div className="text-center space-y-2 mb-4">
                <p className="text-sm text-muted-foreground">
                  We sent a 6-digit code to <strong>{email}</strong>
                </p>
                <p className="text-xs text-muted-foreground">
                  The code expires in 15 minutes
                </p>
              </div>

              <FormField
                control={codeForm.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reset Code</FormLabel>
                    <FormControl>
                      <Input 
                        type="text" 
                        placeholder="000000" 
                        maxLength="6"
                        inputMode="numeric"
                        {...field} 
                        disabled={loading}
                        className="text-center text-2xl letter-spacing tracking-widest"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying...</> : 'Verify Code'}
              </Button>

              <div className="space-y-2 text-sm">
                <Button 
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => resetForm()}
                  disabled={loading}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Email
                </Button>
              </div>
            </form>
          </Form>
        )}

        {/* Step 3: New Password */}
        {step === 'password' && (
          <Form {...passwordForm}>
            <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-6">
              <div className="text-center space-y-2 mb-4">
                <p className="text-sm text-muted-foreground">
                  Code verified. Enter your new password.
                </p>
              </div>

              <FormField
                control={passwordForm.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="••••••••" 
                        {...field}
                        disabled={loading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={passwordForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="••••••••" 
                        {...field}
                        disabled={loading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Resetting...</> : 'Reset Password'}
              </Button>

              <Button 
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => resetForm()}
                disabled={loading}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Start Over
              </Button>
            </form>
          </Form>
        )}

        {/* Step 4: Success */}
        {step === 'success' && (
          <div className="space-y-4">
            <div className="flex justify-center">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="font-semibold text-lg">Password Reset Successfully!</h3>
              <p className="text-sm text-muted-foreground">
                Your password has been changed. You can now sign in with your new password.
              </p>
            </div>
            <Button asChild className="w-full">
              <Link to="/login">Back to Login</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
