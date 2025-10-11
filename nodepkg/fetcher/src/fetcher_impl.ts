import type {
  Fetcher,
  FetcherCreatorOptions,
  FetcherErrorResponse,
  FetcherResponse,
  RequestConfig
} from "./fetcher.ts";
import { xhrFetch } from "./xhr_fetch.ts";
import { paramsSerializer, transformRequestBody } from "./util";

function xFetch(
  url: string,
  options: RequestInit & {
    onUploadProgress?: (evt: ProgressEvent) => void,
  }
): Promise<Response> {
  if (options.onUploadProgress) {
    if (typeof XMLHttpRequest !== "undefined") {
      return xhrFetch(url, options);
    }
  }
  return fetch(url, options);
}

export const createDefaultFetcher = () => createFetcher({
  paramsSerializer: paramsSerializer,
  transformRequestBody: transformRequestBody
});

export const createFetcher = ({
                                paramsSerializer,
                                transformRequestBody
                              }: FetcherCreatorOptions): Fetcher => {

  const toHref = (requestConfig: RequestConfig<any>) => {
    let search = paramsSerializer(requestConfig.params);

    if (search.length && !search.startsWith("?")) {
      search = "?" + search;
    }

    return `${requestConfig.url}${search}`;
  };

  const toRequestBody = (requestConfig: RequestConfig<any>) => {
    return transformRequestBody(requestConfig.body, requestConfig.headers || {});
  };

  return {
    build: (c) => c,
    toRequestBody: toRequestBody,
    toHref: toHref,
    async request<TInputs, TRespData>(requestConfig: RequestConfig<TInputs>) {
      const requestBody = toRequestBody(requestConfig);

      return xFetch(
        toHref(requestConfig), {
          method: requestConfig.method,
          headers: requestConfig.headers || {},
          body: requestBody,
          onUploadProgress: requestConfig.onUploadProgress
        })
        .then(async (res) => {
          let body: any;

          if (res.headers.get("Content-Type")?.includes("application/json")) {
            body = await res.json();
          } else if (
            res.headers
              .get("Content-Type")
              ?.includes("application/octet-stream")
          ) {
            body = await res.blob();
          } else {
            body = await res.text();
          }

          const resp: any = {
            config: requestConfig,
            status: res.status,
            headers: {}
          };

          for (const [key, value] of res.headers.entries()) {
            resp.headers[key] = value;
          }

          resp.body = body as TRespData;

          return resp as FetcherResponse<TInputs, TRespData>;
        })
        .then((resp) => {
          if (resp.status >= 400) {
            (resp as FetcherErrorResponse<TInputs, any>).error = resp.body;
            throw resp;
          }
          return resp;
        });
    }
  };
};