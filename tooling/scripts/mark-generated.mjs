// Keep generated/runtime folders out of the normal Windows Explorer source view.
import {spawnSync} from 'node:child_process';
if(process.platform==='win32'){
 const command="$paths=@('node_modules','dist','.next','.vinext','.wrangler','.sites-runtime','.openai','next-env.d.ts','npm.cmd'); foreach($p in $paths){ if(Test-Path -LiteralPath $p){$i=Get-Item -LiteralPath $p -Force; $i.Attributes=$i.Attributes -bor [IO.FileAttributes]::Hidden}}";
 const result=spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',command],{windowsHide:true,stdio:'inherit'});
 if(result.status!==0)process.exitCode=result.status??1;
}
