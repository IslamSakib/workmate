import { Component, type ReactNode } from "react"
import { ErrorState } from "./States"

export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="mx-auto max-w-md p-6">
        <ErrorState message={this.state.error.message} onRetry={() => location.reload()} />
      </div>
    )
  }
}
