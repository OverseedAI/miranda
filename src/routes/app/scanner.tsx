import { createFileRoute } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { useAction } from 'convex/react';
import { api } from '@/convex/_generated/api';

export const Route = createFileRoute('/app/scanner')({
    component: RouteComponent,
});

function RouteComponent() {
    const getNews = useAction(api.getNews.getNews);

    const handleClick = async () => {
        console.log('Grabbing news');
        const news = await getNews();

        console.log('news:', news);
    };

    return (
        <div className={'m-4'}>
            <Button onClick={handleClick}>Begin Scan</Button>
        </div>
    );
}
