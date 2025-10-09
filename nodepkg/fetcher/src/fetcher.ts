export type RequestConfig<TInputs> = {
  method: string;
  url: string;
  params?: { [k: string]: any };
  headers?: { [k: string]: any };
  body?: any;

  inputs?: TInputs;
  onUploadProgress?: (uploadProgress: UploadProgress) => void;
}

export type UploadProgress = {
  readonly loaded: number;
  readonly total: number;
}

export interface RequestConfigCreator<TInputs, TRespData> {
  (input: TInputs): RequestConfig<TInputs>;

  operationID: string;

  TRespData: TRespData;
}

export interface FetcherResponse<TInputs, TData> {
  config: RequestConfig<TInputs> & { inputs: TInputs };
  status: number;
  headers: { [k: string]: string };
  body: TData;
}

export interface FetcherErrorResponse<TInputs, TError> extends FetcherResponse<TInputs, any> {
  error: TError;
}

export interface Fetcher {
  build(requestConfig: RequestConfig<any>): RequestConfig<any>;

  toHref(requestConfig: RequestConfig<any>): string;

  toRequestBody(requestConfig: RequestConfig<any>): any;

  request<TInputs = undefined, TRespData = any>(requestConfig: RequestConfig<TInputs>): Promise<FetcherResponse<TInputs, TRespData>>;
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
      const build = (requestConfig: RequestConfig<any>): RequestConfig<any> => {
        let config = fetcher.build(requestConfig);

        for (const requestInterceptor of requestInterceptors) {
          config = requestInterceptor(config);
        }

        return config;
      };


      return {
        build,
        toRequestBody: fetcher.toRequestBody,
        request<TInputs = undefined, TRespData = any>(requestConfig: RequestConfig<TInputs>) {
          return fetcher.request<TInputs, TRespData>(build(requestConfig));
        },
        toHref(requestConfig: RequestConfig<any>): string {
          return fetcher.toHref(build(requestConfig));
        }
      };
    };
