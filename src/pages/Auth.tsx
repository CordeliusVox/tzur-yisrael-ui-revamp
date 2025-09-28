import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { School, Eye, EyeOff } from 'lucide-react';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('login');
  const [showPassword, setShowPassword] = useState(false);
  
  const { signIn, signUp, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Secret password - in production, this should be handled server-side
  const SECRET_PASSWORD = "School!Admin3125966";

  useEffect(() => {
    if (user) {
      navigate('/complaints');
    }
  }, [user, navigate]);

  // Load remembered credentials on component mount
  useEffect(() => {
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    const rememberedUsername = localStorage.getItem('rememberedUsername');
    const shouldRemember = localStorage.getItem('rememberMe') === 'true';
    
    if (rememberedEmail && shouldRemember) {
      setEmail(rememberedEmail);
      if (rememberedUsername) {
        setUsername(rememberedUsername);
      }
      setRememberMe(true);
    }
  }, []);

  // Clear form function
  const clearForm = () => {
    setEmail('');
    setPassword('');
    setUsername('');
    setRememberMe(false);
  };

  // Handle remember me functionality
  const handleRememberMe = (email: string, username?: string) => {
    if (rememberMe) {
      localStorage.setItem('rememberedEmail', email);
      if (username) {
        localStorage.setItem('rememberedUsername', username);
      }
      localStorage.setItem('rememberMe', 'true');
    } else {
      localStorage.removeItem('rememberedEmail');
      localStorage.removeItem('rememberedUsername');
      localStorage.removeItem('rememberMe');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        variant: "destructive",
        title: "שגיאה",
        description: "אנא מלא את כל השדות הנדרשים"
      });
      return;
    }

    setLoading(true);

    try {
      // Validate secret password
      if (password !== SECRET_PASSWORD) {
        toast({
          variant: "destructive",
          title: "שגיאה בהתחברות",
          description: "סיסמת מנהל שגויה. אנא פנה למנהל המערכת."
        });
        setLoading(false);
        return;
      }

      // Attempt to sign in with Supabase
      const { error } = await signIn(email, SECRET_PASSWORD);
      
      if (error) {
        // Handle specific Supabase errors
        let errorMessage = "אירעה שגיאה בהתחברות";
        
        if (error.message.includes('Invalid login credentials')) {
          errorMessage = "פרטי התחברות שגויים";
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = "יש לאמת את כתובת האימייל";
        } else if (error.message.includes('Too many requests')) {
          errorMessage = "יותר מדי ניסיונות התחברות. נסה שוב מאוחר יותר";
        }
        
        toast({
          variant: "destructive",
          title: "שגיאה בהתחברות", 
          description: errorMessage
        });
      } else {
        // Success - handle remember me and show success message
        handleRememberMe(email);
        
        toast({
          title: "התחברות בוצעה בהצלחה",
          description: "ברוך הבא למערכת!"
        });
        
        // Clear password for security
        setPassword('');
      }
    } catch (error) {
      console.error('Login error:', error);
      toast({
        variant: "destructive",
        title: "שגיאה",
        description: "אירעה שגיאה לא צפויה. אנא נסה שוב"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password || !username) {
      toast({
        variant: "destructive",
        title: "שגיאה",
        description: "אנא מלא את כל השדות הנדרשים"
      });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        variant: "destructive",
        title: "שגיאה",
        description: "כתובת אימייל לא תקינה"
      });
      return;
    }

    setLoading(true);

    try {
      // Validate secret password
      if (password !== SECRET_PASSWORD) {
        toast({
          variant: "destructive",
          title: "שגיאה בהרשמה",
          description: "סיסמת מנהל שגויה. אנא פנה למנהל המערכת."
        });
        setLoading(false);
        return;
      }

      // Attempt to sign up with Supabase
      const { error } = await signUp(email, SECRET_PASSWORD, username);
      
      if (error) {
        // Handle specific Supabase errors
        let errorMessage = "אירעה שגיאה בהרשמה";
        
        if (error.message.includes('User already registered')) {
          errorMessage = "משתמש זה כבר רשום במערכת";
        } else if (error.message.includes('Password should be at least')) {
          errorMessage = "הסיסמה חייבת להיות באורך של לפחות 6 תווים";
        } else if (error.message.includes('Invalid email')) {
          errorMessage = "כתובת אימייל לא תקינה";
        }
        
        toast({
          variant: "destructive", 
          title: "שגיאה בהרשמה",
          description: errorMessage
        });
      } else {
        // Success - handle remember me and show success message
        handleRememberMe(email, username);
        
        toast({
          title: "הרשמה בוצעה בהצלחה",
          description: "נרשמת בהצלחה! ייתכן שתצטרך לאמת את כתובת האימייל"
        });
        
        // Clear password for security
        setPassword('');
      }
    } catch (error) {
      console.error('Sign up error:', error);
      toast({
        variant: "destructive",
        title: "שגיאה",
        description: "אירעה שגיאה לא צפויה. אנא נסה שוב"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted p-4 rtl">
      <Card className="w-full max-w-md card-elegant">
        <CardHeader className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3 mb-4">
            <School className="h-8 w-8 text-primary" />
            <div>
              <CardTitle className="text-2xl font-bold text-primary hebrew-title">
                בית הספר טכני ב"ש
              </CardTitle>
              <CardDescription className="text-muted-foreground hebrew-body">
                מערכת פניות לקוח
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="rtl">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login" className="hebrew-body">התחברות</TabsTrigger>
              <TabsTrigger value="signup" className="hebrew-body">הרשמה</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email" className="hebrew-body">כתובת אימייל</Label>
                  <Input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="text-right"
                    placeholder="user@example.com"
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="login-password" className="hebrew-body">סיסמת מנהל</Label>
                  <div className="relative">
                    <Input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="text-right pr-10"
                      placeholder="הזן סיסמת מנהל"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      className="absolute left-3 top-1/2 transform -translate-y-1/2"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={loading}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center space-x-2 space-x-reverse">
                  <Checkbox
                    id="remember-login"
                    checked={rememberMe}
                    onCheckedChange={setRememberMe}
                    disabled={loading}
                  />
                  <Label htmlFor="remember-login" className="hebrew-body text-sm">
                    זכור אותי
                  </Label>
                </div>

                <div className="flex gap-2">
                  <Button
                    type="submit"
                    className="flex-1 btn-school"
                    disabled={loading}
                  >
                    {loading ? 'מתחבר...' : 'התחבר'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={clearForm}
                    disabled={loading}
                    className="px-4"
                  >
                    נקה
                  </Button>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="hebrew-body">כתובת אימייל</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="text-right"
                    placeholder="user@example.com"
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-username" className="hebrew-body">שם משתמש</Label>
                  <Input
                    id="signup-username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="text-right"
                    placeholder="הזן שם משתמש"
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="hebrew-body">סיסמת מנהל</Label>
                  <div className="relative">
                    <Input
                      id="signup-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="text-right pr-10"
                      placeholder="הזן סיסמת מנהל"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      className="absolute left-3 top-1/2 transform -translate-y-1/2"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={loading}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center space-x-2 space-x-reverse">
                  <Checkbox
                    id="remember-signup"
                    checked={rememberMe}
                    onCheckedChange={setRememberMe}
                    disabled={loading}
                  />
                  <Label htmlFor="remember-signup" className="hebrew-body text-sm">
                    זכור אותי
                  </Label>
                </div>

                <div className="flex gap-2">
                  <Button
                    type="submit"
                    className="flex-1 btn-school"
                    disabled={loading}
                  >
                    {loading ? 'נרשם...' : 'הירשם'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={clearForm}
                    disabled={loading}
                    className="px-4"
                  >
                    נקה
                  </Button>
                </div>
              </form>
            </TabsContent>
          </Tabs>

          <div className="mt-6 text-center">
            <p className="text-xs text-muted-foreground">
              גרסה 1.0.1 • מערכת פניות לקוח
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
