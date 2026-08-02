import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { LoaderCircle, LogIn } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CrmDataProvider } from "@/lib/crm-data";
import type { Role } from "@/lib/types";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";

interface Membership {
  workspaceId: string;
  workspaceName: string;
  role: Role;
}

interface AuthValue {
  configured: boolean;
  user: User | null;
  membership: Membership | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 70);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const supabase = getSupabaseClient();

  const loadMembership = useCallback(
    async (user: User | null) => {
      if (!supabase || !user) {
        setMembership(null);
        return;
      }

      const { data: member, error: memberError } = await supabase
        .from("workspace_members")
        .select("workspace_id, role")
        .eq("user_id", user.id)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();
      if (memberError) throw memberError;
      if (!member) {
        setMembership(null);
        return;
      }

      const { data: workspace, error: workspaceError } = await supabase
        .from("workspaces")
        .select("name")
        .eq("id", member.workspace_id)
        .single();
      if (workspaceError) throw workspaceError;

      setMembership({
        workspaceId: member.workspace_id,
        workspaceName: workspace.name,
        role: member.role as Role,
      });
    },
    [supabase],
  );

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let active = true;
    void supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      try {
        await loadMembership(data.session?.user ?? null);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not load your workspace.");
      } finally {
        if (active) setLoading(false);
      }
    });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      queueMicrotask(() => {
        void loadMembership(nextSession?.user ?? null).finally(() => setLoading(false));
      });
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [loadMembership, supabase]);

  const createWorkspace = useCallback(
    async (name: string) => {
      if (!supabase || !session?.user) return;
      const workspaceId = crypto.randomUUID();
      const slug = `${slugify(name) || "workspace"}-${session.user.id.slice(0, 6)}`;
      const { error: workspaceError } = await supabase.from("workspaces").insert({
        id: workspaceId,
        name,
        slug,
        created_by: session.user.id,
      });
      if (workspaceError) throw workspaceError;

      const { error: memberError } = await supabase.from("workspace_members").insert({
        workspace_id: workspaceId,
        user_id: session.user.id,
        role: "owner",
      });
      if (memberError) throw memberError;
      await loadMembership(session.user);
    },
    [loadMembership, session?.user, supabase],
  );

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setMembership(null);
  }, [supabase]);

  const value = useMemo<AuthValue>(
    () => ({
      configured: isSupabaseConfigured,
      user: session?.user ?? null,
      membership,
      signOut,
    }),
    [membership, session?.user, signOut],
  );

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <LoaderCircle className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isSupabaseConfigured && !session?.user) {
    return <AuthScreen />;
  }

  if (isSupabaseConfigured && session?.user && !membership) {
    return <WorkspaceSetup user={session.user} onCreate={createWorkspace} onSignOut={signOut} />;
  }

  return (
    <AuthContext.Provider value={value}>
      {isSupabaseConfigured && session?.user && membership ? (
        <CrmDataProvider workspaceId={membership.workspaceId} userId={session.user.id}>
          {children}
        </CrmDataProvider>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}

function AuthScreen() {
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const supabase = getSupabaseClient();

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase) return;
    setSubmitting(true);
    try {
      if (mode === "sign-in") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName.trim() } },
        });
        if (error) throw error;
        if (!data.session) {
          toast.success("Check your email to confirm your account.");
          setMode("sign-in");
        }
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Authentication failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-muted/30 px-4 py-10">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-foreground text-background">
            <span className="text-sm font-bold">M&amp;M</span>
          </div>
          <div>
            <CardTitle className="font-display text-2xl">
              {mode === "sign-in" ? "Welcome back" : "Create your account"}
            </CardTitle>
            <CardDescription>
              {mode === "sign-in"
                ? "Sign in to your private CRM workspace."
                : "Your first account becomes the workspace owner."}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={submit}>
            {mode === "sign-up" ? (
              <div className="space-y-1.5">
                <Label htmlFor="full-name">Full name</Label>
                <Input
                  id="full-name"
                  autoComplete="name"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  required
                />
              </div>
            ) : null}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>
            <Button className="w-full" type="submit" disabled={submitting}>
              {submitting ? (
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <LogIn className="mr-2 h-4 w-4" />
              )}
              {mode === "sign-in" ? "Sign in" : "Create account"}
            </Button>
          </form>
          <Button
            variant="ghost"
            className="mt-3 w-full"
            onClick={() => setMode((value) => (value === "sign-in" ? "sign-up" : "sign-in"))}
          >
            {mode === "sign-in" ? "Need an account? Sign up" : "Already have an account? Sign in"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function WorkspaceSetup({
  user,
  onCreate,
  onSignOut,
}: {
  user: User;
  onCreate: (name: string) => Promise<void>;
  onSignOut: () => Promise<void>;
}) {
  const [name, setName] = useState("M&M Massage Spa");
  const [submitting, setSubmitting] = useState(false);

  return (
    <div className="grid min-h-screen place-items-center bg-muted/30 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="font-display text-2xl">Set up your workspace</CardTitle>
          <CardDescription>
            Signed in as {user.email}. This creates a new, empty CRM workspace.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="workspace-name">Workspace name</Label>
            <Input
              id="workspace-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <Button
            className="w-full"
            disabled={submitting || name.trim().length < 2}
            onClick={() => {
              setSubmitting(true);
              void onCreate(name.trim())
                .catch((error: unknown) =>
                  toast.error(error instanceof Error ? error.message : "Setup failed."),
                )
                .finally(() => setSubmitting(false));
            }}
          >
            {submitting ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}
            Create workspace
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => void onSignOut()}>
            Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  return (
    context ?? {
      configured: false,
      user: null,
      membership: null,
      signOut: async () => undefined,
    }
  );
}
