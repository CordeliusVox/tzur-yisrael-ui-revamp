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
import { School } from 'lucide-react';

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
          description: "נרשמת בהצלחה! אנא בדוק את האימייל שלך לאימות החשבון."
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
                מערכת תלונות
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
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="login-password" className="hebrew-body">סיסמה</Label>
                  <Input
                    id="login-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="text-right"
                    placeholder="הזן סיסמה"
                  />
                </div>

                <div className="flex items-center gap-2 flex-row-reverse">
                  <label htmlFor="remember-login" className="text-sm hebrew-body cursor-pointer">
                    זכור אותי
                  </label>
                  <Checkbox
                    id="remember-login"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                  />
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
                  <Input
                    id="signup-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="text-right"
                    placeholder="הזן סיסמה"
                  />
                </div>

                <div className="flex items-center gap-2 flex-row-reverse">
                  <label htmlFor="remember-signup" className="text-sm hebrew-body cursor-pointer">
                    זכור אותי
                  </label>
                  <Checkbox
                    id="remember-signup"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                  />
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
            <p>גרסה 1.0.0</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}