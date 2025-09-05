import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, Home } from "lucide-react";

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted rtl">
      <Card className="card-elegant max-w-md">
        <CardContent className="text-center py-12">
          <AlertTriangle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="hebrew-title text-4xl mb-4">404</h1>
          <p className="hebrew-body text-xl text-muted-foreground mb-6">
            הדף שביקשתם לא נמצא
          </p>
          <Button 
            onClick={() => navigate("/")}
            className="bg-gradient-to-l from-primary to-primary-glow rounded-xl flex items-center gap-2"
          >
            <Home className="w-4 h-4" />
            חזרה לדף הבית
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotFound;
