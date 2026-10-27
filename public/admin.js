const API='/api/admin',q=s=>document.querySelector(s);let state={clients:[],projects:[],events:[],entries:[]};
const peso=n=>new Intl.NumberFormat('en-PH',{style:'currency',currency:'PHP',maximumFractionDigits:2}).format(Number(n||0));
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date=v=>v?new Date(String(v).slice(0,10)+'T00:00:00').toLocaleDateString('en-PH',{year:'numeric',month:'short',day:'numeric'}):'—';
function msg(id,text,err=false){const el=q('#'+id);el.textContent=text;el.className='admin-message '+(err?'error':'success');}
async function api(path='',opts={}){const r=await fetch(API+path,{...opts,headers:{'Content-Type':'application/json',...(opts.headers||{})}});const data=await r.json().catch(()=>({error:'Unexpected server response'}));if(!r.ok)throw new Error(data.error||'Request failed');return data;}
function table(headers,rows){if(!rows.length)return '<p class="empty">No records yet.</p>';return '<table><thead><tr>'+headers.map(h=>'<th>'+esc(h)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(row=>'<tr>'+row.map(v=>'<td>'+v+'</td>').join('')+'</tr>').join('')+'</tbody></table>';}
function opts(el,items,label,first){const current=el.value;el.innerHTML=(first?'<option value="">'+esc(first)+'</option>':'')+items.map(x=>'<option value="'+esc(x.id)+'">'+esc(label(x))+'</option>').join('');if(items.some(x=>x.id===current))el.value=current;}
function render(){
 const income=state.entries.filter(x=>x.kind==='income').reduce((a,x)=>a+Number(x.amount),0),expense=state.entries.filter(x=>x.kind==='expense').reduce((a,x)=>a+Number(x.amount),0);
 q('#statIncome').textContent=peso(income);q('#statExpenses').textContent=peso(expense);q('#statNet').textContent=peso(income-expense);q('#statProjects').textContent=state.projects.filter(x=>!['Completed','Cancelled'].includes(x.status)).length;
 const today=new Date().toISOString().slice(0,10);
 const upcoming=state.events.filter(x=>x.event_date>=today&&!['Cancelled','Completed'].includes(x.status)).slice(0,6);
 q('#upcomingList').innerHTML=upcoming.length?table(['Date','Activity','Project','Status'],upcoming.map(x=>[esc(date(x.event_date)),esc(x.title),esc(x.client_name),esc(x.status)])):'<p class="empty">No upcoming activities. Add one in Calendar.</p>';
 q('#recentList').innerHTML=state.entries.length?table(['Date','Entry','Amount'],state.entries.slice(0,6).map(x=>[esc(date(x.entry_date)),esc(x.category+' · '+x.kind),'<strong>'+peso(x.amount)+'</strong>'])):'<p class="empty">No financial entries recorded.</p>';
 q('#clientsTable').innerHTML=table(['Client','Contact','Added'],state.clients.map(x=>[esc(x.name),esc([x.email,x.phone].filter(Boolean).join(' / ')||'—'),esc(date(x.created_at))]));
 q('#projectsTable').innerHTML=table(['Reference / client','Service','Status','Fee'],state.projects.map(x=>['<strong>'+esc(x.reference)+'</strong><br>'+esc(x.client_name),esc(x.service),'<span class="pill">'+esc(x.status)+'</span>',peso(x.fee)]));
 q('#eventsTable').innerHTML=table(['Date / activity','Client / location','Status'],state.events.map(x=>[esc(date(x.event_date))+'<br>'+esc(x.title),esc(x.client_name)+'<br>'+esc(x.location),esc(x.status)]));
 q('#financeTable').innerHTML=table(['Date','Type / category','Project','Amount','Description'],state.entries.map(x=>[esc(date(x.entry_date)),esc(x.kind+' / '+x.category),esc(x.reference||'General'),'<strong>'+peso(x.amount)+'</strong>',esc(x.description)]));
 q('#financeSummary').innerHTML='<p>Income received <strong style="float:right">'+peso(income)+'</strong></p><p>Expenses <strong style="float:right">'+peso(expense)+'</strong></p><hr><p>Net recorded cash flow <strong style="float:right">'+peso(income-expense)+'</strong></p>';
 opts(q('#projectClient'),state.clients,x=>x.name+' · '+(x.phone||x.email||'client'),'Choose a client');opts(q('#updateProjectId'),state.projects,x=>x.reference+' · '+x.client_name,'Choose project');opts(q('#eventProject'),state.projects,x=>x.reference+' · '+x.client_name,'Choose project');opts(q('#financeProject'),state.projects,x=>x.reference+' · '+x.client_name,'General business');
}
async function refresh(){try{state=await api();q('#appPanel').hidden=false;q('#loginPanel').hidden=true;render();}catch(e){q('#appPanel').hidden=true;q('#loginPanel').hidden=false;q('#loginMessage').textContent=e.message;}}
document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-tab]').forEach(x=>x.classList.toggle('active',x===b));document.querySelectorAll('.admin-section').forEach(x=>x.classList.toggle('active',x.id==='tab-'+b.dataset.tab));}));
// Staff access is enforced by the protected admin API.
q('#refreshBtn').addEventListener('click',refresh);
async function submit(formId,action,messageId,after){q('#'+formId).addEventListener('submit',async e=>{e.preventDefault();const data=Object.fromEntries(new FormData(e.currentTarget));try{await api('',{method:'POST',body:JSON.stringify({...data,action})});msg(messageId,'Saved successfully.');e.currentTarget.reset();await refresh();if(after)after();}catch(err){msg(messageId,err.message,true);}});}
submit('clientForm','client','clientMessage');
submit('projectForm','project','projectMessage',()=>{document.querySelector('[data-tab="projects"]').click();});
submit('eventForm','event','eventMessage');
submit('financeForm','entry','financeMessage');
q('#updateProjectForm').addEventListener('submit',async e=>{e.preventDefault();try{await api('',{method:'POST',body:JSON.stringify({...Object.fromEntries(new FormData(e.currentTarget)),action:'update_project'})});msg('updateMessage','Project status updated.');await refresh();}catch(err){msg('updateMessage',err.message,true);}});
refresh();