export interface RequestConfig<TInputs> {
  method: string;
  url: string;
  inputs: TInputs;
  params?: { [k: string]: any };
  headers?: { [k: string]: any };
  body?: any;
}

export interface RequestConfigCreator<TInputs, TRespData> {
  (input: TInputs): RequestConfig<TInputs>;

  operationID: string;
  TRespData: TRespData;
}

export interface FetcherResponse<TInputs, TData> {
  config: RequestConfig<TInputs>;
  status: number;
  headers: { [k: string]: string };
  body: TData;
}

export interface FetcherErrorResponse<TInputs, TError>
  extends FetcherResponse<TInputs, any> {
  error: TError;
}

export interface Fetcher {
  build: (requestConfig: RequestConfig<any>) => RequestConfig<any>;
  toHref: (requestConfig: RequestConfig<any>) => string;
  request: <TInputs, TData>(requestConfig: RequestConfig<TInputs>) => Promise<FetcherResponse<TInputs, TData>>;
}

export interface FetcherCreatorOptions {
  paramsSerializer: (params: any) => string;
  transformRequestBody: (data: any, headers: { [k: string]: any }) => BodyInit;
}

export type FetcherCreator = (options: FetcherCreatorOptions) => Fetcher;

export type RequestInterceptor = (requestConfig: RequestConfig<any>) => RequestConfig<any>;

export const applyRequestInterceptors =
  (...requestInterceptors: RequestInterceptor[]) =>
    (fetcher: Fetcher) => {
      const build = (requestConfig: RequestConfig<any>) => {
        let config = requestConfig;
        for (const requestInterceptor of requestInterceptors) {
          config = requestInterceptor(config);
        }
        return config;
      };


      return {
        request: <TInputs, TRespData>(requestConfig: RequestConfig<TInputs>) => {
          return fetcher.request<TInputs, TRespData>(build(requestConfig));
        },
        toHref: (requestConfig: RequestConfig<any>): string => {
          return fetcher.toHref(build(requestConfig));
        },
        build
      };
    };
