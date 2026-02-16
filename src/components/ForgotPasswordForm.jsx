
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
import { AlertCircle, Loader2 } from 'lucide-react';

// Validation schemas for each step
const emailSchema = z.object({
  email: z.string()
    .min(1, { message: 'Email is required.' })
    .email({ message: 'Please enter a valid email address.' }),
});

// Single recovery code instead of 2 codes
const codeSchema = z.object({
  code: z.string()
    .min(1, { message: 'Recovery code is required.' })
    .min(10, { message: 'Recovery code must be at least 10 characters.' }),
});

const passwordSchema = z
  .object({
    newPassword: z.string()
      .min(1, { message: 'New password is required.' })
      .min(6, { message: 'Password must be at least 6 characters.' })
      .max(128, { message: 'Password must not exceed 128 characters.' }),
    confirmPassword: z.string()
      .min(1, { message: 'Password confirmation is required.' }),
  })
  .refine(data => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  })
  .refine(data => data.newPassword.trim().length > 0, {
    message: 'Password cannot be empty or only spaces.',
    path: ['newPassword'],
  });

export function ForgotPasswordForm() {
  const {
    step,
    email,
    codesRemaining,
    loading,
    error,
    verifyEmail,
    verifyCodes,
    updatePassword,
    setNewPassword,
    setConfirmPassword,
    resetForm,
  } = usePasswordRecoveryViewModel();

  // Step 1: Email form
  const emailForm = useForm({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: '' },
  });

  async function onEmailSubmit(values) {
    await verifyEmail(values.email);
  }

  // Step 2: Recovery code form (now just 1 code)
  const codeForm = useForm({
    resolver: zodResolver(codeSchema),
    defaultValues: { code: '' },
  });

  async function onCodeSubmit(values) {
    await verifyCodes(values.code);
  }

  // Step 3: New password form
  const passwordForm = useForm({
    resolver: zodResolver(passwordSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  async function onPasswordSubmit(values) {
    await updatePassword(values.newPassword, values.confirmPassword);
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Recover Your Password</CardTitle>
        <CardDescription>
          {step === 'email' && 'Enter your email address to begin recovery'}
          {step === 'code' && `Enter your recovery code (${codesRemaining} remaining)`}
          {step === 'password' && 'Set your new password'}
          {step === 'success' && 'Password reset successfully!'}
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

        {/* Step 1: Email Verification */}
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
                      <Input type="email" placeholder="you@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying...</> : 'Continue'}
              </Button>
            </form>
          </Form>
        )}

        {/* Step 2: Recovery Code (single code) */}
        {step === 'code' && (
          <Form {...codeForm}>
            <form onSubmit={codeForm.handleSubmit(onCodeSubmit)} className="space-y-4">
              <FormField
                control={codeForm.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Recovery Code</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter your 32-character recovery code"
                        {...field}
                        className="font-mono text-sm"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <p className="text-sm text-muted-foreground">
                You have <strong>{codesRemaining}</strong> recovery code{codesRemaining !== 1 ? 's' : ''} remaining.
                {codesRemaining === 0 && (
                  <span className="block mt-2 text-red-600 font-semibold">
                    All codes used. Please contact admin for help.
                  </span>
                )}
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={resetForm}
                  disabled={loading}
                >
                  Back
                </Button>
                <Button type="submit" className="flex-1" disabled={loading || codesRemaining === 0}>
                  {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying...</> : 'Continue'}
                </Button>
              </div>
            </form>
          </Form>
        )}

        {/* Step 3: New Password */}
        {step === 'password' && (
          <Form {...passwordForm}>
            <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
              <FormField
                control={passwordForm.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
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
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Resetting...</> : 'Reset Password'}
              </Button>
            </form>
          </Form>
        )}

        {/* Step 4: Success */}
        {step === 'success' && (
          <div className="space-y-4 text-center">
            <div className="rounded-lg bg-green-50 p-4 text-sm text-green-800">
              ✅ Your password has been reset successfully!
            </div>
            <p className="text-sm text-muted-foreground">
              Please log in with your new password.
            </p>
            <Button asChild className="w-full">
              <Link to="/login">Go to Login</Link>
            </Button>
          </div>
        )}

        {/* Links */}
        {step === 'email' && (
          <div className="mt-4 text-center text-sm">
            Remembered your password?{' '}
            <Link to="/login" className="underline">
              Login
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
