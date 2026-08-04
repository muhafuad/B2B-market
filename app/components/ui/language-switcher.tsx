'use client';

import { useState, useEffect } from 'react';
import { Languages, Check } from 'lucide-react';
import { Button } from './button'; 
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem,DropdownMenuTrigger,DropdownMenuLabel,DropdownMenuSeparator } from '@radix-ui/react-dropdown-menu';
import { useLanguage } from '../providers/language-provider';
import { languages } from '@/app/lib/i18n/translations';
import { cn } from '@/app/lib/utils';

interface LanguageSwitcherProps {
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'default' | 'sm' | 'icon';
  className?: string;
  showLabel?: boolean;
}

export function LanguageSwitcher({
  variant = 'ghost',
  size = 'icon',
  className,
  showLabel = false,
}: LanguageSwitcherProps) {
  const { lang, setLang } = useLanguage();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const current = languages.find((l) => l.code === lang) ?? languages[0];

  if (!mounted) {
    return (
      <Button variant={variant} size={size} className={className} disabled>
        <Languages className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} className={cn('gap-1.5', className)} aria-label="Switch language">
          <Languages className={showLabel ? 'h-4 w-4' : 'h-5 w-5'} />
          {showLabel && <span className="text-sm font-medium">{current.nativeLabel}</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48  bg-background/40 backdrop-blur-xl
    border border-border/40
    shadow-xl">
        <DropdownMenuLabel>{lang === 'am' ? 'ቋንቋ ይቀይሩ' : 'Switch Language'}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {languages.map((l) => (
          <DropdownMenuItem
            key={l.code}
            onClick={() => setLang(l.code)}
            className="flex items-center justify-between gap-2 cursor-pointer hover:bg-primary/10"
          >
            <span className="flex items-center gap-2">
              <span className="text-base">{l.flag}</span>
              <span className="font-medium">{l.nativeLabel}</span>
            </span>
            {lang === l.code && <Check className="h-4 w-4 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
