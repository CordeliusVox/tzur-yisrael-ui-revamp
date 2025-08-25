import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { School } from 'lucide-react';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showUsernameField, setShowUsernameField] = useState(false);
  
  const { signIn, signUp, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/complaints');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Check if password matches the secret admin password
      const SECRET_PASSWORD = "School!Admin3125966";
      
      if (password !== SECRET_PASSWORD) {
        toast({
          variant: "destructive",
          title: "שגיאה בהתחברות",
          description: "סיסמה שגויה. אנא פנה למנהל המערכת."
        });
        setLoading(false);
        return;
      }

      // If password is correct, proceed with authentication using the email
      if (isSignUp || showUsernameField) {
        const { error } = await signUp(email, SECRET_PASSWORD, username);
        if (error) {
          toast({
            variant: "destructive", 
            title: "שגיאה בהרשמה",
            description: error.message
          });
        } else {
          toast({
            title: "הרשמה בוצעה בהצלחה",
            description: "אנא בדוק את האימייל שלך לאימות"
          });
        }
      } else {
        const { error } = await signIn(email, SECRET_PASSWORD);
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            // Email not registered, show username field for signup
            setShowUsernameField(true);
            toast({
              title: "המשתמש לא נמצא",
              description: "אנא הזן שם משתמש להרשמה"
            });
          } else {
            toast({
              variant: "destructive",
              title: "שגיאה בהתחברות", 
              description: error.message
            });
          }
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
          <form onSubmit={handleSubmit} className="space-y-4">
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

            <div className="space-y-2">
              <Label htmlFor="password" className="hebrew-body">סיסמה (סיסמת מנהל)</Label>
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

            {(isSignUp || showUsernameField) && (
              <div className="space-y-2">
                <Label htmlFor="username" className="hebrew-body">שם משתמש</Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required={isSignUp || showUsernameField}
                  className="text-right"
                  placeholder="הזן שם משתמש"
                />
              </div>
            )}

            <Button
              type="submit"
              className="w-full btn-school"
              disabled={loading}
            >
              {loading ? 'מתחבר...' : (isSignUp || showUsernameField) ? 'הרשמה' : 'התחברות'}
            </Button>

            {!showUsernameField && (
              <div className="text-center">
                <Button
                  type="button"
                  variant="link"
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="text-primary hebrew-body"
                >
                  {isSignUp ? 'יש לך כבר חשבון? התחבר' : 'אין לך חשבון? הירשם'}
                </Button>
              </div>
            )}
          </form>

          <div className="mt-8 text-center text-xs text-muted-foreground">
            <p>גרסה 1.0.0</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}