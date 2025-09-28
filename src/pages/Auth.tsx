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
  const [secretPassword, setSecretPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('login');
  const [showPassword, setShowPassword] = useState(false);
  const [showSecretPassword, setShowSecretPassword] = useState(false);
  
  const { signIn, signUp, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Secret password for accessing the system
  const SECRET_PASSWORD = "School!Admin3125966";

  useEffect(() => {
    if (user) {
      navigate('/complaints');
    }
  }, [user, navigate]);

  // Load remembered credentials on component mount
  useEffect(() => {
    const savedData = localStorage.getItem('rememberedAuth');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        if (parsed.rememberMe) {
          setEmail(parsed.email || '');
          setUsername(parsed.username || '');
          setRememberMe(true);
        }
      } catch (e) {
        console.error('Error loading saved credentials');
      }
    }
  }, []);

  const validateForm = (isSignup = false) => {
    if (!email || !email.includes('@')) {
      toast({
        variant: "destructive",
        title: "שגיאה",
        description: "אנא הזן כתובת אימייל תקינה"
      });
      return false;
    }

    if (!password || password.length < 6) {
      toast({
        variant: "destructive",
        title: "שגיאה",
        description: "הסיסמה חייבת להכיל לפחות 6 תווים"
      });
      return false;
    }

    if (isSignup && (!username || username.trim().length < 2)) {
      toast({
        variant: "destructive",
        title: "שגיאה",
        description: "שם המשתמש חייב להכיל לפחות 2 תווים"
      });
      return false;
    }

    if (secretPassword !== SECRET_PASSWORD) {
      toast({
        variant: "destructive",
        title: "שגיאה באימות",
        description: "סיסמת המנהל שגויה. אנא פנה למנהל המערכת."
      });
      return false;
    }

    return true;
  };

  const saveCredentials = () => {
    if (rememberMe) {
      const dataToSave = {
        email,
        username,
        rememberMe: true
      };
      localStorage.setItem('rememberedAuth', JSON.stringify(dataToSave));
    } else {
      localStorage.removeItem('rememberedAuth');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const { error, data } = await signIn(email, password);
      
      if (error) {
        // If user doesn't exist or wrong password, show appropriate message
        if (error.message.includes('Invalid login credentials')) {
          toast({
            variant: "destructive",
            title: "שגיאה בהתחברות",
            description: "אימייל או סיסמה שגויים"
          });
        } else {
          toast({
            variant: "destructive",
            title: "שגיאה בהתחברות",
            description: error.message
          });
        }
      } else if (data?.user) {
        // Save credentials if remember me is checked
        saveCredentials();
        
        // Store username in user metadata if available
        if (data.user.user_metadata?.username) {
          localStorage.setItem('currentUsername', data.user.user_metadata.username);
        }

        toast({
          title: "התחברות בוצעה בהצלחה",
          description: `ברוך הבא ${data.user.user_metadata?.username || email}!`
        });
        
        navigate('/complaints');
      }
    } catch (error) {
      console.error('Login error:', error);
      toast({
        variant: "destructive",
        title: "שגיאה",
        description: "אירעה שגיאה בהתחברות. אנא נסה שנית."
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm(true)) {
      return;
    }

    setLoading(true);

    try {
      // Sign up with user metadata including username
      const { error, data } = await signUp(email, password, username);
      
      if (error) {
        if (error.message.includes('already registered')) {
          toast({
            variant: "destructive",
            title: "שגיאה בהרשמה",
            description: "כתובת האימייל כבר רשומה במערכת"
          });
        } else {
          toast({
            variant: "destructive",
            title: "שגיאה בהרשמה",
            description: error.message
          });
        }
      } else if (data?.user) {
        // Save credentials if remember me is checked
        saveCredentials();
        
        // Store username
        localStorage.setItem('currentUsername', username);
        
        toast({
          title: "הרשמה בוצעה בהצלחה",
          description: "נרשמת בהצלחה! אנא אמת את האימייל שלך."
        });
        
        // Switch to login tab after successful signup
        setActiveTab('login');
        
        // Clear the secret password field for security
        setSecretPassword('');
      }
    } catch (error) {
      console.error('Signup error:', error);
      toast({
        variant: "destructive",
        title: "שגיאה",
        description: "אירעה שגיאה בהרשמה. אנא נסה שנית."
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted p-4 rtl">
      <Card className="w-full max-w-md card-elegant shadow-lg">
        <CardHeader className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3 mb-4">
            <School className="h-8 w-8 text-primary" />
            <div>
              <CardTitle className="text-2xl font-bold text-primary hebrew-title">
                בית הספר טכני ב"ש
              </CardTitle>
              <CardDescription className="text-muted-foreground hebrew-body">
                מערכת ניהול פניות
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
                    dir="ltr"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="login-password" className="hebrew-body">סיסמה</Label>
                  <div className="relative">
                    <Input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="text-right pr-10"
                      placeholder="הזן סיסמה"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="login-secret" className="hebrew-body">סיסמת מנהל</Label>
                  <div className="relative">
                    <Input
                      id="login-secret"
                      type={showSecretPassword ? "text" : "password"}
                      value={secretPassword}
                      onChange={(e) => setSecretPassword(e.target.value)}
                      required
                      className="text-right pr-10"
                      placeholder="הזן סיסמת מנהל"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecretPassword(!showSecretPassword)}
                      className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showSecretPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center space-x-2 space-x-reverse">
                  <Checkbox
                    id="remember-login"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                  />
                  <Label htmlFor="remember-login" className="hebrew-body cursor-pointer">
                    זכור אותי
                  </Label>
                </div>

                <Button
                  type="submit"
                  className="w-full btn-school"
                  disabled={loading}
                >
                  {loading ? 'מתחבר...' : 'התחבר'}
                </Button>
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
                    dir="ltr"
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
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="hebrew-body">סיסמה</Label>
                  <div className="relative">
                    <Input
                      id="signup-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="text-right pr-10"
                      placeholder="בחר סיסמה (מינימום 6 תווים)"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-secret" className="hebrew-body">סיסמת מנהל</Label>
                  <div className="relative">
                    <Input
                      id="signup-secret"
                      type={showSecretPassword ? "text" : "password"}
                      value={secretPassword}
                      onChange={(e) => setSecretPassword(e.target.value)}
                      required
                      className="text-right pr-10"
                      placeholder="הזן סיסמת מנהל להרשמה"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecretPassword(!showSecretPassword)}
                      className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showSecretPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    * נדרשת סיסמת מנהל כדי להירשם למערכת
                  </p>
                </div>

                <div className="flex items-center space-x-2 space-x-reverse">
                  <Checkbox
                    id="remember-signup"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                  />
                  <Label htmlFor="remember-signup" className="hebrew-body cursor-pointer">
                    זכור אותי
                  </Label>
                </div>

                <Button
                  type="submit"
                  className="w-full btn-school"
                  disabled={loading}
                >
                  {loading ? 'נרשם...' : 'הירשם'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="mt-8 text-center text-xs text-muted-foreground">
            <p>מערכת ניהול פניות - גרסה 1.0.0</p>
            <p className="mt-1">© 2024 בית הספר טכני ב"ש</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
