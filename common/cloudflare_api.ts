//#region Durable objects

export async function listDurableObjectsNamespaces(accountId: string, apiToken: string): Promise<readonly DurableObjectsNamespace[]> {
    const url = `${computeAccountBaseUrl(accountId)}/workers/durable_objects/namespaces`;
    return (await execute('listDurableObjectsNamespaces', 'GET', url, apiToken) as ListDurableObjectsNamespacesResponse).result;
}

export interface ListDurableObjectsNamespacesResponse extends CloudflareApiResponse {
    readonly result: readonly DurableObjectsNamespace[];
}

export async function createDurableObjectsNamespace(accountId: string, apiToken: string, payload: { name: string, script?: string, class?: string }): Promise<DurableObjectsNamespace> {
    const url = `${computeAccountBaseUrl(accountId)}/workers/durable_objects/namespaces`;
    return (await execute('createDurableObjectsNamespace', 'POST', url, apiToken, payload) as CreateDurableObjectsNamespaceResponse).result;
}

export interface CreateDurableObjectsNamespaceResponse extends CloudflareApiResponse {
    readonly result: DurableObjectsNamespace;
}

export async function updateDurableObjectsNamespace(accountId: string, apiToken: string, payload: { id: string, name?: string, script?: string, class?: string }): Promise<DurableObjectsNamespace> {
    const url = `${computeAccountBaseUrl(accountId)}/workers/durable_objects/namespaces/${payload.id}`;
    return (await execute('updateDurableObjectsNamespace', 'PUT', url, apiToken, payload) as UpdateDurableObjectsNamespaceResponse).result;
}

export interface UpdateDurableObjectsNamespaceResponse extends CloudflareApiResponse {
    readonly result: DurableObjectsNamespace;
}

export async function deleteDurableObjectsNamespace(accountId: string, apiToken: string, namespaceId: string): Promise<void> {
    const url = `${computeAccountBaseUrl(accountId)}/workers/durable_objects/namespaces/${namespaceId}`;
    await execute('deleteDurableObjectsNamespace', 'DELETE', url, apiToken) as CloudflareApiResponse;
}

export interface DurableObjectsNamespace {
    readonly id: string;
    readonly name: string;
    readonly script: string | null;
    readonly class: string | undefined;
}

export async function listDurableObjects(accountId: string, namespaceId: string, apiToken: string, opts: { limit?: number, cursor?: string } = {}): Promise<{ objects: readonly DurableObject[], cursor?: string }> {
    const { limit, cursor } = opts;
    const url = new URL(`${computeAccountBaseUrl(accountId)}/workers/durable_objects/namespaces/${namespaceId}/objects`);
    if (typeof limit === 'number') url.searchParams.set('limit', String(limit));
    if (typeof cursor === 'string') url.searchParams.set('cursor', cursor);
    const { result, result_info } = await execute('listDurableObjects', 'GET', url.toString(), apiToken) as ListDurableObjectsResponse;
    const resultCursor = result_info.cursor !== '' ? result_info.cursor : undefined;
    return { objects: result, cursor: resultCursor };
}

export interface ListDurableObjectsResponse extends CloudflareApiResponse {
    readonly result: readonly DurableObject[];
    readonly result_info: {
        readonly count: number;
        readonly cursor: string;
    }
}

export interface DurableObject {
    readonly id: string;
    readonly hasStorageData: boolean;
}

//#endregion

//#region Worker scripts

export async function listScripts(accountId: string, apiToken: string): Promise<readonly Script[]> {
    const url = `${computeAccountBaseUrl(accountId)}/workers/scripts`;
    return (await execute('listScripts', 'GET', url, apiToken) as ListScriptsResponse).result;
}

export interface ListScriptsResponse extends CloudflareApiResponse {
    readonly result: readonly Script[];
}

export async function putScript(accountId: string, scriptName: string, apiToken: string, opts: { scriptContents: Uint8Array, bindings?: Binding[], migrations?: Migrations, parts?: Part[], isModule: boolean, usageModel?: 'bundled' | 'unbound' }): Promise<Script> {
    const { scriptContents, bindings, migrations, parts, isModule, usageModel } = opts;
    const url = `${computeAccountBaseUrl(accountId)}/workers/scripts/${scriptName}`;
    const formData = new FormData();
    const metadata: Record<string, unknown> = { 
        bindings, 
        usage_model: usageModel,
        migrations
    };

    if (isModule) {
        metadata['main_module'] = 'main';
    } else {
        metadata['body_part'] = 'script';   
    }
    if (CloudflareApi.DEBUG) console.log('metadata', JSON.stringify(metadata, undefined, 2));
    const metadataBlob = new Blob([ JSON.stringify(metadata) ], { type: APPLICATION_JSON });
    formData.set('metadata', metadataBlob);
    if (isModule) {
        const scriptBlob = new Blob([ scriptContents.buffer ], { type: 'application/javascript+module' });
        formData.set('script', scriptBlob, 'main');
    } else {
        const scriptBlob = new Blob([ scriptContents.buffer ], { type: 'application/javascript' });
        formData.set('script', scriptBlob);
    }
   
    for (const { name, value, fileName } of (parts || [])) {
        formData.set(name, value, fileName);
    }
    return (await execute('putScript', 'PUT', url, apiToken, formData) as PutScriptResponse).result;
}

