import { createRequest } from "./client";

export const uploadBlob =
	/*#__PURE__*/ createRequest<
		{
			"Content-Type": string;
			body: File | Blob;
		},
		null
	>(
		"example.UploadBlob",
		({ "Content-Type": header_contentType, body: body }) => ({
			method: "PUT",
			url: "/api/kubepkg.innoai.tech/v1/blobs",
			headers: {
				"Content-Type": header_contentType,
			},
			body: body,
		}),
	);

export const statBlob =
	/*#__PURE__*/ createRequest<
		{
			digest: string;
		},
		null
	>(
		"example.StatBlob",
		({ digest: path_digest }) => ({
			method: "GET",
			url: `/api/kubepkg.innoai.tech/v1/blobs/${path_digest}/stat`,
		}),
	);

export interface MetaV1TypeMeta {
	apiVersion?: string;
	kind?: string;
}

export type MetaV1Time = string;

export interface MetaV1FieldsV1 {}

export type MetaV1ManagedFieldsOperationType = string;

export interface MetaV1ManagedFieldsEntry {
	apiVersion?: string;
	fieldsType?: string;
	fieldsV1?: MetaV1FieldsV1;
	manager?: string;
	operation?: MetaV1ManagedFieldsOperationType;
	subresource?: string;
	time?: MetaV1Time;
}

export type TypesUid = string;

export interface MetaV1OwnerReference {
	apiVersion: string;
	blockOwnerDeletion?: boolean;
	controller?: boolean;
	kind: string;
	name: string;
	uid: TypesUid;
}

export interface MetaV1ObjectMeta {
	annotations?: {
		[k: string]: string;
	};
	clusterName?: string;
	creationTimestamp?: MetaV1Time;
	deletionGracePeriodSeconds?: number;
	deletionTimestamp?: MetaV1Time;
	finalizers?: string[];
	generateName?: string;
	generation?: number;
	labels?: {
		[k: string]: string;
	};
	managedFields?: MetaV1ManagedFieldsEntry[];
	name?: string;
	namespace?: string;
	ownerReferences?: MetaV1OwnerReference[];
	resourceVersion?: string;
	selfLink?: string;
	uid?: TypesUid;
}

export interface KubepkgV1Alpha1Manifests {
	[k: string]: any;
}

export interface KubepkgV1Alpha1KubePkgSpec {
	images?: {
		[k: string]: string;
	};
	manifests?: KubepkgV1Alpha1Manifests;
	version: string;
}

export type KubepkgV1Alpha1FileSize = number;

export enum KubepkgV1Alpha1DigestMetaType {
	blob = "blob",
	manifest = "manifest",
}

export interface KubepkgV1Alpha1DigestMeta {
	digest: string;
	name: string;
	platform?: string;
	size: KubepkgV1Alpha1FileSize;
	tag?: string;
	type: keyof typeof KubepkgV1Alpha1DigestMetaType;
}

export interface KubepkgV1Alpha1Statuses {
	[k: string]: any;
}

export interface KubepkgV1Alpha1KubePkgStatus {
	digests?: KubepkgV1Alpha1DigestMeta[];
	statuses?: KubepkgV1Alpha1Statuses;
}

export interface KubepkgV1Alpha1KubePkg extends MetaV1TypeMeta {
	metadata?: MetaV1ObjectMeta;
	spec?: KubepkgV1Alpha1KubePkgSpec;
	status?: KubepkgV1Alpha1KubePkgStatus;
}

export const listKubePkg =
	/*#__PURE__*/ createRequest<void, KubepkgV1Alpha1KubePkg[]>(
		"example.ListKubePkg",
		() => ({
			method: "GET",
			url: "/api/kubepkg.innoai.tech/v1/kubepkgs",
		}),
	);

export const applyKubePkg =
	/*#__PURE__*/ createRequest<
		{} & (
			| {
				"Content-Type": "application/json";
				body: KubepkgV1Alpha1KubePkg;
			}
			| {
				"Content-Type": "application/octet-stream";
				body: File | Blob;
			}
		),
		KubepkgV1Alpha1KubePkg
	>(
		"example.ApplyKubePkg",
		({ body: body, "Content-Type": contentType }) => ({
			method: "PUT",
			url: "/api/kubepkg.innoai.tech/v1/kubepkgs",
			body: body,
			headers: {
				"Content-Type": contentType,
			},
		}),
	);

export const delKubePkg =
	/*#__PURE__*/ createRequest<
		{
			name: string;
			namespace?: string;
		},
		null
	>(
		"example.DelKubePkg",
		({ name: path_name, namespace: query_namespace }) => ({
			method: "DELETE",
			url: `/api/kubepkg.innoai.tech/v1/kubepkgs/${path_name}`,
			params: {
				namespace: query_namespace,
			},
		}),
	);

export const getKubePkg =
	/*#__PURE__*/ createRequest<
		{
			name: string;
			namespace?: string;
		},
		KubepkgV1Alpha1KubePkg
	>(
		"example.GetKubePkg",
		({ name: path_name, namespace: query_namespace }) => ({
			method: "GET",
			url: `/api/kubepkg.innoai.tech/v1/kubepkgs/${path_name}`,
			params: {
				namespace: query_namespace,
			},
		}),
	);
