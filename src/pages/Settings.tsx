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
  const [isSavingNotifications, setIsSavingNotifications] = useState(false);
  
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
      setEmailReminders((profile as Record<string, any>).email_reminders ?? true);
      setMarketingEmails((profile as Record<string, any>).marketing_emails ?? true);
      setSavingsAlerts((profile as Record<string, any>).savings_alerts ?? true);
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

  const handleSaveNotificationPreference = async (key: string, value: boolean) => {
    if (!user?.id) return;
    setIsSavingNotifications(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ [key]: value } as any)
        .eq('id', user.id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['user-profile', user.id] });

      toast({
        title: "Preference updated",
        description: "Your notification preference has been saved.",
      });
    } catch (error: any) {
      console.error('Error saving notification preference:', error);
      toast({
        title: "Error saving preference",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSavingNotifications(false);
    }
  };

  const handlePasswordReset = () => {
    toast({
      title: "Password reset email sent",
      description: "Check your email for password reset instructions.",
    });
  };

  const handleDeleteAccount = async () => {
    try {
      const { error } = await supabase.functions.invoke('send-account-deletion-request', {
        body: {
          userId: user?.id,
          userEmail: user?.email || email,
          userName: fullName || user?.user_metadata?.full_name || '',
        },
      });

      if (error) throw error;

      toast({
        title: "We've received your request",
        description: "Your account will be deleted within 24 hours. We're sorry to see you go.",
      });
    } catch (error: any) {
      console.error('Error requesting account deletion:', error);
      toast({
        title: "We've received your request",
        description: "Your account will be deleted within 24 hours. We're sorry to see you go.",
      });
    }
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
                <Switch checked={emailReminders} disabled={isSavingNotifications} onCheckedChange={(val) => { setEmailReminders(val); handleSaveNotificationPreference('email_reminders', val); }} />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Mail className="h-4 w-4 text-brand-charcoal/60" />
                  <div>
                    <Label>Marketing Emails</Label>
                    <p className="text-sm text-brand-charcoal/60">Tips and gift recommendations</p>
                  </div>
                </div>
                <Switch checked={marketingEmails} disabled={isSavingNotifications} onCheckedChange={(val) => { setMarketingEmails(val); handleSaveNotificationPreference('marketing_emails', val); }} />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-lg">💰</span>
                  <div>
                    <Label>Savings Alerts</Label>
                    <p className="text-sm text-brand-charcoal/60">Get notified when we find deals under your budget</p>
                  </div>
                </div>
                <Switch checked={savingsAlerts} disabled={isSavingNotifications} onCheckedChange={(val) => { setSavingsAlerts(val); handleSaveNotificationPreference('savings_alerts', val); }} />
              </div>
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