'use client';

import { useState } from 'react';
import { AlertTriangle, Loader2, Upload } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  importPortableProject,
  type PortableImportResult,
  type ProjectExport,
} from '@/lib/api/endpoints/importExport';

export default function SettingsPortableImport({ projectKey }: { projectKey: string }) {
  const t = useTranslations('settings.importExport');
  const [file, setFile] = useState<File | null>(null);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<PortableImportResult | null>(null);

  async function run() {
    if (!file) return;
    setPending(true);
    setResult(null);
    try {
      const snapshot = JSON.parse(await file.text()) as ProjectExport;
      const imported = await importPortableProject(projectKey, snapshot);
      setResult(imported);
      toast.success(t('portableImportComplete'));
    } catch {
      toast.error(t('portableImportFailed'));
    } finally {
      setPending(false);
    }
  }

  const unmatched = result
    ? [...new Set([...result.unmatchedAssigneeEmails, ...result.unmatchedCommentAuthorEmails])]
    : [];

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden="true" />
        <p>{t('portableImportEmptyWarning')}</p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          type="file"
          accept="application/json,.json"
          disabled={pending}
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />
        <Button disabled={!file || pending} onClick={() => void run()}>
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Upload className="size-4" aria-hidden="true" />
          )}
          {pending ? t('portableImporting') : t('portableImportButton')}
        </Button>
      </div>
      {result && (
        <div className="space-y-2 rounded-md border p-3 text-sm">
          <p className="font-medium">
            {t('portableImportSummary', {
              issues: result.issues,
              comments: result.comments,
              states: result.states,
              labels: result.labels,
              cycles: result.cycles,
              relations: result.relations,
            })}
          </p>
          {unmatched.length > 0 && (
            <p className="text-muted-foreground">
              {t('portableImportUnmatched', { emails: unmatched.join(', ') })}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
