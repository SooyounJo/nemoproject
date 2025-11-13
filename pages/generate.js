import React, { useEffect, useMemo, useState } from "react";

export default function GeneratePage() {
  // time/weather는 이전 단계에서 이미 선택됨. 쿼리 또는 localStorage에서 수신
  const [timeValue, setTimeValue] = useState("afternoon");
  const [weatherValue, setWeatherValue] = useState("B");
  const [healing, setHealing] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [image, setImage] = useState("");

  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      const t = sp.get("time") || (typeof localStorage !== "undefined" ? localStorage.getItem("gen_time") : "") || "";
      const w = sp.get("weather") || (typeof localStorage !== "undefined" ? localStorage.getItem("gen_weather") : "") || "";
      if (t) setTimeValue(t);
      if (w) setWeatherValue(w);
    } catch {}
  }, []);

  const submit = async () => {
    setIsLoading(true);
    setError("");
    setImage("");
    try {
      const res = await fetch("/api/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ time: timeValue, weather: weatherValue, healing }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setImage(data?.image || "");
    } catch (e) {
      setError(e?.message || "Unknown error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0f1115", color: "#e5e7eb", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: "min(920px, 96vw)" }}>
        <h1 style={{ fontSize: 22, marginBottom: 16 }}>Dreamcore Image Generator</h1>
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16 }}>
          <div style={{ background: "rgba(17,19,24,.8)", border: "1px solid #23262d", borderRadius: 12, padding: 16 }}>
            {/* 읽기전용 배지: 이전 단계에서 결정한 시간/날씨 */}
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <span style={{ background: "#111318", border: "1px solid #23262d", borderRadius: 999, padding: "6px 10px", fontSize: 12, color: "#bfc3ca" }}>
                time: {timeValue}
              </span>
              <span style={{ background: "#111318", border: "1px solid #23262d", borderRadius: 999, padding: "6px 10px", fontSize: 12, color: "#bfc3ca" }}>
                weather: {weatherValue}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ width: 100, color: "#bfc3ca", fontSize: 13 }}>힐링 키워드</span>
              <input
                value={healing}
                onChange={(e) => setHealing(e.target.value)}
                placeholder="ex) calm breathing, warm light, sea breeze"
                style={{ flex: 1, background: "#0b0d12", border: "1px solid #23262d", color: "#e5e7eb", borderRadius: 8, padding: "10px 12px" }}
              />
            </div>
            <div style={{ height: 16 }} />
            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={submit}
                disabled={isLoading}
                style={{
                  padding: "10px 16px",
                  borderRadius: 10,
                  border: "1px solid #23262d",
                  background: "linear-gradient(180deg,#1a1f2e,#111318)",
                  color: "#e5e7eb",
                  cursor: "pointer",
                }}
              >
                {isLoading ? "생성 중..." : "이미지 생성"}
              </button>
              <a
                href="/room"
                style={{
                  padding: "10px 16px",
                  borderRadius: 10,
                  border: "1px solid #23262d",
                  background: "#111318",
                  color: "#e5e7eb",
                  textDecoration: "none",
                }}
              >
                방으로 돌아가기
              </a>
            </div>
            {error && <div style={{ marginTop: 12, color: "#f87171", fontSize: 13 }}>{error}</div>}
          </div>
          <div style={{ background: "rgba(17,19,24,.8)", border: "1px solid #23262d", borderRadius: 12, padding: 16 }}>
            <div style={{ color: "#bfc3ca", marginBottom: 8, fontSize: 13 }}>미리보기</div>
            {image ? (
              <div style={{ display: "flex", justifyContent: "center" }}>
                <img src={image} alt="generated" style={{ maxWidth: "100%", borderRadius: 12, border: "1px solid #23262d" }} />
              </div>
            ) : (
              <div style={{ color: "#778", fontSize: 13 }}>생성 후 미리보기가 여기에 표시됩니다.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


