// 스트리밍 응답: 한 줄에 JSON 이벤트 하나씩 (NDJSON).
// 서버는 ndjsonResponse 로 보내고, 브라우저는 readNdjson 으로 읽는다.

export function ndjsonResponse(run: (send: (event: unknown) => void) => Promise<void>) {
  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (event: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
        } catch {
          closed = true; // 브라우저가 연결을 끊음
        }
      };
      void run(send)
        .catch((err) => {
          console.error("[stream]", err);
          send({ type: "error", message: "알 수 없는 오류가 발생했어요. 다시 시도해 주세요." });
        })
        .finally(() => {
          if (!closed) {
            closed = true;
            try {
              controller.close();
            } catch {
              // 이미 닫힘
            }
          }
        });
    },
    cancel() {
      closed = true;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}

export async function readNdjson<T>(res: Response, onEvent: (event: T) => void) {
  if (!res.body) throw new Error("응답 본문이 없습니다.");
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let index: number;
    while ((index = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, index).trim();
      buffer = buffer.slice(index + 1);
      if (line) onEvent(JSON.parse(line) as T);
    }
  }
  buffer += decoder.decode();
  if (buffer.trim()) onEvent(JSON.parse(buffer.trim()) as T);
}

// 스트림이 시작되기 전에 실패하면 일반 JSON 으로 오류를 보낸다.
export function jsonError(status: number, message: string, code?: string) {
  return Response.json({ error: message, code }, { status });
}

export async function readJsonError(res: Response) {
  try {
    const data = (await res.json()) as { error?: string; code?: string };
    return { message: data.error ?? `요청이 실패했어요 (${res.status})`, code: data.code };
  } catch {
    return { message: `요청이 실패했어요 (${res.status})`, code: undefined };
  }
}
