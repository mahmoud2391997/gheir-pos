import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { TRPCClientError } from "@trpc/client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useLocation } from "wouter";
import { z } from "zod";

const schema = z.object({
  username: z.string().trim().min(1, "Enter your username."),
  password: z.string().min(1, "Enter your password."),
  rememberMe: z.boolean().optional(),
});

type FormValues = z.infer<typeof schema>;

function loginErrorMessage(error: unknown) {
  if (error instanceof TRPCClientError && error.data?.code === "UNAUTHORIZED") {
    return "Invalid username or password.";
  }
  return error instanceof Error ? error.message : "Login failed.";
}

export default function Login() {
  const { user, loading, login } = useAuth();
  const [, setLocation] = useLocation();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [demoSubmitting, setDemoSubmitting] = useState(false);
  const loginOptions = trpc.auth.loginOptions.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });
  const showDemoLogin = Boolean(loginOptions.data?.demoLogin);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { username: "", password: "", rememberMe: true },
  });

  const isSubmitting = form.formState.isSubmitting;
  const canSubmit = useMemo(
    () => !loading && !isSubmitting && !demoSubmitting,
    [demoSubmitting, isSubmitting, loading]
  );

  useEffect(() => {
    if (user && !loading) setLocation("/");
  }, [loading, setLocation, user]);

  const onSubmit = async (values: FormValues) => {
    setSubmitError(null);
    try {
      await login({
        username: values.username,
        password: values.password,
        rememberMe: Boolean(values.rememberMe),
      });
      setLocation("/");
    } catch (error: unknown) {
      setSubmitError(loginErrorMessage(error));
    }
  };

  const onDemoLogin = async () => {
    setSubmitError(null);
    setDemoSubmitting(true);
    try {
      await login({ username: "demo", password: "demo", rememberMe: false });
      setLocation("/");
    } catch (error: unknown) {
      setSubmitError(loginErrorMessage(error));
    } finally {
      setDemoSubmitting(false);
    }
  };

  return (
    <div className="grain flex min-h-dvh items-center justify-center bg-[#f2ead8] px-5 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center">
          <img
            src="/gheir-brand-lockup.png"
            alt="GHEIR"
            className="h-20 w-auto object-contain"
          />
        </div>

        <Card className="border-[#cdbb9c] bg-[#f7f0e3] text-[#2b2b2b]">
          <CardHeader>
            <CardTitle className="serif text-3xl tracking-tight text-[#2f3e34]">
              Sign in
            </CardTitle>
            <CardDescription className="text-[#71675b]">
              What is made by hand can never be truly copied.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label
                  htmlFor="username"
                  className="text-xs font-bold text-[#5c4033]"
                >
                  Username
                </Label>
                <Input
                  id="username"
                  autoComplete="username"
                  placeholder="e.g. admin"
                  className="h-11 border-[#cdbb9c] bg-[#f2ead8] text-[#2b2b2b] placeholder:text-[#817664] focus-visible:ring-[#5c4033]"
                  {...form.register("username")}
                />
                {form.formState.errors.username?.message ? (
                  <p className="text-xs font-medium text-[#9a5537]">
                    {form.formState.errors.username.message}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="password"
                  className="text-xs font-bold text-[#5c4033]"
                >
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  className="h-11 border-[#cdbb9c] bg-[#f2ead8] text-[#2b2b2b] placeholder:text-[#817664] focus-visible:ring-[#5c4033]"
                  {...form.register("password")}
                />
                {form.formState.errors.password?.message ? (
                  <p className="text-xs font-medium text-[#9a5537]">
                    {form.formState.errors.password.message}
                  </p>
                ) : null}
              </div>

              <div className="flex items-center justify-between">
                <label className="flex cursor-pointer items-center gap-2 text-xs text-[#71675b]">
                  <Checkbox
                    checked={Boolean(form.watch("rememberMe"))}
                    onCheckedChange={checked =>
                      form.setValue("rememberMe", Boolean(checked))
                    }
                  />
                  Remember me
                </label>
                <span className="mono text-[10px] uppercase tracking-[.16em] text-[#817664]">
                  GHEIR POS
                </span>
              </div>

              {submitError ? (
                <div className="rounded-xl border border-[#d7b884] bg-[#fff5de] px-3 py-2 text-sm text-[#6e4b2e]">
                  {submitError}
                </div>
              ) : null}

              <Button
                type="submit"
                disabled={!canSubmit}
                className="h-11 w-full rounded-xl bg-[#2f3e34] text-[#f2ead8] hover:bg-[#415045] disabled:opacity-50"
              >
                {isSubmitting ? "Signing in…" : "Sign in"}
              </Button>

              {showDemoLogin ? (
                <div className="space-y-3 pt-1">
                  <div className="flex items-center gap-3 text-[10px] uppercase tracking-[.16em] text-[#817664]">
                    <span className="h-px flex-1 bg-[#cdbb9c]" />
                    No register device
                    <span className="h-px flex-1 bg-[#cdbb9c]" />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!canSubmit}
                    onClick={onDemoLogin}
                    className="h-11 w-full rounded-xl border-[#cdbb9c] bg-transparent text-[#2f3e34] hover:bg-[#efe4d0]"
                  >
                    {demoSubmitting ? "Signing in…" : "Demo login"}
                  </Button>
                </div>
              ) : null}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
