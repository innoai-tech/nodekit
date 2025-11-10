import { isFunction } from "./util/Typed.ts";

export function xhrFetch(
  url: string,
  options: RequestInit & {
    onUploadProgress?: (evt: ProgressEvent) => void;
  },
): Promise<Response> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open(options.method ?? "GET", url);

    if (options.headers) {
      for (const [key, value] of Object.entries(options.headers)) {
        xhr.setRequestHeader(key, value);
      }
    }

    if (xhr.upload && isFunction(options.onUploadProgress)) {
      xhr.upload.addEventListener("progress", options.onUploadProgress);
    }

    xhr.responseType = "arraybuffer";

    xhr.onloadend = () => {
      if (xhr.status == 0) {
        return;
      }

      const headers = parseHeaders(xhr.getAllResponseHeaders());

      const resp = new Response(
        xhr.status != 204 && xhr.response ? new Blob(xhr.response) : null,
        {
          status: xhr.status,
          statusText: xhr.statusText,
          headers: headers,
        },
      );

      resolve(resp);
    };

    xhr.onerror = () => reject(new TypeError("Network request failed"));
    xhr.ontimeout = () => reject(new TypeError("Network request timed out"));
    xhr.onabort = () => reject(new DOMException("Aborted", "AbortError"));

    xhr.send((options.body as any) ?? null);
  });
}

function parseHeaders(rawHeaders: string): Headers {
  const headerRows = rawHeaders.trim().split(/[\r\n]+/);

  const headers = new Headers();

  for (const line of headerRows) {
    const parts = line.split(": ");
    const key = parts.shift()!;

    headers.set(key, parts.join(": "));
  }

  return headers;
}
