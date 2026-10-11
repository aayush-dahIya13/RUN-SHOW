'use client';

import { useState, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Lock, Eye, EyeOff, ArrowRight, UserPlus } from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  
  const { setPendingEmail, checkEmailExists } = useAuthStore();

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (pwd: string): { valid: boolean; message: string } => {
    if (!pwd) return { valid: false, message: 'Password is required' };
    if (pwd.length < 8) return { valid: false, message: 'Password must be at least 8 characters' };
    return { valid: true, message: '' };
  };

  const validateConfirmPassword = (pwd: string, confirm: string): { valid: boolean; message: string } => {
    if (!confirm) return { valid: false, message: 'Please confirm your password' };
    if (pwd !== confirm) return { valid: false, message: 'Passwords do not match' };
    return { valid: true, message: '' };
  };

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(undefined);

    const trimmedEmail = email.trim().toLowerCase();
    
    if (!trimmedEmail) {
      setError('Please enter your email address');
      return;
    }

    if (!validateEmail(trimmedEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    const pwdResult = validatePassword(password);
    if (!pwdResult.valid) {
      setError(pwdResult.message);
      return;
    }

    setIsLoading(true);

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));

    const exists = checkEmailExists(trimmedEmail);
    
    // If login mode but email doesn't exist, switch to signup
    // If signup mode but email exists, switch to login
    const isSignup = mode === 'signup' || (!exists && mode === 'login');
    
    if (mode === 'login' && !exists) {
      setError('No account found with this email. Switching to sign up...');
      await new Promise(resolve => setTimeout(resolve, 1000));
    } else if (mode === 'signup' && exists) {
      setError('An account with this email already exists. Switching to login...');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    setPendingEmail(trimmedEmail, isSignup);
    setIsLoading(false);
  };

  const handleModeChange = (newMode: 'login' | 'signup') => {
    setMode(newMode);
    setError(undefined);
    // Clear password when switching modes
    if (newMode === 'login') setPassword('');
  };

  // Signup form fields state
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupContact, setSignupContact] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  
  // Field-specific signup errors
  const [signupErrors, setSignupErrors] = useState<{
    name?: string;
    email?: string;
    contact?: string;
    password?: string;
    confirmPassword?: string;
    general?: string;
  }>({});
  const [signupIsLoading, setSignupIsLoading] = useState(false);

  const validateSignupContact = (contact: string): { valid: boolean; message: string } => {
    if (!contact) return { valid: true, message: '' };
    const phoneRegex = /^[\+]?[0-9\s\-\(\)]{8,15}$/;
    if (!phoneRegex.test(contact)) {
      return { valid: false, message: 'Please enter a valid contact number' };
    }
    return { valid: true, message: '' };
  };

  const handleSignupSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSignupErrors({});
    setSignupIsLoading(true);

    const contactResult = validateSignupContact(signupContact);
    const pwdResult = validatePassword(signupPassword);
    const confirmResult = validateConfirmPassword(signupPassword, signupConfirmPassword);

    const newErrors: typeof signupErrors = {};

    if (!signupName.trim()) {
      newErrors.name = 'Full name is required';
    }
    if (!signupEmail.trim()) {
      newErrors.email = 'Please enter your email address';
    } else if (!validateEmail(signupEmail.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }
    if (!contactResult.valid) {
      newErrors.contact = contactResult.message;
    }
    if (!pwdResult.valid) {
      newErrors.password = pwdResult.message;
    }
    if (!confirmResult.valid) {
      newErrors.confirmPassword = confirmResult.message;
    }

    if (Object.keys(newErrors).length > 0) {
      setSignupErrors(newErrors);
      setSignupIsLoading(false);
      return;
    }

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));

    setSignupIsLoading(false);
    setPendingEmail(signupEmail.toLowerCase().trim(), true);
  };

  const handleSignupInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const name = e.target.name;
    
    if (name === 'name') {
      setSignupName(value);
      if (signupErrors.name) setSignupErrors(prev => ({ ...prev, name: undefined }));
    } else if (name === 'email') {
      setSignupEmail(value);
      if (signupErrors.email) setSignupErrors(prev => ({ ...prev, email: undefined }));
    } else if (name === 'contact') {
      setSignupContact(value);
      if (signupErrors.contact) setSignupErrors(prev => ({ ...prev, contact: undefined }));
    } else if (name === 'password') {
      setSignupPassword(value);
      if (signupErrors.password) setSignupErrors(prev => ({ ...prev, password: undefined }));
    } else if (name === 'confirmPassword') {
      setSignupConfirmPassword(value);
      if (signupErrors.confirmPassword) setSignupErrors(prev => ({ ...prev, confirmPassword: undefined }));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        className="w-full max-w-md"
      >
        {/* Logo/Brand */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.3 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 mb-4">
            <svg className="w-8 h-8 text-slate-950" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-slate-100 tracking-tight">EventPilot AI</h1>
          <p className="text-slate-400 mt-1">Intelligent Event Command Centre</p>
        </motion.div>

        {/* Login/Signup Card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 0, x: mode === 'login' ? -20 : 20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: mode === 'login' ? 20 : -20, scale: 0.95 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          >
            <Card variant="glass" padding="lg" className="border-slate-800/50">
              <CardHeader className="text-center mb-6">
                <CardTitle className="text-2xl">
                  {mode === 'login' ? 'Welcome back' : 'Create your account'}
                </CardTitle>
                <CardDescription>
                  {mode === 'login' 
                    ? 'Enter your email and password to access the command centre' 
                    : 'Enter your details to get started'}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-5">
                <form onSubmit={mode === 'login' ? handleSubmit : handleSignupSubmit}>
                  <div className="space-y-4">
                    
                    {/* Email field - always visible */}
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" aria-hidden="true" />
                      <Input
                        type="email"
                        id="email"
                        name="email"
                        placeholder="you@example.com"
                        value={mode === 'login' ? email : signupEmail}
                        onChange={(e) => {
                          if (mode === 'login') setEmail(e.target.value);
                          else setSignupEmail(e.target.value);
                        }}
                        error={mode === 'login' ? error : signupErrors.email}
                        disabled={isLoading || signupIsLoading}
                        className="pl-10"
                        autoComplete="email"
                        autoFocus
                        aria-describedby={mode === 'login' ? (error ? 'email-error' : undefined) : (signupErrors.email ? 'signup-email-error' : undefined)}
                      />
                    </div>

                    {mode === 'login' && error && (
                      <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-sm text-red-400 flex items-center gap-1.5"
                        role="alert"
                        id="email-error"
                      >
                        <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 10-2 0v4a1 1 0 102 0V5z" clipRule="evenodd" />
                        </svg>
                        {error}
                      </motion.p>
                    )}

                    {mode === 'signup' && signupErrors.email && (
                      <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-sm text-red-400 flex items-center gap-1.5"
                        role="alert"
                        id="signup-email-error"
                      >
                        <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 10-2 0v4a1 1 0 102 0V5z" clipRule="evenodd" />
                        </svg>
                        {signupErrors.email}
                      </motion.p>
                    )}

                    {/* Signup-only fields - shown only in signup mode */}
                    {mode === 'signup' && (
                      <div className="space-y-4">
                        <div>
                          <label htmlFor="signup-name" className="block text-sm font-medium text-slate-300 mb-1.5">
                            Full name
                          </label>
                          <div className="relative">
                            <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" aria-hidden="true" />
                            <Input
                              type="text"
                              id="signup-name"
                              name="name"
                              placeholder="Jane Doe"
                              value={signupName}
                              onChange={handleSignupInputChange}
                              error={signupErrors.name}
                              disabled={signupIsLoading}
                              className="pl-10"
                              autoComplete="name"
                            />
                          </div>
                          {signupErrors.name && (
                            <motion.p
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="text-sm text-red-400 flex items-center gap-1.5 mt-1.5"
                              role="alert"
                            >
                              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 10-2 0v4a1 1 0 102 0V5z" clipRule="evenodd" />
                              </svg>
                              {signupErrors.name}
                            </motion.p>
                          )}
                        </div>

                        <div>
                          <label htmlFor="signup-contact" className="block text-sm font-medium text-slate-300 mb-1.5">
                            Contact number
                          </label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" aria-hidden="true" />
                            <Input
                              type="tel"
                              id="signup-contact"
                              name="contact"
                              placeholder="+1 555-123-4567"
                              value={signupContact}
                              onChange={handleSignupInputChange}
                              error={signupErrors.contact}
                              disabled={signupIsLoading}
                              className="pl-10"
                              autoComplete="tel"
                            />
                          </div>
                          {signupErrors.contact && (
                            <motion.p
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="text-sm text-red-400 flex items-center gap-1.5 mt-1.5"
                              role="alert"
                            >
                              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 10-2 0v4a1 1 0 102 0V5z" clipRule="evenodd" />
                              </svg>
                              {signupErrors.contact}
                            </motion.p>
                          )}
                        </div>

                        <div>
                          <label htmlFor="signup-password" className="block text-sm font-medium text-slate-300 mb-1.5">
                            Password
                          </label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" aria-hidden="true" />
                            <Input
                              type={showPassword ? 'text' : 'password'}
                              id="signup-password"
                              name="password"
                              placeholder="••••••••"
                              value={signupPassword}
                              onChange={handleSignupInputChange}
                              error={signupErrors.password}
                              disabled={signupIsLoading}
                              className="pl-10"
                              autoComplete="new-password"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
                              aria-label={showPassword ? 'Hide password' : 'Show password'}
                            >
                              {showPassword ? <EyeOff className="w-4 h-4" aria-hidden="true" /> : <Eye className="w-4 h-4" aria-hidden="true" />}
                            </Button>
                          </div>
                          {signupErrors.password && (
                            <motion.p
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="text-sm text-red-400 flex items-center gap-1.5 mt-1.5"
                              role="alert"
                            >
                              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 10-2 0v4a1 1 0 102 0V5z" clipRule="evenodd" />
                              </svg>
                              {signupErrors.password}
                            </motion.p>
                          )}
                        </div>

                        <div>
                          <label htmlFor="signup-confirm-password" className="block text-sm font-medium text-slate-300 mb-1.5">
                            Confirm password
                          </label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" aria-hidden="true" />
                            <Input
                              type={showConfirmPassword ? 'text' : 'password'}
                              id="signup-confirm-password"
                              name="confirmPassword"
                              placeholder="••••••••"
                              value={signupConfirmPassword}
                              onChange={handleSignupInputChange}
                              error={signupErrors.confirmPassword}
                              disabled={signupIsLoading}
                              className="pl-10"
                              autoComplete="confirm-password"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
                              aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                            >
                              {showConfirmPassword ? <EyeOff className="w-4 h-4" aria-hidden="true" /> : <Eye className="w-4 h-4" aria-hidden="true" />}
                            </Button>
                          </div>
                          {signupErrors.confirmPassword && (
                            <motion.p
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="text-sm text-red-400 flex items-center gap-1.5 mt-1.5"
                              role="alert"
                            >
                              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 10-2 0v4a1 1 0 102 0V5z" clipRule="evenodd" />
                              </svg>
                              {signupErrors.confirmPassword}
                            </motion.p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Login mode - Password field */}
                    {mode === 'login' && (
                      <div>
                        <label htmlFor="login-password" className="block text-sm font-medium text-slate-300 mb-1.5">
                          Password
                        </label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" aria-hidden="true" />
                          <Input
                            type={showPassword ? 'text' : 'password'}
                            id="login-password"
                            name="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            error={error}
                            disabled={isLoading}
                            className="pl-10"
                            autoComplete="current-password"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" aria-hidden="true" /> : <Eye className="w-4 h-4" aria-hidden="true" />}
                          </Button>
                        </div>
                        {error && !error.includes('email') && !error.includes('Email') && (
                          <motion.p
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-sm text-red-400 flex items-center gap-1.5 mt-1.5"
                            role="alert"
                            id="password-error"
                          >
                            <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 10-2 0v4a1 1 0 102 0V5z" clipRule="evenodd" />
                            </svg>
                            {error}
                          </motion.p>
                        )}
                      </div>
                    )}

                    <Button
                      type="submit"
                      size="lg"
                      className="w-full"
                      loading={isLoading || signupIsLoading}
                      disabled={isLoading || signupIsLoading || (mode === 'login' && (!email.trim() || !password)) || (mode === 'signup' && !signupName.trim())}
                    >
                      {mode === 'login' ? 'Continue' : 'Create Account'}
                      <ArrowRight className="w-4 h-4" aria-hidden="true" />
                    </Button>
                  </div>
                </form>
              </CardContent>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-800" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-slate-900/50 text-slate-500">Demo mode — no real authentication</span>
                </div>
              </div>

              <p className="text-center text-sm text-slate-400">
                {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleModeChange(mode === 'login' ? 'signup' : 'login')}
                  className="text-cyan-400 hover:text-cyan-300 p-0 h-auto"
                >
                  {mode === 'login' ? 'Sign up' : 'Log in'}
                </Button>
              </p>
            </Card>

            <CardFooter className="justify-center pt-6">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <svg className="w-4 h-4 text-cyan-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                </svg>
                <span>This is a prototype. No real accounts are created. No emails are sent.</span>
              </div>
            </CardFooter>
          </motion.div>
        </AnimatePresence>

        {/* Demo accounts hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.3 }}
          className="mt-6 text-center"
        >
          <details className="text-slate-500 text-sm">
            <summary className="cursor-pointer flex items-center justify-center gap-1.5 hover:text-slate-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Demo accounts for testing
            </summary>
            <div className="mt-3 p-3 text-left bg-slate-900/50 rounded-lg border border-slate-800/50 text-xs space-y-1">
              <p className="font-medium text-slate-300">Pre-configured demo emails:</p>
              <p><span className="font-mono text-cyan-400">organizer@demo.com</span> — Organizer role</p>
              <p><span className="font-mono text-cyan-400">suborg@demo.com</span> — Sub-organizer (Marketing)</p>
              <p><span className="font-mono text-cyan-400">participant@demo.com</span> — Participant role</p>
              <p className="mt-2 text-slate-500">Or enter any email to simulate a new user</p>
            </div>
          </details>
        </motion.div>
      </motion.div>
    </div>
  );
}
