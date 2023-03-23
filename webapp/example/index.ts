import { createFetcher, paramsSerializer, transformRequestBody } from "@innoai-tech/fetcher";
import { useAsObservable } from "@innoai-tech/reactutil";

const Fetcher = createFetcher({ paramsSerializer, transformRequestBody });

console.log(Fetcher, useAsObservable);

