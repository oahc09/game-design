// Neutral engine bootstrap shared byte-for-byte by both study arms. No game rules or design toolkit.
try {
 const cc=await import('../../vendor/cocosair/cocosair.module.js');
 const app=await cc.createAirApp({canvas:'#GameCanvas',designResolution:{width:800,height:600,policy:0},diagnostics:'warnings'});
 const scene=new cc.Scene('EmptyScene');
 const canvas=cc.createUICanvas(scene,'Canvas',{designWidth:800,designHeight:600});
 const node=new cc.Node('EnginePrimitive');node.layer=cc.Layers.Enum.UI_2D;node.addComponent(cc.UITransform).setContentSize(80,80);
 const graphics=node.addComponent(cc.GraphicsComponent);graphics.fillColor=new cc.Color().fromHEX('#8edbd0');graphics.rect(-40,-40,80,80);graphics.fill();canvas.addChild(node);
 app.run(scene);
 document.querySelector('#status').textContent=`CocosAirJS ${cc.AIR_VERSION} · revision ${cc.AIR_REVISION} · ready`;
 window.__engineStarter={ready:true,version:cc.AIR_VERSION,revision:cc.AIR_REVISION,app,scene,canvas,cc};
} catch(error){document.querySelector('#error').textContent=String(error.stack??error);window.__engineStarter={ready:false,error:String(error)};}
