import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const InviteUser = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.endsWith("@recaste.com")) {
      toast({
        title: "Invalid email",
        description: "Only @recaste.com emails can be invited",
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

      toast({
        title: "Invite sent!",
        description: data.message || `Invite link sent to ${email}`,
      });
      setEmail("");
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invite Team Member</CardTitle>
        <CardDescription>
          Send an invite link to a @recaste.com email address
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleInvite} className="flex gap-2">
          <Input
            type="email"
            placeholder="name@recaste.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
          />
          <Button type="submit" disabled={loading}>
            {loading ? "Sending..." : "Send Invite"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default InviteUser;
