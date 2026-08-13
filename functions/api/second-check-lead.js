export async function onRequestPost({request,env}){
  try{
    const data=Object.fromEntries((await request.formData()).entries());
    const fields=['household_status','monthly_gap','bridge_years','income_impact','primary_goal','veteran_household','contact_time','first_name','last_name','phone','email','state','consent'];
    for(const field of fields)if(!String(data[field]||'').trim())return new Response('Please complete every required field.',{status:400});
    const monthly=Number(data.monthly_gap),years=Number(data.bridge_years);
    const endpoint=env.GHL_SECOND_CHECK_WEBHOOK_URL||env.FORM_ENDPOINT;
    if(!endpoint)return new Response('Online delivery is being configured.',{status:503});
    const payload={campaign:'protect-second-check-v1',recipient:'tgeer@ascend-fg.com',submittedAt:new Date().toISOString(),estimated_gap:monthly*12*years,...data};
    const result=await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});
    if(!result.ok)return new Response('Delivery failed.',{status:502});
    return Response.redirect(new URL('/protect-second-check/thank-you.html',request.url).toString(),303);
  }catch(error){return new Response('Request failed.',{status:500})}
}
