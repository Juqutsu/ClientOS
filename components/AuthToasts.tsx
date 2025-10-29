"use client";
import { useEffect } from 'react';
import toast from 'react-hot-toast';

export default function AuthToasts({ error, success }: { error?: string; success?: string }) {
  useEffect(() => {
    if (error) toast.error(decodeURIComponent(error));
  }, [error]);
  useEffect(() => {
    if (success === 'signup') toast.success('Bitte E-Mail bestätigen.');
    if (success === 'magic') toast.success('Magic Link wurde gesendet.');
    if (success === 'reset') toast.success('Reset-Link wurde gesendet.');
  }, [success]);
  return null;
}
