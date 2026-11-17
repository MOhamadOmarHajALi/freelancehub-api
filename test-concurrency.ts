// تشغيل: npx ts-node test-concurrency.ts  (والسيرفر شغّال)
const B = 'http://localhost:3000';
const call = async (m: string, p: string, t?: string, b?: any) => {
  const r = await fetch(B + p, { method: m, body: b && JSON.stringify(b),
    headers: { 'Content-Type': 'application/json', ...(t && { Authorization: `Bearer ${t}` }) } });
  return { s: r.status, j: await r.json().catch(() => null) };
};
const reg = async (role: string, n: string) =>
  (await call('POST', '/auth/register', undefined, { name: n, email: `${n}${Date.now()}@x.com`, password: '12345678', role })).j.accessToken;

(async () => {
  const owner = await reg('OWNER', 'owner'), f1 = await reg('FREELANCER', 'fa'), f2 = await reg('FREELANCER', 'fb');
  await call('POST', '/wallet/topup', owner, { amount: 300 });
  const cat = (await call('GET', '/categories')).j[0].id;
  const pid = (await call('POST', '/projects', owner, { title: 'Logo', description: 'Design a logo please', categoryId: cat, budget: 200 })).j.id;
  const a = (await call('POST', `/projects/${pid}/proposals`, f1, { price: 200, days: 3, message: 'hello there' })).j.id;
  const b = (await call('POST', `/projects/${pid}/proposals`, f2, { price: 200, days: 2, message: 'hello there' })).j.id;
  const res = await Promise.all([call('POST', `/proposals/${a}/accept`, owner), call('POST', `/proposals/${b}/accept`, owner)]);
  console.log('statuses:', res.map((r) => r.s));                    // المتوقع: واحد 201 وواحد 409
  console.log('wallet:', (await call('GET', '/wallet', owner)).j);  // المتوقع: balance 100, held 200
})();
