export function usePlugin(opts: {}): [string, any];

import { TransformConfig } from "@swc/core";

export function transform(
	code: string,
	opts: {
		filename?: string;
		minify?: boolean;
		env?: {
			targets?: string | string[] | { [K: string]: string };
			mode?: string;
			coreJs?: string;
			exclude?: string[];
			include?: string[];
		};
		plugins?: Array<[string, any]>;
	},
): Promise<{
	code: string;
	map?: string;
}>;
