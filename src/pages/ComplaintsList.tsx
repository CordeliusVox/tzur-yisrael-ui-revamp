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
import { Settings, LogOut, Search, User, RefreshCw, Calendar, Tag } from 'lucide-react';
import { getComplaintAge, getComplaintCardClass, sortComplaintsByPriority, formatTimeAgo, type ComplaintWithAge, type ComplaintAge } from '@/utils/complaintUtils';

// Local storage keys
const STORAGE_KEY = "complaints_v1";
const CACHE_KEY = "complaints_cache";
const CACHE_TIMESTAMP_KEY = "complaints_cache_timestamp";
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Categories will be loaded from database

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

  // Helper: normalize strings for comparison (trim + unicode normalization)
  const normalizeForCompare = (s?: string) => {
    if (!s) return "";
    try {
      return s.toString().trim().normalize("NFC");
    } catch {
      return s.toString().trim();
    }
  };

  // Load categories from database
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const { supabase } = await import('@/integrations/supabase/client');
        const { data, error } = await supabase
          .from('categories')
          .select('id, name')
          .order('name');

        if (error) throw error;

        // Normalize category names when we store them locally
        const normalized = (data?.map((c: any) => normalizeForCompare(c.name)).filter(Boolean)) || [];
        setCategories(normalized);
        console.log('Loaded categories (normalized):', normalized);
      } catch (error) {
        console.error('Error loading categories:', error);
      }
    };

    loadCategories();
  }, []);

  // Load user's assigned categories using user_categories.category_id -> categories.id -> categories.name
  useEffect(() => {
    const loadUserCategories = async () => {
      if (!user?.email) {
        setUserAssignedCategories([]);
        console.log('No user.email, clearing assigned categories');
        return;
      }

      try {
        const { supabase } = await import('@/integrations/supabase/client');

        // Get profile ID only
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

        const userId = profileData.id;
        console.log('Found profile ID:', userId);

        // Fetch category_id values from user_categories for this user
        const { data: ucRows, error: ucError } = await supabase
          .from('user_categories')
          .select('category_id')
          .eq('user_id', userId);

        if (ucError) {
          console.warn('Error fetching user_categories rows:', ucError);
        }

        console.log('user_categories rows for this user (category_id):', ucRows);

        if (!Array.isArray(ucRows) || ucRows.length === 0) {
          console.log('No user_categories rows found for this user.');
          setUserAssignedCategories([]);
          return;
        }

        // Collect distinct ids
        const ids = Array.from(new Set(ucRows.map((r: any) => r.category_id).filter(Boolean)));
        if (ids.length === 0) {
          console.log('user_categories rows contained no category_id values.');
          setUserAssignedCategories([]);
          return;
        }

        // Now fetch category names for those ids
        const { data: catData, error: catError } = await supabase
          .from('categories')
          .select('id, name')
          .in('id', ids);

        if (catError) {
          console.warn('Error fetching categories by id:', catError);
          setUserAssignedCategories([]);
          return;
        }

        if (!Array.isArray(catData) || catData.length === 0) {
          console.log('No categories rows found for provided ids:', ids);
          setUserAssignedCategories([]);
          return;
        }

        const assignedCats = catData.map((c: any) => normalizeForCompare(c.name)).filter(Boolean);
        console.log('User assigned categories (from category ids):', assignedCats);
        setUserAssignedCategories(assignedCats);
      } catch (error) {
        console.error('Error loading user categories (unexpected):', error);
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

  // Normalize category - trim/normalize and default to 'אחר'
  const normalizeCategory = (category: string): string => {
    const normalized = normalizeForCompare(category);
    if (!normalized) return 'אחר';
    
    // If category exists in our loaded canonical categories, return that canonical value
    if (categories.includes(normalized)) {
      return normalized;
    }
    
    // Otherwise return the normalized raw string so comparisons still work
    return normalized;
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
        return parsedData
          .filter((complaint: any) => complaint.visible !== false)
          .map((complaint: any) => {
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
    const complaintsWithAge = complaintsData
      .filter((complaint: any) => complaint.visible !== false)
      .map((complaint: any) => {
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
    const complaintsForStorage = complaintsData
      .filter((complaint: any) => complaint.visible !== false)
      .map((complaint: any) => ({
        id: complaint.id,
        title: complaint.title || "לא נמצא כותרת",
        submitter: complaint.name || "לא ידוע",
        submitterEmail: complaint.email || "לא נמצא אימייל",
        submitterPhone: complaint.phone || "לא נמצא מספר טלפון",
        category: normalizeCategory(complaint.category),
        date: complaint.created_at,
        description: complaint.details,
        assignedTo: complaint.assigned_to,
        visible: complaint.visible !== false,
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
      
      // Normalize complaint category for comparison (defensive)
      const complaintCatNorm = normalizeForCompare(complaint.category);

      // If user has assigned categories, only show those complaints
      // If no categories assigned, show all (admin/staff case)
      const matchesUserCategories = userAssignedCategories.length === 0 || 
        userAssignedCategories.includes(complaintCatNorm);
      
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

  const getAgeBadge = (age: ComplaintAge) => {
    const ageConfig = {
      "new": { variant: "default" as const, text: "חדש", color: "bg-green-100 text-green-800" },
      "warning": { variant: "default" as const, text: "דורש תשומת לב", color: "bg-yellow-100 text-yellow-800" },
      "critical": { variant: "destructive" as const, text: "דחוף", color: "bg-red-100 text-red-800" },
    };

    const config = ageConfig[age as keyof typeof ageConfig] || ageConfig["new"];
    return (
      <Badge variant={config.variant} className={config.color}>
        {config.text}
      </Badge>
    );
  };

  const getCategoryIcon = (category: string) => {
    const iconMap: Record<string, JSX.Element> = {
      'פדגוגיה': <User className="h-3 w-3" />,
      'מחשוב': <Settings className="h-3 w-3" />,
      'תשתיות': <Settings className="h-3 w-3" />,
      'ביטחון אישי': <Settings className="h-3 w-3" />
    };
    
    return iconMap[category] || <Tag className="h-3 w-3" />;
  };

  const getUserDisplay = (userId: string) => {
    if (userId === user?.id) return "אתה";
    return "משתמש אחר";
  };

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
                  {availableCategories.map(category => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

            </div>
          </CardContent>
        </Card>

        {/* Complaints List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
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
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="hebrew-subtitle text-foreground flex-1 line-clamp-1">
                      {complaint.title || "כותרת לא נמצאה"}
                    </h3>
                    {getAgeBadge(complaint.age)}
                  </div>
                  
                  <p className="hebrew-body text-muted-foreground mb-4 line-clamp-2 text-sm">
                    {truncateText(complaint.description || (complaint as any).details || "אין תיאור זמין", 100)}
                  </p>
                  
                  <div className="flex items-center justify-between pt-3 border-t border-border">
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Tag className="w-3.5 h-3.5" />
                      <span className="truncate">{complaint.category}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>
                        {new Date(complaint.created_at).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' })}
                      </span>
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
