/** Isolated Playwright dependency via NODE_PATH; Browser plugin not available. */
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),net=require('node:net'),{spawn,execFileSync}=require('node:child_process');
(async()=>{
 const out=path.resolve(process.argv[2]),root=path.resolve(__dirname,'..');await fs.mkdir(out,{recursive:true});
 const {getArchetype}=await import('../src/archetypes/index.mjs'),{hash}=await import('../src/core/index.mjs'),{createToolkitTools,effectiveSpecs}=await import('../src/skill/toolkit.mjs');
 const reserve=net.createServer();await new Promise(ok=>reserve.listen(0,'127.0.0.1',ok));const port=reserve.address().port;await new Promise(ok=>reserve.close(ok));
 const server=spawn(process.execPath,['tools/serve.mjs'],{cwd:root,env:{...process.env,PORT:String(port)},stdio:'ignore',windowsHide:true});let browser;const report={status:'FAIL',browser_tools:require('playwright/package.json').version,browser_fallback:'Browser plugin not available',cases:[],warnings:[],errors:[],screenshots:[],scope:'Browser automation and visual evidence; no human participant or formal trial'};
 try{
  if(process.platform==='linux'){report.cjk_font=execFileSync('fc-match',['-f','%{family}','sans:lang=zh-cn'],{encoding:'utf8'});assert(/Noto.*CJK/.test(report.cjk_font),'Linux browser acceptance requires the CI CJK font package');}
  const base=`http://127.0.0.1:${port}`;let ready=false;for(let i=0;i<100;i++){try{if((await fetch(base)).ok){ready=true;break;}}catch{}await new Promise(ok=>setTimeout(ok,50));}assert(ready,'owned server startup');
  browser=await chromium.launch({headless:true,executablePath:process.env.GD_BROWSER_EXECUTABLE||undefined,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});report.browser_version=browser.version();report.browser_executable=process.env.GD_BROWSER_EXECUTABLE||'Playwright-managed Chromium';
  const page=await browser.newPage({viewport:{width:1280,height:1050},acceptDownloads:true});page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());if(m.type()==='warning')report.warnings.push(m.text());});
  const screenshot=async name=>{await page.screenshot({path:path.join(out,name),fullPage:true});report.screenshots.push(name);};
  const snapshot=()=>page.evaluate(()=>window.__gameDesign.snapshot());
  async function clickCell(x,y,w,h){const box=await page.locator('#GameCanvas').boundingBox(),size=Math.min(590/w,590/h),ox=(720-w*size)/2,oy=(720-h*size)/2;await page.mouse.click(box.x+(ox+(x+.5)*size)*box.width/720,box.y+(oy+(y+.5)*size)*box.height/720);}
  for(const entry of ['reference','candidate']){
   await page.goto(`${base}/web/${entry==='reference'?'index':'candidate'}.html?manual=1${entry==='candidate'?'&candidate=1':''}`);await page.waitForFunction(()=>window.__gameDesign?.ready===true,null,{timeout:30000});assert((await page.title()).length>0);assert((await page.locator('body').innerText()).length>100);
   for(const id of ['sokoban','falling_blocks','arcade_shooter','match3','merge2048','block_puzzle']){
    const spec=getArchetype(id).exampleSpec(),ref=new (getArchetype(id).Runtime)(spec);ref.reset({seed:42});await page.evaluate(id=>window.__gameDesign.select(id,42),id);assert.equal(hash(await snapshot()),hash(ref.clone()));await page.locator('#GameCanvas').focus();
    if(['sokoban','merge2048'].includes(id))await page.keyboard.press('ArrowRight');
    else if(['falling_blocks','arcade_shooter'].includes(id)){await page.keyboard.down('ArrowRight');await page.evaluate(()=>window.__gameDesign.advanceRender(1/60,window.__gameDesign.input()));await page.keyboard.up('ArrowRight');}
    else{const action=ref.legalActions()[0],s=ref.clone();assert(action,'legal input exists');if(id==='match3'){await clickCell(...action.from,s.width,s.height);await clickCell(...action.to,s.width,s.height);}else{await page.locator('#piece-tray button').nth(action.piece).click();await clickCell(action.x,action.y,s.width,s.height);}}
    assert((await snapshot()).tick>0,`${entry}/${id} real input advances`);await screenshot(`${entry}-${id}.png`);report.cases.push({id:`${entry}/${id}/real-input`,status:'PASS'});
   }
   for(const id of ['falling_blocks','arcade_shooter']){
    const states=[];for(const fps of [30,60,144]){await page.evaluate(id=>window.__gameDesign.select(id,42),id);await page.evaluate(fps=>{for(let i=0;i<fps;i++)window.__gameDesign.advanceRender(1/fps,'NOOP');},fps);states.push(hash(await snapshot()));}assert.equal(new Set(states).size,1);report.cases.push({id:`${entry}/${id}/fixed-step-30-60-144`,status:'PASS'});
   }
   await page.evaluate(()=>window.__gameDesign.select('merge2048',42));const initial=hash(await snapshot());await page.locator('#pause').click();await page.locator('#GameCanvas').focus();await page.keyboard.press('ArrowRight');assert.equal(hash(await snapshot()),initial);await page.locator('#restart').click();assert.equal(hash(await snapshot()),initial);
   await page.evaluate(()=>window.__gameDesign.select('arcade_shooter',42));await page.locator('#GameCanvas').focus();await page.keyboard.down('ArrowRight');assert.equal((await page.evaluate(()=>window.__gameDesign.input())).move[0],1);await page.evaluate(()=>window.dispatchEvent(new Event('blur')));assert.equal((await page.evaluate(()=>window.__gameDesign.input())).move[0],0);await page.keyboard.up('ArrowRight');report.cases.push({id:`${entry}/pause-restart-blur`,status:'PASS'});
   await page.setViewportSize({width:390,height:844});await page.evaluate(()=>window.__gameDesign.select('sokoban',42));const canvas=await page.locator('#GameCanvas').boundingBox(),frame=await page.locator('#GameDiv').boundingBox();assert(Math.abs(canvas.width-frame.width)<1&&Math.abs(canvas.height-frame.height)<1&&frame.width<390);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),390);await screenshot(`${entry}-mobile.png`);await page.setViewportSize({width:1280,height:1050});
   // Independently read the actually loaded spec through the page's existing export.
   const tools=createToolkitTools({browserVerifier:async c=>{
    await page.evaluate(({spec,seed})=>window.__gameDesign.loadSpec(spec,seed),{spec:c.spec,seed:17});const runtime=new (getArchetype(c.spec.game.archetype).Runtime)(c.spec);runtime.reset({seed:17});assert.equal(hash(await snapshot()),hash(runtime.clone()));
    const download=page.waitForEvent('download');await page.locator('#download').click();const data=JSON.parse(await fs.readFile(await (await download).path(),'utf8'));const checked_spec_hash=hash(data.spec);await screenshot(`${entry}-new-${c.spec.game.archetype}.png`);return {status:'PASS',checked_spec_hash,evidence:'page export and screenshot'};
   }});
   for(const id of ['match3','block_puzzle','arcade_shooter']){
    const context={spec:getArchetype(id).exampleSpec(),seed:17,seeds:[17],profiles:['competent'],maxSteps:3},outputs={};
    if(id==='arcade_shooter'){context.balance={parameters:{enemySpeed:[3]},targets:{competent_completion_rate:{min:0,max:1}},seeds:[17],profiles:['competent'],maxSteps:3,maxCandidates:1};outputs.tune_balance=await tools.tune_balance({context,outputs});}
    else{context.controls={count:1,max_attempts:20,custom:id==='match3'?{width:6,height:6}:{width:7,batchSize:4},evaluation:{seeds:[17],maxSteps:3}};outputs.generate_content=await tools.generate_content({context,outputs});}
    const validation=await tools.validate_content({context,outputs});assert.equal(validation.status,'PASS');const result=await tools.adapter_verify({context,outputs});assert.equal(result.status,'PASS');assert.equal(result.data[0].visual.checked_spec_hash,hash(effectiveSpecs({context,outputs})[0]));report.cases.push({id:`${entry}/${id}/effective-spec-browser`,status:'PASS',spec_hash:result.data[0].spec_hash});
   }
  }
  assert.equal(report.errors.length,0,report.errors.join('\n'));report.status='PASS';
 }catch(error){report.failure=error.stack;throw error;}finally{await fs.writeFile(path.join(out,'browser.json'),JSON.stringify(report,null,2)+'\n');await browser?.close();server.kill();}
 console.log(JSON.stringify({status:report.status,cases:report.cases.length,screenshots:report.screenshots.length}));
})().catch(error=>{console.error(error);process.exitCode=1;});