export type Binding = PlainTextBinding | SecretTextBinding | KvNamespaceBinding | DurableObjectNamespaceBinding | WasmModuleBinding | ServiceBinding | R2BucketBinding | AnalyticsEngineBinding | D1DatabaseBinding;

export interface PlainTextBinding {
    readonly type: 'plain_text';
    readonly name: string;
    readonly text: string;
}

export interface SecretTextBinding {
    readonly type: 'secret_text';
    readonly name: string;
    readonly text: string;
}

export interface KvNamespaceBinding {
    readonly type: 'kv_namespace';
    readonly name: string;
    readonly 'namespace_id': string;
}

export interface DurableObjectNamespaceBinding {
    readonly type: 'durable_object_namespace';
    readonly name: string;
    readonly 'namespace_id': string;
}

export interface WasmModuleBinding {
    readonly type: 'wasm_module';
    readonly name: string;
    readonly part: string;
}

export interface ServiceBinding {
    readonly type: 'service';
    readonly name: string;
    readonly service: string;
    readonly environment: string;
}

export interface R2BucketBinding {
    readonly type: 'r2_bucket';
    readonly name: string;
    readonly 'bucket_name': string;
}

export interface AnalyticsEngineBinding {
    readonly type: 'analytics_engine';
    readonly name: string;
    readonly dataset: string;
}

export interface D1DatabaseBinding {
    readonly type: 'd1';
    readonly name: string;
    readonly id: string;
}

// this is likely not correct, but it works to delete obsolete DO classes at least
export interface Migrations {
    readonly tag: string;
    readonly deleted_classes: string[];
}

export interface Part {
    readonly name: string;
    readonly value: string | Blob;
    readonly fileName?: string;
    readonly valueBytes?: Uint8Array;
}

export interface PutScriptResponse extends CloudflareApiResponse {
    readonly result: Script;
}

export async function deleteScript(accountId: string, scriptName: string, apiToken: string): Promise<DeleteScriptResult> {
    const url = `${computeAccountBaseUrl(accountId)}/workers/scripts/${scriptName}`;
    return (await execute('deleteScript', 'DELETE', url, apiToken) as DeleteScriptResponse).result;
}

export interface DeleteScriptResponse extends CloudflareApiResponse {
    readonly result: DeleteScriptResult;
}

export interface DeleteScriptResult {
    readonly id: string;
}

export interface Script {
    readonly id: string;
    readonly etag: string;
    readonly handlers: readonly string[];
    readonly 'named_handlers'?: readonly NamedHandler[];
    readonly 'modified_on': string;
    readonly 'created_on': string;
    readonly 'usage_model': string;
}

export interface NamedHandler {
    readonly name: string;
    readonly handlers: readonly string[];
}

//#endregion

//#region Worker Account Settings

export async function getWorkerAccountSettings(accountId: string, apiToken: string): Promise<WorkerAccountSettings> {
    const url = `${computeAccountBaseUrl(accountId)}/workers/account-settings`;
    return (await execute('getWorkerAccountSettings', 'GET', url, apiToken) as WorkerAccountSettingsResponse).result;
}

export async function putWorkerAccountSettings(accountId: string, apiToken: string, opts: { defaultUsageModel: 'bundled' | 'unbound' }): Promise<WorkerAccountSettings> {
    const { defaultUsageModel: default_usage_model } = opts;
    const url = `${computeAccountBaseUrl(accountId)}/workers/account-settings`;
    return (await execute('putWorkerAccountSettings', 'PUT', url, apiToken, { default_usage_model }) as WorkerAccountSettingsResponse).result;
}

export interface WorkerAccountSettings {
    readonly 'default_usage_model': string,
    readonly 'green_compute': boolean,
}

export interface WorkerAccountSettingsResponse extends CloudflareApiResponse {
    readonly result: WorkerAccountSettings;
}

//#endregion

//#region Workers KV

export async function getKeyValue(accountId: string, namespaceId: string, key: string, apiToken: string): Promise<Uint8Array | undefined> {
    const url = `${computeAccountBaseUrl(accountId)}/storage/kv/namespaces/${namespaceId}/values/${key}`;
    return await execute('getKeyValue', 'GET', url, apiToken, undefined, 'bytes?');
}

export async function getKeyMetadata(accountId: string, namespaceId: string, key: string, apiToken: string): Promise<Record<string, string> | undefined> {
    const url = `${computeAccountBaseUrl(accountId)}/storage/kv/namespaces/${namespaceId}/metadata/${key}`;
    const res = await execute('getKeyMetadata', 'GET', url, apiToken, undefined, 'json?');
    return res ? (res as GetKeyMetadataResponse).result : undefined;
}

export interface GetKeyMetadataResponse extends CloudflareApiResponse {
    readonly result: Record<string, string>;
}

/**
 * Write key-value pair
 * https://api.cloudflare.com/#workers-kv-namespace-write-key-value-pair
 * 
 * Write key-value pair with metadata
 * https://api.cloudflare.com/#workers-kv-namespace-write-key-value-pair-with-metadata
 */
