import { createFileRoute } from '@tanstack/react-router';
import { api } from '@/convex/_generated/api';
import { useMutation, usePaginatedQuery } from 'convex/react';
import { Button } from '@/components/ui/button';

export const Route = createFileRoute('/app/rss')({
    component: RouteComponent,
});

function RouteComponent() {
    const { results, status, loadMore } = usePaginatedQuery(
        api.services.rss.getRss,
        {},
        { initialNumItems: 10 },
    );
    const addRss = useMutation(api.services.rss.createRss);

    const handleAddNew = async () => {
        const name = prompt('Enter RSS Name:');
        const url = prompt('Enter RSS URL:');

        if (name && url) {
            await addRss({ name, htmlUrl: url });
        }
    };

    return (
        <div className={'m-4'}>
            <Button onClick={handleAddNew}>+ Add New</Button>
            {results?.map(({ _id, name, url }) => (
                <div key={_id.toString()}>
                    <h2>{name}</h2>
                    <p>{url}</p>
                </div>
            ))}
            <Button onClick={() => loadMore(10)}>Load More</Button>
        </div>
    );
}
