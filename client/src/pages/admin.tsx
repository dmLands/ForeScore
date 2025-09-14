import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, Users, Copy, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface UserData {
  'First Name': string;
  'Last Name': string;
  'Email Address': string;
  'Auth Method': string;
  'Created At': string;
}

interface ExportResponse {
  success: boolean;
  count: number;
  users: UserData[];
  exportedAt: string;
}

export default function AdminPage() {
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch user data
  const { data: exportData, isLoading, error } = useQuery<ExportResponse>({
    queryKey: ['/api/admin/export-users'],
    retry: 1,
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

  if (isLoading) {
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

        {/* Instructions Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Export Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <h4 className="font-semibold">Method 1: Download CSV File</h4>
                <p className="text-sm text-gray-600">Click the "Download CSV" button above to download a spreadsheet file</p>
              </div>
              
              <div>
                <h4 className="font-semibold">Method 2: Direct API Access</h4>
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">Access these endpoints while logged in:</p>
                  <div className="bg-gray-100 p-3 rounded-md space-y-1">
                    <p className="font-mono text-sm">
                      <strong>JSON:</strong> 
                      <button 
                        onClick={() => copyToClipboard(`${window.location.origin}/api/admin/export-users`, 'JSON URL')}
                        className="ml-2 text-blue-600 hover:underline"
                      >
                        {window.location.origin}/api/admin/export-users
                        {copySuccess === 'JSON URL' ? ' ✓' : ' 📋'}
                      </button>
                    </p>
                    <p className="font-mono text-sm">
                      <strong>CSV:</strong> 
                      <button 
                        onClick={() => copyToClipboard(`${window.location.origin}/api/admin/export-users?format=csv`, 'CSV URL')}
                        className="ml-2 text-blue-600 hover:underline"
                      >
                        {window.location.origin}/api/admin/export-users?format=csv
                        {copySuccess === 'CSV URL' ? ' ✓' : ' 📋'}
                      </button>
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold">Method 3: Copy from Table</h4>
                <p className="text-sm text-gray-600">Use "Copy All Emails" button or select/copy individual data from the table below</p>
              </div>
            </div>
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