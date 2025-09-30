import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { serve } from "bun";
import {
  applyRequestInterceptors,
  createFetcher,
  paramsSerializer,
  type RequestConfig,
  transformRequestBody
} from "../";


describe("GIVEN a server", () => {
  let server: ReturnType<typeof serve>;

  beforeAll(() => {
    server = serve({
      routes: {
        "/api/status": (req) => {
          const u = new URL(req.url);
          return Response.json({ ready: true, params: u.searchParams });
        },
        "/uploads": async (req) => {
          const v = await req.text();
          return Response.json({ uploaded: v.length });
        }
      }
    });
  });

  afterAll(() => {
    server.stop();
  });

  describe("GIVEN create fetcher", () => {
    const fetcher = applyRequestInterceptors((requestConfig: RequestConfig<any>) => {
      requestConfig.url = `${server.url}${requestConfig.url}`;
      return requestConfig;
    })(createFetcher({
      paramsSerializer: paramsSerializer,
      transformRequestBody: transformRequestBody
    }));

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
  });
});