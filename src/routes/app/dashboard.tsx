import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/app/dashboard')({
    component: Home,
});

function Home() {
    return <main className="p-8 flex flex-col gap-16"></main>;
}
