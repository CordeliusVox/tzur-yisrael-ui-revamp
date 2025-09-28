import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Settings, LogOut, Search, User, RefreshCw } from 'lucide-react';
import { getComplaintAge, getComplaintCardClass, sortComplaintsByPriority, formatTimeAgo, type ComplaintWithAge } from '@/utils/complaintUtils';

// Local storage keys
const STORAGE_KEY = "complaints_v1";
const CACHE_KEY = "complaints_cache";
const CACHE_TIMESTAMP_KEY = "complaints_cache_timestamp";
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export default function ComplaintsList() {
  const [complaints, setComplaints] = useState<ComplaintWithAge[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('הכל');
  const [statusFilter, setStatusFilter] = useState('הכל');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const complaintsPerPage = 25;
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load from cache immediately on mount
  useEffect(() => {
    if (user) {
      loadComplaintsWithCache();
    }
    
    // Cleanup on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [user]);

  // Load from cache first, then fetch if needed
  const loadComplaintsWithCache = async () => {
    // Try to load from cache first
    const cachedData = loadFromCache();
    if (cachedData && cachedData.length > 0) {
      setComplaints(cachedData);
      setLoading(false);
      
      // Check if cache is expired and fetch in background
      const cacheTimestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
      if (cacheTimestamp) {
        const age = Date.now() - parseInt(cacheTimestamp, 10);
        if (age > CACHE_DURATION) {
          // Fetch fresh data in background without showing loading
          fetchComplaintsInBackground();
        }
      }
    } else {
      // No cache, fetch fresh data
      await loadComplaints();
    }
  };

  const loadFromCache = (): ComplaintWithAge[] | null => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsedData = JSON.parse(cached);
        return parsedData.map((complaint: any) => {
          const { age, daysOld } = getComplaintAge(complaint.created_at, complaint.status);
          return { ...complaint, age, daysOld };
        });
      }
    } catch (error) {
      console.error("Error loading from cache:", error);
    }
    return null;
  };

  const saveToCache = (data: any[]) => {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
      localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
    } catch (error) {
      console.error("Error saving to cache:", error);
    }
  };

  const fetchComplaintsInBackground = async () => {
    try {
      const controller = new AbortController();
      abortControllerRef.current = controller;
      
      const response = await fetch(
        "https://daxknkbmetzajmgdpniz.supabase.co/functions/v1/sync-google-sheets",
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
        }
      );

      if (!response.ok) throw new Error("Failed to fetch complaints");
      
      const complaintsData = await response.json();
      
      // Process and update only if data changed
      const complaintsWithAge = processComplaints(complaintsData);
      
      // Check if data actually changed before updating state
      if (JSON.stringify(complaintsWithAge) !== JSON.stringify(complaints)) {
        setComplaints(complaintsWithAge);
        saveToCache(complaintsData);
        saveComplaintsForDetailPage(complaintsData);
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error("Background fetch error:", error);
      }
    }
  };

  const loadComplaints = async () => {
    setLoading(true);
    try {
      const controller = new AbortController();
      abortControllerRef.current = controller;
      
      // Add timeout
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(
        "https://daxknkbmetzajmgdpniz.supabase.co/functions/v1/sync-google-sheets",
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
        }
      );
      
      clearTimeout(timeoutId);

      if (!response.ok) throw new Error("Failed to fetch complaints");

      const complaintsData = await response.json();
      const complaintsWithAge = processComplaints(complaintsData);
      
      setComplaints(complaintsWithAge);
      saveToCache(complaintsData);
      saveComplaintsForDetailPage(complaintsData);
      
    } catch (error: any) {
      if (error.name === 'AbortError') {
        toast({
          title: "הבקשה בוטלה",
          description: "זמן הטעינה ארך מדי, נסה שוב",
          variant: "destructive",
        });
      } else {
        console.error("Error loading complaints:", error);
        toast({
          title: "שגיאה",
          description: "נכשל בטעינת התלונות",
          variant: "destructive",
        });
      }
      
      // Try to load from cache as fallback
      const cachedData = loadFromCache();
      if (cachedData) {
        setComplaints(cachedData);
      }
    } finally {
      setLoading(false);
    }
  };

  const processComplaints = (complaintsData: any[]): ComplaintWithAge[] => {
    const complaintsWithAge = complaintsData.map((complaint: any) => {
      const { age, daysOld } = getComplaintAge(complaint.created_at, complaint.status);
      return {
        ...complaint,
        age,
        daysOld,
        submitter_id: complaint.submitter_id || "external",
      };
    });
    return sortComplaintsByPriority(complaintsWithAge);
  };

  const saveComplaintsForDetailPage = (complaintsData: any[]) => {
    const complaintsForStorage = complaintsData.map((complaint: any) => ({
      id: complaint.id,
      title: complaint.title || "לא נמצא כותרת",
      submitter: complaint.submitter || complaint.name,
      submitterEmail: complaint.email || "לא נמצא אימייל",
      submitterPhone: complaint.phone || "לא נמצא מספר טלפון",
      category: complaint.category,
      status: complaint.status,
      date: complaint.created_at,
      description: complaint.details,
      assignedTo: complaint.assigned_to,
      updates: [],
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(complaintsForStorage));
  };

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      // Force refresh from server
      const response = await fetch(
        "https://daxknkbmetzajmgdpniz.supabase.co/functions/v1/sync-google-sheets?refresh=true",
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }
      );
      
      if (response.ok) {
        const complaintsData = await response.json();
        const complaintsWithAge = processComplaints(complaintsData);
        setComplaints(complaintsWithAge);
        saveToCache(complaintsData);
        saveComplaintsForDetailPage(complaintsData);
        
        toast({
          title: "עודכן בהצלחה",
          description: "הרשימה עודכנה מהשרת",
        });
      }
    } catch (error) {
      console.error("Refresh error:", error);
      toast({
        title: "שגיאה",
        description: "נכשל בעדכון הרשימה",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [toast]);

  const filteredComplaints = useMemo(() => {
    return complaints.filter((complaint) => {
      const description = complaint.description || (complaint as any).details || "";
      const matchesSearch =
        complaint.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === "הכל" || complaint.category === categoryFilter;
      const matchesStatus = statusFilter === "הכל" || complaint.status === statusFilter;
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [complaints, searchTerm, categoryFilter, statusFilter]);

  const totalPages = Math.ceil(filteredComplaints.length / complaintsPerPage);
  const paginatedComplaints = useMemo(() => {
    return filteredComplaints.slice(
      (currentPage - 1) * complaintsPerPage,
      currentPage * complaintsPerPage
    );
  }, [filteredComplaints, currentPage, complaintsPerPage]);

  const handleClaim = useCallback((id: string) => {
    const updatedComplaints = complaints.map((complaint) => {
      if (complaint.id === id && complaint.status === "לא שויך") {
        return {
          ...complaint,
          assigned_to: user?.id,
          status: "בטיפול" as const,
        };
      }
      return complaint;
    });

    setComplaints(updatedComplaints);
    
    // Update cache
    saveToCache(updatedComplaints);

    toast({
      title: "התלונה נתפסה",
      description: "התלונה הוקצתה אליך בהצלחה",
    });
  }, [complaints, user, toast]);

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      "לא שויך": { variant: "secondary" as const, text: "לא שויך" },
      "פתוח": { variant: "default" as const, text: "פתוח" },
      "בטיפול": { variant: "default" as const, text: "בטיפול" },
      "הושלם": { variant: "default" as const, text: "הושלם" },
      "חדש": { variant: "default" as const, text: "חדש" },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig["לא שויך"];
    return <Badge variant={config.variant}>{config.text}</Badge>;
  };

  const getUserDisplay = (userId: string) => {
    if (userId === user?.id) return "אתה";
    return "משתמש אחר";
  };

  // Show minimal loading UI only on initial load
  if (loading && complaints.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <div className="text-lg hebrew-body">טוען תלונות...</div>
        </div>
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
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                >
                  <RefreshCw className={`h-4 w-4 ml-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                  רענן
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/settings")}
                >
                  <Settings className="h-4 w-4 ml-2" />
                  הגדרות
                </Button>
                <Button variant="outline" size="sm" onClick={signOut}>
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="חפש תלונות ..."
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
                  <SelectItem value="חדש">חדש</SelectItem>
                </SelectContent>
              </Select>
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
                className={`card-elegant cursor-pointer transition-all hover:shadow-lg ${getComplaintCardClass(
                  complaint.age
                )}`}
                onClick={() => navigate(`/complaint/${complaint.id}`)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg hebrew-subtitle line-clamp-1">
                      {complaint.title}
                    </CardTitle>
                    <div
                      className="flex gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {complaint.status === "לא שויך" && (
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
                    {complaint.description || (complaint as any).details}
                  </p>

                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      <span>מגיש: {getUserDisplay(complaint.submitter_id)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>{formatTimeAgo(complaint.created_at)}</span>
                      {complaint.assigned_to && (
                        <span className="text-xs">
                          מטופל על ידי: {getUserDisplay(complaint.assigned_to)}
                        </span>
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

              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <PaginationItem key={pageNum}>
                    <PaginationLink
                      onClick={() => setCurrentPage(pageNum)}
                      isActive={currentPage === pageNum}
                      className="cursor-pointer"
                    >
                      {pageNum}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}

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
