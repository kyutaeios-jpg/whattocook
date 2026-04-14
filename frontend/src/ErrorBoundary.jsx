import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("ErrorBoundary caught:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, textAlign: "center" }}>
          <p style={{ fontSize: 18, color: "#888", marginBottom: 16 }}>
            문제가 발생했습니다
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false });
              window.location.reload();
            }}
            style={{
              padding: "10px 20px", borderRadius: 10, border: "none",
              background: "#f97316", color: "#fff", fontSize: 15,
              fontWeight: 600, cursor: "pointer",
            }}
          >
            새로고침
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