export async function putKeyValue(accountId: string, namespaceId: string, key: string, value: string, apiToken: string, opts: { expiration?: number, expirationTtl?: number, metadata?: Record<string, unknown> } = {}) {
    const { expiration, expirationTtl, metadata } = opts;
    const url = new URL(`${computeAccountBaseUrl(accountId)}/storage/kv/namespaces/${namespaceId}/values/${key}`);
    if (typeof expiration === 'number') url.searchParams.set('expiration', expiration.toString());
    if (typeof expirationTtl === 'number') url.searchParams.set('expirationTtl', expirationTtl.toString());

    if (isStringRecord(metadata) && Object.keys(metadata).length > 0) {
        const form = new FormData();
        form.set('value', value);
        form.set('metadata', JSON.stringify(metadata));
        await execute('putKeyValueWithMetadata', 'PUT', url.toString(), apiToken, form);
    } else {
        await execute('putKeyValue', 'PUT', url.toString(), apiToken, value);
    }
}

//#endregion

//#region Workers Tails

/**
 * List Tails
 * Lists all active Tail sessions for a given Worker
 * https://api.cloudflare.com/#worker-tails-list-tails
 */
export async function listTails(accountId: string, scriptName: string, apiToken: string): Promise<readonly Tail[]> {
    const url = `${computeAccountBaseUrl(accountId)}/workers/scripts/${scriptName}/tails`;
    return (await execute('listTails', 'GET', url, apiToken) as ListTailsResponse).result;
}

/**
 * Create Tail
 * https://api.cloudflare.com/#worker-create-tail
 * 
 * Constrained to at most one tail per script
 */
export async function createTail(accountId: string, scriptName: string, apiToken: string): Promise<Tail> {
    const url = `${computeAccountBaseUrl(accountId)}/workers/scripts/${scriptName}/tails`;
    return (await execute('createTail', 'POST', url, apiToken) as CreateTailResponse).result;
}

/**
 * Send Tail Heartbeat
 * https://api.cloudflare.com/#worker-tail-heartbeat
 */
export async function sendTailHeartbeat(accountId: string, scriptName: string, tailId: string, apiToken: string): Promise<Tail> {
    const url = `${computeAccountBaseUrl(accountId)}/workers/scripts/${scriptName}/tails/${tailId}/heartbeat`;
    return (await execute('sendTailHeartbeat', 'POST', url, apiToken) as SendTailHeartbeatResponse).result;
}

/**
 * Delete Tail
 * https://api.cloudflare.com/#worker-delete-tail
 */
export async function deleteTail(accountId: string, scriptName: string, tailId: string, apiToken: string): Promise<void> {
    const url = `${computeAccountBaseUrl(accountId)}/workers/scripts/${scriptName}/tails/${tailId}`;
    await execute('deleteTail', 'DELETE', url, apiToken); // result = null
}

export interface CreateTailResponse extends CloudflareApiResponse {
    readonly result: Tail;
}

export interface Tail {
    readonly id: string; // cf id
    readonly url: string // e.g. wss://tail.developers.workers.dev/<tail-id>
    readonly 'expires_at': string; // e.g. 2021-08-20T23:45:17Z  (4-6 hrs from creation)
}

export interface ListTailsResponse extends CloudflareApiResponse {
    readonly result: readonly Tail[];
}

export interface SendTailHeartbeatResponse extends CloudflareApiResponse {
    readonly result: Tail;
}

//#endregion

//#region R2

/**
 * List R2 Buckets
 */
export async function listR2Buckets(accountId: string, apiToken: string): Promise<readonly Bucket[]> {
    const url = `${computeAccountBaseUrl(accountId)}/r2/buckets`;
    return (await execute('listR2Buckets', 'GET', url, apiToken) as ListR2BucketsResponse).result.buckets;
}

export interface ListR2BucketsResponse extends CloudflareApiResponse {
    readonly result: { buckets: readonly Bucket[]; };
}

export interface Bucket {
    readonly name: string;
    readonly creation_date: string;
}

/**
 * Create R2 Bucket
 * 
 * @throws if exists and owned: 409 10004 The bucket you tried to create already exists, and you own it.
 */
export async function createR2Bucket(accountId: string, bucketName: string, apiToken: string): Promise<void> {
    const url = `${computeAccountBaseUrl(accountId)}/r2/buckets/${bucketName}`;
    await execute('createR2Bucket', 'PUT', url, apiToken);
    // result is: {}
}

/**
 * Delete R2 Bucket
 * 
 * @throws if not exists: 404 10006 The specified bucket does not exist.
 */
export async function deleteR2Bucket(accountId: string, bucketName: string, apiToken: string): Promise<void> {
    const url = `${computeAccountBaseUrl(accountId)}/r2/buckets/${bucketName}`;
    await execute('deleteR2Bucket', 'DELETE', url, apiToken);
    // result is: {}
}

//#endregion

//#region Flags

/**
 * List Account Flags
 */
export async function listFlags(accountId: string, apiToken: string): Promise<FlagsResult> {
    const url = `${computeAccountBaseUrl(accountId)}/flags`;
    return (await execute('listFlags', 'GET', url, apiToken) as ListFlagsResponse).result;
}

