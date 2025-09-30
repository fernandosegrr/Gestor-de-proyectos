import React from 'react';
import { Bot, MessageSquare, Instagram, Facebook, Phone } from 'lucide-react';

export function PlatformIcon({ platform, className = '' }) {
  switch ((platform || '').toLowerCase()) {
    case 'whatsapp':
      return <Phone className={`text-green-500 ${className}`} title="WhatsApp" />;
    case 'messenger':
      return <Facebook className={`text-blue-500 ${className}`} title="Messenger" />;
    case 'instagram':
      return <Instagram className={`text-pink-500 ${className}`} title="Instagram" />;
    default:
      return <Bot className={`text-gray-400 ${className}`} title="Otra plataforma" />;
  }
}
