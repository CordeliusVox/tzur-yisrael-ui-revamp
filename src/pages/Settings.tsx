import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import { useNavigate } from "react-router-dom";
import { Settings as SettingsIcon, Bell, Moon, SunMedium, Save, ChevronRight } from "lucide-react";

const TOPICS = [
  "משמעת",
  "אלימות",
  "ציוד",
  "אקדמי",
  "תחבורה",
  "סביבת למידה",
  "שירותי מזון",
  "אחר",
];

const STORAGE_KEY = "app_settings_v1";

type SettingsData = {
  theme: "light" | "dark";
  notificationsEnabled: boolean;
  topics: string[];
};

const defaultSettings: SettingsData = {
  theme: "light",
  notificationsEnabled: false,
  topics: [],
};

const Settings = () => {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(defaultSettings.notificationsEnabled);
  const [topics, setTopics] = useState<string[]>(defaultSettings.topics);

  // Load saved settings
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const saved: SettingsData = JSON.parse(raw);
        if (saved.theme) setTheme(saved.theme);
        if (typeof saved.notificationsEnabled === "boolean") setNotificationsEnabled(saved.notificationsEnabled);
        if (Array.isArray(saved.topics)) setTopics(saved.topics);
      } catch {}
    }
  }, [setTheme]);

  // SEO: title, meta description, canonical
  useEffect(() => {
    const title = "הגדרות מערכת – מצב כהה והתראות | מערכת פניות";
    const description = "נהל/י מצב תאורה (בהיר/כהה) והגדרות התראות לפי נושאים במערכת ניהול הפניות הבית־ספרית.";
    document.title = title;

    const ensureTag = (selector: string, create: () => HTMLElement) => {
      let el = document.head.querySelector(selector) as HTMLElement | null;
      if (!el) {
        el = create();
        document.head.appendChild(el);
      }
      return el;
    };

    const metaDesc = ensureTag('meta[name="description"]', () => {
      const m = document.createElement("meta");
      m.setAttribute("name", "description");
      return m;
    });
    metaDesc.setAttribute("content", description);

    const linkCanonical = ensureTag('link[rel="canonical"]', () => {
      const l = document.createElement("link");
      l.setAttribute("rel", "canonical");
      return l;
    });
    linkCanonical.setAttribute("href", window.location.origin + "/settings");
  }, []);

  const allSelected = useMemo(() => topics.length === TOPICS.length, [topics.length]);

  const toggleTopic = (topic: string) => {
    setTopics((prev) =>
      prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]
    );
  };

  const toggleAll = (checked: boolean) => {
    setTopics(checked ? [...TOPICS] : []);
  };

  const handleSave = async () => {
    const data: SettingsData = {
      theme: (theme as "light" | "dark") || "light",
      notificationsEnabled,
      topics,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

    if (notificationsEnabled && "Notification" in window) {
      try {
        const perm = await Notification.requestPermission();
        if (perm === "granted") {
          toast.success("התראות הופעלו בהצלחה");
        } else if (perm === "denied") {
          toast.error("ההרשאה להתראות נדחתה בדפדפן");
        } else {
          toast("ההרשאה להתראות טרם הוחלטה");
        }
      } catch {
        toast.error("שגיאה בבקשת הרשאת התראות");
      }
    } else if (!notificationsEnabled) {
      toast("התראות הושבתו");
    }

    toast.success("ההגדרות נשמרו");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted rtl">
      <header className="bg-white/80 backdrop-blur-sm border-b border-border sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-glow rounded-lg flex items-center justify-center">
                <SettingsIcon className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="hebrew-title text-primary">הגדרות מערכת</h1>
                <p className="text-sm text-muted-foreground">ניהול נראות והתראות</p>
              </div>
            </div>

            <Button variant="outline" onClick={() => navigate('/complaints')} className="rounded-xl">
              <ChevronRight className="w-4 h-4 ml-2" />
              חזרה לרשימת הפניות
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Theme Section */}
          <Card className="card-elegant">
            <CardHeader>
              <CardTitle className="hebrew-subtitle flex items-center gap-2">
                <SunMedium className="w-5 h-5" />
                מצב תאורה
              </CardTitle>
              <CardDescription className="hebrew-body">
                בחרי/בחרי בין מצב בהיר למצב כהה לממשק המערכת
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between rounded-xl border border-border p-4">
                <div className="flex items-center gap-3">
                  {theme === 'dark' ? (
                    <Moon className="w-5 h-5" />
                  ) : (
                    <SunMedium className="w-5 h-5" />
                  )}
                  <div>
                    <div className="font-medium">מצב {theme === 'dark' ? 'כהה' : 'בהיר'}</div>
                    <p className="text-sm text-muted-foreground">ניתן להחליף בכל עת</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Label htmlFor="theme-switch">כהה</Label>
                  <Switch
                    id="theme-switch"
                    checked={theme === 'dark'}
                    onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notifications Section */}
          <Card className="card-elegant">
            <CardHeader>
              <CardTitle className="hebrew-subtitle flex items-center gap-2">
                <Bell className="w-5 h-5" />
                התראות לפי נושא
              </CardTitle>
              <CardDescription className="hebrew-body">
                הפעלת התראות ובחירת נושאים שברצונך לקבל עליהם התראות
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-xl border border-border p-4">
                  <div>
                    <div className="font-medium">הפעלת התראות</div>
                    <p className="text-sm text-muted-foreground">נשלח בקשת הרשאה מהדפדפן בעת שמירה</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Label htmlFor="notif-switch">מופעל</Label>
                    <Switch
                      id="notif-switch"
                      checked={notificationsEnabled}
                      onCheckedChange={setNotificationsEnabled}
                    />
                  </div>
                </div>

                <fieldset className="rounded-xl border border-border p-4" disabled={!notificationsEnabled}>
                  <legend className="px-2 text-sm text-muted-foreground">נושאים להתראה</legend>

                  <div className="flex items-center gap-2 mb-3">
                    <Checkbox
                      id="select-all"
                      checked={allSelected}
                      onCheckedChange={(v) => toggleAll(Boolean(v))}
                    />
                    <Label htmlFor="select-all" className="text-sm">בחר/י הכול</Label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {TOPICS.map((topic) => (
                      <label key={topic} className="flex items-center gap-2 rounded-lg border border-border p-3 cursor-pointer">
                        <Checkbox
                          checked={topics.includes(topic)}
                          onCheckedChange={() => toggleTopic(topic)}
                        />
                        <span className="text-sm">{topic}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                <div className="pt-2 flex justify-end">
                  <Button onClick={handleSave} className="rounded-xl">
                    <Save className="w-4 h-4 ml-2" />
                    שמירת הגדרות
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Settings;