export type FlagsResult = Record<string, Record<string, unknown>>;

export interface ListFlagsResponse extends CloudflareApiResponse {
    readonly result: FlagsResult;
}

//#endregion

//#region Workers Domains

export async function listWorkersDomains(accountId: string, apiToken: string, opts: { hostname?: string } = {}): Promise<readonly WorkersDomain[]> {
    const { hostname } = opts;
    const url = new URL(`${computeAccountBaseUrl(accountId)}/workers/domains`);
    if (hostname) url.searchParams.set('hostname', hostname);
    return (await execute('listWorkersDomains', 'GET', url.toString(), apiToken) as ListWorkersDomainsResponse).result;
}

export interface ListWorkersDomainsResponse extends CloudflareApiResponse {
    readonly result: readonly WorkersDomain[];
}

export async function putWorkersDomain(accountId: string, apiToken: string, opts: { hostname: string, zoneId: string, service: string, environment: string }): Promise<WorkersDomain> {
    const { hostname, zoneId, service, environment } = opts;
    const url = new URL(`${computeAccountBaseUrl(accountId)}/workers/domains`);

    return (await execute('putWorkersDomain', 'PUT', url.toString(), apiToken, { hostname, zone_id: zoneId, service, environment }) as PutWorkersDomainResponse).result;
}

export interface PutWorkersDomainResponse extends CloudflareApiResponse {
    readonly result: WorkersDomain;
}

export async function deleteWorkersDomain(accountId: string, apiToken: string, opts: { workersDomainId: string }): Promise<void> {
    const { workersDomainId } = opts;
    const url = `${computeAccountBaseUrl(accountId)}/workers/domains/${workersDomainId}`;

    await execute('deleteWorkersDomain', 'DELETE', url, apiToken, undefined, 'empty');
}

export interface WorkersDomain {
    readonly id: string;
    readonly zone_id: string;
    readonly zone_name: string;
    readonly hostname: string;
    readonly service: string;
    readonly environment: string;
}

//#endregion

//#region Zones

export interface ListZonesOpts {

    /**
     * Whether to match all search requirements or at least one (any)
     * 
     * default: all
     */
    readonly match?: 'any' | 'all';

    /**
     * A domain name
     * 
     * max length: 253
     */
    readonly name?: string;

    /**
     * Field to order zones by
     * 
     * valid values: name, status, account.id, account.name
     */
    readonly order?: 'name' | 'status' | 'account.id' | 'account.name';

    /**
     * Page number of paginated results
     * 
     * default value: 1
     * min value:1
     */
    readonly page?: number;

    /**
     * Number of zones per page
     * 
     * default value: 20
     * min value:5
     * max value:50 (found max value:1000)
     */
    readonly perPage?: number;

    /** Status of the zone */
    readonly status?: ZoneStatus;

    /** Direction to order zones */
    readonly direction?: 'asc' | 'desc';
}

export async function listZones(accountId: string, apiToken: string, opts: ListZonesOpts = {}) {
    const { match, name, order, page, perPage, status, direction } = opts;
    const url = new URL(`${computeBaseUrl()}/zones`);
    url.searchParams.set('account.id', accountId);
    if (match) url.searchParams.set('match', match);
    if (name) url.searchParams.set('name', name);
    if (order) url.searchParams.set('order', order);
    if (page) url.searchParams.set('page', String(page));
    if (perPage) url.searchParams.set('per_page', String(perPage));
    if (status) url.searchParams.set('status', status);
    if (direction) url.searchParams.set('direction', direction);
    return (await execute('listZones', 'GET', url.toString(), apiToken) as ListZonesResponse).result;
}

export interface ListZonesResponse extends CloudflareApiResponse {
    readonly result: readonly Zone[];
    readonly result_info: ResultInfo;
}

export type ZoneStatus = 'active' | 'pending' | 'initializing' | 'moved' | 'deleted' | 'deactivated' | 'read only';

export interface Zone {
    /**
     * Zone identifier tag
     * 
     * max length: 32
     * read only
     */
    readonly id: string;

    /**
     * The domain name
     * 
     * max length: 253
     * read only
     * pattern: ^([a-zA-Z0-9][\-a-zA-Z0-9]*\.)+[\-a-zA-Z0-9]{2,20}$
     */
    readonly name: string;

    /**
     * Status of the zone
     */
    readonly status: ZoneStatus;

    /**
     * Indicates if the zone is only using Cloudflare DNS services. A true value means the zone will not receive security or performance benefits.
     * 
     * default value: false
     * read only
     */
    readonly paused: boolean;

    /**
     * A full zone implies that DNS is hosted with Cloudflare. A partial zone is typically a partner-hosted zone or a CNAME setup.
     */
    readonly type: 'full' | 'partial';

    /**
     * The interval (in seconds) from when development mode expires (positive integer) or last expired (negative integer) for the domain. If development mode has never been enabled, this value is 0.
     * 
     * read only
     */
    readonly development_mode: number;

    // TODO others as needed
}

//#endregion

//#region Verify Token

export async function verifyToken(apiToken: string): Promise<VerifyTokenResult> {
    const url = `${computeBaseUrl()}/user/tokens/verify`;
    return (await execute('verifyToken', 'GET', url, apiToken) as VerifyTokenResponse).result;
}

