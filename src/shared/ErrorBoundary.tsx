import { Component, type ReactNode, type ErrorInfo } from "react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: unknown;
}

/**
 * Attrape toute erreur de rendu d'un composant enfant et affiche un écran
 * d'erreur convivial au lieu d'un écran blanc.
 * Doit être un composant classe — seule API React supportant componentDidCatch.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: unknown): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("[ErrorBoundary] Erreur de rendu :", error, info.componentStack);
  }

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={{
        minHeight: "100dvh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        background: "#1A2E1A", color: "#fff",
        padding: 32, textAlign: "center",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}>
        <div style={{ fontSize: 52, marginBottom: 16 }}>⚠️</div>
        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 10 }}>
          Une erreur inattendue est survenue
        </div>
        <div style={{ fontSize: 14, color: "rgba(255,255,255,.65)", marginBottom: 32, maxWidth: 340, lineHeight: 1.6 }}>
          L'application a rencontré un problème. Rechargez la page pour continuer.
          Si l'erreur persiste, contactez votre administrateur.
        </div>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: "14px 32px", borderRadius: 12, border: "none",
            background: "#4CAF50", color: "#fff",
            fontSize: 15, fontWeight: 600, cursor: "pointer",
            fontFamily: "inherit",
          }}>
          🔄 Recharger la page
        </button>
        {import.meta.env.DEV && this.state.error != null && (
          <pre style={{
            marginTop: 28, fontSize: 11, color: "#ffaaaa",
            maxWidth: 540, overflow: "auto", textAlign: "left",
            background: "rgba(255,0,0,.1)", borderRadius: 8, padding: "10px 14px",
          }}>
            {String(this.state.error)}
          </pre>
        )}
      </div>
    );
  }
}
