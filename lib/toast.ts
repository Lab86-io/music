export const MUSIC_TOAST_EVENT = "music:toast";

export interface MusicToastDetail {
  id: string;
  kind: "success" | "warning" | "error";
  message: string;
}

function emit(kind: MusicToastDetail["kind"], message: string) {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent<MusicToastDetail>(MUSIC_TOAST_EVENT, {
      detail: {
        id: `${kind}:${message}`,
        kind,
        message,
      },
    }),
  );
}

export const toast = {
  success: (message: string) => emit("success", message),
  warning: (message: string) => emit("warning", message),
  error: (message: string) => emit("error", message),
};
