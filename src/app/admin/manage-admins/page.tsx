"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { CheckCircle2, Circle, Loader, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function ManageAdminsPage() {
  const { user, role, isLoaded } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isLoaded) return;
    if (!user || role !== 'admin') {
      router.push('/login');
      return;
    }
    fetchUsers();
  }, [isLoaded, user, role, router]);

  const fetchUsers = async () => {
    try {
      const { data } = await supabase
        .from('users')
        .select('id, email, role, created_at')
        .order('created_at', { ascending: false });

      if (data) {
        setUsers(data);
      }
    } catch (err) {
      setError('Failed to fetch users');
      console.error(err);
    }
    setLoading(false);
  };

  const toggleAdminRole = async (userId: string, currentRole: string) => {
    setSaving(true);
    try {
      const newRole = currentRole === 'admin' ? 'participant' : 'admin';
      const { error: updateError } = await supabase
        .from('users')
        .update({ role: newRole })
        .eq('id', userId);

      if (updateError) throw updateError;

      // Update local state
      setUsers(users.map(u =>
        u.id === userId ? { ...u, role: newRole } : u
      ));
    } catch (err) {
      setError('Failed to update user role');
      console.error(err);
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center py-12 text-slate-400">Loading users...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Manage Admin Access</h1>
        <p className="text-slate-400">Grant or revoke admin privileges to users.</p>
      </header>

      {error && (
        <div className="mb-6 p-4 bg-red-500/20 border border-red-500 text-red-100 rounded flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">User Roles</CardTitle>
          <CardDescription className="text-slate-400">
            {users.length} total users
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {users.length === 0 ? (
              <div className="text-center py-8 text-slate-500">No users found.</div>
            ) : (
              users.map((usr) => (
                <div
                  key={usr.id}
                  className="flex items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-lg hover:border-slate-700 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-200 font-medium truncate">{usr.email}</p>
                    <p className="text-xs text-slate-500 mt-1">ID: {usr.id.substring(0, 12)}...</p>
                  </div>

                  <div className="flex items-center gap-3">
                    {usr.role === 'admin' ? (
                      <Badge className="bg-rose-500/20 text-rose-400">ADMIN</Badge>
                    ) : (
                      <Badge className="bg-slate-800 text-slate-400">PARTICIPANT</Badge>
                    )}

                    <button
                      onClick={() => toggleAdminRole(usr.id, usr.role)}
                      disabled={saving}
                      className="hover:opacity-70 transition-opacity disabled:opacity-50"
                    >
                      {usr.role === 'admin' ? (
                        <CheckCircle2 className="w-6 h-6 text-rose-500" />
                      ) : (
                        <Circle className="w-6 h-6 text-slate-600 hover:text-slate-400" />
                      )}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 p-4 bg-slate-900/50 border border-slate-800 rounded-lg">
        <h3 className="text-sm font-bold text-slate-400 mb-2">Instructions:</h3>
        <ul className="text-xs text-slate-500 space-y-1">
          <li>• Click the circle icon to make a user an admin</li>
          <li>• Click the checkmark to revoke admin privileges</li>
          <li>• Changes take effect immediately</li>
        </ul>
      </div>
    </div>
  );
}
