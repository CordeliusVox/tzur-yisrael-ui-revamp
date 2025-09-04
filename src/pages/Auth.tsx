import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { School, ArrowRight, ArrowLeft } from 'lucide-react';

type AuthStep = 'email' | 'existing-user' | 'new-user';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authStep, setAuthStep] = useState<AuthStep>('email');
  
  const { signIn, signUp, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const SECRET_PASSWORD = "School!Admin3125966";

  useEffect(() => {
    if (user) {
      navigate('/complaints');
    }
  }, [user, navigate]);

  // Load remembered credentials
  useEffect(() => {
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    const rememberedUsername = localStorage.getItem('rememberedUsername');
    const shouldRemember = localStorage.getItem('rememberMe') === 'true';
    
    if (rememberedEmail && shouldRemember) {
      setEmail(rememberedEmail);
      setUsername(rememberedUsername || '');
      setRememberMe(true);
    }
  }, []);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    
    try {
      // For this school system, we'll always check if user should sign up or sign in
      // by trying to sign up first (which will fail if user exists)
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password: 'temp_password_check', // This will be ignored if user exists
        options: {
          emailRedirectTo: `${window.location.origin}/complaints`
        }
      });

      if (signUpError) {
        if (signUpError.message.includes('User already registered')) {
          // User exists, go to existing user flow
          setAuthStep('existing-user');
        } else {
          // Other error, assume new user
          setAuthStep('new-user');
        }
      } else {
        // Sign up succeeded, this means new user (but we need to clean up the temp account)
        await supabase.auth.signOut(); // Clear the temp signup
        setAuthStep('new-user');
      }
    } catch (error) {
      // Network error or other issue, assume new user
      setAuthStep('new-user');
    } finally {
      setLoading(false);
    }
  };

  const handleExistingUserAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (password !== SECRET_PASSWORD) {
        toast({
          variant: "destructive",
          title: "שגיאה בהתחברות",
          description: "סיסמה שגויה. אנא פנה למנהל המערכת."
        });
        setLoading(false);
        return;
      }

      // Fake login for testing
      if (email === "YourEmail@gmail.com/fake") {
        // Save credentials if remember me is checked
        if (rememberMe) {
          localStorage.setItem('rememberedEmail', email);
          localStorage.setItem('rememberMe', 'true');
        }
        
        toast({
          title: "התחברות בוצעה בהצלחה",
          description: "ברוך הבא למערכת!"
        });
        
        navigate('/complaints');
        setLoading(false);
        return;
      }

      const { error } = await signIn(email, SECRET_PASSWORD);
      if (error) {
        toast({
          variant: "destructive",
          title: "שגיאה בהתחברות", 
          description: error.message
        });
      } else {
        // Save credentials if remember me is checked
        if (rememberMe) {
          localStorage.setItem('rememberedEmail', email);
          localStorage.setItem('rememberMe', 'true');
        } else {
          localStorage.removeItem('rememberedEmail');
          localStorage.removeItem('rememberedUsername');
          localStorage.removeItem('rememberMe');
        }
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "שגיאה",
        description: "אירעה שגיאה לא צפויה"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNewUserAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (password !== SECRET_PASSWORD) {
        toast({
          variant: "destructive",
          title: "שגיאה בהרשמה",
          description: "סיסמת מנהל שגויה. אנא פנה למנהל המערכת."
        });
        setLoading(false);
        return;
      }

      const { error } = await signUp(email, SECRET_PASSWORD, username);
      
      if (error) {
        toast({
          variant: "destructive", 
          title: "שגיאה בהרשמה",
          description: error.message
        });
      } else {
        // Save credentials if remember me is checked
        if (rememberMe) {
          localStorage.setItem('rememberedEmail', email);
          localStorage.setItem('rememberedUsername', username);
          localStorage.setItem('rememberMe', 'true');
        }
        
        toast({
          title: "הרשמה בוצעה בהצלחה",
          description: "אנא בדוק את האימייל שלך לאימות. לאחר האימות תועבר ישירות למערכת."
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "שגיאה",
        description: "אירעה שגיאה לא צפויה"
      });
    } finally {
      setLoading(false);
    }
  };

  const resetToEmailStep = () => {
    setAuthStep('email');
    setPassword('');
    setUsername('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted p-4">
      <Card className="w-full max-w-md card-elegant">
        <CardHeader className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3 mb-4">
            <School className="h-8 w-8 text-primary" />
            <div>
              <CardTitle className="text-2xl font-bold text-primary hebrew-title">
                בית הספר טכני ב"ש
              </CardTitle>
              <CardDescription className="text-muted-foreground hebrew-body">
                מערכת תלונות
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {authStep === 'email' && (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="hebrew-body">כתובת אימייל</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="text-right"
                  placeholder="user@example.com"
                />
              </div>

              <Button
                type="submit"
                className="w-full btn-school"
                disabled={loading || !email.trim()}
              >
                {loading ? 'בודק...' : 'המשך'}
                <ArrowRight className="h-4 w-4 mr-2" />
              </Button>
            </form>
          )}

          {authStep === 'existing-user' && (
            <form onSubmit={handleExistingUserAuth} className="space-y-4">
              <div className="space-y-2">
                <Label className="hebrew-body text-sm text-muted-foreground">
                  כתובת אימייל: {email}
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={resetToEmailStep}
                  className="p-0 h-auto text-primary"
                >
                  <ArrowLeft className="h-4 w-4 ml-2" />
                  שנה אימייל
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="hebrew-body">סיסמת מנהל</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="text-right"
                  placeholder="הזן סיסמת מנהל"
                />
              </div>

              <div className="flex items-center space-x-2 space-x-reverse">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                />
                <label htmlFor="remember" className="text-sm hebrew-body cursor-pointer">
                  זכור אותי
                </label>
              </div>

              <Button
                type="submit"
                className="w-full btn-school"
                disabled={loading}
              >
                {loading ? 'מתחבר...' : 'התחבר'}
              </Button>
            </form>
          )}

          {authStep === 'new-user' && (
            <form onSubmit={handleNewUserAuth} className="space-y-4">
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-4">
                <p className="text-sm hebrew-body text-foreground">
                  <strong>משתמש חדש זוהה</strong><br />
                  {email}<br />
                  אנא הזן את פרטי המנהל להרשמה
                </p>
                <Button
                  type="button"
                  variant="ghost" 
                  size="sm"
                  onClick={resetToEmailStep}
                  className="mt-2 p-0 h-auto text-primary"
                >
                  <ArrowLeft className="h-4 w-4 ml-2" />
                  שנה אימייל
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="username" className="hebrew-body">שם משתמש</Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="text-right"
                  placeholder="הזן שם משתמש"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="hebrew-body">סיסמת מנהל</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="text-right"
                  placeholder="הזן סיסמת מנהל"
                />
              </div>

              <div className="flex items-center space-x-2 space-x-reverse">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                />
                <label htmlFor="remember" className="text-sm hebrew-body cursor-pointer">
                  זכור אותי
                </label>
              </div>

              <Button
                type="submit"
                className="w-full btn-school"
                disabled={loading}
              >
                {loading ? 'נרשם...' : 'הירשם'}
              </Button>
            </form>
          )}

          <div className="mt-8 text-center text-xs text-muted-foreground">
            <p>גרסה 1.0.0</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
