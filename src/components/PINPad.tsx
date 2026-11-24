/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useStore } from '../store';
import { Lock, Delete } from 'lucide-react';
import { Logo } from './Logo';

export const PINPad: React.FC = () => {
  const { unlockWithPasscode, hasPasscode, setupSecurityPasscode, companySettings } = useStore();
  const [pin, setPin] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isInitializing] = useState<boolean>(!hasPasscode);
  const [confirmPin, setConfirmPin] = useState<string>('');
  const [setupStep, setSetupStep] = useState<1 | 2>(1);

  const handleKeyPress = (num: string) => {
    if (pin.length < 4) {
      setPin(prev => prev + num);
      setErrorMsg('');
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    setPin('');
    setErrorMsg('');
  };

  const handleSubmit = () => {
    if (isInitializing) {
      if (pin.length !== 4) {
        setErrorMsg('PIN must be 4 digits.');
        return;
      }
      if (setupStep === 1) {
        setConfirmPin(pin);
        setPin('');
        setSetupStep(2);
      } else {
        if (pin === confirmPin) {
          setupSecurityPasscode(pin);
        } else {
          setErrorMsg('PINs do not match. Try again.');
          setPin('');
          setSetupStep(1);
        }
      }
    } else {
      const success = unlockWithPasscode(pin);
      if (success) {
        setPin('');
      } else {
        setErrorMsg('Incorrect PIN. Please try again.');
        setPin('');
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-[#F8F6F1] z-50 flex flex-col items-center justify-center p-4 font-sans">
      <div className="w-full max-w-sm bg-[#FFFDF9] border border-[#E5E0D5] rounded-xl p-7">
        <div className="flex flex-col items-center mb-6 text-center">
          <Logo size={40} className="mb-3 rounded-lg" />
          <h2 className="font-display text-xl font-semibold text-[#1F1D1A]">
            {isInitializing ? `Set ${companySettings.name} PIN` : `${companySettings.name} Locked`}
          </h2>
          <p className="text-xs text-[#6B655C] mt-1">
            {isInitializing
              ? setupStep === 1
                ? 'Choose a 4-digit PIN for your workspace.'
                : 'Confirm your 4-digit PIN.'
              : 'Enter your 4-digit PIN to open your ledger.'}
          </p>
        </div>

        {/* PIN Indicators */}
        <div className="flex justify-center gap-4 mb-5">
          {[0, 1, 2, 3].map(i => (
            <div
              key={i}
              className={`w-3.5 h-3.5 rounded-full border transition-all duration-150 ${
                pin.length > i
                  ? 'bg-[#1B4D3E] border-[#1B4D3E] scale-110'
                  : 'border-[#D5CEBF] bg-transparent'
              }`}
            />
          ))}
        </div>

        {errorMsg && (
          <div className="text-xs text-[#B91C1C] text-center mb-4 font-medium">
            {errorMsg}
          </div>
        )}

        {/* Numerical Pad */}
        <div className="grid grid-cols-3 gap-2.5 mb-5">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(n => (
            <button
              key={n}
              type="button"
              onClick={() => handleKeyPress(n)}
              className="py-3 bg-[#F8F6F1] hover:bg-[#F2EFE9] border border-[#E5E0D5] rounded-lg text-[#1F1D1A] font-mono font-semibold text-base transition-colors cursor-pointer"
            >
              {n}
            </button>
          ))}
          <button
            type="button"
            onClick={handleClear}
            className="py-3 bg-[#F8F6F1] hover:bg-[#F2EFE9] text-[#6B655C] border border-[#E5E0D5] rounded-lg text-xs font-medium transition-colors cursor-pointer"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => handleKeyPress('0')}
            className="py-3 bg-[#F8F6F1] hover:bg-[#F2EFE9] border border-[#E5E0D5] rounded-lg text-[#1F1D1A] font-mono font-semibold text-base transition-colors cursor-pointer"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="py-3 bg-[#F8F6F1] hover:bg-[#F2EFE9] text-[#6B655C] flex items-center justify-center border border-[#E5E0D5] rounded-lg transition-colors cursor-pointer"
            aria-label="Backspace"
          >
            <Delete className="w-4 h-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          className="w-full py-2.5 bg-[#1B4D3E] hover:bg-[#143B2F] text-[#FFFDF9] text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
        >
          <Lock className="w-3.5 h-3.5" />
          {isInitializing ? (setupStep === 1 ? 'Next' : 'Confirm PIN') : 'Unlock Ledger'}
        </button>
      </div>
    </div>
  );
};
