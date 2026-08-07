const json = (data, status = 200) => new Response(JSON.stringify(data), {status, headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});

export async function onRequestPost({request, env}) {
  try {
    const body = await request.json();
    const required = ['name','phone','email','location','source','licensed','career','why','consent'];
    for (const key of required) if (!String(body[key] ?? '').trim()) return json({ok:false,error:`Missing ${key}`},400);
    if (body.consent !== true && body.consent !== 'true' && body.consent !== 'on') return json({ok:false,error:'Consent is required'},400);

    const registeredAt = new Date().toISOString();
    const webinarDate = env.WEBINAR_DATE || 'Next available webinar';
    const webinarLink = env.WEBINAR_LINK || '';
    const row = [registeredAt, webinarDate, body.name, body.phone, body.email, body.location, body.licensed, body.career, body.why, body.source, 'Registered', 'Pending', 'Pending', webinarLink, '', ''];

    if (!env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !env.GOOGLE_PRIVATE_KEY || !env.ASCEND_SHEET_ID) throw new Error('Google Sheets backend is not configured');
    const accessToken = await getGoogleAccessToken(env.GOOGLE_SERVICE_ACCOUNT_EMAIL, env.GOOGLE_PRIVATE_KEY);
    const range = encodeURIComponent("'Webinar Registrations'!A:P");
    const sheetsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${env.ASCEND_SHEET_ID}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
    const append = await fetch(sheetsUrl,{method:'POST',headers:{authorization:`Bearer ${accessToken}`,'content-type':'application/json'},body:JSON.stringify({values:[row]})});
    if (!append.ok) throw new Error(`Google Sheets append failed: ${await append.text()}`);

    let emailSent = false, textSent = false;
    if (env.RESEND_API_KEY && env.FROM_EMAIL && webinarLink) {
      const r = await fetch('https://api.resend.com/emails',{method:'POST',headers:{authorization:`Bearer ${env.RESEND_API_KEY}`,'content-type':'application/json'},body:JSON.stringify({from:env.FROM_EMAIL,to:[body.email],subject:'Your Ascend Career Webinar Registration',html:`<p>Hi ${escapeHtml(body.name)},</p><p>You’re registered for the Ascend Financial Group career webinar.</p><p><strong>${escapeHtml(webinarDate)}</strong></p><p><a href="${escapeHtml(webinarLink)}">Join the free webinar</a></p><p>We look forward to meeting you.<br>Ascend Financial Group</p>`})});
      emailSent = r.ok;
    }
    if (env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_FROM_NUMBER && webinarLink) {
      const form = new URLSearchParams({To:body.phone,From:env.TWILIO_FROM_NUMBER,Body:`Ascend Financial Group: You’re registered for our career webinar (${webinarDate}). Join here: ${webinarLink}`});
      const auth = btoa(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`);
      const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`,{method:'POST',headers:{authorization:`Basic ${auth}`,'content-type':'application/x-www-form-urlencoded'},body:form});
      textSent = r.ok;
    }

    return json({ok:true,emailSent,textSent,webinarDate});
  } catch (e) { return json({ok:false,error:e?.message || 'Registration failed'},500); }
}

async function getGoogleAccessToken(email, privateKey) {
  const now = Math.floor(Date.now()/1000);
  const header = base64url(JSON.stringify({alg:'RS256',typ:'JWT'}));
  const claim = base64url(JSON.stringify({iss:email,scope:'https://www.googleapis.com/auth/spreadsheets',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600}));
  const input = `${header}.${claim}`;
  const keyData = pemToArrayBuffer(privateKey.replace(/\\n/g,'\n'));
  const key = await crypto.subtle.importKey('pkcs8',keyData,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['sign']);
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5',key,new TextEncoder().encode(input));
  const jwt = `${input}.${base64urlBytes(new Uint8Array(sig))}`;
  const res = await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:jwt})});
  if (!res.ok) throw new Error(`Google auth failed: ${await res.text()}`);
  return (await res.json()).access_token;
}
function base64url(s){return btoa(unescape(encodeURIComponent(s))).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_')}
function base64urlBytes(bytes){let s=''; for(const b of bytes)s+=String.fromCharCode(b); return btoa(s).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_')}
function pemToArrayBuffer(pem){const b64=pem.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g,''); const bin=atob(b64); const bytes=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i); return bytes.buffer}
function escapeHtml(v){return String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
