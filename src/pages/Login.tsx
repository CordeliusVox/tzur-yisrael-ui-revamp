import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { GraduationCap, Mail, Lock, User } from "lucide-react";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate authentication
    setTimeout(() => {
      if (email && password && username) {
        localStorage.setItem("username", username);
        toast({
          title: "התחברות בוצעה בהצלחה",
          description: `ברוך/ה הבא/ה, ${username}`,
        });
        navigate("/complaints");
      } else {
        toast({
          title: "שגיאה בהתחברות",
          description: "אנא מלאו את כל השדות (כולל שם משתמש)",
          variant: "destructive",
        });
      }
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 rtl">
      <div className="w-full max-w-md">
        {/* School Header */}
        <div className="text-center mb-8">
          <div className="mx-auto w-20 h-20 bg-gradient-to-br from-primary to-primary-glow rounded-full flex items-center justify-center mb-4 shadow-lg">
            <GraduationCap className="w-10 h-10 text-white" />
          </div>
          <h1 className="hebrew-title text-primary mb-2">מערכת ניהול פניות</h1>
          <p className="hebrew-body text-muted-foreground">התחברו למערכת לניהול פניות התלמידים</p>
        </div>

        {/* Login Card */}
        <Card className="card-elegant">
          <CardHeader className="text-center">
            <CardTitle className="hebrew-subtitle">התחברות למערכת</CardTitle>
            <CardDescription className="hebrew-body">הזינו את פרטי ההתחברות שלכם</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="hebrew-body font-medium">
                  כתובת אימייל
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="הזינו את כתובת האימייל"
                    className="pl-10 h-12 rounded-xl border-border focus:border-primary transition-colors"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="username" className="hebrew-body font-medium">
                  שם משתמש במערכת
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="הזינו שם משתמש שיופיע בשיוך ועדכונים"
                    className="pl-10 h-12 rounded-xl border-border focus:border-primary transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="hebrew-body font-medium">
                  סיסמה
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="הזינו את הסיסמה"
                    className="pl-10 h-12 rounded-xl border-border focus:border-primary transition-colors"
                    dir="ltr"
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                disabled={isLoading} 
                className="w-full h-12 text-lg font-medium bg-gradient-to-l from-primary to-primary-glow hover:shadow-lg transition-all duration-300 rounded-xl"
              >
                {isLoading ? "מתחבר..." : "התחברות"}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                שכחתם את הסיסמה? צרו קשר עם מנהל המערכת
              </p>
            </div>
          </CardContent>
        </Card>

        {/* School Info Footer */}
        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            מערכת ניהול פניות בית ספר • גרסה 2024
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;