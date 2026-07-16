import { useState, useEffect } from 'react';
import { X, Mail, Lock, Loader2, CheckCircle2, Shield, ArrowLeft, AlertCircle } from 'lucide-react';
import { setupOperator, verifyOperator } from '../lib/auth';
import { isValidEmail } from '../lib/phone';

type Mode = 'setup' | 'verify';

type P = {
  open: boolean;
  mode: Mode;
  phone: string;
  email: string | null;
  onClose: () => void;
  onSuccess: () => void;
};

export function OperatorAuthModal({ open, mode, phone, email, onClose, onSuccess }: P) {
  const [emailVal, setEmailVal] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setEmailVal(email ?? '');
      setPassword(''); setConfirm(''); setError(''); setLoading(false);
    }
  }, [open, email]);

  if (!open) return null;

  const handleSetup = async () => {
    setError('');
    if (!isValidEmail(emailVal)) { setError('Email inválido'); return; }
    if (password.length < 6) { setError('Contraseña mínimo 6 caracteres'); return; }
    if (password !== confirm) { setError('Las contraseñas no coinciden'); return; }
    setLoading(true);
    const r = await setupOperator(phone, emailVal.trim(), password);
    setLoading(false);
    if (r.error) setError(r.error);
    else onSuccess();
  };

  const handleVerify = async () => {
    setError('');
    if (!isValidEmail(emailVal)) { setError('Email inválido'); return; }
    if (!password) { setError('Ingresa tu contraseña'); return; }
    setLoading(true);
    const r = await verifyOperator(phone, emailVal.trim(), password);
    setLoading(false);
    if (r.error || !r.data?.verified) setError(r.error ?? 'Credenciales incorrectas');
    else onSuccess();
  };

  const isSetup = mode === 'setup';

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-[60] max-w-md mx-auto bg-gray-950 text-white rounded-t-3xl shadow-2xl animate-slide-up flex flex-col" style={{ maxHeight: '90vh' }}>
        <div className="pt-3 pb-1 flex justify-center"><div className="w-10 h-1.5 rounded-full bg-gray-700" /></div>
        <div className="px-5 py-3 flex items-center justify-between border-b border-gray-800">
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-gray-800 flex items-center justify-center active:scale-90">
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </button>
          <h2 className="text-lg font-bold flex-1 text-center flex items-center justify-center gap-2">
            <Shield className="w-5 h-5 text-orange-400" />
            {isSetup ? 'Configurar Acceso' : 'Verificar Operador'}
          </h2>
          <div className="w-9" />
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
          {isSetup ? (
            <div className="bg-orange-950/30 border border-orange-900/50 rounded-xl p-3.5 flex items-start gap-2.5">
              <Shield className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-orange-300">Acceso de Operador Requerido</p>
                <p className="text-xs text-gray-400 mt-1">Como personal autorizado, debes vincular tu email y crear una contraseña para acceder a los paneles de operación.</p>
              </div>
            </div>
          ) : (
            <div className="bg-blue-950/30 border border-blue-900/50 rounded-xl p-3.5 flex items-start gap-2.5">
              <Lock className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-blue-300">Autenticación Requerida</p>
                <p className="text-xs text-gray-400 mt-1">Ingresa tus credenciales de operador para continuar.</p>
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-gray-400 mb-1.5 block">Email</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="email"
                value={emailVal}
                onChange={e => { setEmailVal(e.target.value); setError(''); }}
                placeholder="tu@email.com"
                disabled={!isSetup && !!email}
                className="w-full pl-10 pr-4 py-3.5 rounded-xl bg-gray-900 border border-gray-700 text-sm focus:outline-none focus:border-orange-500 disabled:opacity-60"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-400 mb-1.5 block">Contraseña</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="password"
                value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                placeholder={isSetup ? 'Mínimo 6 caracteres' : '••••••••'}
                className="w-full pl-10 pr-4 py-3.5 rounded-xl bg-gray-900 border border-gray-700 text-sm focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>

          {isSetup && (
            <div>
              <label className="text-xs font-semibold text-gray-400 mb-1.5 block">Confirmar Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="password"
                  value={confirm}
                  onChange={e => { setConfirm(e.target.value); setError(''); }}
                  placeholder="Repite tu contraseña"
                  className="w-full pl-10 pr-4 py-3.5 rounded-xl bg-gray-900 border border-gray-700 text-sm focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-950/40 border border-red-900/50 rounded-xl p-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}

          <button
            onClick={isSetup ? handleSetup : handleVerify}
            disabled={loading || !emailVal.trim() || !password}
            className="w-full py-3.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm active:scale-[0.98] shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : isSetup ? <><CheckCircle2 className="w-4 h-4" /> Configurar</> : <><Shield className="w-4 h-4" /> Verificar</>}
          </button>
        </div>
      </div>
    </>
  );
}
