import { DatabaseSync, backup } from 'node:sqlite';
import { createHash } from 'node:crypto';
import { constants, copyFileSync, existsSync, lstatSync, mkdirSync, readFileSync, realpathSync, writeFileSync, unlinkSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const repository = fileURLToPath(new URL('../../', import.meta.url));
const filenamePattern = /^[a-f0-9-]{36}\.jpg$/;
const hash = path => createHash('sha256').update(readFileSync(path)).digest('hex');
const within = (parent, child) => { const path=relative(parent,child); return !path||(path!=='..'&&!path.startsWith(`..${sep}`)&&!isAbsolute(path)); };
function regular(path) {
  const info=lstatSync(path);
  if(!info.isFile()||info.isSymbolicLink())throw new Error('Backup requires regular files; symbolic links are not followed.');
  return info;
}
function inspect(db) {
  if(db.prepare('PRAGMA integrity_check').get().integrity_check!=='ok'||db.prepare('PRAGMA foreign_key_check').all().length)
    throw new Error('Database integrity/foreign-key checks failed.');
  return Object.fromEntries(['users','observations','media'].map(table=>[table,db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get().count]));
}

export function verifyBackup(directory) {
  const root=realpathSync(directory),manifestPath=join(root,'manifest.json');
  const mediaDirectory=lstatSync(join(root,'media'));
  if(!mediaDirectory.isDirectory()||mediaDirectory.isSymbolicLink())throw new Error('Backup media directory must not be a symbolic link.');
  if(existsSync(join(root,'INCOMPLETE.txt')))throw new Error('This backup is incomplete. Do not restore it.');
  regular(manifestPath);
  const manifest=JSON.parse(readFileSync(manifestPath,'utf8'));
  if(manifest.version!==1||manifest.database?.file!=='bird-wanderer.sqlite'||!Array.isArray(manifest.media))throw new Error('Unknown backup manifest.');
  const database=join(root,manifest.database.file);regular(database);
  if(hash(database)!==manifest.database.sha256)throw new Error('Database checksum does not match.');
  const db=new DatabaseSync(database,{readOnly:true});
  try {
    const counts=inspect(db),rows=db.prepare('SELECT filename,bytes FROM media ORDER BY filename').all();
    if(JSON.stringify(counts)!==JSON.stringify(manifest.counts)||rows.length!==manifest.media.length)throw new Error('Backup counts do not match.');
    for(let i=0;i<rows.length;i++){
      const row=rows[i],saved=manifest.media[i];
      if(!filenamePattern.test(row.filename)||row.filename!==saved.file)throw new Error('Invalid backup media reference.');
      const path=join(root,'media',row.filename),info=regular(path);
      if(info.size!==row.bytes||info.size!==saved.bytes||hash(path)!==saved.sha256)throw new Error('Photograph checksum/size does not match.');
    }
    return manifest;
  } finally { db.close(); }
}

export async function createBackup({databasePath,mediaPath,destination,serverStopped=false}) {
  if(!serverStopped)throw new Error('Stop every app process using this database/media, then explicitly confirm --server-stopped.');
  const source=realpathSync(databasePath);regular(source);
  const output=join(realpathSync(dirname(resolve(destination))),resolve(destination).split(/[\\/]/).at(-1));
  if(within(realpathSync(repository),output)||output===source||existsSync(output))throw new Error('Choose a NEW backup directory outside the repository. Existing paths are never overwritten.');
  const db=new DatabaseSync(source,{readOnly:true});
  try {
    const counts=inspect(db),rows=db.prepare('SELECT filename,bytes FROM media ORDER BY filename').all();
    const media=rows.length?realpathSync(mediaPath):null;
    if(media&&within(media,output))throw new Error('Backup destination must be outside the media directory.');
    for(const row of rows){
      if(!filenamePattern.test(row.filename)||regular(join(media,row.filename)).size!==row.bytes)throw new Error('A referenced photograph is missing, unsafe or has the wrong size.');
    }
    mkdirSync(output,{mode:0o700});mkdirSync(join(output,'media'),{mode:0o700});
    writeFileSync(join(output,'INCOMPLETE.txt'),'Backup did not finish. Do not restore this directory.\n',{flag:'wx',mode:0o600});
    const database=join(output,'bird-wanderer.sqlite');
    await backup(db,database);
    const files=rows.map(row=>{
      const target=join(output,'media',row.filename);
      copyFileSync(join(media,row.filename),target,constants.COPYFILE_EXCL);
      return {file:row.filename,bytes:row.bytes,sha256:hash(target)};
    });
    const manifest={version:1,createdAt:new Date().toISOString(),counts,database:{file:'bird-wanderer.sqlite',sha256:hash(database)},media:files};
    writeFileSync(join(output,'manifest.json'),JSON.stringify(manifest,null,2)+'\n',{flag:'wx',mode:0o600});
    unlinkSync(join(output,'INCOMPLETE.txt'));
    try { verifyBackup(output); }
    catch(error){writeFileSync(join(output,'INCOMPLETE.txt'),'Verification failed. Do not restore.\n',{mode:0o600});throw error;}
    return {directory:output,counts};
  } finally { db.close(); }
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try {
    await import('dotenv/config');
    const args=process.argv.slice(2);
    if(args[0]==='verify'&&args.length===2){const manifest=verifyBackup(args[1]);console.log('Backup verified:',manifest.counts);}
    else if(args[0]==='create'&&args.length===3&&args[2]==='--server-stopped'){
      const root=fileURLToPath(new URL('../',import.meta.url));
      const result=await createBackup({databasePath:process.env.DATABASE_PATH||join(root,'data/bird-wanderer.sqlite'),mediaPath:process.env.MEDIA_PATH||join(root,'data/media'),destination:args[1],serverStopped:true});
      console.log('Backup created and verified:',result.directory,result.counts);
    } else throw new Error('Usage: node scripts/backup.mjs create <new-external-directory> --server-stopped | verify <backup-directory>');
  } catch(error) {console.error('Backup failed:',error.code||error.message);process.exitCode=1;}
}
