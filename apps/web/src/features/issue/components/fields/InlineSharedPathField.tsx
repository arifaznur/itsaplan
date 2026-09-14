import { useState } from 'react';
import { Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Pill } from '@/components/common/fields/Pill';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { isWindowsPath } from '@/utils/windowsPath';
import SharedPathLink from './SharedPathLink';

export default function InlineSharedPathField({
  value,
  saveKey,
  onSave,
}: {
  value: string | null;
  saveKey: string;
  onSave: (value: string | null) => void;
}) {
  const t = useTranslations('issue.fields');
  const tCommon = useTranslations('common');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [invalid, setInvalid] = useState(false);
  const display = value === '' || value == null ? null : value;

  function start() {
    setDraft(display ?? '');
    setInvalid(false);
    setEditing(true);
  }

  function commit() {
    const trimmed = draft.trim();
    if (trimmed === '') {
      onSave(null);
      setEditing(false);
      return;
    }
    if (!isWindowsPath(trimmed)) {
      setInvalid(true);
      return;
    }
    onSave(trimmed);
    setEditing(false);
  }

  if (!editing) {
    if (display == null) {
      return (
        <Pill onClick={start}>
          <span>{t('empty')}</span>
        </Pill>
      );
    }
    return (
      <div className="flex items-center gap-1">
        <Pill active onClick={start}>
          <span className="max-w-[200px] truncate" dir="ltr">
            {display}
          </span>
        </Pill>
        <SharedPathLink value={display} />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <Input
        type="text"
        autoFocus
        value={draft}
        key={saveKey}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? `${saveKey}-path-error` : undefined}
        placeholder={t('sharedPathPlaceholder')}
        className="h-8 max-w-[320px]"
        dir="ltr"
        onChange={(event) => {
          setDraft(event.target.value);
          setInvalid(false);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') commit();
          if (event.key === 'Escape') setEditing(false);
        }}
        onBlur={() => setEditing(false)}
      />
      {invalid && (
        <span id={`${saveKey}-path-error`} className="sr-only">
          {t('invalidSharedPath')}
        </span>
      )}
      <Button
        variant="ghost"
        size="icon"
        className="size-8 shrink-0 text-muted-foreground hover:text-foreground"
        title={tCommon('save')}
        onMouseDown={(event) => event.preventDefault()}
        onClick={commit}
      >
        <Check className="size-4" />
      </Button>
    </div>
  );
}
