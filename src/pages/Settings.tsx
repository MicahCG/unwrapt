
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
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
  CreditCard, 
  Shield,
  Download,
  Trash2,
  Phone,
  Mail,
  Lock,
  Plus,
  Edit,
  Receipt
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
  
  // Automation settings
  const [autoSendGifts, setAutoSendGifts] = useState(true);
  const [leadTime, setLeadTime] = useState('5');
  
  // Payment settings
  const [spendingLimit, setSpendingLimit] = useState([75]);

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

        {/* Automation Section */}
        <Card className="border-brand-charcoal/10">
          <CardHeader>
            <CardTitle className="flex items-center text-brand-charcoal">
              <Zap className="h-5 w-5 mr-2" />
              Automation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Auto-send Gifts</Label>
                <p className="text-sm text-brand-charcoal/60">Automatically send scheduled gifts</p>
              </div>
              <Switch checked={autoSendGifts} onCheckedChange={setAutoSendGifts} />
            </div>

            <div className="space-y-3">
              <Label>Lead Time</Label>
              <Select value={leadTime} onValueChange={setLeadTime}>
                <SelectTrigger>
                  <SelectValue placeholder="Select lead time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 days before occasion</SelectItem>
                  <SelectItem value="5">5 days before occasion</SelectItem>
                  <SelectItem value="7">7 days before occasion</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-brand-charcoal/60">How many days before the occasion should gifts be sent?</p>
            </div>
          </CardContent>
        </Card>

        {/* Payment Section */}
        <Card className="border-brand-charcoal/10">
          <CardHeader>
            <CardTitle className="flex items-center text-brand-charcoal">
              <CreditCard className="h-5 w-5 mr-2" />
              Payment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Payment Methods</Label>
                <Button size="sm" variant="outline" className="border-brand-charcoal/20">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Card
                </Button>
              </div>
              <div className="p-3 border border-brand-charcoal/10 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-5 bg-gradient-to-r from-blue-600 to-blue-400 rounded"></div>
                    <div>
                      <p className="font-medium">•••• •••• •••• 4242</p>
                      <p className="text-sm text-brand-charcoal/60">Expires 12/25</p>
                    </div>
                  </div>
                  <Button size="sm" variant="ghost">
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Transaction History</Label>
                <Button size="sm" variant="outline" className="border-brand-charcoal/20">
                  <Receipt className="h-4 w-4 mr-2" />
                  View Receipts
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <Label>Spending Limit per Gift</Label>
              <div className="px-3">
                <Slider
                  value={spendingLimit}
                  onValueChange={setSpendingLimit}
                  max={200}
                  min={15}
                  step={5}
                  className="w-full"
                />
                <div className="flex justify-between text-sm text-brand-charcoal/60 mt-2">
                  <span>$15</span>
                  <span className="font-medium">${spendingLimit[0]}</span>
                  <span>$200+</span>
                </div>
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
