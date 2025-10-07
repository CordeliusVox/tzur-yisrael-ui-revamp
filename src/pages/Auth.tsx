import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { School, Eye, EyeOff, Shield } from 'lucide-react';

interface Account {
  id: string;
  username: string;
  email: string;
}

export default function Auth() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/complaints');
    }
  }, [user, navigate]);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    setLoadingAccounts(true);
    try {
      const response = await fetch(
        'https://daxknkbmetzajmgdpniz.supabase.co/functions/v1/auth-verify',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'get_accounts' }),
        }
      );

      const data = await response.json();
      if (data.success && data.accounts) {
        setAccounts(data.accounts);
        if (data.accounts.length > 0) {
          setSelectedAccountId(data.accounts[0].id);
        }
      }
    } catch (error) {
      console.error('Error loading accounts:', error);
    } finally {
      setLoadingAccounts(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password) {
      toast({
        variant: "destructive",
        title: "שגיאה",
        description: "אנא הזן סיסמה"
      });
      return;
    }

    setLoading(true);

    try {
      // First, try owner password
      const ownerResponse = await fetch(
        'https://daxknkbmetzajmgdpniz.supabase.co/functions/v1/auth-verify',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'verify_owner',
            password,
          }),
        }
      );

      const ownerData = await ownerResponse.json();
      
      if (ownerData.success && ownerData.isOwner) {
        // Owner password correct - go to owner panel
        sessionStorage.setItem('owner_password', password);
        toast({
          title: "התחברות מוצלחת",
          description: "ברוך הבא, בעלים"
        });
        navigate('/owner-panel');
        return;
      }

      // If not owner, try admin password with account selection
      if (!selectedAccountId) {
        toast({
          variant: "destructive",
          title: "שגיאה",
          description: "אנא בחר חשבון"
        });
        setLoading(false);
        return;
      }

      const adminResponse = await fetch(
        'https://daxknkbmetzajmgdpniz.supabase.co/functions/v1/auth-verify',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'verify_admin',
            password,
            accountId: selectedAccountId,
          }),
        }
      );

      const adminData = await adminResponse.json();
      
      if (adminData.success && adminData.account) {
        // Admin password correct - simulate login
        const fakeUser = {
          id: adminData.account.id,
          email: adminData.account.email,
          user_metadata: { username: adminData.account.username },
          app_metadata: {},
          aud: 'authenticated',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        sessionStorage.setItem('fake_user', JSON.stringify(fakeUser));
        
        // Trigger auth context update first
        window.dispatchEvent(new Event('fake-login'));
        
        // Small delay to ensure auth state is updated
        setTimeout(() => {
          toast({
            title: "התחברות מוצלחת",
            description: `ברוך הבא, ${adminData.account.username}`
          });
          
          // Navigate to complaints page
          navigate('/complaints');
        }, 100);
      } else {
        toast({
          variant: "destructive",
          title: "שגיאה בהתחברות",
          description: "סיסמה שגויה"
        });
      }
    } catch (error) {
      console.error('Login error:', error);
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
                מערכת פניות לקוח
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="rtl">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="account" className="hebrew-body">בחר חשבון</Label>
              {loadingAccounts ? (
                <div className="flex items-center justify-center py-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                </div>
              ) : accounts.length === 0 ? (
                <p className="text-sm text-muted-foreground hebrew-body text-center py-2">
                  אין חשבונות זמינים
                </p>
              ) : (
                <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                  <SelectTrigger className="text-right">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.username} ({account.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="hebrew-body">סיסמה</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="text-right pr-10"
                  placeholder="הזן סיסמת מנהל או בעלים"
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
              <p className="text-xs text-muted-foreground hebrew-body">
                השתמש בסיסמת בעלים לגישה לפאנל ניהול
              </p>
            </div>

            <Button
              type="submit"
              className="w-full btn-school"
              disabled={loading || accounts.length === 0}
            >
              {loading ? 'מתחבר...' : 'התחבר'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground mb-2">
              <Shield className="h-3 w-3" />
              <span className="hebrew-body">מערכת מאובטחת</span>
            </div>
            <p className="text-xs text-muted-foreground">
              גרסה 2.0.0 • מערכת פניות לקוח
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}