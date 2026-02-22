import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, Trash2, Loader2, AlertTriangle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/components/auth/AuthProvider';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { sanitizeEmail } from '@/utils/inputSanitization';

export const AdminDeleteUser = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [targetEmail, setTargetEmail] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [result, setResult] = useState<any>(null);

  // Check if current user is admin
  const { data: isAdmin } = useQuery({
    queryKey: ['user-admin-status', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();
      return !!data && !error;
    },
    enabled: !!user?.id,
  });

  if (!isAdmin) return null;

  const handleDelete = async () => {
    const sanitized = sanitizeEmail(targetEmail.trim());
    if (!sanitized) {
      toast({ title: 'Invalid email', variant: 'destructive' });
      return;
    }

    // Prevent deleting yourself
    if (sanitized === user?.email) {
      toast({ title: "You can't delete your own account from here", variant: 'destructive' });
      return;
    }

    setIsDeleting(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('admin-delete-user', {
        body: { user_email: sanitized },
      });

      if (error) throw error;

      setResult(data);
      setTargetEmail('');
      toast({
        title: 'User deleted',
        description: `Successfully deleted ${sanitized}`,
      });
    } catch (err: any) {
      console.error('Delete user error:', err);
      toast({
        title: 'Error deleting user',
        description: err.message || 'Something went wrong',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setShowConfirm(false);
    }
  };

  return (
    <>
      <Card className="border-red-200 bg-red-50/30">
        <CardHeader>
          <CardTitle className="flex items-center text-brand-charcoal">
            <Shield className="h-5 w-5 mr-2 text-red-600" />
            Admin: Delete User
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-amber-900">
              This will cancel their Stripe subscription (if VIP), delete all their data, and remove their account permanently.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="deleteEmail">User Email</Label>
            <Input
              id="deleteEmail"
              type="email"
              value={targetEmail}
              onChange={(e) => setTargetEmail(e.target.value)}
              placeholder="user@example.com"
            />
          </div>

          <Button
            variant="destructive"
            onClick={() => setShowConfirm(true)}
            disabled={!targetEmail.trim() || isDeleting}
            className="w-full"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete User
              </>
            )}
          </Button>

          {result && (
            <div className="mt-3 p-3 bg-muted rounded-lg text-xs font-mono space-y-1 max-h-48 overflow-y-auto">
              {result.steps?.map((step: string, i: number) => (
                <p key={i}>{step}</p>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete user permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{targetEmail}</strong>, cancel any Stripe subscriptions, and remove all their data. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Yes, delete permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
