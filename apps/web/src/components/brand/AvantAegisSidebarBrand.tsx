import Image from 'next/image';

export default function AvantAegisSidebarBrand() {
  return (
    <div className="flex h-24 w-full shrink-0 flex-col items-center justify-center gap-1.5 overflow-hidden px-2 group-data-[collapsible=icon]:hidden">
      <Image
        src="/brand/avant-aegis.png"
        alt="Avant Aegis"
        width={350}
        height={116}
        priority
        className="h-auto max-h-14 w-full max-w-40 object-contain"
      />
      <span className="text-xs font-medium text-sidebar-foreground">Project Management</span>
    </div>
  );
}
