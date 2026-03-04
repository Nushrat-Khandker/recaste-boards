import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Copy, Check } from "lucide-react";

const InviteUser = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !email.includes("@")) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-invite-link", {
        body: { email },
      });

      if (error) throw error;

      setInviteLink(data.inviteLink);
      toast({
        title: "Invite link generated!",
        description: data.message || `Invite link created for ${email}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send invite",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (inviteLink) {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Invite link copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const resetForm = () => {
    setEmail("");
    setInviteLink(null);
    setCopied(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invite Team Member</CardTitle>
        <CardDescription>
          Generate an invite link for any email address
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!inviteLink ? (
          <form onSubmit={handleInvite} className="flex gap-2">
            <Input
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
            <Button type="submit" disabled={loading}>
              {loading ? "Generating..." : "Generate Link"}
            </Button>
          </form>
        ) : (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                type="text"
                value={inviteLink}
                readOnly
                className="font-mono text-sm"
              />
              <Button onClick={copyToClipboard} variant="outline" size="icon">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <div className="flex gap-2">
              <Button onClick={resetForm} variant="outline" className="flex-1">
                Generate Another
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default InviteUser;
