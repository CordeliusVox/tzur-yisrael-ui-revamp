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
import { Settings, LogOut, Search, RefreshCw, Calendar, Tag } from 'lucide-react';
import { getComplaintAge, getComplaintCardClass, sortComplaintsByPriority, formatTimeAgo, type ComplaintWithAge } from '@/utils/complaintUtils';

// Local storage keys
const STORAGE_KEY = "complaints_v1";
const CACHE_KEY = "complaints_cache";
const CACHE_TIMESTAMP_KEY = "complaints_cache_timestamp";
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export default function ComplaintsList() {
  const [complaints, setComplaints] = useState<ComplaintWithAge[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [userAssignedCategories, setUserAssignedCategories] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('הכל');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const complaintsPerPage = 25;
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load categories from database
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const { supabase } = await import('@/integrations/supabase/client');
        const { data, error } = await supabase
          .from('categories')
          .select('name')
          .order('name');

        if (error) throw error;
        setCategories(data?.map(c => c.name) || []);
      } catch (error) {
        console.error('Error loading categories:', error);
      }
    };

    loadCategories();
  }, []);

  // Load user's assigned categories
  useEffect(() => {
    const loadUserCategories = async () => {
      if (!user?.email) {
        console.log('No user email, showing all categories');
        setUserAssignedCategories([]);
        return;
      }
      
      try {
        const { supabase } = await import('@/integrations/supabase/client');
        
        // Get profile by email (since fake login doesn't set user_id)
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', user.email)
          .maybeSingle();
        
        if (profileError) {
          console.error('Error fetching profile:', profileError);
          setUserAssignedCategories([]);
          return;
        }

        if (!profileData) {
          console.log('No profile found for user email:', user.email);
          setUserAssignedCategories([]);
          return;
        }

        console.log('Found profile ID:', profileData.id);

        const { data, error } = await supabase
          .from('user_categories')
          .select('categories(name)')
          .eq('user_id', profileData.id);

        if (error) {
          console.error('Error loading user categories:', error);
          setUserAssignedCategories([]);
          return;
        }

        const assignedCats = data?.map((uc: any) => uc.categories?.name).filter(Boolean) || [];
        console.log('User assigned categories:', assignedCats);
        setUserAssignedCategories(assignedCats);
      } catch (error) {
        console.error('Error loading user categories:', error);
        setUserAssignedCategories([]);
      }
    };

    loadUserCategories();
  }, [user]);

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

  // Normalize category - just return as is or default to 'אחר'
  const normalizeCategory = (category: string): string => {
    if (!category) return 'אחר';
    
    // If category exists in our loaded categories, use it
    if (categories.includes(category)) {
      return category;
    }
    
    return category; // Keep original category even if not in list
  };

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
          const { age, daysOld } = getComplaintAge(complaint.created_at);
          return { 
            ...complaint, 
            age, 
            daysOld,
            category: normalizeCategory(complaint.category)
          };
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
      const normalizedCategory = normalizeCategory(complaint.category);
      const { age, daysOld } = getComplaintAge(complaint.created_at);
      
      return {
        ...complaint,
        category: normalizedCategory,
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
      submitter: complaint.name || "לא ידוע",
      submitterEmail: complaint.email || "לא נמצא אימייל",
      submitterPhone: complaint.phone || "לא נמצא מספר טלפון",
      category: normalizeCategory(complaint.category),
      date: complaint.created_at,
      description: complaint.details,
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
    console.log('Filtering complaints. User categories:', userAssignedCategories);
    return complaints.filter((complaint) => {
      const description = complaint.description || (complaint as any).details || "";
      const matchesSearch =
        complaint.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        description.toLowerCase().includes(searchTerm.toLowerCase());
      
      // If user has assigned categories, only show those complaints
      // If no categories assigned, show all (admin/staff case)
      const matchesUserCategories = userAssignedCategories.length === 0 || 
        userAssignedCategories.includes(complaint.category);
      
      const matchesCategory = categoryFilter === "הכל" || complaint.category === categoryFilter;
      
      return matchesSearch && matchesCategory && matchesUserCategories;
    });
  }, [complaints, searchTerm, categoryFilter, userAssignedCategories]);

  // Get available categories for filter dropdown
  const availableCategories = useMemo(() => {
    if (userAssignedCategories.length === 0) {
      return categories; // Show all if no restrictions
    }
    return categories.filter(cat => userAssignedCategories.includes(cat));
  }, [categories, userAssignedCategories]);

  const totalPages = Math.ceil(filteredComplaints.length / complaintsPerPage);
  const paginatedComplaints = useMemo(() => {
    return filteredComplaints.slice(
      (currentPage - 1) * complaintsPerPage,
      currentPage * complaintsPerPage
    );
  }, [filteredComplaints, currentPage, complaintsPerPage]);

  const truncateText = (text: string, maxLength: number = 50): string => {
    if (!text) return "";
    return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
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
                רשימת פניות
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="חיפוש לפי כותרת או תיאור..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10 rounded-xl"
                />
              </div>
              
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="rounded-xl">
                  <Tag className="h-4 w-4 ml-2" />
                  <SelectValue placeholder="כל הקטגוריות" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="הכל">הכל</SelectItem>
                  {availableCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Results Count */}
        <div className="mb-4 text-sm text-muted-foreground">
          נמצאו {filteredComplaints.length} פניות
          {userAssignedCategories.length > 0 && (
            <span className="mr-2">
              (מוצגות רק פניות מהקטגוריות שלך: {userAssignedCategories.join(', ')})
            </span>
          )}
        </div>

        {/* Complaints List */}
        <div className="space-y-4">
          {paginatedComplaints.length === 0 ? (
            <Card className="card-elegant">
              <CardContent className="text-center py-12">
                <p className="text-muted-foreground hebrew-body">לא נמצאו פניות</p>
              </CardContent>
            </Card>
          ) : (
            paginatedComplaints.map((complaint) => (
              <Card 
                key={complaint.id}
                className={`card-elegant cursor-pointer hover:shadow-lg transition-all ${getComplaintCardClass(complaint.age)}`}
                onClick={() => navigate(`/complaint/${complaint.id}`)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start gap-3">
                        <h3 className="text-lg font-semibold hebrew-subtitle">{complaint.title}</h3>
                        <Badge variant="outline" className="shrink-0">
                          <Tag className="h-3 w-3 ml-1" />
                          {complaint.category}
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-muted-foreground hebrew-body">
                        {truncateText((complaint as any).details || complaint.description, 100)}
                      </p>
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatTimeAgo(complaint.created_at)}
                        </div>
                        {complaint.age === 'critical' && (
                          <Badge variant="destructive" className="text-xs">דחוף - {complaint.daysOld} ימים</Badge>
                        )}
                        {complaint.age === 'warning' && (
                          <Badge variant="secondary" className="text-xs">{complaint.daysOld} ימים</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-8">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <PaginationItem key={page}>
                    <PaginationLink
                      onClick={() => setCurrentPage(page)}
                      isActive={currentPage === page}
                      className="cursor-pointer"
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                
                <PaginationItem>
                  <PaginationNext
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </div>
    </div>
  );
}