export interface VerifyTokenResponse extends CloudflareApiResponse {
    readonly result: VerifyTokenResult;
}

export interface VerifyTokenResult {
    readonly id: string;
    readonly status: string; // e.g. active
}

//#endregion

//#region Memberships

export interface ListMembershipsOpts {

    /** Status of this membership */
    readonly status?: MembershipStatus;

    /** 
     * Account name
     * 
     * max length: 100
     */
    readonly accountName?: string;

    /**
     * Field to order zones by
     * 
     * valid values: name, status, account.id, account.name
     */
    readonly order?: 'id' | 'status' | 'account.name';

    /**
     * Page number of paginated results
     * 
     * default value: 1
     * min value:1
     */
    readonly page?: number;

    /**
     * Number of memberships per page
     * 
     * default value: 20
     * min value:5
     * max value:50 (found max value:1000)
     */
    readonly perPage?: number;

    /** Direction to order zones */
    readonly direction?: 'asc' | 'desc';
}

export async function listMemberships(apiToken: string, opts: ListMembershipsOpts = {}) {
    const { status, accountName, order, page, perPage, direction } = opts;
    const url = new URL(`${computeBaseUrl()}/memberships`);
    if (status) url.searchParams.set('status', status);
    if (accountName) url.searchParams.set('account.name', accountName);
    if (order) url.searchParams.set('order', order);
    if (page) url.searchParams.set('page', String(page));
    if (perPage) url.searchParams.set('per_page', String(perPage));
    if (direction) url.searchParams.set('direction', direction);
    return (await execute('listMemberships', 'GET', url.toString(), apiToken) as ListMembershipsResponse).result;
}

export interface ListMembershipsResponse extends CloudflareApiResponse {
    readonly result: readonly Membership[];
    readonly result_info: ResultInfo;
}

export type MembershipStatus = 'accepted' | 'pending' | 'rejected';

export interface Membership {
    /** 
     * Membership identifier tag
     * 
     * max length: 32
     * read only
     */
    readonly id: string;

    /**
     * The unique activation code for the account membership
     * 
     * max length: 64
     * read only
     */
    readonly code: string;

    /** Status of this membership */
    readonly status: MembershipStatus;

    readonly account: Account;

    /** List of role names for the User at the Account */
    readonly roles: readonly string[];

    // e.g. { "analytics": { "read": true, "write": true } }
    readonly permissions: Record<string, unknown>;
}

//#endregion

//#region Accounts

export interface ListAccountsOpts {

    /** Name of the account */
    readonly name?: string;

    /**
     * Page number of paginated results
     * 
     * default value: 1
     * min value:1
     */
    readonly page?: number;

    /**
     * Number of memberships per page
     * 
     * default value: 20
     * min value:5
     * max value:50 (found max value:1000)
     */
    readonly perPage?: number;

    /** Direction to order zones */
    readonly direction?: 'asc' | 'desc';
}

export async function listAccounts(apiToken: string, opts: ListAccountsOpts = {}) {
    const { name, page, perPage, direction } = opts;
    const url = new URL(`${computeBaseUrl()}/accounts`);
    if (name) url.searchParams.set('name', name);
    if (page) url.searchParams.set('page', String(page));
    if (perPage) url.searchParams.set('per_page', String(perPage));
    if (direction) url.searchParams.set('direction', direction);
    return (await execute('listAccounts', 'GET', url.toString(), apiToken) as ListAccountsResponse).result;
}

export interface ListAccountsResponse extends CloudflareApiResponse {
    readonly result: readonly Account[];
    readonly result_info: ResultInfo;
}

export interface Account {
    /**
     * Account identifier tag
     * 
     * max length: 32
     * read only
     */
    readonly id: string;

    /**
     * Account name
     * 
     * max length: 100
     * read only
     */
    readonly name: string;

    /** Account settings */
    readonly settings: Record<string, unknown>;

    /** Describes when account was created */
    readonly created_on: string; // instant
}

//#endregion

//#region User

export async function getUser(apiToken: string): Promise<User> {
    const url = `${computeBaseUrl()}/user`;
    return (await execute('getUser', 'GET', url, apiToken) as UserResponse).result;
}

export interface UserResponse extends CloudflareApiResponse {
    readonly result: User;
}

export interface User {
    /**
     * User identifier tag
     * 
     * max length: 32
     * read only
     */
    readonly id: string;

    /**
     * Your contact email address
     * 
     * max length: 90
     */
    readonly email: string;

    readonly has_pro_zones: boolean;
    readonly has_business_zones: boolean;
    readonly has_enterprise_zones: boolean;

    /** Indicates whether the user is prevented from performing certain actions within their account */
    readonly suspended: boolean;

    // TODO as needed
}

//#endregion

//#region Pub/Sub

export async function listPubsubNamespaces(accountId: string, apiToken: string): Promise<PubsubNamespace[]> {
    const url = `${computeBaseUrl()}/accounts/${accountId}/pubsub/namespaces`;
    return (await execute('listPubsubNamespaces', 'GET', url, apiToken) as ListPubsubNamespacesResponse).result;
}

export interface ListPubsubNamespacesResponse extends CloudflareApiResponse {
    readonly result: PubsubNamespace[];
}

