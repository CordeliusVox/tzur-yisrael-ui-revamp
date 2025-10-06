import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Shield, Plus, Trash2, ArrowRight, LogOut } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Account {
  id: string;
  username: string;
  email: string;
  role?: string;
  created_at: string;
}

export default function OwnerPanel() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountEmail, setNewAccountEmail] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    setLoading(true);
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
      if (data.success) {
        setAccounts(data.accounts);
      } else {
        toast({
          title: 'שגיאה',
          description: 'לא הצלחנו לטעון את החשבונות',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error loading accounts:', error);
      toast({
        title: 'שגיאה',
        description: 'אירעה שגיאה בטעינת החשבונות',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddAccount = async () => {
    if (!newAccountName || !newAccountEmail) {
      toast({
        title: 'שגיאה',
        description: 'אנא מלא את כל השדות',
        variant: 'destructive',
      });
      return;
    }

    const ownerPassword = sessionStorage.getItem('owner_password');
    if (!ownerPassword) {
      navigate('/');
      return;
    }

    try {
      const response = await fetch(
        'https://daxknkbmetzajmgdpniz.supabase.co/functions/v1/auth-verify',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'create_account',
            password: ownerPassword,
            accountData: {
              name: newAccountName,
              email: newAccountEmail,
            },
          }),
        }
      );

      const data = await response.json();
      if (data.success) {
        toast({
          title: 'הצלחה',
          description: 'החשבון נוצר בהצלחה',
        });
        setNewAccountName('');
        setNewAccountEmail('');
        setIsAddDialogOpen(false);
        loadAccounts();
      } else {
        toast({
          title: 'שגיאה',
          description: data.error || 'לא הצלחנו ליצור את החשבון',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error adding account:', error);
      toast({
        title: 'שגיאה',
        description: 'אירעה שגיאה ביצירת החשבון',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteAccount = async (accountId: string) => {
    const ownerPassword = sessionStorage.getItem('owner_password');
    if (!ownerPassword) {
      navigate('/');
      return;
    }

    try {
      const response = await fetch(
        'https://daxknkbmetzajmgdpniz.supabase.co/functions/v1/auth-verify',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'delete_account',
            password: ownerPassword,
            accountId,
          }),
        }
      );

      const data = await response.json();
      if (data.success) {
        toast({
          title: 'הצלחה',
          description: 'החשבון נמחק בהצלחה',
        });
        loadAccounts();
      } else {
        toast({
          title: 'שגיאה',
          description: data.error || 'לא הצלחנו למחוק את החשבון',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      toast({
        title: 'שגיאה',
        description: 'אירעה שגיאה במחיקת החשבון',
        variant: 'destructive',
      });
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('owner_password');
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted p-4 rtl">
      <div className="max-w-6xl mx-auto">
        <Card className="card-elegant">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield className="h-8 w-8 text-primary" />
                <div>
                  <CardTitle className="text-3xl font-bold text-primary hebrew-title">
                    פאנל בעלים
                  </CardTitle>
                  <CardDescription className="hebrew-body">
                    ניהול חשבונות משתמשים
                  </CardDescription>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => navigate('/complaints')}>
                  <ArrowRight className="h-4 w-4 ml-2" />
                  לפניות
                </Button>
                <Button variant="outline" onClick={handleLogout}>
                  <LogOut className="h-4 w-4 ml-2" />
                  התנתק
                </Button>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold hebrew-subtitle">חשבונות ({accounts.length})</h3>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="btn-school">
                    <Plus className="h-4 w-4 ml-2" />
                    הוסף חשבון
                  </Button>
                </DialogTrigger>
                <DialogContent className="rtl">
                  <DialogHeader>
                    <DialogTitle className="hebrew-title">הוסף חשבון חדש</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="hebrew-body">שם</Label>
                      <Input
                        id="name"
                        value={newAccountName}
                        onChange={(e) => setNewAccountName(e.target.value)}
                        className="text-right"
                        placeholder="הזן שם"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email" className="hebrew-body">אימייל</Label>
                      <Input
                        id="email"
                        type="email"
                        value={newAccountEmail}
                        onChange={(e) => setNewAccountEmail(e.target.value)}
                        className="text-right"
                        placeholder="email@example.com"
                      />
                    </div>
                    <Button onClick={handleAddAccount} className="w-full btn-school">
                      צור חשבון
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground hebrew-body">טוען חשבונות...</p>
              </div>
            ) : accounts.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground hebrew-body">אין חשבונות עדיין</p>
              </div>
            ) : (
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right hebrew-body">שם</TableHead>
                      <TableHead className="text-right hebrew-body">אימייל</TableHead>
                      <TableHead className="text-right hebrew-body">תאריך יצירה</TableHead>
                      <TableHead className="text-left">פעולות</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accounts.map((account) => (
                      <TableRow key={account.id}>
                        <TableCell className="font-medium hebrew-body">{account.username}</TableCell>
                        <TableCell className="hebrew-body">{account.email}</TableCell>
                        <TableCell className="hebrew-body">
                          {new Date(account.created_at).toLocaleDateString('he-IL')}
                        </TableCell>
                        <TableCell className="text-left">
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteAccount(account.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}