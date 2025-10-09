import { paramsSerializer } from "./Search.ts";
import { isArray, isObject } from "./Typed.ts";

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


const isContentTypeApplicationJSON = (headers: any) =>
  getContentType(headers).includes("application/json");


const isContentTypeOctetStream = (headers: any) =>
  getContentType(headers).includes("application/octet-stream");

const isContentTypeFormURLEncoded = (headers: any) =>
  getContentType(headers).includes("application/x-www-form-urlencoded");


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

  if (isContentTypeApplicationJSON(headers)) {
    return JSON.stringify(data);
  }

  if (isArray(data) || isObject(data)) {
    return JSON.stringify(data);
  }

  return data;
};
