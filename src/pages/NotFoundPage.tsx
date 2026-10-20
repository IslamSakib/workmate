import { Link } from "react-router-dom"
import { PageHeader } from "@/components/shared/PageHeader"

export default function NotFoundPage() {
  return (
    <div className="mx-auto max-w-md p-6">
      <PageHeader title="Page not found" description="That address does not exist." />
      <Link to="/dashboard" className="mt-4 inline-block text-sm underline">
        Go to dashboard
      </Link>
    </div>
  )
}
