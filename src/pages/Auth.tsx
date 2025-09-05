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
import { School, User, Mail, Lock, Sparkles } from 'lucide-react';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('login');
  
  const { signIn, signUp, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const SECRET_PASSWORD = "ARI2884EL3125966!0812";
  const FAKE_EMAIL = "technibussiness@gmail.com";

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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Check if this is the fake login account
      if (email === FAKE_EMAIL && password === SECRET_PASSWORD) {
        const { error } = await signIn(email, password);
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

          toast({
            title: "התחברות בוצעה בהצלחה",
            description: "ברוך הבא למערכת!"
          });
        }
        setLoading(false);
        return;
      }

      // Regular admin password check for other accounts
      if (password !== "School!Admin3125966") {
        toast({
          variant: "destructive",
          title: "שגיאה בהתחברות",
          description: "סיסמה שגויה. אנא פנה למנהל המערכת."
        });
        setLoading(false);
        return;
      }

      const { error } = await signIn(email, "School!Admin3125966");
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

        toast({
          title: "התחברות בוצעה בהצלחה",
          description: "ברוך הבא למערכת!"
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

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Check if this is the fake login account
      if (email === FAKE_EMAIL && password === SECRET_PASSWORD) {
        const { error } = await signUp(email, password, username);
        
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
            description: "נרשמת בהצלחה! מועבר למערכת..."
          });
        }
        setLoading(false);
        return;
      }

      // Regular admin password check for other accounts
      if (password !== "School!Admin3125966") {
        toast({
          variant: "destructive",
          title: "שגיאה בהרשמה",
          description: "סיסמת מנהל שגויה. אנא פנה למנהל המערכת."
        });
        setLoading(false);
        return;
      }

      const { error } = await signUp(email, "School!Admin3125966", username);
      
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
          description: "נרשמת בהצלחה! מועבר למערכת..."
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

  return (
    <div className="page-container flex items-center justify-center p-4 lg:p-8">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-primary/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/3 right-1/3 w-48 h-48 bg-primary-glow/10 rounded-full blur-3xl animate-pulse delay-700"></div>
      </div>

      <Card className="w-full max-w-lg card-elegant animate-fade-in relative z-10">
        <CardHeader className="text-center space-y-6 pb-8">
          {/* Logo Section */}
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-glow"></div>
              <div className="relative bg-gradient-to-br from-primary to-primary-light p-4 rounded-2xl shadow-elegant">
                <School className="h-8 w-8 text-white" />
              </div>
            </div>
            <div className="text-center">
              <CardTitle className="text-3xl font-bold hebrew-title bg-gradient-to-l from-primary to-primary-light bg-clip-text text-transparent">
                בית הספר טכני ב"ש
              </CardTitle>
              <CardDescription className="text-lg text-muted-foreground hebrew-body mt-2">
                מערכת תלונות חכמה
              </CardDescription>
            </div>
          </div>

          {/* Feature badges */}
          <div className="flex justify-center gap-2 flex-wrap">
            <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
              <Sparkles className="w-3 h-3" />
              מתקדם
            </div>
            <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-success/10 text-success text-sm font-medium">
              <Lock className="w-3 h-3" />
              מאובטח
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8 bg-muted/50 backdrop-blur-sm">
              <TabsTrigger 
                value="login" 
                className="hebrew-body font-medium data-[state=active]:bg-white data-[state=active]:shadow-soft transition-all duration-300"
              >
                התחברות
              </TabsTrigger>
              <TabsTrigger 
                value="signup" 
                className="hebrew-body font-medium data-[state=active]:bg-white data-[state=active]:shadow-soft transition-all duration-300"
              >
                הרשמה
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="login" className="animate-fade-in">
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-3">
                  <Label htmlFor="login-email" className="hebrew-body font-medium text-foreground">
                    כתובת אימייל
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      id="login-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="pl-10 h-12 filter-dropdown rounded-xl"
                      placeholder="user@example.com"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="login-password" className="hebrew-body font-medium text-foreground">
                    סיסמת מנהל
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      id="login-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="pl-10 h-12 filter-dropdown rounded-xl"
                      placeholder="הזן סיסמת מנהל"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <Checkbox
                      id="remember-login"
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                      className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                    <label htmlFor="remember-login" className="text-sm hebrew-body cursor-pointer text-foreground/80">
                      זכור אותי
                    </label>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 btn-school rounded-xl text-lg font-semibold mt-6"
                  disabled={loading}
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      מתחבר...
                    </div>
                  ) : (
                    'התחבר למערכת'
                  )}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="animate-fade-in">
              <form onSubmit={handleSignUp} className="space-y-5">
                <div className="space-y-3">
                  <Label htmlFor="signup-email" className="hebrew-body font-medium text-foreground">
                    כתובת אימייל
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      id="signup-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="pl-10 h-12 filter-dropdown rounded-xl"
                      placeholder="user@example.com"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="signup-username" className="hebrew-body font-medium text-foreground">
                    שם משתמש
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      id="signup-username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      className="pl-10 h-12 filter-dropdown rounded-xl"
                      placeholder="הזן שם משתמש"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="signup-password" className="hebrew-body font-medium text-foreground">
                    סיסמת מנהל
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      id="signup-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="pl-10 h-12 filter-dropdown rounded-xl"
                      placeholder="הזן סיסמת מנהל"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2 space-x-reverse pt-2">
                  <Checkbox
                    id="remember-signup"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                    className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                  <label htmlFor="remember-signup" className="text-sm hebrew-body cursor-pointer text-foreground/80">
                    זכור אותי
                  </label>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 btn-school rounded-xl text-lg font-semibold mt-6"
                  disabled={loading}
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      נרשם...
                    </div>
                  ) : (
                    'הירשם למערכת'
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="mt-8 text-center">
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
              <span>גרסה 2.0.0 • מערכת מאובטחת</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}