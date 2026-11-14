import { Component, Suspense } from 'react'

// If a decorative component crashes (or is still loading), show the plain fallback instead.
export default class Safe extends Component {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(err) { console.warn('Component failed, using fallback:', err) }
  render() {
    if (this.state.failed) return this.props.fallback ?? null
    return <Suspense fallback={this.props.fallback ?? null}>{this.props.children}</Suspense>
  }
}
