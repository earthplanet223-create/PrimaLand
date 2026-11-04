(() => {
 const API='/api/admin';
 const $=s=>document.querySelector(s);
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let data={clients:[],projects:[],events:[],entries:[]}, current=null;
 const dialog=$('#editDialog'), fields=$('#editFields');
 const statuses=['Request received','In progress','Fieldwork scheduled','Processing','For client review','Completed','On hold','Cancelled'];
 const services=['Boundary / Relocation Survey','Subdivision / Consolidation','Topographic Survey','GNSS / Control Survey','GIS / Mapping','CAD / As-Built Plans','Other'];
 function input(label,name,value,type='text',wide=false,required=false,extra=''){return '<label class="'+(wide?'wide':'')+'">'+label+'<input name="'+name+'" type="'+type+'" value="'+esc(value??'')+'" '+(required?'required':'')+' '+extra+'></label>';}
 function area(label,name,value){return '<label class="wide">'+label+'<textarea name="'+name+'" rows="3">'+esc(value??'')+'</textarea></label>';}
 function select(label,name,value,items,wide=false){return '<label class="'+(wide?'wide':'')+'">'+label+'<select name="'+name+'">'+items.map(o=>{const v=typeof o==='string'?o:o.value,t=typeof o==='string'?o:o.label;return '<option value="'+esc(v)+'" '+(String(v)===String(value??'')?'selected':'')+'>'+esc(t)+'</option>';}).join('')+'</select></label>';}
 async function load(){const r=await fetch(API);if(!r.ok)throw new Error('Unable to load records');data=await r.json();}
 function open(kind,id){
  const x=(data[{client:'clients',project:'projects',event:'events',entry:'entries'}[kind]]||[]).find(v=>v.id===id);if(!x)return;
  current={kind,id};let html='';
  if(kind==='client'){
   $('#editTitle').textContent='Edit client record';
   html=input('Full name / company','name',x.name,'text',true,true)+input('Email (optional)','email',x.email,'email')+input('Phone','phone',x.phone)+input('Address','address',x.address,'text',true)+area('Notes','notes',x.notes);
  }else if(kind==='project'){
   $('#editTitle').textContent='Edit project · '+x.reference;
   html=select('Client','client_id',x.client_id,data.clients.map(c=>({value:c.id,label:c.name})),true)+select('Service type','service',x.service,services)+input('Agreed fee (PHP)','fee',x.fee,'number',false,true,'min="0" step="0.01"')+input('Property location','location',x.location,'text',true,true)+input('Target delivery date','due_date',String(x.due_date||'').slice(0,10),'date')+select('Status','status',x.status,statuses)+area('Client-visible status note','public_note',x.public_note)+area('Internal notes','internal_notes',x.internal_notes);
  }else if(kind==='event'){
   $('#editTitle').textContent='Edit schedule entry';
   html=select('Project','project_id',x.project_id,data.projects.map(p=>({value:p.id,label:p.reference+' · '+p.client_name})),true)+select('Event type','event_type',x.event_type||'Survey',['Survey','Payment due','Task','Site inspection','Deliverable deadline'])+input('Activity','title',x.title,'text',true,true)+input('Date','event_date',String(x.event_date).slice(0,10),'date',false,true)+input('Start time','start_time',String(x.start_time||'').slice(0,5),'time')+input('End time','end_time',String(x.end_time||'').slice(0,5),'time')+input('Location','location',x.location,'text',true)+select('Status','status',x.status,['Scheduled','Confirmed','Completed','Rescheduled','Cancelled'])+area('Notes','notes',x.notes);
  }else{
   $('#editTitle').textContent='Edit financial entry';
   html=select('Entry type','kind',x.kind,['income','expense'])+input('Amount (PHP)','amount',x.amount,'number',false,true,'min="0.01" step="0.01"')+input('Date','entry_date',String(x.entry_date).slice(0,10),'date',false,true)+input('Category','category',x.category,'text',false,true)+'<label class="wide">Related project<select name="project_id"><option value="">General business</option>'+data.projects.map(p=>'<option value="'+esc(p.id)+'" '+(p.id===x.project_id?'selected':'')+'>'+esc(p.reference+' · '+p.client_name)+'</option>').join('')+'</select></label>'+input('Description','description',x.description,'text',true,true)+input('Payment method / reference','payment_reference',x.payment_reference,'text',true);
  }
  fields.innerHTML=html;$('#editMessage').textContent='';dialog.showModal();
 }
 document.addEventListener('click',e=>{const b=e.target.closest('.edit-record');if(b)open(b.dataset.kind,b.dataset.id);});
 $('#cancelEdit').addEventListener('click',()=>dialog.close());
 $('#editForm').addEventListener('submit',async e=>{
  e.preventDefault();if(!current)return;
  const actions={client:'update_client',project:'update_project_full',event:'update_event',entry:'update_entry'};
  const body=Object.fromEntries(new FormData(e.currentTarget));body.id=current.id;body.action=actions[current.kind];
  try{const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const result=await r.json();if(!r.ok)throw new Error(result.error||'Unable to save changes');dialog.close();location.reload();}
  catch(err){$('#editMessage').textContent=err.message;$('#editMessage').className='admin-message error';}
 });
 load().catch(err=>{console.error(err);});
})();