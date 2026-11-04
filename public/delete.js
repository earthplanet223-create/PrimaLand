(() => {
 const labels={client:'client record',project:'project and its schedule/status history',event:'schedule entry',entry:'financial transaction'};
 document.addEventListener('click',async e=>{
  const button=e.target.closest('.delete-record');if(!button)return;
  const kind=button.dataset.kind,id=button.dataset.id;
  const warning=kind==='project'
   ?'Delete this project? Its linked schedule entries and status history will also be removed. Projects with linked financial transactions cannot be deleted. This action cannot be undone.'
   :kind==='client'
    ?'Delete this client? Clients with registered projects cannot be deleted. This action cannot be undone.'
    :'Permanently delete this '+labels[kind]+'? This action cannot be undone.';
  if(!window.confirm(warning))return;
  button.disabled=true;const original=button.textContent;button.textContent='Deleting…';
  try{
   const response=await fetch('/api/admin',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'delete_record',kind,id})});
   const result=await response.json();if(!response.ok)throw new Error(result.error||'Unable to delete record.');
   window.location.reload();
  }catch(error){window.alert(error.message);button.disabled=false;button.textContent=original;}
 });
})();