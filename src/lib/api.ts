export type ApiUser = { id: string; name: string; role: 'owner' | 'manager' | 'worker' };
export type ApiList<T> = { items: T[] };
export type SyncPushResult = { accepted: string[]; duplicates: string[]; rejected: Array<{ operationId: string; reason: string }> };
const API_BASE = (import.meta.env.VITE_API_URL ?? '/api').replace(/\/$/, '');
const TOKEN_KEY = 'azrnou_access_token';
const token = () => localStorage.getItem(TOKEN_KEY);
export function setAccessToken(value: string | null){if(value)localStorage.setItem(TOKEN_KEY,value);else localStorage.removeItem(TOKEN_KEY);}
export function getAccessToken(){return token();}
async function request<T>(path:string,init:RequestInit={}):Promise<T>{const headers=new Headers(init.headers);if(init.body)headers.set('Content-Type','application/json');const accessToken=token();if(accessToken)headers.set('Authorization',`Bearer ${accessToken}`);const response=await fetch(`${API_BASE}${path}`,{...init,headers});const contentType=response.headers.get('content-type')??'';const body=contentType.includes('application/json')?await response.json():null;if(!response.ok)throw new Error(body?.error??`API request failed (${response.status})`);return body as T;}
export const api={
 health:()=>request<{ok:boolean;service:string;database:string;timestamp:string}>('/health'),
 login:async(identifier:string,password:string)=>{const result=await request<{token:string;user:ApiUser}>('/auth/login',{method:'POST',body:JSON.stringify({email:identifier,password})});setAccessToken(result.token);return result.user;},
 me:()=>request<{user:ApiUser}>('/auth/me'),
 logout:async()=>{try{await request('/auth/logout',{method:'POST'});}finally{setAccessToken(null);}},
 customers:()=>request<ApiList<Record<string,unknown>>>('/business/customers'),
 products:()=>request<ApiList<Record<string,unknown>>>('/business/products'),
 productCategories:()=>request<ApiList<Record<string,unknown>>>('/business-core/categories'),
 orders:()=>request<ApiList<Record<string,unknown>>>('/business/orders'),
 suppliers:()=>request<ApiList<Record<string,unknown>>>('/finance/suppliers'),
 deliveries:()=>request<ApiList<Record<string,unknown>>>('/operations/deliveries'),
 invoices:()=>request<ApiList<Record<string,unknown>>>('/operations/invoices'),
 expenses:()=>request<ApiList<Record<string,unknown>>>('/finance/expenses'),
 purchases:()=>request<ApiList<Record<string,unknown>>>('/finance/purchases'),
 supplierPayments:(purchaseId?:string,supplierId?:string)=>request<ApiList<Record<string,unknown>>>(`/finance/supplier-payments?${purchaseId?`purchaseId=${encodeURIComponent(purchaseId)}&`:''}${supplierId?`supplierId=${encodeURIComponent(supplierId)}`:''}`),
 cashSummary:()=>request<Record<string,unknown>>('/finance/cash-summary'),
 productionBatches:()=>request<ApiList<Record<string,unknown>>>('/production/batches'),
 livestock:()=>request<ApiList<Record<string,unknown>>>('/production/livestock'),
 reportSummary:(start?:string,end?:string)=>request<Record<string,unknown>>(`/reports/summary?start=${encodeURIComponent(start??'1970-01-01')}&end=${encodeURIComponent(end??'2999-12-31')}`),
 lowStock:()=>request<ApiList<Record<string,unknown>>>('/reports/low-stock'),
 createCustomer:(payload:unknown)=>request('/business/customers',{method:'POST',body:JSON.stringify(payload)}),
 createProduct:(payload:unknown)=>request('/business/products',{method:'POST',body:JSON.stringify(payload)}),
 createSupplier:(payload:unknown)=>request('/finance/suppliers',{method:'POST',body:JSON.stringify(payload)}),
 updateSupplier:(supplierId:string,payload:unknown)=>request(`/finance/suppliers/${encodeURIComponent(supplierId)}`,{method:'PATCH',body:JSON.stringify(payload)}),
 updateVariant:(variantId:string,payload:unknown)=>request(`/business-core/variants/${encodeURIComponent(variantId)}`,{method:'PATCH',body:JSON.stringify(payload)}),
 adjustStock:(payload:unknown)=>request('/business-core/stock-adjustments',{method:'POST',body:JSON.stringify(payload)}),
 updateOrderStatus:(orderId:string,status:string)=>request(`/business-core/orders/${encodeURIComponent(orderId)}/status`,{method:'PATCH',body:JSON.stringify({status})}),
 createOrder:(payload:unknown)=>request('/business/orders',{method:'POST',body:JSON.stringify(payload)}),
 createPayment:(payload:unknown)=>request('/business/payments',{method:'POST',body:JSON.stringify(payload)}),
 createExpense:(payload:unknown)=>request('/finance/expenses',{method:'POST',body:JSON.stringify(payload)}),
 createPurchase:(payload:unknown)=>request('/finance/purchases',{method:'POST',body:JSON.stringify(payload)}),
 createSupplierPayment:(payload:unknown)=>request('/finance/supplier-payments',{method:'POST',body:JSON.stringify(payload)}),
 createDelivery:(payload:unknown)=>request('/operations/deliveries',{method:'POST',body:JSON.stringify(payload)}),
 createInvoiceFromOrder:(orderId:string)=>request(`/operations/invoices/from-order/${encodeURIComponent(orderId)}`,{method:'POST'}),
 createProductionBatch:(payload:unknown)=>request('/production/batches',{method:'POST',body:JSON.stringify(payload)}),
 completeProductionBatch:(batchId:string,outputVariantId:string)=>request(`/production/batches/${encodeURIComponent(batchId)}/complete`,{method:'PATCH',body:JSON.stringify({outputVariantId})}),
 createLivestockEvent:(payload:unknown)=>request('/production/livestock/events',{method:'POST',body:JSON.stringify(payload)}),
 createFeed:(payload:unknown)=>request('/production/feed',{method:'POST',body:JSON.stringify(payload)}),
 syncPush:(deviceId:string,operations:unknown[])=>request<SyncPushResult>('/sync/push',{method:'POST',body:JSON.stringify({deviceId,operations})}),
 syncPull:(deviceId:string,since:string)=>request<{items:Record<string,unknown>[];nextSince:string}>(`/sync/pull?deviceId=${encodeURIComponent(deviceId)}&since=${encodeURIComponent(since)}`),
 syncStatus:(deviceId:string)=>request<Record<string,unknown>>(`/sync/status?deviceId=${encodeURIComponent(deviceId)}`),
};
