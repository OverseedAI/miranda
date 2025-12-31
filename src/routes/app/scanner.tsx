import { createFileRoute } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useQuery as useTanstackQuery } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import type { Id } from '@/convex/_generated/dataModel';
import { useEffect, useState } from 'react';
import { IconTruckLoading } from '@tabler/icons-react';

export const Route = createFileRoute('/app/scanner')({
    component: RouteComponent,
});

function RouteComponent() {
    const [scanId, setScanId] = useState<null | Id<'scans'>>(null);
    const queueScan = useMutation(api.services.scans.queueScan);
    const cancelScan = useMutation(api.services.scans.cancelScan);
    const runningScan = useQuery(api.services.scans.getRunningScan);
    const scanLogs = useTanstackQuery({
        ...convexQuery(api.services.logs.getLogs, {
            scanId: scanId ?? ('' as Id<'scans'>),
        }),
        enabled: Boolean(scanId),
    });

    useEffect(() => {
        if (runningScan && !scanId) {
            setScanId(runningScan._id);
        }
    }, [runningScan]);

    const handleClick = async () => {
        if (runningScan) {
            await cancelScan({ scanId: runningScan._id });

            return;
        }

        const scanId = await queueScan({ rssCount: 5, delay: 1 });

        setScanId(scanId);
    };

    return (
        <div className={'m-4'}>
            <Button onClick={handleClick}>
                {runningScan && <IconTruckLoading />}
                {runningScan ? 'Cancel Scan' : 'Begin Scan'}
            </Button>
            {scanLogs.data && (
                <pre>
                    {scanLogs.data.map((line) => (
                        <p key={line._id}>{line.message}</p>
                    ))}
                </pre>
            )}
        </div>
    );
}
