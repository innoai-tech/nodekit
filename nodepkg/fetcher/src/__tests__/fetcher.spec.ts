import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { serve } from "bun";
import { applyRequestInterceptors, createDefaultFetcher, type RequestConfig, type UploadProgress } from "../";

describe("GIVEN a server", () => {
  let server: ReturnType<typeof serve>;

  const CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "OPTIONS, POST",
    "Access-Control-Allow-Headers": "Content-Type"
  };

  beforeAll(() => {
    server = serve({
      routes: {
        "/api/status": (req) => {
          const u = new URL(req.url);
          return Response.json({ ready: true, params: u.searchParams }, { headers: CORS_HEADERS });
        },
        "/uploads": async (req) => {
          if (req.method === "OPTIONS") {
            return new Response(null, { headers: CORS_HEADERS });
          }
          const v = await req.text();
          return Response.json({ uploaded: v.length }, {
            headers: CORS_HEADERS
          });
        }
      }
    });
  });

  afterAll(() => {
    server.stop();
  });

  describe("GIVEN create fetcher", () => {
    const fetcher = applyRequestInterceptors((requestConfig: RequestConfig<any>) => {
      const remoteURL = new URL(server.url);

      requestConfig.url = `${remoteURL.origin}${requestConfig.url}`;
      return requestConfig;
    })(createDefaultFetcher());

    it("WHEN request to server", async () => {
      const resp = await fetcher.request({
        method: "GET",
        url: "/api/status",
        params: {
          q: "s"
        }
      });

      expect(resp.status).toBe(200);
      expect(resp.body).toEqual({
        ready: true,
        params: { q: "s" }
      });
    });

    it("WHEN uploads to server", async () => {
      const resp = await fetcher.request({
        method: "POST",
        url: "/uploads",
        headers: {
          "Content-Type": "application/octet-stream"
        },
        body: 123
      });

      expect(resp.status).toBe(200);
      expect(resp.body).toEqual({ uploaded: 3 });
    });

    it("WHEN uploads to server with handling progress", async () => {
      const data = new Array(1024 * 1024).fill(1).join("");

      const resp = await fetcher.request({
        method: "POST",
        url: "/uploads",
        headers: {
          "Content-Type": "application/octet-stream"
        },
        body: new TextEncoder().encode(data),
        onUploadProgress: (p: UploadProgress) => {
          console.log(p.loaded, p.total);
        }
      });

      expect(resp.status).toBe(200);
      expect(resp.body).toEqual({ uploaded: data.length });
    });
  });
});