import { db } from "hatchable";
export const access = "admin";
const s=(v,n=500)=>String(v??"").trim().slice(0,n);
const validStatus=new Set(["Request received","In progress","Fieldwork scheduled","Processing","For client review","Completed","On hold","Cancelled"]);
const isoDate=v=>v?s(v,10):null;
export default async function(req,res){
 try{
  if(req.method==="GET"){
   const [clients,projects,events,entries]=await Promise.all([
    db.query("SELECT id,name,email,phone,address,notes,created_at FROM clients ORDER BY created_at DESC"),
    db.query("SELECT p.id,p.reference,p.client_id,c.name AS client_name,c.phone AS client_phone,p.service,p.location,p.fee,COALESCE((SELECT SUM(f.amount) FROM financial_entries f WHERE f.project_id=p.id AND f.kind='income'),0) AS amount_received,GREATEST(p.fee-COALESCE((SELECT SUM(f.amount) FROM financial_entries f WHERE f.project_id=p.id AND f.kind='income'),0),0) AS receivable,p.status,p.public_note,p.internal_notes,p.due_date,p.created_at,p.updated_at FROM projects p JOIN clients c ON c.id=p.client_id ORDER BY p.created_at DESC"),
    db.query("SELECT e.id,e.project_id,p.reference,c.name AS client_name,e.event_type,e.title,e.event_date,e.start_time,e.end_time,e.location,e.status,e.notes FROM survey_events e JOIN projects p ON p.id=e.project_id JOIN clients c ON c.id=p.client_id ORDER BY e.event_date ASC,e.start_time ASC"),
    db.query("SELECT f.id,f.project_id,p.reference,c.name AS client_name,f.kind,f.amount,f.entry_date,f.category,f.description,f.payment_reference FROM financial_entries f LEFT JOIN projects p ON p.id=f.project_id LEFT JOIN clients c ON c.id=p.client_id ORDER BY f.entry_date DESC,f.created_at DESC")
   ]);
   return res.json({clients:clients.rows,projects:projects.rows,events:events.rows,entries:entries.rows});
  }
  if(req.method!=="POST")return res.status(405).json({error:"Method not allowed"});
  const b=req.body||{}, action=s(b.action,40);
  if(action==="delete_record"){
   const id=s(b.id,50),kind=s(b.kind,20);if(!id||!["client","project","event","entry"].includes(kind))return res.status(400).json({error:"Invalid record."});
   if(kind==="client"){
    const linked=await db.query("SELECT COUNT(*)::int AS n FROM projects WHERE client_id=$1",[id]);
    if(Number(linked.rows[0].n)>0)return res.status(409).json({error:"This client has project records. Delete or reassign those projects first; client records with linked work are protected."});
    const r=await db.query("DELETE FROM clients WHERE id=$1 RETURNING id",[id]);if(!r.rows.length)return res.status(404).json({error:"Client not found."});
   }else if(kind==="project"){
    const linked=await db.query("SELECT COUNT(*)::int AS n FROM financial_entries WHERE project_id=$1",[id]);
    if(Number(linked.rows[0].n)>0)return res.status(409).json({error:"This project has financial transactions linked to it. Those transactions are protected; reassign them to General business or another project before deleting this project."});
    const exists=await db.query("SELECT id FROM projects WHERE id=$1",[id]);if(!exists.rows.length)return res.status(404).json({error:"Project not found."});
    await db.query("DELETE FROM survey_events WHERE project_id=$1",[id]);
    await db.query("DELETE FROM project_status_history WHERE project_id=$1",[id]);
    await db.query("DELETE FROM projects WHERE id=$1",[id]);
   }else if(kind==="event"){
    const r=await db.query("DELETE FROM survey_events WHERE id=$1 RETURNING id",[id]);if(!r.rows.length)return res.status(404).json({error:"Schedule entry not found."});
   }else{
    const r=await db.query("DELETE FROM financial_entries WHERE id=$1 RETURNING id",[id]);if(!r.rows.length)return res.status(404).json({error:"Financial entry not found."});
   }
   return res.json({ok:true,deleted:true,kind});
  }
  if(action==="client"){
   const name=s(b.name,160);if(!name)return res.status(400).json({error:"Client name is required."});
   const {rows}=await db.query("INSERT INTO clients (name,email,phone,address,notes) VALUES ($1,$2,$3,$4,$5) RETURNING id",[name,s(b.email,160)||null,s(b.phone,40)||null,s(b.address,300)||null,s(b.notes,1000)]);
   return res.status(201).json({ok:true,id:rows[0].id});
  }
  if(action==="update_client"){
   const id=s(b.id,50),name=s(b.name,160);if(!id||!name)return res.status(400).json({error:"Client name is required."});
   const {rows}=await db.query("UPDATE clients SET name=$2,email=$3,phone=$4,address=$5,notes=$6 WHERE id=$1 RETURNING id",[id,name,s(b.email,160)||null,s(b.phone,40)||null,s(b.address,300)||null,s(b.notes,1000)]);
   if(!rows.length)return res.status(404).json({error:"Client not found."});
   return res.json({ok:true,id:rows[0].id});
  }
  if(action==="update_project_full"){
   const id=s(b.id,50),clientId=s(b.client_id,50),service=s(b.service,100),location=s(b.location,240),fee=Number(b.fee),status=s(b.status,50);
   if(!id||!clientId||!service||!location||!Number.isFinite(fee)||fee<0||!validStatus.has(status))return res.status(400).json({error:"Check the client, service, location, fee and status."});
   const note=s(b.public_note,500),internal=s(b.internal_notes,2000),due=isoDate(b.due_date);
   const {rows}=await db.query("UPDATE projects SET client_id=$2,service=$3,location=$4,fee=$5,status=$6,public_note=$7,internal_notes=$8,due_date=$9,updated_at=NOW() WHERE id=$1 RETURNING id,reference,status,public_note",[id,clientId,service,location,fee,status,note,internal,due]);
   if(!rows.length)return res.status(404).json({error:"Project not found."});
   await db.query("INSERT INTO project_status_history (project_id,status,public_note) VALUES ($1,$2,$3)",[id,status,note]);
   return res.json({ok:true,project:rows[0]});
  }
  if(action==="update_event"){
   const id=s(b.id,50),projectId=s(b.project_id,50),title=s(b.title,160),date=isoDate(b.event_date);
   if(!id||!projectId||!title||!date)return res.status(400).json({error:"Project, activity title and date are required."});
   const {rows}=await db.query("UPDATE survey_events SET project_id=$2,event_type=$3,title=$4,event_date=$5,start_time=$6,end_time=$7,location=$8,status=$9,notes=$10 WHERE id=$1 RETURNING id",[id,projectId,s(b.event_type,40)||"Survey",title,date,s(b.start_time,5)||null,s(b.end_time,5)||null,s(b.location,240),s(b.status,40)||"Scheduled",s(b.notes,1000)]);
   if(!rows.length)return res.status(404).json({error:"Schedule entry not found."});
   return res.json({ok:true,id:rows[0].id});
  }
  if(action==="update_entry"){
   const id=s(b.id,50),kind=s(b.kind,10),amount=Number(b.amount),date=isoDate(b.entry_date),category=s(b.category,100),description=s(b.description,300);
   if(!id||!["income","expense"].includes(kind)||!Number.isFinite(amount)||amount<=0||!date||!category||!description)return res.status(400).json({error:"Enter a valid transaction type, positive amount, date, category and description."});
   const {rows}=await db.query("UPDATE financial_entries SET project_id=$2,kind=$3,amount=$4,entry_date=$5,category=$6,description=$7,payment_reference=$8 WHERE id=$1 RETURNING id",[id,s(b.project_id,50)||null,kind,amount,date,category,description,s(b.payment_reference,160)]);
   if(!rows.length)return res.status(404).json({error:"Financial entry not found."});
   return res.json({ok:true,id:rows[0].id});
  }
  if(action==="project"){
   const clientId=s(b.client_id,50),service=s(b.service,100),location=s(b.location,240),fee=Number(b.fee);
   if(!clientId||!service||!location||!Number.isFinite(fee)||fee<0)return res.status(400).json({error:"Enter a client, service, location and valid fee."});
   const status=validStatus.has(s(b.status,50))?s(b.status,50):"Request received";
   const reference="PL-"+new Date().getFullYear()+"-"+crypto.randomUUID().replace(/-/g,"").slice(0,6).toUpperCase();
   const {rows}=await db.query("INSERT INTO projects (reference,client_id,service,location,fee,status,public_note,internal_notes,due_date) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id,reference",[reference,clientId,service,location,fee,status,s(b.public_note,500)||"Your project has been registered.",s(b.internal_notes,2000),isoDate(b.due_date)]);
   await db.query("INSERT INTO project_status_history (project_id,status,public_note) VALUES ($1,$2,$3)",[rows[0].id,status,s(b.public_note,500)||"Your project has been registered."]);
   return res.status(201).json({ok:true,...rows[0]});
  }
  if(action==="update_project"){
   const id=s(b.id,50),status=s(b.status,50);if(!id||!validStatus.has(status))return res.status(400).json({error:"Choose a valid project and status."});
   const note=s(b.public_note,500),internal=s(b.internal_notes,2000);
   const {rows}=await db.query("UPDATE projects SET status=$2,public_note=$3,internal_notes=$4,due_date=$5,updated_at=NOW() WHERE id=$1 RETURNING id,reference,status,public_note,updated_at",[id,status,note,internal,isoDate(b.due_date)]);
   if(!rows.length)return res.status(404).json({error:"Project not found."});
   await db.query("INSERT INTO project_status_history (project_id,status,public_note) VALUES ($1,$2,$3)",[id,status,note]);
   return res.json({ok:true,project:rows[0]});
  }
  if(action==="event"){
   const projectId=s(b.project_id,50),title=s(b.title,160),date=isoDate(b.event_date),eventType=s(b.event_type,40)||"Survey";
   if(!projectId||!title||!date)return res.status(400).json({error:"Project, activity title and date are required."});
   const {rows}=await db.query("INSERT INTO survey_events (project_id,event_type,title,event_date,start_time,end_time,location,status,notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id",[projectId,eventType,title,date,s(b.start_time,5)||null,s(b.end_time,5)||null,s(b.location,240),s(b.status,40)||"Scheduled",s(b.notes,1000)]);
   return res.status(201).json({ok:true,id:rows[0].id});
  }
  if(action==="entry"){
   const kind=s(b.kind,10),amount=Number(b.amount),date=isoDate(b.entry_date),category=s(b.category,100),description=s(b.description,300);
   if(!["income","expense"].includes(kind)||!Number.isFinite(amount)||amount<=0||!date||!category||!description)return res.status(400).json({error:"Enter a valid transaction type, positive amount, date, category and description."});
   const {rows}=await db.query("INSERT INTO financial_entries (project_id,kind,amount,entry_date,category,description,payment_reference) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id",[s(b.project_id,50)||null,kind,amount,date,category,description,s(b.payment_reference,160)]);
   return res.status(201).json({ok:true,id:rows[0].id});
  }
  return res.status(400).json({error:"Unknown action."});
 }catch(e){console.log("Admin operation failed",String(e));return res.status(500).json({error:"The operation could not be completed. Check the fields and try again."});}
}