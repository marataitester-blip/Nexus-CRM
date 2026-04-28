'use client';

import React, { useState } from 'react';

export default function TelegramAuthPage() {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [hash, setHash] = useState('');
  const [tempSession, setTempSession] = useState(''); // Новое хранилище памяти
  const [session, setSession] = useState('');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const sendCode = async () => {
    setLoading(true);
    const res = await fetch('/api/tg/send-code', {
      method: 'POST',
      body: JSON.stringify({ phoneNumber: phone }),
    });
    const data = await res.json();
    if (data.success) {
      setHash(data.phoneCodeHash);
      setTempSession(data.tempSession); // Сохраняем память
      setStep(2);
    } else {
      alert('Ошибка: ' + data.error);
    }
    setLoading(false);
  };

  const signIn = async () => {
    setLoading(true);
    const res = await fetch('/api/tg/sign-in', {
      method: 'POST',
      body: JSON.stringify({ phoneNumber: phone, code, phoneCodeHash: hash, tempSession }), // Передаем память
    });
    const data = await res.json();
    if (data.success) {
      setSession(data.session);
      setStep(3);
    } else {
      alert('Ошибка: ' + data.error);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-black text-yellow-500 flex flex-col items-center justify-center p-4 font-mono">
      <div className="max-w-md w-full border-2 border-yellow-600 p-8 rounded-lg shadow-[0_0_20px_rgba(202,138,4,0.3)] bg-zinc-900">
        <h1 className="text-2xl mb-6 text-center uppercase tracking-widest font-bold">Nexus-CRM: Активация</h1>
        
        {step === 1 && (
          <div className="space-y-4">
            <p className="text-sm text-zinc-400">Номер телефона:</p>
            <input 
              type="text" 
              placeholder="+375XXXXXXXXX" 
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-black border border-yellow-700 p-3 rounded text-yellow-500 outline-none"
            />
            <button 
              onClick={sendCode}
              disabled={loading}
              className="w-full bg-yellow-600 text-black font-bold py-3 rounded disabled:opacity-50"
            >
              {loading ? 'ЗАПРОС...' : 'ПОЛУЧИТЬ КОД'}
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-zinc-400">Код из Telegram:</p>
            <input 
              type="text" 
              placeholder="12345" 
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full bg-black border border-yellow-700 p-3 rounded text-yellow-500 outline-none"
            />
            <button 
              onClick={signIn}
              disabled={loading}
              className="w-full bg-yellow-600 text-black font-bold py-3 rounded disabled:opacity-50"
            >
              {loading ? 'ПРОВЕРКА...' : 'ПОДТВЕРДИТЬ'}
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <p className="text-sm text-green-500 font-bold">УСПЕХ!</p>
            <textarea 
              readOnly 
              value={session}
              className="w-full bg-black border border-green-900 p-3 h-32 rounded text-xs text-green-400"
            />
          </div>
        )}
      </div>
    </div>
  );
}
