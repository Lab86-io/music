import { ImageResponse } from "next/og";
import { loadConversion, type PageParams } from "./conversion";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Listen on any music service";

const SERVICES = ["Spotify", "Apple Music", "Deezer", "TIDAL", "YouTube Music", "Amazon Music"];

export default async function OpengraphImage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const result = await loadConversion(await params);
  const source = result?.source;
  const type = result?.type ?? "track";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          background: "#09090b",
          color: "#fafafa",
          padding: 64,
          fontFamily: "sans-serif",
        }}
      >
        {source?.artworkUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={source.artworkUrl}
            alt=""
            width={440}
            height={440}
            style={{
              width: 440,
              height: 440,
              objectFit: "cover",
              borderRadius: type === "artist" ? 220 : 24,
              boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
            }}
          />
        ) : (
          <div
            style={{
              width: 440,
              height: 440,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 24,
              background: "#18181b",
              fontSize: 160,
            }}
          >
            ♪
          </div>
        )}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginLeft: 56,
            flex: 1,
            minWidth: 0,
          }}
        >
          <div
            style={{
              fontSize: 24,
              textTransform: "uppercase",
              letterSpacing: 4,
              color: "#a1a1aa",
            }}
          >
            {type}
          </div>
          <div
            style={{
              fontSize: source && source.title.length > 40 ? 48 : 64,
              fontWeight: 700,
              marginTop: 12,
              lineHeight: 1.1,
            }}
          >
            {source?.title ?? "Music link"}
          </div>
          {source?.artist && type !== "artist" && (
            <div style={{ fontSize: 36, color: "#a1a1aa", marginTop: 16 }}>
              {source.artist}
            </div>
          )}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 10,
              marginTop: 40,
            }}
          >
            {SERVICES.map((name) => (
              <div
                key={name}
                style={{
                  display: "flex",
                  fontSize: 20,
                  color: "#d4d4d8",
                  border: "1px solid #3f3f46",
                  borderRadius: 999,
                  padding: "8px 18px",
                }}
              >
                {name}
              </div>
            ))}
          </div>
          <div style={{ fontSize: 24, color: "#71717a", marginTop: 40 }}>
            music.lab86.io
          </div>
        </div>
      </div>
    ),
    size
  );
}
