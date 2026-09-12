import { dataRepository } from './dataRepository';
import { getDeviceId } from './device';
import { api } from './api';
import { offlineQueue } from './offlineQueue';

export type CoreData = Awaited<ReturnType<typeof loadCoreData>>;
export async function loadCoreData(){const [customers,products,orders]=await Promise.all([dataRepository.customers(),dataRepository.products(),dataRepository.orders()]);return{customers:customers.items,products:products.items,orders:orders.items};}
export async function refreshCoreData(){return loadCoreData();}

export async function flushCoreCreateQueue(){
 if(!navigator.onLine)return{applied:0,rejected:0,remaining:offlineQueue.list().length};
 const pending=offlineQueue.list().filter(operation=>operation.status!=='failed');
 if(!pending.length)return{applied:0,rejected:0,remaining:0};
 const deviceId=getDeviceId();let applied=0,rejected=0;
 for(const operation of pending){
  try{
   if(operation.entity==='expense' && operation.action==='create'){
    await api.createExpense({...(operation.payload as Record<string, unknown>),idempotencyKey:operation.id});
    offlineQueue.remove(operation.id); applied++; continue;
   }
   const result=await api.syncPush(deviceId,[{operationId:operation.id,entityType:operation.entity,operationType:operation.action,payload:operation.payload}]);
   if(result.accepted.includes(operation.id)||result.duplicates.includes(operation.id)){offlineQueue.remove(operation.id);applied++;continue;}
   const failure=result.rejected.find(item=>item.operationId===operation.id);
   if(failure){offlineQueue.update(operation.id,{status:'failed',attempts:operation.attempts+1,lastError:failure.reason});rejected++;}
   break;
  }catch(error){offlineQueue.update(operation.id,{status:'pending',attempts:operation.attempts+1,lastError:error instanceof Error?error.message:String(error)});break;}
 }
 if(applied)await refreshCoreData();
 return{applied,rejected,remaining:offlineQueue.list().length};
}

export function startCoreDataSync(onRefresh?:()=>void){
 const handleOnline=async()=>{await flushCoreCreateQueue();await refreshCoreData();onRefresh?.();};
 window.addEventListener('online',handleOnline);if(navigator.onLine)void handleOnline();
 return()=>window.removeEventListener('online',handleOnline);
}
export { getDeviceId };
