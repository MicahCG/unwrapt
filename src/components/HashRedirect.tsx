
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const HashRedirect = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Check if we're on a hash-based URL and redirect to clean URL
    if (window.location.hash) {
      const hash = window.location.hash.slice(1); // Remove the #
      const cleanPath = hash || '/';
      console.log('Redirecting from hash URL to:', cleanPath);
      navigate(cleanPath, { replace: true });
    }
  }, [navigate]);

  return null;
};

export default HashRedirect;
