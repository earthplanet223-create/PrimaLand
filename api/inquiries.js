import { db } from "hatchable";
export const access = "public";
export const methods = ["POST"];
const clean = (v, max=500) => String(v ?? "").trim().slice(0,max);
export default async function(req,res){
 try {
  const b=req.body||{};
  const name=clean(b.name,160), phone=clean(b.phone,40), email=clean(b.email,160), service=clean(b.service,100), location=clean(b.location,240), notes=clean(b.notes,2000);
  if(!name||!phone||!service||!location) return res.status(400).json({error:"Please complete all required fields."});
  const clientResult=await db.query("INSERT INTO clients (name,email,phone,notes) VALUES ($1,$2,$3,$4) RETURNING id",[name,email||null,phone,notes]);
  const clientId=clientResult.rows[0].id;
  const reference="PL-"+new Date().getFullYear()+"-"+crypto.randomUUID().replace(/-/g,"").slice(0,6).toUpperCase();
  await db.query("INSERT INTO projects (reference,client_id,service,location,status,public_note,internal_notes) VALUES ($1,$2,$3,$4,'Request received','Your inquiry has been received. PrimaLand will contact you to discuss the next steps.',$5)",[reference,clientId,service,location,notes]);
  return res.status(201).json({ok:true,reference});
 } catch(e){console.log("Inquiry submission failed",String(e));return res.status(500).json({error:"We could not submit your inquiry. Please try again or contact the firm directly."});}
}