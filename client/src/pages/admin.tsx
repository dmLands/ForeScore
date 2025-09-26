import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Download, Users, Copy, CheckCircle, Shield, AlertTriangle, Search, Clock, Plus, Trash2, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface UserData {
  'First Name': string;
  'Last Name': string;
  'Email Address': string;
  'Auth Method': string;
  'Marketing Preference Status': string;
  'Subscription Status': string;
  'Created At': string;
}

interface ExportResponse {
  success: boolean;
  count: number;
  users: UserData[];
  exportedAt: string;
}

interface SearchUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  hasManualTrial: boolean;
  manualTrialEndsAt?: string;
}

interface ActiveTrial {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  manualTrialGrantedAt: string;
  manualTrialEndsAt: string;
  manualTrialDays: number;
  manualTrialReason: string;
  daysRemaining: number;
}

export default function AdminPage() {
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<SearchUser | null>(null);
  const [trialDays, setTrialDays] = useState(10);
  const [trialReason, setTrialReason] = useState('');
  const [extendDays, setExtendDays] = useState(7);
  const [extendReason, setExtendReason] = useState('');
  const [isGrantDialogOpen, setIsGrantDialogOpen] = useState(false);
  const [isExtendDialogOpen, setIsExtendDialogOpen] = useState(false);
  const { toast } = useToast();
  const { isAuthenticated, isLoading, isAdmin } = useAuth();

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show unauthorized message if user is not authenticated or not admin
  if (!isAuthenticated || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <Shield className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle className="text-xl font-semibold text-gray-900">
              Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <div className="mb-4">
              <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
              <p className="text-gray-600 mb-4">
                You don't have permission to access this admin panel. 
                Only authorized administrators can view this page.
              </p>
            </div>
            <Button 
              onClick={() => window.history.back()} 
              variant="outline"
              className="w-full"
              data-testid="button-go-back"
            >
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fetch user data
  const { data: exportData, isLoading: dataLoading, error } = useQuery<ExportResponse>({
    queryKey: ['/api/admin/export-users'],
    retry: 1,
  });

  // Fetch search results
  const { data: searchResults, isLoading: searchLoading } = useQuery<{success: boolean; users: SearchUser[]}>({
    queryKey: ['/api/admin/users/search', searchTerm],
    enabled: searchTerm.length > 0,
    retry: 1,
  });

  // Fetch active manual trials
  const { data: activeTrials, isLoading: trialsLoading } = useQuery<{success: boolean; trials: ActiveTrial[]}>({
    queryKey: ['/api/admin/manual-trials'],
    retry: 1,
  });

  // Grant manual trial mutation
  const grantTrialMutation = useMutation({
    mutationFn: async (data: { userId: string; days: number; reason: string }) => {
      const response = await fetch('/api/admin/grant-manual-trial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include'
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to grant trial');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/manual-trials'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users/search'] });
      toast({ title: "Success", description: "Manual trial granted successfully" });
      setIsGrantDialogOpen(false);
      setSelectedUser(null);
      setTrialReason('');
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to grant trial", variant: "destructive" });
    }
  });

  // Extend trial mutation
  const extendTrialMutation = useMutation({
    mutationFn: async (data: { userId: string; additionalDays: number; reason: string }) => {
      const response = await fetch(`/api/admin/extend-manual-trial/${data.userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ additionalDays: data.additionalDays, reason: data.reason }),
        credentials: 'include'
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to extend trial');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/manual-trials'] });
      toast({ title: "Success", description: "Manual trial extended successfully" });
      setIsExtendDialogOpen(false);
      setSelectedUser(null);
      setExtendReason('');
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to extend trial", variant: "destructive" });
    }
  });

  // Revoke trial mutation
  const revokeTrialMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(`/api/admin/revoke-manual-trial/${userId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to revoke trial');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/manual-trials'] });
      toast({ title: "Success", description: "Manual trial revoked successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to revoke trial", variant: "destructive" });
    }
  });

  const handleDownloadCSV = () => {
    // Open CSV download endpoint in new window
    const csvUrl = '/api/admin/export-users?format=csv';
    window.open(csvUrl, '_blank');
    toast({
      title: "Download Started",
      description: "CSV file download should begin automatically"
    });
  };

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(type);
      toast({
        title: "Copied to Clipboard",
        description: `${type} copied successfully`
      });
      setTimeout(() => setCopySuccess(null), 2000);
    } catch (err) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy to clipboard",
        variant: "destructive"
      });
    }
  };

  const copyAllEmails = async () => {
    if (!exportData?.users) return;
    const emails = exportData.users.map(user => user['Email Address']).join(', ');
    await copyToClipboard(emails, 'All Emails');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading user data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <p className="text-red-600 mb-4">Failed to load user data</p>
            <p className="text-sm text-gray-500">You might not have admin access</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-6 w-6" />
              ForeScore Admin - User Accounts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div>
                <p className="text-lg font-semibold">
                  Total Users: <Badge variant="secondary">{exportData?.count || 0}</Badge>
                </p>
                <p className="text-sm text-gray-600">
                  Data exported at: {exportData?.exportedAt ? formatDate(exportData.exportedAt) : 'N/A'}
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2">
                <Button 
                  onClick={copyAllEmails}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                  data-testid="button-copy-emails"
                >
                  {copySuccess === 'All Emails' ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  Copy All Emails
                </Button>
                
                <Button 
                  onClick={handleDownloadCSV}
                  className="flex items-center gap-2"
                  data-testid="button-download-csv"
                >
                  <Download className="h-4 w-4" />
                  Download CSV
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Manual Trial Management */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-6 w-6" />
              Manual Trial Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* User Search */}
              <div>
                <Label htmlFor="user-search" className="text-sm font-medium mb-2 block">Search Users</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="user-search"
                      placeholder="Search by email or name..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                      data-testid="input-user-search"
                    />
                  </div>
                </div>
                
                {/* Search Results */}
                {searchTerm && (
                  <div className="mt-3">
                    {searchLoading ? (
                      <p className="text-sm text-gray-500">Searching...</p>
                    ) : searchResults?.users?.length ? (
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Found {searchResults.users.length} users:</p>
                        <div className="grid gap-2 max-h-60 overflow-y-auto">
                          {searchResults.users.map((user) => (
                            <div 
                              key={user.id} 
                              className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                              data-testid={`search-result-${user.id}`}
                            >
                              <div>
                                <p className="font-medium">{user.fullName || 'No name'}</p>
                                <p className="text-sm text-gray-600">{user.email}</p>
                                {user.hasManualTrial && (
                                  <Badge variant="secondary" className="text-xs mt-1">
                                    Has Manual Trial
                                  </Badge>
                                )}
                              </div>
                              <Dialog open={isGrantDialogOpen && selectedUser?.id === user.id} onOpenChange={(open) => {
                                setIsGrantDialogOpen(open);
                                if (!open) setSelectedUser(null);
                              }}>
                                <DialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={user.hasManualTrial}
                                    onClick={() => setSelectedUser(user)}
                                    data-testid={`button-grant-trial-${user.id}`}
                                  >
                                    <Plus className="h-4 w-4 mr-1" />
                                    Grant Trial
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Grant Manual Trial</DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <div>
                                      <p className="text-sm"><strong>User:</strong> {user.fullName} ({user.email})</p>
                                    </div>
                                    <div>
                                      <Label htmlFor="trial-days">Trial Duration (days)</Label>
                                      <Input
                                        id="trial-days"
                                        type="number"
                                        min="1"
                                        max="365"
                                        value={trialDays}
                                        onChange={(e) => setTrialDays(parseInt(e.target.value) || 10)}
                                        data-testid="input-trial-days"
                                      />
                                    </div>
                                    <div>
                                      <Label htmlFor="trial-reason">Reason</Label>
                                      <Textarea
                                        id="trial-reason"
                                        placeholder="Why is this manual trial being granted?"
                                        value={trialReason}
                                        onChange={(e) => setTrialReason(e.target.value)}
                                        required
                                        data-testid="textarea-trial-reason"
                                      />
                                    </div>
                                    <div className="flex gap-2 justify-end">
                                      <Button 
                                        variant="outline" 
                                        onClick={() => {
                                          setIsGrantDialogOpen(false);
                                          setSelectedUser(null);
                                          setTrialReason('');
                                        }}
                                        data-testid="button-cancel-grant"
                                      >
                                        Cancel
                                      </Button>
                                      <Button
                                        onClick={() => {
                                          if (!trialReason.trim()) {
                                            toast({ title: "Error", description: "Reason is required", variant: "destructive" });
                                            return;
                                          }
                                          grantTrialMutation.mutate({
                                            userId: user.id,
                                            days: trialDays,
                                            reason: trialReason
                                          });
                                        }}
                                        disabled={grantTrialMutation.isPending || !trialReason.trim()}
                                        data-testid="button-confirm-grant"
                                      >
                                        {grantTrialMutation.isPending ? 'Granting...' : 'Grant Trial'}
                                      </Button>
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No users found matching "{searchTerm}"</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Manual Trials */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-6 w-6" />
              Active Manual Trials ({activeTrials?.trials?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {trialsLoading ? (
              <p className="text-center text-gray-500">Loading active trials...</p>
            ) : activeTrials?.trials?.length ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Granted</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead>Days Remaining</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeTrials.trials.map((trial) => (
                      <TableRow key={trial.id} data-testid={`row-trial-${trial.id}`}>
                        <TableCell className="font-medium">{trial.fullName || 'No name'}</TableCell>
                        <TableCell className="font-mono text-sm">{trial.email}</TableCell>
                        <TableCell className="text-sm">
                          {formatDate(trial.manualTrialGrantedAt)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDate(trial.manualTrialEndsAt)}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={trial.daysRemaining > 3 ? 'default' : trial.daysRemaining > 0 ? 'secondary' : 'destructive'}
                            className="text-xs"
                          >
                            {trial.daysRemaining} days
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm max-w-xs truncate" title={trial.manualTrialReason}>
                          {trial.manualTrialReason}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Dialog open={isExtendDialogOpen && selectedUser?.id === trial.id} onOpenChange={(open) => {
                              setIsExtendDialogOpen(open);
                              if (!open) setSelectedUser(null);
                            }}>
                              <DialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setSelectedUser(trial as any)}
                                  data-testid={`button-extend-trial-${trial.id}`}
                                >
                                  <Calendar className="h-4 w-4 mr-1" />
                                  Extend
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Extend Manual Trial</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <p className="text-sm"><strong>User:</strong> {trial.fullName} ({trial.email})</p>
                                    <p className="text-sm"><strong>Current Expiry:</strong> {formatDate(trial.manualTrialEndsAt)}</p>
                                  </div>
                                  <div>
                                    <Label htmlFor="extend-days">Additional Days</Label>
                                    <Input
                                      id="extend-days"
                                      type="number"
                                      min="1"
                                      max="365"
                                      value={extendDays}
                                      onChange={(e) => setExtendDays(parseInt(e.target.value) || 7)}
                                      data-testid="input-extend-days"
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor="extend-reason">Reason for Extension</Label>
                                    <Textarea
                                      id="extend-reason"
                                      placeholder="Why is this trial being extended?"
                                      value={extendReason}
                                      onChange={(e) => setExtendReason(e.target.value)}
                                      required
                                      data-testid="textarea-extend-reason"
                                    />
                                  </div>
                                  <div className="flex gap-2 justify-end">
                                    <Button 
                                      variant="outline" 
                                      onClick={() => {
                                        setIsExtendDialogOpen(false);
                                        setSelectedUser(null);
                                        setExtendReason('');
                                      }}
                                      data-testid="button-cancel-extend"
                                    >
                                      Cancel
                                    </Button>
                                    <Button
                                      onClick={() => {
                                        if (!extendReason.trim()) {
                                          toast({ title: "Error", description: "Reason is required", variant: "destructive" });
                                          return;
                                        }
                                        extendTrialMutation.mutate({
                                          userId: trial.id,
                                          additionalDays: extendDays,
                                          reason: extendReason
                                        });
                                      }}
                                      disabled={extendTrialMutation.isPending || !extendReason.trim()}
                                      data-testid="button-confirm-extend"
                                    >
                                      {extendTrialMutation.isPending ? 'Extending...' : 'Extend Trial'}
                                    </Button>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                if (confirm(`Are you sure you want to revoke the manual trial for ${trial.fullName}?`)) {
                                  revokeTrialMutation.mutate(trial.id);
                                }
                              }}
                              disabled={revokeTrialMutation.isPending}
                              data-testid={`button-revoke-trial-${trial.id}`}
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Revoke
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-center text-gray-500 py-4">No active manual trials</p>
            )}
          </CardContent>
        </Card>

        {/* User Table */}
        <Card>
          <CardHeader>
            <CardTitle>All User Accounts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>First Name</TableHead>
                    <TableHead>Last Name</TableHead>
                    <TableHead>Email Address</TableHead>
                    <TableHead>Auth Method</TableHead>
                    <TableHead>Marketing Status</TableHead>
                    <TableHead>Subscription Status</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exportData?.users?.map((user, index) => (
                    <TableRow key={index} data-testid={`row-user-${index}`}>
                      <TableCell className="font-medium">{user['First Name'] || '-'}</TableCell>
                      <TableCell>{user['Last Name'] || '-'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm">{user['Email Address']}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(user['Email Address'], `Email ${index + 1}`)}
                            className="h-6 w-6 p-0"
                            data-testid={`button-copy-email-${index}`}
                          >
                            {copySuccess === `Email ${index + 1}` ? (
                              <CheckCircle className="h-3 w-3" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user['Auth Method'] === 'local' ? 'default' : 'secondary'}>
                          {user['Auth Method']}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            user['Marketing Preference Status'] === 'subscribed' ? 'default' :
                            user['Marketing Preference Status'] === 'unsubscribed' ? 'destructive' :
                            'outline'
                          }
                          className={`text-xs ${
                            user['Marketing Preference Status'] === 'subscribed' ? 'bg-green-100 text-green-800' :
                            user['Marketing Preference Status'] === 'unsubscribed' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}
                          data-testid={`badge-marketing-${index}`}
                        >
                          {user['Marketing Preference Status'] === 'subscribed' ? 'Subscribed' :
                           user['Marketing Preference Status'] === 'unsubscribed' ? 'Unsubscribed' :
                           'Pending'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            user['Subscription Status'].includes('Active') ? 'default' :
                            user['Subscription Status'].includes('Trial') ? 'secondary' :
                            user['Subscription Status'].includes('Expired') || user['Subscription Status'].includes('Past Due') ? 'destructive' :
                            'outline'
                          }
                          className={`text-xs ${
                            user['Subscription Status'].includes('Active') ? 'bg-green-100 text-green-800' :
                            user['Subscription Status'].includes('Trial') ? 'bg-blue-100 text-blue-800' :
                            user['Subscription Status'].includes('Expired') || user['Subscription Status'].includes('Past Due') ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}
                          data-testid={`badge-subscription-${index}`}
                        >
                          {user['Subscription Status']}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {formatDate(user['Created At'])}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(
                            `${user['First Name']} ${user['Last Name']}, ${user['Email Address']}`,
                            `User ${index + 1}`
                          )}
                          className="text-xs"
                          data-testid={`button-copy-user-${index}`}
                        >
                          Copy
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Back Navigation */}
        <div className="mt-6 text-center">
          <Button 
            variant="outline" 
            onClick={() => window.history.back()}
            data-testid="button-back"
          >
            ← Back to App
          </Button>
        </div>
      </div>
    </div>
  );
}