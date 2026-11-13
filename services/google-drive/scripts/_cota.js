const { drive } = require('../client');
(async () => {
  const a = await drive.about.get({ fields: 'storageQuota,user' });
  const q = a.data.storageQuota, gb = v => (Number(v||0)/2**30).toFixed(1);
  console.log('conta:', a.data.user && a.data.user.emailAddress);
  console.log('limite  %s GB', gb(q.limit));
  console.log('usado   %s GB', gb(q.usage));
  console.log('livre   %s GB', q.limit ? gb(q.limit - q.usage) : 'ilimitado');
  const d = await drive.drives.list({ pageSize: 20 });
  console.log('shared drives:', (d.data.drives||[]).map(x=>x.name).join(' | ') || '(nenhum)');
})().catch(e => { console.error('ERRO:', e.message); process.exit(1); });
