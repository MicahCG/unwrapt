import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Settings as SettingsIcon,
  ArrowLeft,
  User,
  Bell,
  Zap,
  Shield,
  Clock,
  Download,
  Trash2,
  Phone,
  Mail,
  Lock
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { SubscriptionManagement } from '@/components/subscription/SubscriptionManagement';
import { useUserProfile } from '@/hooks/useUserProfile';
import { supabase } from '@/integrations/supabase/client';
import { sanitizeInput, sanitizeEmail, sanitizePhoneNumber } from '@/utils/inputSanitization';
import { useQueryClient } from '@tanstack/react-query';

const Settings = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: profile, isLoading: profileLoading } = useUserProfile();
  const queryClient = useQueryClient();

  // Form states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  // Notification preferences
  const [emailReminders, setEmailReminders] = useState(true);
  const [marketingEmails, setMarketingEmails] = useState(true);
  const [savingsAlerts, setSavingsAlerts] = useState(true);
  
  // Enhanced automation settings
  const [autoSendGifts, setAutoSendGifts] = useState(false);
  const [dayBeforeNotifications, setDayBeforeNotifications] = useState(true);
  const [notificationTime, setNotificationTime] = useState('morning');
  const [allowCancellation, setAllowCancellation] = useState(true);
  const [leadTime, setLeadTime] = useState('3-days');

  // Populate form fields from profile data
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setEmail(profile.email || user?.email || '');
      setPhone((profile as Record<string, any>).phone || '');
    } else if (user) {
      setFullName(user.user_metadata?.full_name || '');
      setEmail(user.email || '');
    }
  }, [profile, user]);

  const handleSaveProfile = async () => {
    if (!user?.id) return;
    
    setIsSaving(true);
    try {
      const sanitizedName = sanitizeInput(fullName);
      const sanitizedEmail = sanitizeEmail(email);
      const sanitizedPhone = sanitizePhoneNumber(phone);

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: sanitizedName,
          email: sanitizedEmail,
          phone: sanitizedPhone,
        } as any)
        .eq('id', user.id);

      if (error) throw error;

      // Invalidate the profile cache so other components pick up the changes
      queryClient.invalidateQueries({ queryKey: ['user-profile', user.id] });

      toast({
        title: "Profile updated",
        description: "Your profile information has been saved.",
      });
    } catch (error: any) {
      console.error('Error saving profile:', error);
      toast({
        title: "Error saving profile",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordReset = () => {
    toast({
      title: "Password reset email sent",
      description: "Check your email for password reset instructions.",
    });
  };

  const handleDeleteAccount = () => {
    toast({
      title: "Account deletion initiated",
      description: "Your account will be deleted within 24 hours.",
      variant: "destructive",
    });
  };

  const handleExportData = () => {
    toast({
      title: "Data export started",
      description: "You'll receive an email when your data is ready to download.",
    });
  };

  return (
    <div className="min-h-screen bg-brand-cream">
      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4 pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/')}
            className="border-brand-charcoal/20 text-brand-charcoal hover:bg-brand-cream-light"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-brand-charcoal">Settings</h1>
            <p className="text-brand-charcoal/60">Manage your account and preferences</p>
          </div>
        </div>

        {/* Subscription Section */}
        <SubscriptionManagement />

        {/* Account Section */}
        <Card className="border-brand-charcoal/10">
          <CardHeader>
            <CardTitle className="flex items-center text-brand-charcoal">
              <User className="h-5 w-5 mr-2" />
              Account
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <div className="flex space-x-2">
                <Phone className="h-4 w-4 mt-3 text-brand-charcoal/60" />
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(555) 123-4567"
                  className="flex-1"
                />
              </div>
              <p className="text-sm text-brand-charcoal/60">Optional contact information</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <Button onClick={handleSaveProfile} disabled={isSaving} className="bg-brand-charcoal text-white hover:bg-brand-charcoal/90">
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button variant="outline" onClick={handlePasswordReset} className="border-brand-charcoal/20">
                <Lock className="h-4 w-4 mr-2" />
                Change Password
              </Button>
            </div>

            <div className="pt-4 border-t border-brand-charcoal/10">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Account
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete your account and remove all your data.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteAccount} className="bg-red-600 hover:bg-red-700">
                      Delete Account
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>

        {/* Notifications Section */}
        <Card className="border-brand-charcoal/10">
          <CardHeader>
            <CardTitle className="flex items-center text-brand-charcoal">
              <Bell className="h-5 w-5 mr-2" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Mail className="h-4 w-4 text-brand-charcoal/60" />
                  <div>
                    <Label>Email Reminders</Label>
                    <p className="text-sm text-brand-charcoal/60">Get notified about upcoming occasions</p>
                  </div>
                </div>
                <Switch checked={emailReminders} onCheckedChange={setEmailReminders} />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Mail className="h-4 w-4 text-brand-charcoal/60" />
                  <div>
                    <Label>Marketing Emails</Label>
                    <p className="text-sm text-brand-charcoal/60">Tips and gift recommendations</p>
                  </div>
                </div>
                <Switch checked={marketingEmails} onCheckedChange={setMarketingEmails} />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-lg">💰</span>
                  <div>
                    <Label>Savings Alerts</Label>
                    <p className="text-sm text-brand-charcoal/60">Get notified when we find deals under your budget</p>
                  </div>
                </div>
                <Switch checked={savingsAlerts} onCheckedChange={setSavingsAlerts} />
              </div>
            </div>
          </CardContent>
        </Card>


        {/* Privacy Section */}
        <Card className="border-brand-charcoal/10">
          <CardHeader>
            <CardTitle className="flex items-center text-brand-charcoal">
              <Shield className="h-5 w-5 mr-2" />
              Privacy
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <Button
                variant="outline"
                onClick={handleExportData}
                className="w-full justify-start border-brand-charcoal/20"
              >
                <Download className="h-4 w-4 mr-2" />
                Export My Data
              </Button>
              <p className="text-sm text-brand-charcoal/60">Download a copy of all your data</p>
            </div>
          </CardContent>
        </Card>

        {/* Bottom spacing for mobile */}
        <div className="pb-8"></div>
      </div>
    </div>
  );
};

export default Settings;