export async function createPubsubNamespace(accountId: string, apiToken: string, payload: { name: string }): Promise<PubsubNamespace> {
    const url = `${computeAccountBaseUrl(accountId)}/pubsub/namespaces`;
    return (await execute('createPubsubNamespace', 'POST', url, apiToken, payload) as CreatePubsubNamespaceResponse).result;
}

export interface CreatePubsubNamespaceResponse extends CloudflareApiResponse {
    readonly result: PubsubNamespace;
}

export interface PubsubNamespace {
    readonly id: string;
    readonly name: string;
    readonly description: string;
    readonly created_on: string;
    readonly modified_on: string;
}

export async function deletePubsubNamespace(accountId: string, apiToken: string, namespaceName: string): Promise<void> {
    const url = `${computeAccountBaseUrl(accountId)}/pubsub/namespaces/${namespaceName}`;
    await execute('deletePubsubNamespace', 'DELETE', url, apiToken);
    // 200, result = null
}

export async function listPubsubBrokers(accountId: string, apiToken: string, namespaceName: string): Promise<unknown> {
    const url = `${computeBaseUrl()}/accounts/${accountId}/pubsub/namespaces/${namespaceName}/brokers`;
    return (await execute('listPubsubBrokers', 'GET', url, apiToken) as ListPubsubBrokersResponse).result;
}

export interface ListPubsubBrokersResponse extends CloudflareApiResponse {
    readonly result: PubsubBroker[];
}

export interface PubsubBroker {
    readonly id: string;
    readonly name: string;
    readonly auth_type: string; // TOKEN
    readonly created_on: string;
    readonly modified_on: string;
    readonly expiration: null;
    readonly endpoint: string; // mqtts://<broker-name>.<namespace-name>.cloudflarepubsub.com:8883
    readonly on_publish?: { url: string };
}

export async function createPubsubBroker(accountId: string, apiToken: string, namespaceName: string, payload: { name: string, authType: string }): Promise<PubsubBroker> {
    const url = `${computeAccountBaseUrl(accountId)}/pubsub/namespaces/${namespaceName}/brokers`;
    return (await execute('createPubsubBroker', 'POST', url, apiToken, payload) as CreatePubsubBrokerResponse).result;
}

export interface CreatePubsubBrokerResponse extends CloudflareApiResponse {
    readonly result: PubsubBroker;
}

export async function updatePubsubBroker(accountId: string, apiToken: string, namespaceName: string, brokerName: string, opts: { expiration?: number | null, onPublishUrl?: string | null }): Promise<void> {
    const { expiration, onPublishUrl } = opts;
    const url = `${computeAccountBaseUrl(accountId)}/pubsub/namespaces/${namespaceName}/brokers/${brokerName}`;
    const payload: Record<string, unknown> = {};
    if (expiration !== undefined) payload.expiration = expiration;
    if (onPublishUrl === null || typeof onPublishUrl === 'string') payload.on_publish = { url: onPublishUrl };
    await execute('updatePubsubBroker', 'PATCH', url.toString(), apiToken, payload);
}

export async function listPubsubBrokerPublicKeys(accountId: string, apiToken: string, namespaceName: string, brokerName: string): Promise<PubsubBrokerPublicKeys> {
    const url = `${computeAccountBaseUrl(accountId)}/pubsub/namespaces/${namespaceName}/brokers/${brokerName}/publickeys`;
    return (await execute('listPubsubBrokerPublicKeys', 'GET', url, apiToken) as ListPubsubBrokerPublicKeysResponse).result;
}

export interface ListPubsubBrokerPublicKeysResponse extends CloudflareApiResponse {
    readonly result: PubsubBrokerPublicKeys;
}

export interface PubsubBrokerPublicKeys {
    readonly keys: Record<string, string>[];
}

export async function getPubsubBroker(accountId: string, apiToken: string, namespaceName: string, brokerName: string): Promise<PubsubBroker> {
    const url = `${computeAccountBaseUrl(accountId)}/pubsub/namespaces/${namespaceName}/brokers/${brokerName}`;
    return (await execute('getPubsubBroker', 'GET', url, apiToken) as GetPubsubBrokerResponse).result;
}

export interface GetPubsubBrokerResponse extends CloudflareApiResponse {
    readonly result: PubsubBroker;
}

export async function deletePubsubBroker(accountId: string, apiToken: string, namespaceName: string, brokerName: string): Promise<void> {
    const url = `${computeAccountBaseUrl(accountId)}/pubsub/namespaces/${namespaceName}/brokers/${brokerName}`;
    await execute('deletePubsubBroker', 'DELETE', url, apiToken);
    // 200, result = null
}

export async function generatePubsubCredentials(accountId: string, apiToken: string, namespaceName: string, brokerName: string, payload: { number: number, type: string, topicAcl: string, clientIds?: string[], expiration?: number }): Promise<Record<string, string>> {
    const { number, type, topicAcl, clientIds, expiration } = payload;
    const url = new URL(`${computeAccountBaseUrl(accountId)}/pubsub/namespaces/${namespaceName}/brokers/${brokerName}/credentials`);
    url.searchParams.set('number', String(number));
    url.searchParams.set('type', type);
    url.searchParams.set('topicAcl', topicAcl);
    if (typeof expiration === 'number') url.searchParams.set('expiration', String(expiration));
    (clientIds ?? []).forEach(v => url.searchParams.append('clientid', v));
    return (await execute('generatePubsubCredentials', 'GET', url.toString(), apiToken) as GeneratePubsubCredentialsResponse).result;
}

