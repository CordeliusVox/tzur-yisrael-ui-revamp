import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Settings, LogOut, Search, Plus, User } from 'lucide-react';
import { getComplaintAge, getComplaintCardClass, sortComplaintsByPriority, formatTimeAgo, type ComplaintWithAge } from '@/utils/complaintUtils';


export default function ComplaintsList() {
  const [complaints, setComplaints] = useState<ComplaintWithAge[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('הכל');
  const [statusFilter, setStatusFilter] = useState('הכל');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<Record<string, { username?: string; email: string }>>({});
  
  const complaintsPerPage = 25;
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const syncGoogleSheets = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('sync-google-sheets');
      if (error) throw error;
      
      toast({
        title: "סנכרון הושלם",
        description: `${data.synced} תלונות חדשות נוספו מהגיליון`
      });
      
      fetchComplaints();
    } catch (error) {
      console.error('Sync error:', error);
      toast({
        variant: "destructive",
        title: "שגיאה בסנכרון",
        description: "לא ניתן לסנכרן עם הגיליון"
      });
    }
  };

  useEffect(() => {
    if (user) {
      fetchComplaints();
      fetchProfiles();
    }
  }, [user]);


  const fetchComplaints = async () => {
    try {
      const { data, error } = await supabase
        .from('complaints')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const complaintsWithAge = data.map(complaint => {
        const { age, daysOld } = getComplaintAge(complaint.created_at, complaint.status);
        return { ...complaint, age, daysOld };
      });

      setComplaints(sortComplaintsByPriority(complaintsWithAge));
    } catch (error) {
      toast({
        variant: "destructive",
        title: "שגיאה",
        description: "לא ניתן לטעון את התלונות"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, username, email');

      if (error) throw error;

      const profilesMap = data.reduce((acc, profile) => {
        acc[profile.user_id] = {
          username: profile.username,
          email: profile.email
        };
        return acc;
      }, {} as Record<string, { username?: string; email: string }>);

      setProfiles(profilesMap);
    } catch (error) {
      console.error('Error fetching profiles:', error);
    }
  };

  const filteredComplaints = useMemo(() => {
    return complaints.filter(complaint => {
      const matchesSearch = complaint.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        complaint.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === 'הכל' || complaint.category === categoryFilter;
      const matchesStatus = statusFilter === 'הכל' || complaint.status === statusFilter;
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [complaints, searchTerm, categoryFilter, statusFilter]);

  const totalPages = Math.ceil(filteredComplaints.length / complaintsPerPage);
  const paginatedComplaints = filteredComplaints.slice(
    (currentPage - 1) * complaintsPerPage,
    currentPage * complaintsPerPage
  );

  const handleClaim = async (id: string) => {
    try {
      const { error } = await supabase
        .from('complaints')
        .update({ 
          assigned_to: user?.id,
          status: 'בטיפול'
        })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "התלונה נתפסה",
        description: "התלונה הוקצתה אליך בהצלחה"
      });

      fetchComplaints();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "שגיאה",
        description: "לא ניתן לתפוס את התלונה"
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'לא שויך': { variant: 'secondary' as const, text: 'לא שויך' },
      'פתוח': { variant: 'default' as const, text: 'פתוח' },
      'בטיפול': { variant: 'default' as const, text: 'בטיפול' },
      'הושלם': { variant: 'default' as const, text: 'הושלם' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig['לא שויך'];
    return <Badge variant={config.variant}>{config.text}</Badge>;
  };

  const getUserDisplay = (userId: string) => {
    const profile = profiles[userId];
    return profile?.username || profile?.email || 'משתמש לא ידוע';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg hebrew-body">טוען תלונות...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <Card className="card-elegant mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-3xl font-bold text-primary hebrew-title">
                רשימת תלונות
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/settings')}
                >
                  <Settings className="h-4 w-4 ml-2" />
                  הגדרות
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={signOut}
                >
                  <LogOut className="h-4 w-4 ml-2" />
                  התנתק
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Filters */}
        <Card className="card-elegant mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="חפש תלונות..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10 text-right"
                />
              </div>
              
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="בחר קטגוריה" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="הכל">הכל</SelectItem>
                  <SelectItem value="טכני">טכני</SelectItem>
                  <SelectItem value="ניקיון">ניקיון</SelectItem>
                  <SelectItem value="בטיחות">בטיחות</SelectItem>
                  <SelectItem value="אחר">אחר</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="בחר סטטוס" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="הכל">הכל</SelectItem>
                  <SelectItem value="לא שויך">לא שויך</SelectItem>
                  <SelectItem value="פתוח">פתוח</SelectItem>
                  <SelectItem value="בטיפול">בטיפול</SelectItem>
                  <SelectItem value="הושלם">הושלם</SelectItem>
                </SelectContent>
              </Select>

              <Button 
                className="btn-school"
                onClick={syncGoogleSheets}
              >
                <Plus className="h-4 w-4 ml-2" />
                רענן מגיליון
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Complaints List */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {paginatedComplaints.length === 0 ? (
            <div className="col-span-full">
              <Card className="card-elegant">
                <CardContent className="text-center py-12">
                  <p className="text-muted-foreground hebrew-body">לא נמצאו תלונות</p>
                </CardContent>
              </Card>
            </div>
          ) : (
            paginatedComplaints.map((complaint) => (
              <Card 
                key={complaint.id} 
                className={`card-elegant cursor-pointer ${getComplaintCardClass(complaint.age)}`}
                onClick={() => navigate(`/complaint/${complaint.id}`)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg hebrew-subtitle line-clamp-1">
                      {complaint.title}
                    </CardTitle>
                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                      {complaint.status === 'לא שויך' && (
                        <Button
                          size="sm"
                          onClick={() => handleClaim(complaint.id)}
                          className="btn-secondary"
                        >
                          תפוס
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(complaint.status)}
                    <Badge variant="outline">{complaint.category}</Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <p className="text-muted-foreground mb-4 hebrew-body line-clamp-3">
                    {complaint.description}
                  </p>
                  
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      <span>מגיש: {getUserDisplay(complaint.submitter_id)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>{formatTimeAgo(complaint.created_at)}</span>
                      {complaint.assigned_to && (
                        <span className="text-xs">מטופל על ידי: {getUserDisplay(complaint.assigned_to)}</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <Pagination>
            <PaginationContent>
              {currentPage > 1 && (
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={() => setCurrentPage(currentPage - 1)}
                    className="cursor-pointer"
                  />
                </PaginationItem>
              )}
              
              {Array.from({ length: totalPages }, (_, i) => (
                <PaginationItem key={i + 1}>
                  <PaginationLink
                    onClick={() => setCurrentPage(i + 1)}
                    isActive={currentPage === i + 1}
                    className="cursor-pointer"
                  >
                    {i + 1}
                  </PaginationLink>
                </PaginationItem>
              ))}
              
              {currentPage < totalPages && (
                <PaginationItem>
                  <PaginationNext 
                    onClick={() => setCurrentPage(currentPage + 1)}
                    className="cursor-pointer"
                  />
                </PaginationItem>
              )}
            </PaginationContent>
          </Pagination>
        )}
      </div>
    </div>
  );
}