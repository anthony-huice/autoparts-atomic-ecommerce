"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClient } from "@/lib/supabase/client";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUIStore } from "@/store/useUIStore";
const loginSchema = z.object({
  email: z.string().email("Correo electrónico inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});
const registerSchema = loginSchema
  .extend({
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });
type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;
export function AuthModal() {
  const { isAuthModalOpen, authModalTab, closeAuthModal, openAuthModal } =
    useUIStore();
  const router = useRouter();
  const supabase = createClient();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const isLogin = authModalTab === "login";

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: "", password: "", confirmPassword: "" },
  });

  // Limpiar errores cuando cambia la pestaña
  const switchTab = (tab: "login" | "registro") => {
    setError(null);
    setSuccess(null);
    loginForm.reset();
    registerForm.reset();
    openAuthModal(tab);
  };

  const handleLoginSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });
    setIsLoading(false);
    if (error) {
      setError(error.message);
    } else {
      closeAuthModal();
      router.refresh(); // Refresca el navbar para mostrar la sesión
    }
  };

  const handleRegisterSubmit = async (data: RegisterFormValues) => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    const { error, data: authData } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
    });
    setIsLoading(false);
    if (error) {
      setError(error.message);
    } else {
      if (authData.user && authData.session === null) {
        setSuccess(
          "¡Registro exitoso! Revisa tu correo para confirmar tu cuenta.",
        );
      } else {
        closeAuthModal();
        router.refresh();
      }
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setError(error.message);
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isAuthModalOpen}
      onClose={closeAuthModal}
      title={isLogin ? "Iniciar Sesión" : "Crear Cuenta"}
    >
      <div className="space-y-6">
        {/* Pestañas (Tabs) */}
        <div className="flex rounded-none bg-gray-100 p-1">
          <button
            className={`flex-1 rounded-none py-2 text-sm font-semibold transition-all ${isLogin ? "bg-white text-gray-900 " : "text-gray-500 hover:text-gray-700"}`}
            onClick={() => switchTab("login")}
          >
            Ingresar
          </button>
          <button
            className={`flex-1 rounded-none py-2 text-sm font-semibold transition-all ${!isLogin ? "bg-white text-gray-900 " : "text-gray-500 hover:text-gray-700"}`}
            onClick={() => switchTab("registro")}
          >
            Registrarse
          </button>
        </div>

        {/* Mensajes Globales */}
        {error && (
          <div className="rounded-none bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-none bg-green-50 p-4 text-sm text-green-600">
            {success}
          </div>
        )}

        {/* Formulario de Login */}
        {isLogin && (
          <form
            onSubmit={loginForm.handleSubmit(handleLoginSubmit)}
            className="space-y-4"
          >
            <div>
              <Label htmlFor="login-email">Correo Electrónico</Label>
              <Input
                id="login-email"
                type="email"
                placeholder="ejemplo@correo.com"
                className="mt-1"
                {...loginForm.register("email")}
                disabled={isLoading}
              />
              {loginForm.formState.errors.email && (
                <p className="mt-1 text-xs text-red-600">
                  {loginForm.formState.errors.email.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="login-password">Contraseña</Label>
              <Input
                id="login-password"
                type="password"
                placeholder="••••••••"
                className="mt-1"
                {...loginForm.register("password")}
                disabled={isLoading}
              />
              {loginForm.formState.errors.password && (
                <p className="mt-1 text-xs text-red-600">
                  {loginForm.formState.errors.password.message}
                </p>
              )}
            </div>
            <Button type="submit" className="w-full mt-6" disabled={isLoading}>
              {isLoading ? "Ingresando..." : "Iniciar Sesión"}
            </Button>
          </form>
        )}

        {/* Formulario de Registro */}
        {!isLogin && (
          <form
            onSubmit={registerForm.handleSubmit(handleRegisterSubmit)}
            className="space-y-4"
          >
            <div>
              <Label htmlFor="reg-email">Correo Electrónico</Label>
              <Input
                id="reg-email"
                type="email"
                placeholder="ejemplo@correo.com"
                className="mt-1"
                {...registerForm.register("email")}
                disabled={isLoading}
              />
              {registerForm.formState.errors.email && (
                <p className="mt-1 text-xs text-red-600">
                  {registerForm.formState.errors.email.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="reg-password">Contraseña</Label>
              <Input
                id="reg-password"
                type="password"
                placeholder="••••••••"
                className="mt-1"
                {...registerForm.register("password")}
                disabled={isLoading}
              />
              {registerForm.formState.errors.password && (
                <p className="mt-1 text-xs text-red-600">
                  {registerForm.formState.errors.password.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="reg-confirmPassword">Confirmar Contraseña</Label>
              <Input
                id="reg-confirmPassword"
                type="password"
                placeholder="••••••••"
                className="mt-1"
                {...registerForm.register("confirmPassword")}
                disabled={isLoading}
              />
              {registerForm.formState.errors.confirmPassword && (
                <p className="mt-1 text-xs text-red-600">
                  {registerForm.formState.errors.confirmPassword.message}
                </p>
              )}
            </div>
            <Button
              type="submit"
              className="w-full mt-6 bg-blue-600 hover:bg-blue-700"
              disabled={isLoading}
            >
              {isLoading ? "Registrando..." : "Crear Cuenta"}
            </Button>
          </form>
        )}

        {/* Separador */}
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-white px-2 text-gray-500">O continuar con</span>
          </div>
        </div>

        {/* Botón de Google */}
        <Button
          type="button"
          className="w-full flex items-center justify-center gap-2 bg-white text-gray-900 border border-gray-300 hover:bg-gray-50"
          onClick={handleGoogleLogin}
          disabled={isLoading}
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Ingresar con Google
        </Button>
      </div>
    </Modal>
  );
}