export interface GeneratePubsubCredentialsResponse extends CloudflareApiResponse {
    readonly result: Record<string, string>;
}

export async function revokePubsubCredentials(accountId: string, apiToken: string, namespaceName: string, brokerName: string, ...jwtIds: string[]): Promise<void> {
    const url = new URL(`${computeAccountBaseUrl(accountId)}/pubsub/namespaces/${namespaceName}/brokers/${brokerName}/revocations`);
    if (jwtIds.length === 0) throw new Error(`Must include at least one JWT id to revoke`);
    url.searchParams.set('jti', jwtIds.join(','));
    await execute('revokePubsubCredentials', 'POST', url.toString(), apiToken);
    // 200, result = null
}

export async function listPubsubRevocations(accountId: string, apiToken: string, namespaceName: string, brokerName: string): Promise<unknown> {
    const url = `${computeBaseUrl()}/accounts/${accountId}/pubsub/namespaces/${namespaceName}/brokers/${brokerName}/revocations`;
    return (await execute('listPubsubRevocations', 'GET', url, apiToken) as ListPubsubRevocationsResponse).result;
}

export interface ListPubsubRevocationsResponse extends CloudflareApiResponse {
    readonly result: string[]; // JWT ids
}

export async function deletePubsubRevocations(accountId: string, apiToken: string, namespaceName: string, brokerName: string, ...jwtIds: string[]): Promise<void> {
    const url = new URL(`${computeAccountBaseUrl(accountId)}/pubsub/namespaces/${namespaceName}/brokers/${brokerName}/revocations`);
    url.searchParams.set('jti', jwtIds.join(','));
    await execute('deletePubsubRevocations', 'DELETE', url.toString(), apiToken);
    // 200, result = null
}

//#endregion

//#region Analytics Engine

export async function queryAnalyticsEngine(accountId: string, apiToken: string, query: string): Promise<string> {
    const url = `${computeAccountBaseUrl(accountId)}/analytics_engine/sql`;
    return await execute('queryAnalyticsEngine', 'POST', url, apiToken, query, 'text');
}

//#endregion

//#region D1

export async function createD1Database(accountId: string, apiToken: string, databaseName: string): Promise<D1Database> {
    const url = `${computeAccountBaseUrl(accountId)}/d1/database`;
    return (await execute('createD1Database', 'POST', url, apiToken, { name: databaseName }) as CreateD1DatabaseResponse).result;
}

export interface CreateD1DatabaseResponse extends CloudflareApiResponse {
    readonly result: D1Database;
}

export async function listD1Databases(accountId: string, apiToken: string): Promise<D1Database[]> {
    const url = `${computeAccountBaseUrl(accountId)}/d1/database`;
    return (await execute('listD1Databases', 'GET', url, apiToken) as ListD1DatabasesResponse).result;
}

export interface ListD1DatabasesResponse extends CloudflareApiResponse {
    readonly result: D1Database[];
    readonly result_info: ResultInfo;
}

export interface D1Database {
    readonly uuid: string; // dashed v4 guid
    readonly name: string;
}

export async function deleteD1Database(accountId: string, apiToken: string, databaseUuid: string): Promise<void> {
    const url = `${computeAccountBaseUrl(accountId)}/d1/database/${databaseUuid}`;
    await execute('deleteD1Database', 'DELETE', url.toString(), apiToken);
    // 200 result: null
}

export async function queryD1Database(accountId: string, apiToken: string, databaseUuid: string, sql: string, params: (null | number | string | ArrayBuffer)[] = []): Promise<D1QueryResult[]> {
    const url = `${computeAccountBaseUrl(accountId)}/d1/database/${databaseUuid}/query`;
    const payload = { sql, params };
    return (await execute('queryD1Database', 'POST', url, apiToken, payload) as QueryD1DatabaseResponse).result;
}

export interface QueryD1DatabaseResponse extends CloudflareApiResponse {
    readonly result: D1QueryResult[];
}

export interface D1QueryResult {
    readonly results: Record<string, unknown>;
    readonly duration: number; // duration of the operation in milliseconds, e.g. 0.04996099999999615
    readonly lastRowId: number | null; // the rowid of the last row inserted or null if it doesn't apply, see https://www.sqlite.org/c3ref/last_insert_rowid.html
    readonly changes: number | null; // total # of rows that were inserted/updated/deleted, or 0 if read-only
    readonly success: boolean;
}

//#endregion

export class CloudflareApi {
    static DEBUG = false;
    static URL_TRANSFORMER: (url: string) => string = v => v;
}

//

const APPLICATION_JSON = 'application/json';
const APPLICATION_JSON_UTF8 = 'application/json; charset=UTF-8';
const APPLICATION_OCTET_STREAM = 'application/octet-stream';
const TEXT_PLAIN_UTF8 = 'text/plain; charset=UTF-8';

