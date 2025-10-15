import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "next-themes";
import { ArrowLeft, Settings as SettingsIcon, Moon, SunMedium } from "lucide-react";


const Settings = () => {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();


// SEO: title, meta description, canonical
useEffect(() => {
  const title = "הגדרות מערכת – מצב תאורה | מערכת פניות";
  const description = "ניהול מצב תאורה (בהיר/כהה) למערכת ניהול הפניות.";
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



  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted rtl">
      <header className="bg-background/80 backdrop-blur-sm border-b border-border sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-glow rounded-lg flex items-center justify-center">
                <SettingsIcon className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="hebrew-title text-primary">הגדרות</h1>
                <p className="text-sm text-muted-foreground">ניהול מערכת</p>
              </div>
            </div>

            <Button variant="outline" onClick={() => navigate('/complaints')} className="rounded-xl">
              <ArrowLeft className="w-4 h-4 ml-2" />
              חזרה לתלונות
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
                בחר בין מצב בהיר למצב כהה לממשק המערכת
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
        </div>
      </main>
    </div>
  );
};

export default Settings;
