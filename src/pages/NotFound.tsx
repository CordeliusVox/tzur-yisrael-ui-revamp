import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, Home, ArrowRight } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="page-container flex items-center justify-center p-4 rtl">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-destructive/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/3 right-1/3 w-48 h-48 bg-primary/10 rounded-full blur-3xl animate-pulse delay-700"></div>
      </div>

      <Card className="card-elegant max-w-md w-full animate-scale-in relative z-10">
        <CardContent className="text-center py-16 px-8">
          {/* Error Icon */}
          <div className="relative mb-8">
            <div className="absolute inset-0 bg-destructive/20 rounded-full blur-xl animate-glow"></div>
            <div className="relative bg-gradient-to-br from-destructive to-red-600 p-6 rounded-full shadow-elegant mx-auto w-fit">
              <AlertTriangle className="w-16 h-16 text-white" />
            </div>
          </div>

          {/* Error Content */}
          <div className="space-y-4 mb-8">
            <h1 className="hebrew-title text-6xl font-black bg-gradient-to-l from-destructive to-red-600 bg-clip-text text-transparent">
              404
            </h1>
            <h2 className="hebrew-subtitle text-2xl text-foreground">
              דף לא נמצא
            </h2>
            <p className="hebrew-body text-lg text-muted-foreground leading-relaxed">
              הדף שביקשתם לא קיים במערכת.<br />
              ייתכן שהקישור שגוי או שהדף הועבר למיקום אחר.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button 
              onClick={() => navigate("/")}
              className="w-full btn-school h-12 text-lg font-semibold gap-3 rounded-xl"
            >
              <Home className="w-5 h-5" />
              חזרה לדף הבית
              <ArrowRight className="w-4 h-4" />
            </Button>
            
            <Button 
              onClick={() => navigate(-1)}
              variant="outline"
              className="w-full btn-secondary h-12 text-lg gap-3 rounded-xl"
            >
              חזור לדף הקודם
            </Button>
          </div>

          {/* Help Text */}
          <div className="mt-8 pt-6 border-t border-border/50">
            <p className="text-xs text-muted-foreground hebrew-body">
              אם הבעיה נמשכת, אנא פנה למנהל המערכת
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotFound;