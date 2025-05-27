
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heart, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Wishlist = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-brand-cream p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center space-x-4">
          <Button
            variant="outline"
            onClick={() => navigate('/')}
            className="border-brand-charcoal text-brand-charcoal hover:bg-brand-cream-light"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-brand-charcoal">
              <Heart className="h-5 w-5 mr-2" />
              Wishlist & Saved Ideas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <Heart className="h-16 w-16 text-brand-charcoal/30 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-brand-charcoal mb-2">
                Wishlist Coming Soon
              </h3>
              <p className="text-brand-charcoal/70">
                Save and organize your favorite gift ideas
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Wishlist;
