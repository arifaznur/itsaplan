import { Download, FolderOpen } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { explorerConnectorUrl } from '@/utils/windowsPath';

export default function SharedPathLink({ value }: { value: string }) {
  const t = useTranslations('issue.fields');

  return (
    <span className="flex shrink-0 items-center">
      <a
        href={explorerConnectorUrl(value)}
        title={t('openInExplorer')}
        className="flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground"
      >
        <FolderOpen className="size-3.5" />
      </a>
      <a
        href="/downloads/ItsAPLAN-Explorer-Connector-win-x64.zip"
        download
        title={t('installExplorerConnector')}
        className="flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground"
      >
        <Download className="size-3.5" />
      </a>
    </span>
  );
}
