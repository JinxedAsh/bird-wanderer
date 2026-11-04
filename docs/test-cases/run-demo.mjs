// Run from the project root: node docs/test-cases/run-demo.mjs
// Uses only temporary local data. Does not read .env or contact live providers.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtempSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../../frontend/server/auth.mjs';
import { createDiscoveryService } from '../../frontend/server/discovery.mjs';
const require = createRequire(new URL('../../frontend/package.json', import.meta.url));
const sharp = require('sharp');
const directory = mkdtempSync(join(tmpdir(), 'bw-lecture-demo-'));
const clock = Date.parse('2026-10-26T12:00:00Z');
let offline = false;
const upstream = async url => {
  if (offline) throw new Error('Controlled provider outage');
  return Response.json(url.pathname.includes('taxonomy')
    ? [{ speciesCode:'indrol2', comName:'Indian Roller', sciName:'Coracias benghalensis', category:'species' }]
    : url.pathname.includes('hotspot')
      ? [{locId:'L123',locName:'Demo Wetland',lat:28.5,lng:77.2,numSpeciesAllTime:42}]
      : [{speciesCode:'indrol2',comName:'Indian Roller',sciName:'Coracias benghalensis',locId:'L123',locName:'Demo Wetland',obsDt:'2026-10-25 09:00',howMany:3}]);
};
const discovery = createDiscoveryService({apiKey:'synthetic-demo-key',fetchImpl:upstream,now:()=>clock,ttl:0});
const {app,db} = createApp({dbPath:join(directory,'demo.sqlite'),mediaPath:join(directory,'media'),discovery,now:()=>clock});
const server=app.listen(0,'127.0.0.1');
await new Promise(resolve=>server.once('listening',resolve));
const base=`http://127.0.0.1:${server.address().port}/api/`;
const rows=[];
let media,record,owner,viewer;
const request=async(path,method='GET',body,cookie,type)=>{
  const response=await fetch(base+path,{method,headers:{origin:'http://localhost:3000',...(cookie?{cookie}:{}),...(body===undefined?{}:{'Content-Type':type||'application/json'})},body:body===undefined?undefined:Buffer.isBuffer(body)?body:JSON.stringify(body)});
  const data=response.headers.get('content-type')?.includes('application/json')?await response.json():Buffer.from(await response.arrayBuffer());
  return {status:response.status,data,cookie:response.headers.get('set-cookie')?.split(';')[0]};
};
const count=table=>db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n;
async function run(id,title,fn){
  const details=await fn();rows.push({id,title,status:'Pass',...details});
  console.log(`\n${id}  PASS  ${title}\n${details.actual}`);
  if(details.error)console.log(`Handled error: "${details.error}"\nRecovery: ${details.recovery}`);
}
async function register(name){const r=await request('auth/register','POST',{name,email:`${name.toLowerCase()}@example.test`,password:'DemoBird2026!'});assert.equal(r.status,201);return r.cookie;}
const image=await sharp({create:{width:16,height:16,channels:3,background:'#245a27'}}).jpeg().withExif({IFD0:{Make:'Demo camera',Model:'Fixture only'},IFD3:{GPSLatitudeRef:'N',GPSLatitude:'28/1 30/1 0/1',GPSLongitudeRef:'E',GPSLongitude:'77/1 12/1 0/1'}}).toBuffer();
const body=()=>({mediaId:media.id,speciesId:'indrol2',hotspotId:'L123',observedAt:'2026-10-25T09:00',notes:'Demonstration record using synthetic test data.',visibility:'private',hideExactLocation:true});
try {
  console.log('BIRD WANDERER: 5 SUCCESSFUL OPERATIONS AND 5 HANDLED ERRORS\nIsolated API integration demo. Provider data and photograph are synthetic fixtures.');
  owner=await register('Owner');viewer=await register('Viewer');
  await run('BW-P01','Discover species, hotspots and recent sightings',async()=>{
    const r=await request('discovery/catalogue','GET',undefined,owner);assert.equal(r.status,200);
    assert.equal(r.data.species[0].id,'indrol2');assert.equal(r.data.species[0].source,'eBird');
    assert.equal(r.data.species[0].recentObservations[0].hotspotId,'L123');assert.equal(r.data.hotspots[0].speciesCount,42);
    assert.ok(!JSON.stringify(r.data).includes('synthetic-demo-key'));
    return {http:200,actual:'200 OK; Indian Roller joins to Demo Wetland and its recent report. Source IDs retained; API key absent.'};
  });
  await run('BW-P02','Upload a valid photograph and protect its metadata',async()=>{
    const r=await request('observations/media','POST',image,owner,'image/jpeg');assert.equal(r.status,201);media=r.data.media;
    assert.equal(media.exif.cameraMake,'Demo camera');assert.equal(media.hasPrivateLocation,true);
    const served=await request(`observations/media/${media.id}`,'GET',undefined,owner);assert.equal(served.status,200);
    assert.equal((await sharp(served.data).metadata()).exif,undefined);assert.equal(count('media'),1);
    return {http:201,actual:'201 Created; camera metadata extracted; private GPS detected; served JPEG has no embedded EXIF; one media record.'};
  });
  await run('BW-P03','Save a private observation to the journal',async()=>{
    const r=await request('observations','POST',body(),owner);assert.equal(r.status,201);record=r.data.observation;
    const journal=await request('observations','GET',undefined,owner);assert.equal(journal.data.observations.length,1);
    assert.equal(journal.data.profile.photosCount,1);assert.equal(journal.data.profile.birdsCount,1);
    const feed=await request('observations?scope=feed','GET',undefined,viewer);assert.equal(feed.data.observations.length,0);
    assert.equal(record.privateLocation.latitude,28.5);
    return {http:201,actual:'201 Created; owner journal contains one observation; photo and bird totals are 1; other account feed excludes it.'};
  });
  await run('BW-P04','Share an observation while withholding exact coordinates',async()=>{
    const r=await request(`observations/${record.id}`,'PATCH',{visibility:'public'},owner);assert.equal(r.status,200);
    const shared=await request(`observations/${record.id}`,'GET',undefined,viewer);assert.equal(shared.status,200);
    assert.equal(shared.data.observation.location,'Demo Wetland');assert.ok(!Object.hasOwn(shared.data.observation,'privateLocation'));
    assert.equal((await request(`observations/media/${media.id}`,'GET',undefined,viewer)).status,200);
    assert.equal((await request('observations?scope=feed','GET',undefined,viewer)).data.observations.length,1);
    return {http:200,actual:'200 OK; other account can read the public post and photo; hotspot name shown; privateLocation absent.'};
  });
  await run('BW-P05','Bookmark a catalogue species without duplicate records',async()=>{
    for(let i=0;i<2;i++)assert.equal((await request('activity/saves/species/indrol2','PUT',{saved:true},owner)).status,200);
    const r=await request('activity','GET',undefined,owner);assert.deepEqual(r.data.saves,[{kind:'species',id:'indrol2'}]);
    assert.equal(count('discovery_saves'),1);assert.equal((await request('activity','GET',undefined,viewer)).data.saves.length,0);
    return {http:200,actual:'200 OK; two save requests produce one saved reference; later read retains it; viewer has no bookmark.'};
  });
  await run('BW-N01','Reject a corrupt photograph and allow a valid replacement',async()=>{
    const before=count('media'),files=readdirSync(join(directory,'media')).length;
    const r=await request('observations/media','POST',Buffer.from([255,216,255,0]),owner,'image/jpeg');assert.equal(r.status,422);
    assert.equal(count('media'),before);assert.equal(readdirSync(join(directory,'media')).length,files);
    const retry=await request('observations/media','POST',image,owner,'image/jpeg');assert.equal(retry.status,201);
    return {http:422,error:r.data.error,actual:'422 Unprocessable Entity; corrupt JPEG creates no media row or file; valid replacement returns 201.',recovery:'Choose a valid JPEG/PNG. A valid retry succeeded.'};
  });
  await run('BW-N02','Reject an upload above the 10 MB limit',async()=>{
    const before=count('media'),files=readdirSync(join(directory,'media')).length;
    const r=await request('observations/media','POST',Buffer.alloc(10*1024*1024+1),owner,'image/jpeg');assert.equal(r.status,413);
    assert.equal(count('media'),before);assert.equal(readdirSync(join(directory,'media')).length,files);
    const retry=await request('observations/media','POST',image,owner,'image/jpeg');assert.equal(retry.status,201);
    return {http:413,error:r.data.error,actual:'413 Payload Too Large; 10,485,761-byte upload rejected; file/row totals unchanged; smaller valid retry returns 201.',recovery:'Resize/compress the photo below the limit. A smaller valid upload succeeded.'};
  });
  await run('BW-N03','Reject an impossible future observation date',async()=>{
    const uploaded=await request('observations/media','POST',image,owner,'image/jpeg');assert.equal(uploaded.status,201);
    const input={...body(),mediaId:uploaded.data.media.id,observedAt:'2099-01-01T09:00'};const before=count('observations');
    const r=await request('observations','POST',input,owner);assert.equal(r.status,400);assert.equal(count('observations'),before);
    const retry=await request('observations','POST',{...input,observedAt:'2026-10-25T09:00'},owner);assert.equal(retry.status,201);
    return {http:400,error:r.data.error,actual:'400 Bad Request; 2099 date creates no observation; correcting only the date returns 201 with the same staged photo.',recovery:'Correct the date to the actual observation time. Corrected submission succeeded without re-upload.'};
  });
  await run('BW-N04','Block another account from a private record and its photograph',async()=>{
    assert.equal((await request(`observations/${record.id}`,'PATCH',{visibility:'private'},owner)).status,200);
    const r=await request(`observations/${record.id}`,'GET',undefined,viewer);assert.equal(r.status,404);
    const photo=await request(`observations/media/${media.id}`,'GET',undefined,viewer);assert.equal(photo.status,404);
    assert.equal((await request(`observations/${record.id}`,'DELETE',undefined,viewer)).status,404);
    assert.equal((await request(`observations/${record.id}`,'GET',undefined,owner)).status,200);
    return {http:404,error:r.data.error,actual:'404 for private record, photo and delete attempt from viewer; owner still reads the unchanged record with 200.',recovery:'Use the owning account or ask the owner to change visibility. Owner access succeeded.'};
  });
  await run('BW-N05','Handle a bird-data provider outage and recover on retry',async()=>{
    offline=true;const r=await request('discovery/catalogue','GET',undefined,owner);assert.equal(r.status,503);
    assert.equal(r.data.error,'Cannot reach eBird. Please try again.');assert.ok(!Object.hasOwn(r.data,'species'));
    assert.equal((await request('observations','GET',undefined,owner)).status,200);
    offline=false;const retry=await request('discovery/catalogue','GET',undefined,owner);assert.equal(retry.status,200);assert.equal(retry.data.species[0].id,'indrol2');
    return {http:503,error:r.data.error,actual:'503 Service Unavailable; explicit error instead of fake empty data; journal remains readable; provider recovery returns 200.',recovery:'Restore provider connectivity and retry. Catalogue retry succeeded; local journal remained available.'};
  });
  writeFileSync(join(directory,'results.json'),JSON.stringify({date:'26 October 2026',mode:'API integration tests against real application routes and SQLite, with synthetic external provider responses and photograph. Browser interaction has not been executed.',rows},null,2));
  console.log(`\n10/10 PASS. Negative operations failed safely as expected.\nEvidence: ${join(directory,'results.json')}\nTemporary demonstration data: ${directory}`);
} finally {await new Promise(resolve=>server.close(resolve));db.close();}