function computeBaseUrl(): string {
    return CloudflareApi.URL_TRANSFORMER(`https://api.cloudflare.com/client/v4`);
}

function computeAccountBaseUrl(accountId: string): string {
    return CloudflareApi.URL_TRANSFORMER(`https://api.cloudflare.com/client/v4/accounts/${accountId}`);
}

// deno-lint-ignore no-explicit-any
function isStringRecord(obj: any): obj is Record<string, unknown> {
    return typeof obj === 'object' && obj !== null && !Array.isArray(obj) && obj.constructor === Object;
}

type ExecuteBody = string | Record<string, unknown> | Record<string, unknown>[] | FormData;

async function execute(op: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH', url: string, apiToken: string, body?: ExecuteBody, responseType?: 'json'): Promise<CloudflareApiResponse>;
async function execute(op: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH', url: string, apiToken: string, body?: ExecuteBody, responseType?: 'bytes'): Promise<Uint8Array>;
async function execute(op: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH', url: string, apiToken: string, body?: ExecuteBody, responseType?: 'bytes?'): Promise<Uint8Array | undefined>;
async function execute(op: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH', url: string, apiToken: string, body?: ExecuteBody, responseType?: 'text'): Promise<string>;
async function execute(op: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH', url: string, apiToken: string, body?: ExecuteBody, responseType?: 'json?'): Promise<CloudflareApiResponse | undefined>;
async function execute(op: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH', url: string, apiToken: string, body?: ExecuteBody, responseType?: 'empty'): Promise<undefined>;
async function execute(op: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH', url: string, apiToken: string, body?: ExecuteBody, responseType: 'json' | 'json?' | 'bytes' | 'bytes?' | 'text' | 'empty' = 'json'): Promise<CloudflareApiResponse | Uint8Array | string | undefined> {
    if (CloudflareApi.DEBUG) console.log(`${op}: ${method} ${url}`);
    const headers = new Headers({ 'Authorization': `Bearer ${apiToken}`});
    let bodyObj: Record<string, unknown> | Record<string, unknown>[] | undefined;
    if (typeof body === 'string') {
        headers.set('Content-Type', TEXT_PLAIN_UTF8);
    } else if (isStringRecord(body) || Array.isArray(body)) {
        headers.set('Content-Type', APPLICATION_JSON_UTF8);
        bodyObj = body;
        body = JSON.stringify(body, undefined, 2);
    }
    if (CloudflareApi.DEBUG) console.log([...headers].map(v => v.join(': ')).join('\n'));
    if (CloudflareApi.DEBUG && bodyObj) console.log(bodyObj);
    const fetchResponse = await fetch(url, { method, headers, body });
    if (CloudflareApi.DEBUG) console.log(`${fetchResponse.status} ${fetchResponse.url}`);
    if (CloudflareApi.DEBUG) console.log([...fetchResponse.headers].map(v => v.join(': ')).join('\n'));
    const contentType = fetchResponse.headers.get('Content-Type') || '';
    if (responseType === 'empty' && fetchResponse.status >= 200 && fetchResponse.status < 300) {
        if (contentType !== '') throw new Error(`Unexpected content-type (expected none): ${contentType}, fetchResponse=${fetchResponse}, body=${await fetchResponse.text()}`);
        const text = await fetchResponse.text();
        if (text !== '') throw new Error(`Unexpected body (expected none): ${text}, fetchResponse=${fetchResponse}, body=${text}`);
        return;
    }
    if ((responseType === 'bytes' || responseType === 'bytes?') && contentType === APPLICATION_OCTET_STREAM) {
        const buffer = await fetchResponse.arrayBuffer();
        return new Uint8Array(buffer);
    }
    if (responseType === 'text') {
        return await fetchResponse.text();
    }
    if (![APPLICATION_JSON_UTF8, APPLICATION_JSON].includes(contentType)) {
        throw new Error(`Unexpected content-type: ${contentType}, fetchResponse=${fetchResponse}, body=${await fetchResponse.text()}`);
    }
    const apiResponse = await fetchResponse.json() as CloudflareApiResponse;
    if (CloudflareApi.DEBUG) console.log(apiResponse);
    if (!apiResponse.success) {
        if (fetchResponse.status === 404 && ['bytes?', 'json?'].includes(responseType)) return undefined;
        throw new CloudflareApiError(`${op} failed: status=${fetchResponse.status}, errors=${apiResponse.errors.map(v => `${v.code} ${v.message}`).join(', ')}`, fetchResponse.status, apiResponse.errors);
    }
    return apiResponse;
}

//

export class CloudflareApiError extends Error {
    readonly status: number;
    readonly errors: readonly Message[];

    constructor(message: string, status: number, errors: readonly Message[]) {
        super(message);
        this.status = status;
        this.errors = errors;
    }
}

export interface Message {
    readonly code: number;
    readonly message: string;
}

export interface CloudflareApiResponse {
    readonly success: boolean;
    readonly errors: readonly Message[];
    readonly messages?: readonly Message[];
}

export interface ResultInfo {
    readonly page: number;
    readonly per_page: number;
    readonly total_pages: number;
    readonly count: number;
    readonly total_count: number;
}
