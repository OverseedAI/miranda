import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/app/articles')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/app/articles"!</div>
}
