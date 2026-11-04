const API='/api/admin',q=s=>document.querySelector(s);let state={clients:[],projects:[],events:[],entries:[]};
const peso=n=>new Intl.NumberFormat('en-PH',{style:'currency',currency:'PHP',maximumFractionDigits:2}).format(Number(n||0));
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date=v=>v?new Date(String(v).slice(0,10)+'T00:00:00').toLocaleDateString('en-PH',{year:'numeric',month:'short',day:'numeric'}):'—';
function msg(id,text,err=false){const el=q('#'+id);el.textContent=text;el.className='admin-message '+(err?'error':'success');}
async function api(path='',opts={}){const r=await fetch(API+path,{...opts,headers:{'Content-Type':'application/json',...(opts.headers||{})}});const data=await r.json().catch(()=>({error:'Unexpected server response'}));if(!r.ok)throw new Error(data.error||'Request failed');return data;}
function table(headers,rows){if(!rows.length)return '<p class="empty">No records yet.</p>';return '<table><thead><tr>'+headers.map(h=>'<th>'+esc(h)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(row=>'<tr>'+row.map(v=>'<td>'+v+'</td>').join('')+'</tr>').join('')+'</tbody></table>';}
function opts(el,items,label,first){const current=el.value;el.innerHTML=(first?'<option value="">'+esc(first)+'</option>':'')+items.map(x=>'<option value="'+esc(x.id)+'">'+esc(label(x))+'</option>').join('');if(items.some(x=>x.id===current))el.value=current;}
let calendarCursor=new Date(new Date().getFullYear(),new Date().getMonth(),1);
function renderCalendar(){
 const grid=q('#calendarGrid');if(!grid)return;
 const y=calendarCursor.getFullYear(),m=calendarCursor.getMonth(),first=new Date(y,m,1),last=new Date(y,m+1,0);
 q('#calendarMonth').textContent=calendarCursor.toLocaleDateString('en-PH',{month:'long',year:'numeric'});
 const cells=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=>'<div class="cal-head">'+d+'</div>');
 for(let i=0;i<first.getDay();i++)cells.push('<div class="cal-day blank"></div>');
 for(let d=1;d<=last.getDate();d++){
  const key=y+'-'+String(m+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');
  const ev=state.events.filter(e=>String(e.event_date).slice(0,10)===key&&!['Cancelled'].includes(e.status));
  cells.push('<div class="cal-day"><span class="cal-date">'+d+'</span>'+ev.map(e=>'<div class="cal-event '+(e.event_type==='Payment due'?'pay':e.event_type==='Task'?'task':'survey')+'" title="'+esc(e.title)+'">'+esc(e.event_type||'Survey')+': '+esc(e.title)+'</div>').join('')+'</div>');
 }
 grid.innerHTML=cells.join('');
}
function render(){
 const income=state.entries.filter(x=>x.kind==='income').reduce((a,x)=>a+Number(x.amount),0),expense=state.entries.filter(x=>x.kind==='expense').reduce((a,x)=>a+Number(x.amount),0);
 q('#statIncome').textContent=peso(income);q('#statExpenses').textContent=peso(expense);q('#statNet').textContent=peso(income-expense);q('#statProjects').textContent=state.projects.filter(x=>!['Completed','Cancelled'].includes(x.status)).length;
 const today=new Date().toISOString().slice(0,10);
 const upcoming=state.events.filter(x=>x.event_date>=today&&!['Cancelled','Completed'].includes(x.status)).slice(0,6);
 q('#upcomingList').innerHTML=upcoming.length?table(['Date','Activity','Project','Status'],upcoming.map(x=>[esc(date(x.event_date)),esc(x.title),esc(x.client_name),esc(x.status)])):'<p class="empty">No upcoming activities. Add one in Calendar.</p>';
 q('#recentList').innerHTML=state.entries.length?table(['Date','Entry','Amount'],state.entries.slice(0,6).map(x=>[esc(date(x.entry_date)),esc(x.category+' · '+x.kind),'<strong>'+peso(x.amount)+'</strong>'])):'<p class="empty">No financial entries recorded.</p>';
 q('#clientsTable').innerHTML=table(['Client','Contact','Added',''],state.clients.map(x=>[esc(x.name),esc([x.email,x.phone].filter(Boolean).join(' / ')||'—'),esc(date(x.created_at)),'<button type="button" class="button button-light edit-record" data-kind="client" data-id="'+esc(x.id)+'">Edit</button>']));
 q('#projectsTable').innerHTML=table(['Reference / client','Service','Status','Fee','Received','Receivable',''],state.projects.map(x=>['<strong>'+esc(x.reference)+'</strong><br>'+esc(x.client_name),esc(x.service),'<span class="pill">'+esc(x.status)+'</span>',peso(x.fee),peso(x.amount_received),peso(x.receivable),'<button type="button" class="button button-light edit-record" data-kind="project" data-id="'+esc(x.id)+'">Edit</button>']));
 q('#receivablesTable').innerHTML=table(['Reference / client','Service','Amount due'],state.projects.filter(x=>Number(x.receivable)>0&&!['Cancelled'].includes(x.status)).map(x=>['<strong>'+esc(x.reference)+'</strong><br>'+esc(x.client_name),esc(x.service),'<strong>'+peso(x.receivable)+'</strong>']));
 q('#eventsTable').innerHTML=table(['Date / type / activity','Client / location','Status',''],state.events.map(x=>[esc(date(x.event_date))+'<br><span class="pill">'+esc(x.event_type||'Survey')+'</span><br>'+esc(x.title),esc(x.client_name)+'<br>'+esc(x.location),esc(x.status),'<button type="button" class="button button-light edit-record" data-kind="event" data-id="'+esc(x.id)+'">Edit</button>']));
 renderCalendar();
 q('#financeTable').innerHTML=table(['Date','Type / category','Project','Amount','Description',''],state.entries.map(x=>[esc(date(x.entry_date)),esc(x.kind+' / '+x.category),esc(x.reference||'General'),'<strong>'+peso(x.amount)+'</strong>',esc(x.description),'<button type="button" class="button button-light edit-record" data-kind="entry" data-id="'+esc(x.id)+'">Edit</button>']));
 q('#financeSummary').innerHTML='<p>Income received <strong style="float:right">'+peso(income)+'</strong></p><p>Expenses <strong style="float:right">'+peso(expense)+'</strong></p><hr><p>Net recorded cash flow <strong style="float:right">'+peso(income-expense)+'</strong></p>';
 const cats={};state.entries.filter(x=>x.kind==='expense').forEach(x=>cats[x.category]=(cats[x.category]||0)+Number(x.amount));
 q('#expenseCategories').innerHTML=Object.keys(cats).length?table(['Category','Total'],Object.entries(cats).sort((a,b)=>b[1]-a[1]).map(([k,v])=>[esc(k),'<strong>'+peso(v)+'</strong>'])):'<p class="empty">No expenses recorded yet.</p>';
 opts(q('#projectClient'),state.clients,x=>x.name+' · '+(x.phone||x.email||'client'),'Choose a client');opts(q('#updateProjectId'),state.projects,x=>x.reference+' · '+x.client_name,'Choose project');opts(q('#eventProject'),state.projects,x=>x.reference+' · '+x.client_name,'Choose project');opts(q('#financeProject'),state.projects,x=>x.reference+' · '+x.client_name,'General business');
}
async function refresh(){try{state=await api();q('#appPanel').hidden=false;q('#loginPanel').hidden=true;render();}catch(e){q('#appPanel').hidden=true;q('#loginPanel').hidden=false;q('#loginMessage').textContent=e.message;}}
document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-tab]').forEach(x=>x.classList.toggle('active',x===b));document.querySelectorAll('.admin-section').forEach(x=>x.classList.toggle('active',x.id==='tab-'+b.dataset.tab));}));
// Staff access is enforced by the protected admin API.
q('#refreshBtn').addEventListener('click',refresh);
q('#prevMonth').addEventListener('click',()=>{calendarCursor=new Date(calendarCursor.getFullYear(),calendarCursor.getMonth()-1,1);renderCalendar();});
q('#nextMonth').addEventListener('click',()=>{calendarCursor=new Date(calendarCursor.getFullYear(),calendarCursor.getMonth()+1,1);renderCalendar();});
async function submit(formId,action,messageId,after){q('#'+formId).addEventListener('submit',async e=>{e.preventDefault();const data=Object.fromEntries(new FormData(e.currentTarget));try{await api('',{method:'POST',body:JSON.stringify({...data,action})});msg(messageId,'Saved successfully.');e.currentTarget.reset();await refresh();if(after)after();}catch(err){msg(messageId,err.message,true);}});}
submit('clientForm','client','clientMessage');
submit('projectForm','project','projectMessage',()=>{document.querySelector('[data-tab="projects"]').click();});
submit('eventForm','event','eventMessage');
submit('financeForm','entry','financeMessage');
q('#updateProjectForm').addEventListener('submit',async e=>{e.preventDefault();try{await api('',{method:'POST',body:JSON.stringify({...Object.fromEntries(new FormData(e.currentTarget)),action:'update_project'})});msg('updateMessage','Project status updated.');await refresh();}catch(err){msg('updateMessage',err.message,true);}});
refresh();