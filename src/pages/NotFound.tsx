
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  const handleGoHome = () => {
    console.log('🔧 NotFound: Navigating to home');
    navigate('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-cream">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4 text-brand-charcoal">404</h1>
        <p className="text-xl text-brand-charcoal/70 mb-4">Oops! Page not found</p>
        <Button 
          onClick={handleGoHome}
          className="bg-brand-charcoal text-brand-cream hover:bg-brand-charcoal/90"
        >
          <Home className="h-4 w-4 mr-2" />
          Return to Home
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
