export function xhrFetch(
  url: string,
  options: RequestInit & {
    onUploadProgress?: (evt: ProgressEvent) => void,
  }
): Promise<Response> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open(options.method ?? "GET", url);

    if (options.headers) {
      for (const [key, value] of Object.entries(options.headers)) {
        xhr.setRequestHeader(key, value);
      }
    }

    if (xhr.upload && typeof options.onUploadProgress === "function") {
      xhr.upload.addEventListener("progress", options.onUploadProgress);
    }

    xhr.responseType = "blob";
    xhr.onloadend = () => {
      const headers = parseHeaders(xhr.getAllResponseHeaders());

      resolve(
        new Response(
          xhr.status != 204 && xhr.response ? new Blob([xhr.response]) : null,
          {
            status: xhr.status,
            statusText: xhr.statusText,
            headers: headers
          }
        )
      );
    };

    xhr.onerror = () => reject(new TypeError("Network request failed"));
    xhr.ontimeout = () => reject(new TypeError("Network request timed out"));
    xhr.onabort = () => reject(new DOMException("Aborted", "AbortError"));

    xhr.send((options.body as any) ?? null);
  });
}

function parseHeaders(rawHeaders: string): Headers {
  const headers = new Headers();

  rawHeaders
    .trim()
    .split(/[\r\n]+/)
    .forEach((line) => {
      const parts = line.split(": ");
      const key = parts.shift()!;
      headers.set(key, parts.join(": "));
    });
  return headers;
}