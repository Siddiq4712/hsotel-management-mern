import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('./entryHostel',()=>({requestEntryHostel:vi.fn()}));
import { requestEntryHostel } from './entryHostel';
import api from './api';

describe('entry hostel request handling',()=>{
  const originalAdapter=api.defaults.adapter;
  afterEach(()=>{api.defaults.adapter=originalAdapter;vi.clearAllMocks();sessionStorage.clear();localStorage.removeItem('adminWorkspace');});
  it('pins the visible warden hostel to its requests without applying it to mess requests', async () => {
    localStorage.setItem('adminWorkspace', 'warden');
    sessionStorage.setItem('selectedWardenHostelId', '2');
    const calls = [];
    api.defaults.adapter = async config => { calls.push(config); return { config, status: 200, data: {}, headers: {} }; };
    await api.get('/warden/students');
    await api.post('/warden/holidays', { name: 'Holiday' });
    await api.get('/mess/daily-expenses');
    expect(calls[0].headers.get('X-Workspace-Hostel-Id')).toBe('2');
    expect(calls[1].headers.get('X-Workspace-Hostel-Id')).toBe('2');
    expect(calls[2].headers.get('X-Workspace-Hostel-Id')).toBeUndefined();
  });
  it('retries only that entry with the chosen hostel',async()=>{
    requestEntryHostel.mockResolvedValue(2);
    const calls=[];
    api.defaults.adapter=async config=>{
      calls.push(config);
      if(calls.length===1)throw {config,response:{status:409,data:{code:'HOSTEL_REQUIRED',hostels:[{id:2,name:'Hostel 2'}]}}};
      return {config,status:200,data:{success:true},headers:{}};
    };
    await api.post('/mess/stock',{item_id:1});
    expect(calls).toHaveLength(2);
    expect(calls[1].headers.get('X-Entry-Hostel-Id')).toBe('2');
    expect(api.defaults.headers.common['X-Entry-Hostel-Id']).toBeUndefined();
    expect(calls[1].data).toBe(calls[0].data);
  });
  it('does not retry a cancelled entry',async()=>{
    requestEntryHostel.mockRejectedValue(new Error('Cancelled. No entry was saved.'));
    let calls=0;
    api.defaults.adapter=async config=>{calls++;throw {config,response:{status:409,data:{code:'HOSTEL_REQUIRED',hostels:[]}}};};
    await expect(api.post('/mess/stock',{})).rejects.toThrow('Cancelled');
    expect(calls).toBe(1);
  });
  it('keeps the original inventory when a hostel confirmation retries the request',async()=>{
    sessionStorage.setItem('selectedInventoryId','10');
    requestEntryHostel.mockImplementation(async()=>{
      sessionStorage.setItem('selectedInventoryId','20');
      return 2;
    });
    const calls=[];
    api.defaults.adapter=async config=>{
      calls.push(config);
      if(calls.length===1)throw {config,response:{status:409,data:{code:'HOSTEL_REQUIRED',hostels:[{id:2,name:'Hostel B'}]}}};
      return {config,status:200,data:{success:true},headers:{}};
    };
    await api.post('/mess/consumption/bulk',{items:[]});
    expect(calls[0].headers.get('X-Inventory-Id')).toBe('10');
    expect(calls[1].headers.get('X-Inventory-Id')).toBe('10');
    expect(calls[1].headers.get('X-Entry-Hostel-Id')).toBe('2');
  });
});
