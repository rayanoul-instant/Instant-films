import { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, User, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { z } from 'zod';
import logoInstant from '@/assets/logo-instant.png';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const signupSchema = loginSchema.extend({
  username: z.string().min(3, 'Username must be at least 3 characters').max(20, 'Username cannot exceed 20 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export default function AuthPage() {
  const { user, signIn, signUp, loading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [emailSentTo, setEmailSentTo] = useState<string | null>(null);

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [signupUsername, setSignupUsername] = useState('');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  if (emailSentTo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full text-center space-y-6"
        >
          <img src={logoInstant} alt="Instant" className="h-12 mx-auto" />
          <div className="cinema-card p-8 space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center mx-auto">
              <Mail className="w-8 h-8 text-primary" />
            </div>
            <h1 className="font-display text-2xl font-bold">Vérifiez votre email</h1>
            <p className="text-muted-foreground text-sm">
              Un lien de confirmation a été envoyé à <span className="text-foreground font-medium">{emailSentTo}</span>.
              Cliquez sur ce lien pour activer votre compte.
            </p>
            <p className="text-muted-foreground text-xs">
              Une fois confirmé, revenez ici et connectez-vous.
            </p>
            <Button
              variant="outline"
              className="w-full border-border"
              onClick={() => setEmailSentTo(null)}
            >
              Retour à la connexion
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const validation = loginSchema.safeParse({ email: loginEmail, password: loginPassword });
      if (!validation.success) {
        toast.error(validation.error.errors[0].message);
        setIsLoading(false);
        return;
      }

      const { error } = await signIn(loginEmail, loginPassword);
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast.error('Invalid email or password');
        } else {
          toast.error(error.message);
        }
      } else {
        toast.success('Logged in successfully!');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const validation = signupSchema.safeParse({
        email: signupEmail,
        password: signupPassword,
        confirmPassword: signupConfirmPassword,
        username: signupUsername,
      });

      if (!validation.success) {
        toast.error(validation.error.errors[0].message);
        setIsLoading(false);
        return;
      }

      const { error } = await signUp(signupEmail, signupPassword, signupUsername);
      if (error) {
        if (error.message.includes('already registered')) {
          toast.error('This email is already in use');
        } else {
          toast.error(error.message);
        }
      } else {
        setEmailSentTo(signupEmail);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left Side - Decorative */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-accent/10 to-background" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,hsl(270_70%_55%/0.2),transparent_50%)]" />
        
        <div className="relative z-10 flex flex-col justify-center p-12">
          <Link to="/" className="flex items-center gap-3 mb-12">
            <img src={logoInstant} alt="Instant" className="h-10" />
          </Link>
          
          <h1 className="font-display text-4xl md:text-5xl font-bold mb-6">
            Join the <span className="text-gradient-gold">film</span> community
          </h1>
          <p className="text-lg text-muted-foreground max-w-md">
            Discover exceptional short films, share your reviews, and connect 
            with fellow short film enthusiasts.
          </p>
        </div>
      </div>

      {/* Right Side - Forms */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <Link 
            to="/" 
            className="lg:hidden flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>

          <div className="lg:hidden flex items-center gap-3 mb-8">
            <img src={logoInstant} alt="Instant" className="h-8" />
          </div>

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-secondary mb-8">
              <TabsTrigger value="login" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                Log in
              </TabsTrigger>
              <TabsTrigger value="signup" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                Sign up
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="you@example.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="pl-10 bg-secondary border-border"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="pl-10 bg-secondary border-border"
                      required
                    />
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full btn-cinema" 
                  disabled={isLoading}
                >
                  <span>{isLoading ? 'Logging in...' : 'Log in'}</span>
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="signup-username">Username</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="signup-username"
                      type="text"
                      placeholder="YourUsername"
                      value={signupUsername}
                      onChange={(e) => setSignupUsername(e.target.value)}
                      className="pl-10 bg-secondary border-border"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="you@example.com"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      className="pl-10 bg-secondary border-border"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      className="pl-10 bg-secondary border-border"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-confirm">Confirm password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="signup-confirm"
                      type="password"
                      placeholder="••••••••"
                      value={signupConfirmPassword}
                      onChange={(e) => setSignupConfirmPassword(e.target.value)}
                      className="pl-10 bg-secondary border-border"
                      required
                    />
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full btn-cinema" 
                  disabled={isLoading}
                >
                  <span>{isLoading ? 'Creating...' : 'Create my account'}</span>
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <p className="text-center text-sm text-muted-foreground mt-8">
            By signing up, you agree to our terms of service and privacy policy.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
