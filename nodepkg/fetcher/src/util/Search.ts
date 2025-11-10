import { isArray, isObject, isUndefined } from "./Typed.ts";

export const stringifySearch = (
  query: {
    [k: string]: string | string[];
  } = {},
): string => {
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
