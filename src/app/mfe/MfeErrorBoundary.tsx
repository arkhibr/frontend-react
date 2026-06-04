import { Component, type ReactNode } from 'react'

type Props = { mfeName: string; children: ReactNode }
type State = { hasError: boolean }

export class MfeErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: unknown) {
    console.error(`[mfe] falha no microfrontend "${this.props.mfeName}":`, error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div role="alert" className="rounded border border-danger/40 bg-danger/5 p-6 text-danger">
          O módulo <strong>{this.props.mfeName}</strong> está indisponível no momento.
        </div>
      )
    }
    return this.props.children
  }
}
