import { useEffect, useRef, useState } from 'react';
import { Lock, Eye, EyeOff, AlertCircle, ChefHat, Bike } from 'lucide-react';

type Role = 'admin' | 'driver';

const CONFIG: Record<Role, {
  title: string;
  subtitle: string;
  Icon: typeof ChefHat;
  iconBg: string;
  btnClass: string;
}> = {
  admin: {
    title: 'Panel de Cocina',
    subtitle: 'Acceso exclusivo para el equipo de cocina',
    Icon: ChefHat,
    iconBg: 'bg-blue-500',
    btnClass: 'bg-blue-500 hover:bg-blue-600 shadow-blue-500/25',
  },
  driver: {
    title: 'Vista Motorizado',
    subtitle: 'Acceso exclusivo para repartidores',
    Icon: Bike,
    iconBg: 'bg-green-500',
    btnClass: 'bg-green-500 hover:bg-green-600 shadow-green-500/25',
  },
};

type Props = {
  role: Role;
  /** Returns true if credentials are correct. */
  onLogin: (password: string) => boolean;
  onCancel: () => void;
};

export function LoginScreen({ role, onLogin, onCancel }: Props) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(false);
  const [shaking, setShaking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const cfg = CONFIG[role];
  const { Icon } = cfg;

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const ok = onLogin(password);
    if (!ok) {
      setError(true);
      setShaking(true);
      setPassword('');
      setTimeout(() => setShaking(false), 450);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6">
      <div className={`w-full max-w-sm ${shaking ? 'animate-shake' : ''}`}>
        <div className="flex justify-center mb-6">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg ${cfg.iconBg}`}>
            <Icon className="w-8 h-8 text-white" strokeWidth={2} />
          </div>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">{cfg.title}</h1>
          <p className="text-sm text-gray-400 mt-1.5">{cfg.subtitle}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 block">
              Contraseña de acceso
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 pointer-events-none" />
              <input
                ref={inputRef}
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(false);
                }}
                placeholder="Ingresa la clave"
                required
                autoComplete="current-password"
                className={`w-full pl-10 pr-12 py-3.5 rounded-xl bg-white border text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none transition-all ${
                  error
                    ? 'border-red-300 bg-red-50/40 focus:border-red-400'
                    : 'border-gray-200 focus:border-gray-400'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors"
                aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {error && (
              <div className="flex items-center gap-1.5 mt-2">
                <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                <p className="text-xs text-red-500 font-medium">
                  Contraseña incorrecta. Intenta de nuevo.
                </p>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={!password.trim()}
            className={`w-full py-3.5 rounded-xl text-white font-bold text-sm transition-all active:scale-[0.98] shadow-md disabled:opacity-40 disabled:shadow-none ${cfg.btnClass}`}
          >
            Ingresar
          </button>
        </form>

        <button
          onClick={onCancel}
          className="w-full mt-4 py-3 rounded-xl text-gray-400 hover:text-gray-600 text-sm font-medium transition-colors"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
