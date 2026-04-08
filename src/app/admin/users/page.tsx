"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function AdminUsers() {
  return (
    <div className="p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Participant Roster</h1>
        <p className="text-slate-400">View all registered users and their current tournament statistics.</p>
      </header>

      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">Active Players</CardTitle>
          <CardDescription className="text-slate-400">List of players currently synced via Clerk and Supabase.</CardDescription>
        </CardHeader>
        <CardContent>
           <Table>
             <TableHeader className="border-slate-800">
               <TableRow className="border-slate-800 hover:bg-slate-800/50">
                 <TableHead className="text-slate-400">User ID</TableHead>
                 <TableHead className="text-slate-400">Global Score</TableHead>
                 <TableHead className="text-slate-400">Bids Won</TableHead>
                 <TableHead className="text-slate-400">Status</TableHead>
               </TableRow>
             </TableHeader>
             <TableBody>
               <TableRow className="border-slate-800 hover:bg-slate-800/50">
                 <TableCell className="font-medium text-white">usx_1A9Z...</TableCell>
                 <TableCell className="text-cyan-400">142</TableCell>
                 <TableCell className="text-slate-300">12</TableCell>
                 <TableCell><Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/50">Online</Badge></TableCell>
               </TableRow>
               <TableRow className="border-slate-800 hover:bg-slate-800/50">
                 <TableCell className="font-medium text-white">usx_9B2C...</TableCell>
                 <TableCell className="text-cyan-400">95</TableCell>
                 <TableCell className="text-slate-300">8</TableCell>
                 <TableCell><Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/50">Online</Badge></TableCell>
               </TableRow>
               <TableRow className="border-slate-800 hover:bg-slate-800/50">
                 <TableCell className="font-medium text-white">usx_4D4D...</TableCell>
                 <TableCell className="text-cyan-400">0</TableCell>
                 <TableCell className="text-slate-300">0</TableCell>
                 <TableCell><Badge variant="outline" className="text-slate-500 border-slate-700 bg-slate-900">Offline</Badge></TableCell>
               </TableRow>
             </TableBody>
           </Table>
        </CardContent>
      </Card>
    </div>
  );
}
