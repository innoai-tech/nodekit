import { isArray, isObject, isUndefined } from "@innoai-tech/lodash";

export const stringifySearch = (query: {
  [k: string]: string | string[];
} = {}): string => {
  const p = new URLSearchParams();

  for (const [k, vv] of Object.entries(query)) {
    for (const v of ([] as string[]).concat(vv)) {
      p.append(k, v);
    }
  }

  const s = p.toString();

  return s ? `?${s}` : "";
};

export const parseSearch = (search: string): { [k: string]: string[] } => {
  let s = search;
  if (s[0] === "?") {
    s = s.slice(1);
  }
  const p = new URLSearchParams(s);

  const labels: { [k: string]: string[] } = {};
  for (const [k, v] of p) {
    labels[k] = [...(labels[k] || []), v];
  }
  return labels;
};

const getContentType = (headers: any = {}) =>
  headers["Content-Type"] || headers["content-type"] || "";

const dropContentType = (headers: any = {}) => {
  if (headers["Content-Type"]) {
    headers["Content-Type"] = undefined;
  }
  if (headers["content-type"]) {
    headers["content-type"] = undefined;
  }
};

const isContentTypeMultipartFormData = (headers: any) =>
  getContentType(headers).includes("multipart/form-data");


const isContentTypeOctetStream = (headers: any) =>
  getContentType(headers).includes("application/octet-stream");

const isContentTypeFormURLEncoded = (headers: any) =>
  getContentType(headers).includes("application/x-www-form-urlencoded");

export const paramsSerializer = (params: any): string => {
  const searchParams = new URLSearchParams();

  const append = (k: string, v: any) => {
    if (isArray(v)) {
      for (const x of v) {
        append(k, x);
      }
      return;
    }
    if (isObject(v)) {
      append(k, JSON.stringify(v));
      return;
    }
    if (isUndefined(v) || `${v}`.length === 0) {
      return;
    }

    searchParams.append(k, `${v}`);
  };

  if (params) {
    for (const [k, v] of Object.entries(params)) {
      append(k, v);
    }
  }


  return searchParams.toString();
};

export const transformRequestBody = (data: any, headers: any) => {
  if (isContentTypeMultipartFormData(headers)) {
    // https://github.com/github/fetch/issues/505#issuecomment-293064470
    dropContentType(headers);

    const formData = new FormData();

    const appendValue = (k: string, v: any) => {
      if (v instanceof File || v instanceof Blob) {
        formData.append(k, v);
      } else if (isArray(v)) {
        for (const item of v) {
          appendValue(k, item);
        }
      } else if (isObject(v)) {
        formData.append(k, JSON.stringify(v));
      } else {
        formData.append(k, v as string);
      }
    };

    for (const [k, v] of data) {
      appendValue(k, v);
    }

    return formData;
  }

  if (isContentTypeFormURLEncoded(headers)) {
    return paramsSerializer(data);
  }

  if (isContentTypeOctetStream(headers)) {
    return data;
  }

  if (isArray(data) || isObject(data)) {
    return JSON.stringify(data);
  }

  return data;
};
