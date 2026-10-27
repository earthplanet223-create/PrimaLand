import { db } from "hatchable";
export const access = "public";
export const methods = ["POST"];
const norm = v => String(v??"").replace(/[^0-9]/g,"");
export default async function(req,res){
 try{
  const reference=String(req.body?.reference??"").trim().toUpperCase().slice(0,40), phone=norm(req.body?.phone);
  if(!reference||!phone)return res.status(400).json({error:"Enter your reference number and phone number."});
  const {rows}=await db.query("SELECT p.reference,p.service,p.status,p.public_note,p.updated_at,c.phone FROM projects p JOIN clients c ON c.id=p.client_id WHERE upper(p.reference)=upper($1) LIMIT 1",[reference]);
  const p=rows[0];
  if(!p||norm(p.phone)!==phone)return res.status(404).json({error:"No matching transaction was found. Check the reference and phone number provided with your request."});
  return res.json({reference:p.reference,service:p.service,status:p.status,public_note:p.public_note,updated_at:p.updated_at});
 }catch(e){console.log("Transaction lookup failed",String(e));return res.status(500).json({error:"Status lookup is temporarily unavailable. Please try again later."});}
}