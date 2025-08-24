import React, { useState } from 'react';
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
  Clock,          // Added Clock import
  Download,
  Trash2,
  Phone,
  Mail,
  Lock
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';

const Settings = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  // Form states
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState('');
  
  // Notification preferences
  const [emailReminders, setEmailReminders] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(false);
  const [marketingEmails, setMarketingEmails] = useState(true);
  const [savingsAlerts, setSavingsAlerts] = useState(true);
  
  // Enhanced automation settings
  const [autoSendGifts, setAutoSendGifts] = useState(false); // Changed default to false
  const [dayBeforeNotifications, setDayBeforeNotifications] = useState(true); // Added
  const [notificationTime, setNotificationTime] = useState('morning'); // Added
  const [allowCancellation, setAllowCancellation] = useState(true); // Added
  const [leadTime, setLeadTime] = useState('3-days'); // Updated format

  const handleSaveProfile = () => {
    // TODO: Implement profile update
    toast({
      title: "Profile updated",
      description: "Your profile information has been saved.",
    });
  };

  const handlePasswordReset = () => {
    // TODO: Implement password reset
    toast({
      title: "Password reset email sent",
      description: "Check your email for password reset instructions.",
    });
  };

  const handleDeleteAccount = () => {
    // TODO: Implement account deletion
    toast({
      title: "Account deletion initiated",
      description: "Your account will be deleted within 24 hours.",
      variant: "destructive",
    });
  };

  const handleExportData = () => {
    // TODO: Implement data export
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
              <p className="text-sm text-brand-charcoal/60">For SMS notifications</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <Button onClick={handleSaveProfile} className="bg-brand-charcoal text-white hover:bg-brand-charcoal/90">
                Save Changes
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
                  <Phone className="h-4 w-4 text-brand-charcoal/60" />
                  <div>
                    <Label>SMS Alerts</Label>
                    <p className="text-sm text-brand-charcoal/60">Critical updates via text message</p>
                  </div>
                </div>
                <Switch checked={smsAlerts} onCheckedChange={setSmsAlerts} />
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

        {/* Enhanced Automation Section */}
        <Card className="border-brand-charcoal/10">
          <CardHeader>
            <CardTitle className="flex items-center text-brand-charcoal">
              <Zap className="h-5 w-5 mr-2" />
              Gift Automation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {/* Auto-Send Toggle */}
            <div className="flex items-center justify-between p-4 border border-brand-cream rounded-lg bg-brand-cream-light">
              <div>
                <Label className="text-brand-charcoal font-medium">Auto-send Gifts</Label>
                <p className="text-sm text-brand-charcoal/60">
                  Automatically send scheduled gifts without approval
                </p>
                {!autoSendGifts && (
                  <p className="text-xs text-amber-600 mt-1">
                    💡 Enable to experience true thoughtfulness automation
                  </p>
                )}
              </div>
              <Switch 
                checked={autoSendGifts} 
                onCheckedChange={setAutoSendGifts}
              />
            </div>

            {/* Day-Before Notifications */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Bell className="h-4 w-4 text-brand-charcoal/60" />
                  <div>
                    <Label>Day-Before Notifications</Label>
                    <p className="text-sm text-brand-charcoal/60">
                      Get notified 24 hours before gifts are sent
                    </p>
                  </div>
                </div>
                <Switch 
                  checked={dayBeforeNotifications} 
                  onCheckedChange={setDayBeforeNotifications} 
                />
              </div>

              {dayBeforeNotifications && (
                <div className="ml-7 space-y-3 p-3 bg-gray-50 rounded-lg">
                  <div className="space-y-2">
                    <Label className="text-sm">Notification Time</Label>
                    <Select value={notificationTime} onValueChange={setNotificationTime}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="morning">Morning (9 AM)</SelectItem>
                        <SelectItem value="afternoon">Afternoon (2 PM)</SelectItem>
                        <SelectItem value="evening">Evening (6 PM)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm">Allow Last-Minute Cancellation</Label>
                      <p className="text-xs text-brand-charcoal/60">
                        Option to cancel or modify gifts in notifications
                      </p>
                    </div>
                    <Switch 
                      checked={allowCancellation} 
                      onCheckedChange={setAllowCancellation} 
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Lead Time */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-brand-charcoal/60" />
                <Label>Default Lead Time</Label>
              </div>
              <Select value={leadTime} onValueChange={setLeadTime}>
                <SelectTrigger>
                  <SelectValue placeholder="Select lead time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1-week">1 week before</SelectItem>
                  <SelectItem value="5-days">5 days before</SelectItem>
                  <SelectItem value="3-days">3 days before (recommended)</SelectItem>
                  <SelectItem value="2-days">2 days before</SelectItem>
                  <SelectItem value="1-day">1 day before</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-brand-charcoal/60">
                How early to order gifts before the occasion
              </p>
            </div>

            {/* Safety Features */}
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <Shield className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-green-800">Your Safety Net</h4>
                  <ul className="text-sm text-green-700 mt-1 space-y-1">
                    <li>• Always get 24-hour advance notice</li>
                    <li>• Cancel or modify gifts anytime</li>
                    <li>• Review and approve before first auto-send</li>
                    <li>• Change automation settings per recipient</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Automation Status */}
            <div className="text-center p-3 border rounded-lg">
              {autoSendGifts ? (
                <div className="text-green-600">
                  <Zap className="h-5 w-5 mx-auto mb-1" />
                  <p className="font-medium">Automation Active</p>
                  <p className="text-sm">Your thoughtfulness is on autopilot ✨</p>
                </div>
              ) : (
                <div className="text-amber-600">
                  <Bell className="h-5 w-5 mx-auto mb-1" />
                  <p className="font-medium">Manual Approval Mode</p>
                  <p className="text-sm">We'll ask before sending each gift</p>
                </div>
              )}
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