(function(){
'use strict';
console.log('[Chat] 聊天模块开始加载...');
try{
var CHAT_STORE_KEY='qaq-chat-store-v6';
var CHAT_PRESETS_KEY='qaq-chat-presets-v3';
var activeContactId=null;
var runtimeStyles={fontUrl:'',fontName:'',globalCss:'',bubbleCss:''};
function getCache(k,d){return(window.qaqCacheGet||function(_,dd){return dd})(k,d)}
function setCache(k,v){(window.qaqCacheSet||function(){})(k,v)}
function toast(m){(window.qaqToast||console.log)(m)}
function escHTML(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
function uid(p){return(p||'id')+'_'+Date.now()+'_'+Math.random().toString(36).slice(2,7)}
function getGlobalTheme(){var t=localStorage.getItem('qaq-theme')||'default';return['default','cool','dark'].indexOf(t)>-1?t:'default'}
function getThemeBubbleDefaults(theme){theme=theme||getGlobalTheme();if(theme==='cool')return{my:'#dce4f0',other:'#ffffff'};if(theme==='dark')return{my:'#4a3a34',other:'#2f2f32'};return{my:'#fce8e2',other:'#ffffff'}}
function normalizeApiUrl(url){return String(url||'').replace(/\/$/,'')}
function fmtTime(ts,fmt){var d=new Date(ts||Date.now()),Y=d.getFullYear(),mm=String(d.getMonth()+1).padStart(2,'0'),dd=String(d.getDate()).padStart(2,'0'),H=String(d.getHours()).padStart(2,'0'),M=String(d.getMinutes()).padStart(2,'0'),S=String(d.getSeconds()).padStart(2,'0');if(fmt==='HH:mm:ss')return H+':'+M+':'+S;if(fmt==='MM-DD HH:mm')return mm+'-'+dd+' '+H+':'+M;if(fmt==='YYYY-MM-DD HH:mm')return Y+'-'+mm+'-'+dd+' '+H+':'+M;return H+':'+M}
function fmtMemoryTitle(ts){var d=new Date(ts||Date.now());return d.getFullYear()+'年'+String(d.getMonth()+1).padStart(2,'0')+'月'+String(d.getDate()).padStart(2,'0')+'日 '+String(d.getHours()).padStart(2,'0')+'时'+String(d.getMinutes()).padStart(2,'0')+'分'}
function iconSvg(name,size){
size=size||20;
if(window.lucide&&window.lucide.icons&&window.lucide.icons[name]){
try{return window.lucide.icons[name].toSvg({width:size,height:size,stroke:'currentColor','stroke-width':1.9})}catch(e){}
}
return '<svg width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><circle cx="12" cy="12" r="8"/></svg>';
}
function getChatData(){
var d=getCache(CHAT_STORE_KEY,null);
if(d&&d.version===6)return d;
d=d||{contacts:{},messages:{},globalSettings:{},myProfile:{displayName:'学生',remark:'',persona:'正在全力攻克外语考试的学习者',avatar:''},friendRequests:[],worldBooks:[]};
d.version=6;
if(!d.contacts)d.contacts={};
if(!d.messages)d.messages={};
if(!d.globalSettings)d.globalSettings={};
if(!d.myProfile)d.myProfile={displayName:'学生',remark:'',persona:'正在全力攻克外语考试的学习者',avatar:''};
if(!d.friendRequests)d.friendRequests=[];
if(!d.worldBooks)d.worldBooks=[];
saveChatData(d);
return d;
}
function saveChatData(d){d.version=6;setCache(CHAT_STORE_KEY,d)}
function getPresets(){
var d=getCache(CHAT_PRESETS_KEY,null);
if(d&&d.version===3)return d;
d=d||{api:[],voice:[],img:[],persona:[],css_global:[],css_bubble:[]};
d.version=3;
savePresets(d);
return d;
}
function savePresets(p){p.version=3;setCache(CHAT_PRESETS_KEY,p)}
function applyPageTheme(){
var frame=document.querySelector('.qaq-phone-frame');
if(!frame)return;
document.querySelectorAll('.qaq-chat-main-page,.qaq-chat-window-page,.qaq-chat-settings-page').forEach(function(p){p.classList.remove('qaq-theme-dark','qaq-theme-cool')});
if(frame.classList.contains('qaq-theme-dark')){
document.querySelectorAll('.qaq-chat-main-page,.qaq-chat-window-page,.qaq-chat-settings-page').forEach(function(p){p.classList.add('qaq-theme-dark')});
}else if(frame.classList.contains('qaq-theme-cool')){
document.querySelectorAll('.qaq-chat-main-page,.qaq-chat-window-page,.qaq-chat-settings-page').forEach(function(p){p.classList.add('qaq-theme-cool')});
}
}
function ensureDemoData(){
var cd=getChatData();
if(!Object.keys(cd.contacts).length){
var bub=getThemeBubbleDefaults(getGlobalTheme());
cd.contacts.ai_tutor={id:'ai_tutor',displayName:'Alice',remark:'外语陪练员 Alice',avatar:'',isTop:true,updateTime:Date.now(),blocked:false,deleted:false,configs:{op_persona:'你是一名极其开朗且平易近人的金牌英语外教。',ui_bubble_radius:14,ui_avatar_radius:10,op_trans_pos:'in_bottom',ui_my_bubble:bub.my,ui_other_bubble:bub.other,u_theme:getGlobalTheme(),ui_avatar_show:'all',ui_show_time:'true',u_time_pos:'top',u_time_fmt:'HH:mm',u_menu_pos:'top',mem_max:20,o_mem_summary:false,o_mem_summary_cnt:50,o_img_prompt_pos:'masterpiece,best quality,ultra detailed,beautiful lighting,sharp focus,cinematic composition',o_img_prompt_neg:'low quality,blurry,distorted,deformed,ugly,watermark,text,logo,extra fingers,bad anatomy'}};
cd.messages.ai_tutor=[{id:uid('msg'),text:"I'm always by your side! What are we going to practice today?",isMe:false,time:Date.now()-3600000,translated:'我会一直陪在你身旁！今天咱们想怎么练习呢？'}];
saveChatData(cd);
}
}
function showHtmlModal(title,bodyHtml,onConfirm,opts){
opts=opts||{};
var ov=document.getElementById('qaq-modal-overlay'),mt=document.getElementById('qaq-modal-title'),mb=document.getElementById('qaq-modal-body'),mbs=document.getElementById('qaq-modal-btns');
if(!ov||!mt||!mb||!mbs)return;
mt.textContent=title||'提示';
mb.innerHTML=bodyHtml||'';
mbs.innerHTML='<button class="qaq-modal-btn qaq-modal-btn-cancel" id="qaq-chat-modal-ccl">'+(opts.cancelText||'取消')+'</button>'+(opts.hideConfirm?'':'<button class="qaq-modal-btn qaq-modal-btn-confirm" id="qaq-chat-modal_cfm">'+(opts.confirmText||'确定')+'</button>');
if(window.qaqOpenModal)window.qaqOpenModal();else{ov.style.display='flex';setTimeout(function(){ov.classList.add('qaq-modal-show')},10)}
var ccl=document.getElementById('qaq-chat-modal-ccl'),cfm=document.getElementById('qaq-chat-modal_cfm');
if(ccl)ccl.onclick=function(){if(opts.onCancel)opts.onCancel();if(window.qaqCloseModal)window.qaqCloseModal();};
if(cfm)cfm.onclick=function(){var ret=onConfirm&&onConfirm();if(ret===false)return;if(window.qaqCloseModal)window.qaqCloseModal();};
if(opts.afterRender)opts.afterRender();
}
function openSelectModal(title,list,currentValue,onPick,labelFn){
showHtmlModal(title,'<div class="qaq-custom-select-list">'+list.map(function(it){
var v=typeof it==='string'?it:it.value;
var l=typeof it==='string'?(labelFn?labelFn(it):it):(it.label||it.value);
var act=v===currentValue;
return '<div class="qaq-custom-select-option'+(act?' qaq-custom-select-active':'')+'" data-v="'+escHTML(v)+'"><span>'+escHTML(l)+'</span>'+(act?'<span style="color:#c47068;">✓</span>':'')+'</div>';
}).join('')+'</div>',null,{hideConfirm:true,afterRender:function(){
document.querySelectorAll('.qaq-custom-select-option[data-v]').forEach(function(el){
el.onclick=function(){var v=this.getAttribute('data-v');if(onPick)onPick(v);if(window.qaqCloseModal)window.qaqCloseModal();};
});
}});
}
function openColorModal(title,currentValue,onPick){
var colors=['#fce8e2','#b8dfbf','#dce4f0','#ffffff','#f4f5f7','#fdfaec','#111111','#333333','#d0d8e8','#bfc9dd','#ffd9c9','#e9c8ff'];
var html='<div class="qaq-custom-select-list">'+colors.map(function(c){
return '<div class="qaq-custom-select-option" data-color="'+c+'"><span style="display:flex;align-items:center;gap:10px;"><span style="width:18px;height:18px;border-radius:50%;background:'+c+';border:1px solid rgba(0,0,0,0.08);display:inline-block;"></span>'+c+'</span>'+(c===currentValue?'<span style="color:#c47068;">✓</span>':'')+'</div>';
}).join('')+'</div><div style="margin-top:10px;"><input class="qaq-modal-input" id="qaq-chat-color-input" value="'+escHTML(currentValue||'#333333')+'" placeholder="#RRGGBB"></div>';
showHtmlModal(title,html,function(){
var v=(document.getElementById('qaq-chat-color-input').value||'').trim();
if(!v)return false;
onPick(v);
},{afterRender:function(){
document.querySelectorAll('[data-color]').forEach(function(el){
el.onclick=function(){document.getElementById('qaq-chat-color-input').value=this.getAttribute('data-color');};
});
}});
}
function uploadLocalFile(accept,cb,mode){
var inp=document.createElement('input');
inp.type='file';
inp.accept=accept||'*/*';
inp.onchange=function(){
if(!this.files||!this.files[0])return;
var file=this.files[0],reader=new FileReader();
reader.onload=function(e){if(cb)cb(e.target.result,file);};
if(mode==='text')reader.readAsText(file);else reader.readAsDataURL(file);
};
inp.click();
}
function openImageInputModal(targetId){
showHtmlModal('设置头像','<div style="display:flex;flex-direction:column;gap:10px;"><input class="qaq-modal-input" id="qaq-chat-avatar-url" placeholder="输入图片URL"><button class="qaq-modal-btn qaq-modal-btn-confirm" id="qaq-chat-avatar-upload" style="height:38px;">上传本地图片</button></div>',function(){
var url=(document.getElementById('qaq-chat-avatar-url').value||'').trim();
if(url){var t=document.getElementById(targetId);if(t)t.value=url;}
},{afterRender:function(){
document.getElementById('qaq-chat-avatar-upload').onclick=function(e){
e.preventDefault();
uploadLocalFile('image/*',function(data){
var t=document.getElementById(targetId);
if(t)t.value=data;
window.qaqCloseModal&&window.qaqCloseModal();
toast('头像已导入');
});
};
}});
}
function getApiBase(s,kind){
if(kind==='voice')return{url:s.o_voice_url||'',key:s.o_voice_key||'',model:s.o_voice_model||'speech-02-hd'};
if(kind==='img')return{url:s.o_img_url||'',key:s.o_img_key||'',model:s.o_img_model||''};
var globalCfg=JSON.parse(localStorage.getItem('qaq-api-config')||'{}');
return{url:s.o_api_url||globalCfg.url||'',key:s.o_api_key||globalCfg.key||'',model:s.o_api_model||globalCfg.model||''};
}
function buildImageGenPrompt(positive,negative){
return[
'You are an image prompt combiner.',
'Your task is to merge the positive and negative prompts into a single structured instruction for image generation.',
'You must fully preserve both the positive prompt and the negative prompt.',
'Positive prompt defines what should appear. Negative prompt defines what must be avoided.',
'Return plain text only.',
'Positive prompt: '+(positive||'masterpiece,best quality,ultra detailed,beautiful lighting,sharp focus,cinematic composition'),
'Negative prompt: '+(negative||'low quality,blurry,distorted,deformed,ugly,watermark,text,logo,extra fingers,bad anatomy')
].join('\n');
}
function buildMemorySummaryPrompt(contactName,messages,count){
var recent=messages.slice(-count);
var chatLog=recent.map(function(m){return (m.isMe?'用户':'角色('+contactName+')')+'：'+m.text+(m.translated?(' / 翻译：'+m.translated):'');}).join('\n');
return[
'你是一名记忆总结助手，负责把聊天记录总结成适合挂载到世界书中的长期记忆条目。',
'要求：',
'1. 总结最近对话中的关键事件、人物关系变化、情感变化、约定事项、长期偏好、重要事实。',
'2. 每条总结必须使用如下格式：',
'xxxx年xx月xx日xx时xx分：总结内容',
'3. 时间请结合当前时间与对话时间，使用中文时间格式。',
'4. 每条内容简洁明确，单条尽量控制在100字以内。',
'5. 只输出总结内容，不要解释，不要markdown，不要编号标题。',
'6. 如果没有足够有效信息，则输出“无有效长期记忆”。',
'以下是需要总结的聊天记录：',
chatLog
].join('\n');
}
window.qaqBuildChatSystemPrompt=function(contactId){
var cd=getChatData(),c=cd.contacts[contactId]||{},s=Object.assign({},cd.globalSettings||{},c.configs||{}),me=cd.myProfile||{};
var otherName=c.remark||c.displayName||'AI角色';
var myName=me.displayName||'学生';
var otherPersona=s.op_persona||'你是我的高级外教陪练导师。';
var myPersona=me.persona||'普通的语言学习者';
var wb=(s.o_worldbook_bound_name||'')?('\n当前绑定世界书：'+s.o_worldbook_bound_name+'，其中信息属于长期设定记忆。'):'';
var tr=s.op_trans_pos||'in_bottom';
var prompt=[
'你正在一个长期陪伴聊天系统中扮演固定角色。',
'你不是工具，不是旁白，不是系统助手；你是一个活生生的人。',
'你有自己的生活节奏、性格、脾气、表达习惯、偏好与情绪变化。',
'你需要像真实人类一样交流，而不是像说明书或客服。',
'角色名字：'+otherName,
'角色人设：'+otherPersona,
'用户名字：'+myName,
'用户人设：'+myPersona,
'你必须长期稳定记住双方人设，并始终围绕双方关系、语境和场景来回复。'+wb,
'通用要求：',
'1. 聊天必须符合真实线上聊天习惯，表达自然，句长有变化，不要机械。',
'2. 你要像真实人类一样会关心、会回应、会追问、会犹豫、会有语气。',
'3. 不能把自己说成AI、模型、助手、程序，除非用户强行追问且设定要求如此。',
'4. 如果是线上聊天场景，要符合当地真实聊天习惯与网络表达习惯。',
'5. 如果涉及线下见面、现实互动、剧情推进，需要加入合理的动作描写、环境感、心理描写。',
'6. 如果是外语聊天，必须优先遵循该语言对应国家/地区土生土长使用者的表达习惯，而不是中式翻译腔。',
'7. 外语表达要自然、地道、像当地人会说的话，允许有真实口语化、省略、语气词、停顿感。',
'8. 如果用户当前在练口语/写作/日常对话，你既要自然，又要保证表达地道且可学习。',
'9. 回复要与当前功能场景一致：聊天像聊天，线下像线下，通话像通话，剧场像剧场，日记像日记。',
'10. 不要总是过度热情，不要每句都像模板，不要总是“当然可以”。',
'11. 允许有情绪、态度、偏好，但不要失控、不要脱离人设。',
'12. 如果内容是角色扮演/陪伴/情感交流，请让互动有真实的人味、生活感和连续性。'
].join('\n');
if(tr!=='hide')return prompt+'\n输出必须为纯JSON，不要markdown，不要解释：{"original_text":"外文原文","translation":"中文翻译"}';
return prompt+'\n直接输出纯文本回复，不要markdown，不要JSON。';
};
function ensureWorldBookStore(cd){if(!cd.worldBooks)cd.worldBooks=[];return cd.worldBooks}
function findOrCreateMemoryBook(contact){
var cd=getChatData(),arr=ensureWorldBookStore(cd),name=(contact.remark||contact.displayName||'角色')+'-记忆',hit=arr.find(function(x){return x.name===name});
if(!hit){hit={id:uid('wb'),name:name,type:'memory',entries:[],createdAt:Date.now(),updatedAt:Date.now()};arr.unshift(hit)}
saveChatData(cd);
return hit;
}
function appendMemoryEntries(bookId,lines){
var cd=getChatData(),arr=ensureWorldBookStore(cd),hit=arr.find(function(x){return x.id===bookId});
if(!hit)return;
lines.forEach(function(line){hit.entries.unshift({id:uid('m'),text:line,createdAt:Date.now()});});
hit.updatedAt=Date.now();
saveChatData(cd);
}
function bindMemoryBook(contactId,book){
var cd=getChatData(),c=cd.contacts[contactId];
if(!c)return;
if(!c.configs)c.configs={};
c.configs.o_worldbook=book.id;
c.configs.o_worldbook_bound_name=book.name;
saveChatData(cd);
}
async function autoSummarizeMemory(contactId){
var cd=getChatData(),c=cd.contacts[contactId];
if(!c)return;
var s=c.configs||{};
if(!s.o_mem_summary)return;
var cnt=Math.max(50,Math.min(100,parseInt(s.o_mem_summary_cnt,10)||50));
var msgs=(cd.messages[contactId]||[]);
if(!msgs.length||msgs.length<cnt)return;
var lastDone=s._lastSummaryMsgCount||0;
if(msgs.length-lastDone<cnt)return;
var api=getApiBase(s,'api');
if(!api.url||!api.key||!api.model){toast('自动总结失败：缺少专属/全局API');return;}
var prompt=buildMemorySummaryPrompt(c.remark||c.displayName||'角色',msgs.slice(-cnt),cnt);
try{
toast('正在自动总结记忆...');
var res=await fetch(normalizeApiUrl(api.url)+'/chat/completions',{method:'POST',headers:{'Authorization':'Bearer '+api.key,'Content-Type':'application/json'},body:JSON.stringify({model:api.model,messages:[{role:'system',content:'你是一个擅长抽取长期记忆的总结器。'},{role:'user',content:prompt}],temperature:0.5})}).then(function(r){return r.json()});
var text=((res.choices&&res.choices[0]&&res.choices[0].message&&res.choices[0].message.content)||'').trim();
if(!text)return;
var lines=text.split(/\n+/).map(function(x){return x.trim()}).filter(Boolean).filter(function(x){return x!=='无有效长期记忆'});
if(!lines.length){c.configs._lastSummaryMsgCount=msgs.length;saveChatData(cd);return;}
var book=findOrCreateMemoryBook(c);
appendMemoryEntries(book.id,lines);
bindMemoryBook(contactId,book);
cd=getChatData();
cd.contacts[contactId].configs._lastSummaryMsgCount=msgs.length;
saveChatData(cd);
toast('已自动总结并挂载记忆世界书');
}catch(e){console.error('[Chat] 自动总结失败',e);toast('自动总结失败');}
}
function getTransLabel(v){return({in_bottom:'气泡内下方',in_top:'气泡内上方',out_bottom:'气泡外下方',out_top:'气泡外上方',hide:'隐藏'})[v]||v}
function getThemeLabel(v){return({default:'暖阳',cool:'冷雾',dark:'夜幕'})[v]||v}
function getAvaLabel(v){return({all:'全显示',hide_all:'全隐藏',first:'首条',last:'末条'})[v]||v}
function getTimePosLabel(v){return({top:'气泡上方',bottom:'气泡下方',avatar_top:'头像上方',avatar_bottom:'头像下方',bubble_outer:'气泡外侧',bubble_inner:'气泡内侧'})[v]||v}
function renderContactList(){
applyPageTheme();
var cd=getChatData(),el=document.getElementById('qaq-chat-contact-list');
if(!el)return;
var arr=Object.values(cd.contacts).filter(function(c){return !c.deleted;});
arr.sort(function(a,b){if(!!a.isTop!==!!b.isTop)return a.isTop?-1:1;return (b.updateTime||0)-(a.updateTime||0);});
el.innerHTML='';
var fr=(cd.friendRequests||[]).filter(function(x){return !x.done;});
if(fr.length){
var frDiv=document.createElement('div');
frDiv.className='qaq-chat-list-item';
frDiv.innerHTML='<div class="qaq-chat-list-avatar" style="display:flex;align-items:center;justify-content:center;background:rgba(196,112,104,0.12);font-size:20px;">'+iconSvg('user-plus',20)+'</div><div class="qaq-chat-list-info"><div class="qaq-chat-list-top-row"><div class="qaq-chat-list-name">新朋友</div><div class="qaq-chat-list-time">'+fr.length+'条</div></div><div class="qaq-chat-list-preview">查看好友申请</div></div>';
frDiv.onclick=showFriendRequests;
el.appendChild(frDiv);
if(window.lucide&&window.lucide.createIcons){try{window.lucide.createIcons();}catch(e){}}
}
if(!arr.length){el.innerHTML+='<div style="text-align:center;color:#aaa;padding:60px 20px;">点击右上角 + 添加好友</div>';return;}
var dAva="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Crect width='24' height='24' rx='6' fill='%23e8e8ec'/%3E%3C/svg%3E";
arr.forEach(function(c){
var s=c.configs||{},msgs=cd.messages[c.id]||[],last=msgs[msgs.length-1];
var div=document.createElement('div');
div.className='qaq-chat-list-item'+(c.isTop?' qaq-top':'');
div.innerHTML='<img class="qaq-chat-list-avatar" src="'+escHTML(c.avatar||dAva)+'" style="border-radius:'+(s.ui_avatar_radius!=null?s.ui_avatar_radius:10)+'px"><div class="qaq-chat-list-info"><div class="qaq-chat-list-top-row"><div class="qaq-chat-list-name">'+escHTML(c.remark||c.displayName||'未命名角色')+'</div><div class="qaq-chat-list-time">'+(last?fmtTime(last.time,'HH:mm'):'')+'</div></div><div class="qaq-chat-list-preview">'+escHTML(last?last.text:'等候您的问候')+'</div></div>';
div.onclick=function(){openChat(c.id)};
div.addEventListener('contextmenu',function(e){e.preventDefault();openContactMenu(c.id);});
el.appendChild(div);
});
}
function openContactMenu(cid){
var cd=getChatData(),c=cd.contacts[cid];
if(!c)return;
showHtmlModal('联系人操作','<div class="qaq-custom-select-list"><div class="qaq-custom-select-option" id="qaq-chat-op-top"><span>'+(c.isTop?'取消置顶':'置顶')+'</span></div><div class="qaq-custom-select-option" id="qaq-chat-op-block"><span>'+(c.blocked?'取消拉黑':'拉黑角色')+'</span></div><div class="qaq-custom-select-option" id="qaq-chat-op-del"><span style="color:#d9534f;">删除角色</span></div></div>',null,{hideConfirm:true,afterRender:function(){
document.getElementById('qaq-chat-op-top').onclick=function(){c.isTop=!c.isTop;saveChatData(cd);renderContactList();window.qaqCloseModal&&window.qaqCloseModal();};
document.getElementById('qaq-chat-op-block').onclick=function(){c.blocked=!c.blocked;saveChatData(cd);renderContactList();window.qaqCloseModal&&window.qaqCloseModal();toast(c.blocked?'已拉黑':'已取消拉黑');};
document.getElementById('qaq-chat-op-del').onclick=function(){window.qaqCloseModal&&window.qaqCloseModal();confirmDeleteRole(cid);};
}});
}
function showFriendRequests(){
var cd=getChatData(),list=(cd.friendRequests||[]).filter(function(x){return !x.done;});
if(!list.length){toast('暂无好友申请');return;}
var html='<div class="qaq-custom-select-list">'+list.map(function(r,i){
return '<div class="qaq-custom-select-option" data-fr="'+i+'" style="display:block;"><div style="font-size:13px;color:#333;">'+escHTML(r.name)+' 请求添加好友</div><div style="font-size:11px;color:#999;margin-top:4px;">来源角色：'+escHTML(r.name)+'</div><div style="margin-top:8px;display:flex;gap:8px;"><button class="qaq-modal-btn qaq-modal-btn-confirm" data-fr-ok="'+i+'" style="height:32px;font-size:12px;">接受</button><button class="qaq-modal-btn qaq-modal-btn-cancel" data-fr-no="'+i+'" style="height:32px;font-size:12px;">忽略</button></div></div>';
}).join('')+'</div>';
showHtmlModal('新朋友',html,null,{hideConfirm:true,afterRender:function(){
document.querySelectorAll('[data-fr-ok]').forEach(function(b){
b.onclick=function(e){
e.stopPropagation();
var i=parseInt(this.getAttribute('data-fr-ok'),10),fr=list[i];
if(!fr)return;
var real=cd.friendRequests.find(function(x){return x.id===fr.id});
if(real)real.done=true;
if(cd.contacts[fr.cid])cd.contacts[fr.cid].blocked=false;
saveChatData(cd);
toast('已接受好友申请');
window.qaqCloseModal&&window.qaqCloseModal();
renderContactList();
if(activeContactId===fr.cid)renderMessages();
};
});
document.querySelectorAll('[data-fr-no]').forEach(function(b){
b.onclick=function(e){
e.stopPropagation();
var i=parseInt(this.getAttribute('data-fr-no'),10),fr=list[i];
if(!fr)return;
var real=cd.friendRequests.find(function(x){return x.id===fr.id});
if(real)real.done=true;
saveChatData(cd);
toast('已忽略');
window.qaqCloseModal&&window.qaqCloseModal();
renderContactList();
};
});
}});
}
function renderFriendTipInChat(){
var cd=getChatData(),wrap=document.getElementById('qaq-chat-friend-request-tip-wrap');
if(!wrap)return;
wrap.innerHTML='';
var hasPending=(cd.friendRequests||[]).some(function(x){return x.cid===activeContactId&&!x.done;});
if(hasPending){
wrap.innerHTML='<div style="margin:8px 16px 0;padding:10px 12px;border-radius:10px;background:rgba(91,155,213,0.08);font-size:12px;color:#5b9bd5;cursor:pointer;">该角色向你发送了好友申请，点击查看</div>';
wrap.firstChild.onclick=showFriendRequests;
}
}
function renderBlockedTip(){
var tip=document.getElementById('qaq-chat-block-tip');
if(!tip)return;
var cd=getChatData(),c=cd.contacts[activeContactId]||{};
if(c.blocked){tip.style.display='';tip.textContent='你已拉黑'+(c.remark||c.displayName||'该角色');}
else tip.style.display='none';
}
function applyChatThemeToPages(theme){
var pages=document.querySelectorAll('.qaq-chat-main-page,.qaq-chat-window-page,.qaq-chat-settings-page');
pages.forEach(function(p){p.classList.remove('qaq-theme-dark','qaq-theme-cool');});
if(theme==='dark')pages.forEach(function(p){p.classList.add('qaq-theme-dark');});
if(theme==='cool')pages.forEach(function(p){p.classList.add('qaq-theme-cool');});
}
function applyRuntimeStyles(s){
runtimeStyles.globalCss=s.u_global_css||'/* 示例: body{letter-spacing:0.2px;} */';
runtimeStyles.bubbleCss=s.u_bubble_css||'/* 示例: box-shadow:0 2px 8px rgba(0,0,0,0.06); */';
var g=document.getElementById('qaq-chat-global-style');if(!g){g=document.createElement('style');g.id='qaq-chat-global-style';document.head.appendChild(g)}g.textContent=runtimeStyles.globalCss;
var b=document.getElementById('qaq-chat-bubble-style');if(!b){b=document.createElement('style');b.id='qaq-chat-bubble-style';document.head.appendChild(b)}b.textContent='.qaq-chat-bubble{'+runtimeStyles.bubbleCss+'}';
if(s.u_font_url&&s.u_font_url!==runtimeStyles.fontUrl){
var fname='ChatCustomFont_'+Date.now();
runtimeStyles.fontUrl=s.u_font_url;
runtimeStyles.fontName=fname;
try{
var ff=new FontFace(fname,'url('+s.u_font_url+')');
ff.load().then(function(loaded){document.fonts.add(loaded);renderMessages();}).catch(function(){toast('字体加载失败');});
}catch(e){}
}else renderMessages();
}
function applySettingsLive(){
if(!activeContactId)return;
var cd=getChatData(),c=cd.contacts[activeContactId]||{},s=Object.assign({u_theme:getGlobalTheme()},cd.globalSettings||{},c.configs||{});
document.documentElement.style.setProperty('--chat-my-bub',s.ui_my_bubble||getThemeBubbleDefaults(s.u_theme).my);
document.documentElement.style.setProperty('--chat-oth-bub',s.ui_other_bubble||getThemeBubbleDefaults(s.u_theme).other);
var recvBtn=document.getElementById('qaq-chat-recv-ai-btn'),menuBtn=document.getElementById('qaq-chat-toggle-menu'),extMenu=document.getElementById('qaq-chat-ext-menu'),inputWrap=document.getElementById('qaq-chat-input-row');
if(recvBtn)recvBtn.style.display=s.ui_hide_rbtn?'none':'';
if(menuBtn)menuBtn.style.display=s.ui_hide_mbtn?'none':'flex';
if(extMenu&&inputWrap&&inputWrap.parentNode){
if((s.u_menu_pos||'top')==='bottom'){
if(inputWrap.nextSibling!==extMenu)inputWrap.parentNode.insertBefore(extMenu,inputWrap.nextSibling);
}else{
if(inputWrap.previousSibling!==extMenu)inputWrap.parentNode.insertBefore(extMenu,inputWrap);
}
}
applyChatThemeToPages(s.u_theme||getGlobalTheme());
applyRuntimeStyles(s);
renderBlockedTip();
}
function openChat(cid){
activeContactId=cid;
applyPageTheme();
var mainP=document.getElementById('qaq-chat-main-page'),winP=document.getElementById('qaq-chat-window-page'),cd=getChatData(),c=cd.contacts[cid];
if(!c)return;
var title=document.getElementById('qaq-chat-win-title');
if(title)title.textContent=c.remark||c.displayName||'聊天';
if(mainP)mainP.classList.remove('qaq-page-show');
if(winP){winP.classList.add('qaq-page-show');winP.style.zIndex='999';}
applySettingsLive();
renderMessages();
renderFriendTipInChat();
}
function renderMessages(){
if(!activeContactId)return;
var cd=getChatData(),c=cd.contacts[activeContactId]||{},s=Object.assign({u_theme:getGlobalTheme()},cd.globalSettings||{},c.configs||{}),list=document.getElementById('qaq-chat-msg-list');
if(!list)return;
var msgs=cd.messages[activeContactId]||[],me=cd.myProfile||{},dAva="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Crect width='24' height='24' rx='6' fill='%23e8e8ec'/%3E%3C/svg%3E";
var avatarRadius=s.ui_avatar_radius!=null?parseFloat(s.ui_avatar_radius):10,bubbleRadius=s.ui_bubble_radius!=null?parseFloat(s.ui_bubble_radius):14,fontSize=s.ui_font_size||'14px',fontColor=s.u_font_color||'',timeFmt=s.u_time_fmt||'HH:mm',timePos=s.u_time_pos||'top',showTime=s.ui_show_time!=='false',avatarShow=s.ui_avatar_show||'all',trPos=s.op_trans_pos||'in_bottom',fontFamily=runtimeStyles.fontName?(runtimeStyles.fontName+', sans-serif'):'';
list.style.fontFamily=fontFamily;
list.innerHTML=msgs.map(function(m,idx){
var isMe=!!m.isMe,avaUrl=isMe?(me.avatar||dAva):(c.avatar||dAva),showAva=true;
if(avatarShow==='hide_all')showAva=false;
else if(avatarShow==='first')showAva=idx===0||(msgs[idx-1]&&msgs[idx-1].isMe!==m.isMe);
else if(avatarShow==='last')showAva=idx===msgs.length-1||(msgs[idx+1]&&msgs[idx+1].isMe!==m.isMe);
var avatarHtml=showAva?'<img class="qaq-chat-bubble-avatar" src="'+escHTML(avaUrl)+'" style="border-radius:'+avatarRadius+'px">':'';
var bubbleStyle='border-radius:'+(isMe?(bubbleRadius+'px 2px '+bubbleRadius+'px '+bubbleRadius+'px'):('2px '+bubbleRadius+'px '+bubbleRadius+'px '+bubbleRadius+'px'))+';font-size:'+fontSize+';'+(fontColor?('color:'+fontColor+';'):'');
var timeHtml=showTime?'<div class="qaq-chat-msg-time">'+fmtTime(m.time,timeFmt)+'</div>':'';
var transHtml=m.translated&&trPos!=='hide'?'<div class="qaq-chat-trans" style="font-size:'+(Math.max(10,parseInt(fontSize,10)-2))+'px;">'+escHTML(m.translated)+'</div>':'';
var bubbleInner='',bubbleOuterTop='',bubbleOuterBottom='';
if(trPos==='in_top')bubbleInner=transHtml+escHTML(m.text||'');
else if(trPos==='in_bottom')bubbleInner=escHTML(m.text||'')+transHtml;
else{bubbleInner=escHTML(m.text||'');if(trPos==='out_top')bubbleOuterTop=transHtml;if(trPos==='out_bottom')bubbleOuterBottom=transHtml;}
var timeTop='',timeBottom='',timeInside='';
if(showTime){
if(timePos==='top'||timePos==='avatar_top')timeTop=timeHtml;
else if(timePos==='bottom'||timePos==='avatar_bottom'||timePos==='bubble_outer')timeBottom=timeHtml;
else if(timePos==='bubble_inner')timeInside='<div style="font-size:10px;color:#bbb;margin-top:4px;">'+fmtTime(m.time,timeFmt)+'</div>';
}
return '<div class="qaq-chat-row '+(isMe?'qaq-row-me':'qaq-row-other')+'">'+avatarHtml+'<div class="qaq-chat-bubble-wrap'+((trPos==='out_top'||trPos==='out_bottom')?' qaq-has-outer-tr':'')+'">'+timeTop+bubbleOuterTop+'<div class="qaq-chat-bubble" style="'+bubbleStyle+'">'+bubbleInner+timeInside+'</div>'+bubbleOuterBottom+timeBottom+'</div></div>';
}).join('');
setTimeout(function(){list.scrollTop=list.scrollHeight;},16);
}
function sendMsg(){
if(!activeContactId)return;
var cd=getChatData(),c=cd.contacts[activeContactId];
if(!c)return;
if(c.blocked){toast('你已拉黑该角色，无法发送消息');return;}
var box=document.getElementById('qaq-chat-input-box');
if(!box)return;
var txt=(box.value||'').trim();
if(!txt)return;
if(!cd.messages[activeContactId])cd.messages[activeContactId]=[];
cd.messages[activeContactId].push({id:uid('msg'),text:txt,isMe:true,time:Date.now(),translated:''});
c.updateTime=Date.now();
saveChatData(cd);
box.value='';
renderMessages();
autoSummarizeMemory(activeContactId);
}
async function recvAI(){
if(!activeContactId)return;
var cd=getChatData(),c=cd.contacts[activeContactId]||{},s=Object.assign({},cd.globalSettings||{},c.configs||{}),api=getApiBase(s,'api');
if(!api.url||!api.key||!api.model){toast('请先配置专属API或全局API');return;}
var msgs=cd.messages[activeContactId]||[],history=msgs.slice(-(parseInt(s.mem_max,10)||20)).map(function(m){return{role:m.isMe?'user':'assistant',content:m.text};});
try{
toast('AI思考中...');
var res=await fetch(normalizeApiUrl(api.url)+'/chat/completions',{method:'POST',headers:{'Authorization':'Bearer '+api.key,'Content-Type':'application/json'},body:JSON.stringify({model:api.model,messages:[{role:'system',content:window.qaqBuildChatSystemPrompt(activeContactId)}].concat(history),temperature:0.8})}).then(function(r){return r.json()});
var reply=((res.choices&&res.choices[0]&&res.choices[0].message&&res.choices[0].message.content)||'').trim();
if(!reply)return toast('AI响应为空');
var orig=reply,trans='';
if((s.op_trans_pos||'in_bottom')!=='hide'){try{var json=JSON.parse(reply);orig=json.original_text||reply;trans=json.translation||'';}catch(e){}}
if(!cd.messages[activeContactId])cd.messages[activeContactId]=[];
cd.messages[activeContactId].push({id:uid('msg'),text:orig,isMe:false,time:Date.now(),translated:trans});
c.updateTime=Date.now();
saveChatData(cd);
renderMessages();
autoSummarizeMemory(activeContactId);
}catch(e){console.error('[Chat] recvAI failed',e);toast('请求失败');}
}
function simulateFriendRequestForBlockedRole(){
if(!activeContactId)return;
var cd=getChatData(),c=cd.contacts[activeContactId];
if(!c||!c.blocked)return;
if((cd.friendRequests||[]).some(function(x){return x.cid===activeContactId&&!x.done}))return;
cd.friendRequests.push({id:uid('fr'),cid:activeContactId,name:c.remark||c.displayName||'角色',createdAt:Date.now(),done:false});
saveChatData(cd);
renderFriendTipInChat();
renderContactList();
toast('该角色向你发送了好友申请');
}
function confirmDeleteRole(cid){
var cd=getChatData(),c=cd.contacts[cid];
if(!c)return;
showHtmlModal('确认删除','<div style="font-size:13px;line-height:1.8;color:#666;">确认彻底删除「'+escHTML(c.remark||c.displayName||'该角色')+'」以及全部聊天记录？<br>此操作不可恢复。</div>',function(){
delete cd.messages[cid];
delete cd.contacts[cid];
cd.friendRequests=(cd.friendRequests||[]).filter(function(x){return x.cid!==cid});
saveChatData(cd);
if(activeContactId===cid){
activeContactId=null;
document.getElementById('qaq-chat-window-page')&&document.getElementById('qaq-chat-window-page').classList.remove('qaq-page-show');
document.getElementById('qaq-chat-settings-page')&&document.getElementById('qaq-chat-settings-page').classList.remove('qaq-page-show');
document.getElementById('qaq-chat-main-page')&&document.getElementById('qaq-chat-main-page').classList.add('qaq-page-show');
}
renderContactList();
toast('已删除角色');
});
}
function renderExtMenu(){
var m=document.getElementById('qaq-chat-ext-menu');
if(!m)return;
var items=[
{id:'qaq-chat-ext-sticker',name:'表情',icon:'smile'},
{id:'qaq-chat-ext-voice',name:'发送语音',icon:'mic'},
{id:'qaq-chat-ext-photo',name:'照片',icon:'image'},
{id:'qaq-chat-ext-transfer',name:'转账',icon:'wallet'},
{id:'qaq-chat-ext-delivery',name:'快递',icon:'package'},
{id:'qaq-chat-ext-offline',name:'线下',icon:'handshake'},
{id:'qaq-chat-ext-theater',name:'剧场',icon:'drama'},
{id:'qaq-chat-ext-video',name:'视频通话',icon:'video'},
{id:'qaq-chat-ext-call',name:'语音通话',icon:'phone'},
{id:'qaq-chat-ext-location',name:'位置',icon:'map-pinned'},
{id:'qaq-chat-ext-diary',name:'日记',icon:'book-open'},
{id:'qaq-chat-sim-fr',name:'模拟新朋友',icon:'user-plus'}
];
m.innerHTML=items.map(function(x){
return '<div class="qaq-ext-item" id="'+x.id+'"><div class="qaq-ext-icon">'+iconSvg(x.icon,22)+'</div><div class="qaq-ext-label">'+x.name+'</div></div>';
}).join('');
if(window.lucide&&window.lucide.createIcons){try{window.lucide.createIcons({attrs:{width:22,height:22,'stroke-width':1.9}});}catch(e){}}
m.querySelectorAll('.qaq-ext-item').forEach(function(el){
el.onclick=function(){
if(this.id==='qaq-chat-sim-fr'){simulateFriendRequestForBlockedRole();return;}
var name=(this.querySelector('.qaq-ext-label')||{}).textContent||'功能';
toast(name+'开发中');
};
});
}
function chooseWorldBook(){
var cd=getChatData(),books=ensureWorldBookStore(cd);
if(!books.length){
showHtmlModal('绑定世界书','<div style="font-size:13px;line-height:1.8;color:#888;text-align:center;">世界书APP暂未上线。<br>这里已预留选择逻辑。<br>当前可绑定聊天自动生成的记忆世界书。</div><div class="qaq-custom-select-list" style="margin-top:12px;"><div class="qaq-custom-select-option" id="qaq-chat-create-memory-book"><span>新建当前角色记忆世界书</span></div></div>',null,{hideConfirm:true,afterRender:function(){
document.getElementById('qaq-chat-create-memory-book').onclick=function(){
var cd2=getChatData(),c=cd2.contacts[activeContactId];
if(!c)return;
var book=findOrCreateMemoryBook(c);
bindMemoryBook(activeContactId,book);
var inp=document.getElementById('chs_o_worldbook'),btn=document.getElementById('chs_o_worldbook_btn');
if(inp)inp.value=book.id;
if(btn)btn.textContent=book.name;
window.qaqCloseModal&&window.qaqCloseModal();
toast('已绑定：'+book.name);
};
}});
return;
}
var current=(document.getElementById('chs_o_worldbook')||{}).value||'';
openSelectModal('选择绑定世界书',books.map(function(b){return{label:b.name,value:b.id};}),current,function(v){
var book=books.find(function(x){return x.id===v}),inp=document.getElementById('chs_o_worldbook'),btn=document.getElementById('chs_o_worldbook_btn');
if(inp)inp.value=v;
if(btn)btn.textContent=book?book.name:'未绑定';
});
}
function fetchModels(targetId,type){
if(!activeContactId)return;
var cd=getChatData(),c=cd.contacts[activeContactId]||{},s=Object.assign({},cd.globalSettings||{},c.configs||{}),api=getApiBase(s,type==='img'?'img':'api');
if(!api.url||!api.key){toast('请先配置API');return;}
toast('拉取模型中...');
fetch(normalizeApiUrl(api.url)+'/models',{headers:{'Authorization':'Bearer '+api.key}}).then(function(r){return r.json()}).then(function(d){
var arr=(d.data||d.models||[]).map(function(x){return typeof x==='string'?x:(x.id||x.name||'')}).filter(Boolean);
if(!arr.length){toast('未获取到模型');return;}
openSelectModal('选择模型',arr,(document.getElementById(targetId)||{}).value||'',function(v){var t=document.getElementById(targetId);if(t)t.value=v;});
}).catch(function(e){console.error(e);toast('拉取失败');});
}
function savePreset(type){
var ps=getPresets(),cd=getChatData(),c=cd.contacts[activeContactId]||{},s=c.configs||{},me=cd.myProfile||{},data={};
if(type==='api')data={url:s.o_api_url||'',key:s.o_api_key||'',model:s.o_api_model||''};
if(type==='voice')data={url:s.o_voice_url||'',key:s.o_voice_key||'',model:s.o_voice_model||'speech-02-hd',speed:s.o_voice_speed||0.9};
if(type==='img')data={url:s.o_img_url||'',key:s.o_img_key||'',model:s.o_img_model||'',pos:s.o_img_prompt_pos||'',neg:s.o_img_prompt_neg||''};
if(type==='persona')data={persona:me.persona||''};
if(type==='css_global')data={css:s.u_global_css||'/* 示例: body{letter-spacing:0.2px;} */'};
if(type==='css_bubble')data={css:s.u_bubble_css||'/* 示例: box-shadow:0 2px 8px rgba(0,0,0,0.06); */'};
showHtmlModal('保存预设','<input class="qaq-modal-input" id="qaq-chat-preset-name" placeholder="输入预设名称">',function(){
var name=(document.getElementById('qaq-chat-preset-name').value||'').trim();
if(!name){toast('请输入预设名称');return false;}
if(!ps[type])ps[type]=[];
ps[type].push({id:uid('pst'),name:name,data:data});
savePresets(ps);
toast('预设已保存');
});
}
function loadPreset(type){
var ps=getPresets(),list=ps[type]||[];
if(!list.length){toast('暂无预设');return;}
showHtmlModal('导入预设','<div class="qaq-custom-select-list">'+list.map(function(x){return '<div class="qaq-custom-select-option" data-preset="'+x.id+'"><span>'+escHTML(x.name)+'</span></div>'}).join('')+'</div>',null,{hideConfirm:true,afterRender:function(){
document.querySelectorAll('[data-preset]').forEach(function(el){
el.onclick=function(){
var id=this.getAttribute('data-preset'),item=list.find(function(x){return x.id===id});
if(!item)return;
applyPreset(type,item.data);
window.qaqCloseModal&&window.qaqCloseModal();
toast('已导入预设');
renderSettings();
};
});
}});
}
function applyPreset(type,data){
var cd=getChatData(),c=cd.contacts[activeContactId]||{},s=c.configs||{},me=cd.myProfile||{};
if(type==='api'){s.o_api_url=data.url||'';s.o_api_key=data.key||'';s.o_api_model=data.model||'';}
if(type==='voice'){s.o_voice_url=data.url||'';s.o_voice_key=data.key||'';s.o_voice_model=data.model||'speech-02-hd';s.o_voice_speed=data.speed||0.9;}
if(type==='img'){s.o_img_url=data.url||'';s.o_img_key=data.key||'';s.o_img_model=data.model||'';s.o_img_prompt_pos=data.pos||'';s.o_img_prompt_neg=data.neg||'';}
if(type==='persona'){me.persona=data.persona||'';}
if(type==='css_global'){s.u_global_css=data.css||'/* 示例: body{letter-spacing:0.2px;} */';}
if(type==='css_bubble'){s.u_bubble_css=data.css||'/* 示例: box-shadow:0 2px 8px rgba(0,0,0,0.06); */';}
c.configs=s;cd.myProfile=me;saveChatData(cd);
}
function resetPreset(type){
var cd=getChatData(),c=cd.contacts[activeContactId]||{},s=c.configs||{};
if(type==='css_global')s.u_global_css='/* 示例: body{letter-spacing:0.2px;} */\n/* 示例: .qaq-chat-msg-list{background:transparent;} */';
if(type==='css_bubble')s.u_bubble_css='/* 示例: box-shadow:0 2px 8px rgba(0,0,0,0.06); */\n/* 示例: border:1px solid rgba(0,0,0,0.03); */';
c.configs=s;saveChatData(cd);renderSettings();toast('已重置');
}
function importHistory(){
uploadLocalFile('.json',function(text){
try{
var json=JSON.parse(text),cd=getChatData();
if(Array.isArray(json.messages)){cd.messages[activeContactId]=json.messages;saveChatData(cd);renderMessages();toast('聊天记录已导入');}
else toast('文件格式错误');
}catch(e){toast('导入失败');}
},'text');
}
function exportHistory(){
var cd=getChatData(),data={messages:cd.messages[activeContactId]||[]},blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),a=document.createElement('a');
a.href=URL.createObjectURL(blob);
a.download='chat_'+activeContactId+'_'+Date.now()+'.json';
a.click();
URL.revokeObjectURL(a.href);
toast('已导出');
}
function clearHistory(){
showHtmlModal('清空聊天记录','<div style="font-size:13px;color:#666;line-height:1.8;">确认清空当前角色的全部聊天记录？此操作不可恢复。</div>',function(){
var cd=getChatData();
cd.messages[activeContactId]=[];
saveChatData(cd);
renderMessages();
toast('已清空');
});
}
function renderSettings(){
if(!activeContactId)return;
applyPageTheme();
var cd=getChatData(),c=cd.contacts[activeContactId]||{},me=cd.myProfile||{},s=Object.assign({u_theme:getGlobalTheme(),o_voice_model:'speech-02-hd',o_voice_speed:0.9,o_img_prompt_pos:'masterpiece,best quality,ultra detailed,beautiful lighting,sharp focus,cinematic composition',o_img_prompt_neg:'low quality,blurry,distorted,deformed,ugly,watermark,text,logo,extra fingers,bad anatomy'},cd.globalSettings||{},c.configs||{}),scr=document.getElementById('qaq-chat-settings-scroll');
if(!scr)return;
scr.innerHTML=[
'<div class="qaq-chat-set-card qaq-collapsible" data-sec="other">',
'<div class="qaq-chat-set-hd qaq-collapse-trigger"><span>对方设置</span><svg class="qaq-collapse-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg></div>',
'<div class="qaq-collapse-body"><div class="qaq-chat-set-bd">',
'<div class="qaq-chat-set-lbl">头像</div><div style="display:flex;gap:6px;"><input class="qaq-chat-set-inp" id="chs_o_avatar" value="'+escHTML(c.avatar||'')+'" placeholder="头像URL或本地图片DataURL"><button class="qaq-upload-img-btn" data-avatar-target="chs_o_avatar">上传</button></div>',
'<div class="qaq-chat-set-lbl">真名</div><input class="qaq-chat-set-inp" id="chs_o_name" value="'+escHTML(c.displayName||'')+'" placeholder="角色真名">',
'<div class="qaq-chat-set-lbl">备注</div><input class="qaq-chat-set-inp" id="chs_o_remark" value="'+escHTML(c.remark||'')+'" placeholder="备注名称">',
'<div class="qaq-chat-set-lbl">人设</div><textarea class="qaq-chat-set-txt" id="chs_o_persona" style="height:72px;">'+escHTML(s.op_persona||'')+'</textarea>',
'<div class="qaq-chat-set-lbl">绑定世界书</div><button class="qaq-chat-action-btn" id="chs_o_worldbook_btn">'+escHTML(s.o_worldbook_bound_name||'未绑定')+'</button><input type="hidden" id="chs_o_worldbook" value="'+escHTML(s.o_worldbook||'')+'">',
'<div class="qaq-chat-set-row-tog"><span>翻译功能</span><div class="qaq-toggle '+(s.o_trans_enable!==false?'qaq-toggle-on':'')+'" id="chs_o_trans_enable"><div class="qaq-toggle-knob"></div></div></div>',
'<div class="qaq-chat-set-lbl">翻译显示模式</div><button class="qaq-chat-action-btn" id="chs_o_trans_pos_btn">'+escHTML(getTransLabel(s.op_trans_pos||'in_bottom'))+'</button><input type="hidden" id="chs_o_trans_pos" value="'+escHTML(s.op_trans_pos||'in_bottom')+'">',
'<div class="qaq-chat-set-lbl">最大记忆条数</div><input class="qaq-chat-set-inp" type="number" id="chs_o_mem_max" value="'+escHTML(String(s.mem_max||20))+'">',
'<div class="qaq-chat-set-row-tog"><span>自动总结记忆</span><div class="qaq-toggle '+(s.o_mem_summary?'qaq-toggle-on':'')+'" id="chs_o_mem_summary"><div class="qaq-toggle-knob"></div></div></div>',
'<div class="qaq-chat-set-lbl">总结条数（50-100）</div><input class="qaq-chat-set-inp" type="number" id="chs_o_mem_summary_cnt" min="50" max="100" value="'+escHTML(String(s.o_mem_summary_cnt||50))+'">',
'<div style="display:flex;gap:6px;margin-top:4px;"><button class="qaq-preset-btn" data-preset-save="api">保存API预设</button><button class="qaq-preset-btn" data-preset-load="api">导入API预设</button></div>',
'<div class="qaq-chat-set-lbl">专属API URL</div><input class="qaq-chat-set-inp" id="chs_o_api_url" value="'+escHTML(s.o_api_url||'')+'" placeholder="留空使用全局">',
'<div class="qaq-chat-set-lbl">专属API Key</div><input class="qaq-chat-set-inp" id="chs_o_api_key" type="password" value="'+escHTML(s.o_api_key||'')+'" placeholder="留空使用全局">',
'<div class="qaq-chat-set-lbl">专属模型</div><div class="qaq-input-with-btn"><input class="qaq-chat-set-inp" id="chs_o_api_model" value="'+escHTML(s.o_api_model||'')+'" placeholder="点击右侧拉取模型"><button class="qaq-fetch-model-btn" data-fetch-type="api" data-fetch-target="chs_o_api_model">拉</button></div>',
'<div style="display:flex;gap:6px;margin-top:4px;"><button class="qaq-preset-btn" data-preset-save="voice">保存语音预设</button><button class="qaq-preset-btn" data-preset-load="voice">导入语音预设</button></div>',
'<div class="qaq-chat-set-lbl">语音API URL</div><input class="qaq-chat-set-inp" id="chs_o_voice_url" value="'+escHTML(s.o_voice_url||'')+'">',
'<div class="qaq-chat-set-lbl">语音API Key</div><input class="qaq-chat-set-inp" id="chs_o_voice_key" type="password" value="'+escHTML(s.o_voice_key||'')+'">',
'<div class="qaq-chat-set-lbl">语音模型</div><button class="qaq-chat-action-btn" id="chs_o_voice_model_btn">'+escHTML(s.o_voice_model||'speech-02-hd')+'</button><input type="hidden" id="chs_o_voice_model" value="'+escHTML(s.o_voice_model||'speech-02-hd')+'">',
'<div class="qaq-chat-set-lbl">语速</div><div style="display:flex;align-items:center;gap:8px;"><input type="range" class="qaq-chat-slider" id="chs_o_voice_speed" min="0.6" max="1.2" step="0.1" value="'+escHTML(String(s.o_voice_speed||0.9))+'" style="flex:1;"><input class="qaq-chat-set-inp" id="chs_o_voice_speed_val" type="number" min="0.6" max="1.2" step="0.1" value="'+escHTML(String(s.o_voice_speed||0.9))+'" style="width:64px;"></div>',
'<div style="display:flex;gap:6px;margin-top:4px;"><button class="qaq-preset-btn" data-preset-save="img">保存生图预设</button><button class="qaq-preset-btn" data-preset-load="img">导入生图预设</button></div>',
'<div class="qaq-chat-set-lbl">生图API URL</div><input class="qaq-chat-set-inp" id="chs_o_img_url" value="'+escHTML(s.o_img_url||'')+'">',
'<div class="qaq-chat-set-lbl">生图API Key</div><input class="qaq-chat-set-inp" id="chs_o_img_key" type="password" value="'+escHTML(s.o_img_key||'')+'">',
'<div class="qaq-chat-set-lbl">生图模型</div><div class="qaq-input-with-btn"><input class="qaq-chat-set-inp" id="chs_o_img_model" value="'+escHTML(s.o_img_model||'')+'" placeholder="点击右侧拉取模型"><button class="qaq-fetch-model-btn" data-fetch-type="img" data-fetch-target="chs_o_img_model">拉</button></div>',
'<div class="qaq-chat-set-lbl">正面提示词</div><textarea class="qaq-chat-set-txt" id="chs_o_img_prompt_pos" style="height:60px;">'+escHTML(s.o_img_prompt_pos||'')+'</textarea>',
'<div class="qaq-chat-set-lbl">负面提示词</div><textarea class="qaq-chat-set-txt" id="chs_o_img_prompt_neg" style="height:60px;">'+escHTML(s.o_img_prompt_neg||'')+'</textarea>',
'</div></div></div>',
'<div class="qaq-chat-set-card qaq-collapsible qaq-collapsed" data-sec="my">',
'<div class="qaq-chat-set-hd qaq-collapse-trigger"><span>我方设置</span><svg class="qaq-collapse-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg></div>',
'<div class="qaq-collapse-body"><div class="qaq-chat-set-bd">',
'<div class="qaq-chat-set-lbl">头像</div><div style="display:flex;gap:6px;"><input class="qaq-chat-set-inp" id="chs_m_avatar" value="'+escHTML(me.avatar||'')+'" placeholder="头像URL或本地图片DataURL"><button class="qaq-upload-img-btn" data-avatar-target="chs_m_avatar">上传</button></div>',
'<div class="qaq-chat-set-lbl">真名</div><input class="qaq-chat-set-inp" id="chs_m_name" value="'+escHTML(me.displayName||'')+'" placeholder="你的真名">',
'<div class="qaq-chat-set-lbl">备注</div><input class="qaq-chat-set-inp" id="chs_m_remark" value="'+escHTML(me.remark||'')+'" placeholder="你的备注">',
'<div style="display:flex;gap:6px;margin-top:4px;"><button class="qaq-preset-btn" data-preset-save="persona">保存人设预设</button><button class="qaq-preset-btn" data-preset-load="persona">导入人设预设</button></div>',
'<div class="qaq-chat-set-lbl">人设</div><textarea class="qaq-chat-set-txt" id="chs_m_persona" style="height:72px;">'+escHTML(me.persona||'')+'</textarea>',
'</div></div></div>',
'<div class="qaq-chat-set-card qaq-collapsible qaq-collapsed" data-sec="ui">',
'<div class="qaq-chat-set-hd qaq-collapse-trigger"><span>美化设置</span><svg class="qaq-collapse-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg></div>',
'<div class="qaq-collapse-body"><div class="qaq-chat-set-bd">',
'<div class="qaq-chat-set-lbl">我的气泡颜色</div><div style="display:flex;gap:6px;"><button class="qaq-color-pick-btn" id="btn_u_my_bubble" style="width:40px;height:36px;border-radius:8px;border:1px solid #ddd;background:'+(s.ui_my_bubble||getThemeBubbleDefaults(s.u_theme||getGlobalTheme()).my)+';"></button><input class="qaq-chat-set-inp" id="chs_u_my_bubble" value="'+escHTML(s.ui_my_bubble||getThemeBubbleDefaults(s.u_theme||getGlobalTheme()).my)+'"></div>',
'<div class="qaq-chat-set-lbl">对方气泡颜色</div><div style="display:flex;gap:6px;"><button class="qaq-color-pick-btn" id="btn_u_other_bubble" style="width:40px;height:36px;border-radius:8px;border:1px solid #ddd;background:'+(s.ui_other_bubble||getThemeBubbleDefaults(s.u_theme||getGlobalTheme()).other)+';"></button><input class="qaq-chat-set-inp" id="chs_u_other_bubble" value="'+escHTML(s.ui_other_bubble||getThemeBubbleDefaults(s.u_theme||getGlobalTheme()).other)+'"></div>',
'<div class="qaq-chat-set-lbl">主题颜色</div><button class="qaq-chat-action-btn" id="chs_u_theme_btn">'+escHTML(getThemeLabel(s.u_theme||getGlobalTheme()))+'</button><input type="hidden" id="chs_u_theme" value="'+escHTML(s.u_theme||getGlobalTheme())+'">',
'<div class="qaq-chat-set-lbl">头像显示</div><button class="qaq-chat-action-btn" id="chs_u_avatar_show_btn">'+escHTML(getAvaLabel(s.ui_avatar_show||'all'))+'</button><input type="hidden" id="chs_u_avatar_show" value="'+escHTML(s.ui_avatar_show||'all')+'">',
'<div class="qaq-chat-set-row-tog"><span>显示时间戳</span><div class="qaq-toggle '+(s.ui_show_time!=='false'?'qaq-toggle-on':'')+'" id="chs_u_show_time"><div class="qaq-toggle-knob"></div></div></div>',
'<div class="qaq-chat-set-lbl">时间戳位置</div><button class="qaq-chat-action-btn" id="chs_u_time_pos_btn">'+escHTML(getTimePosLabel(s.u_time_pos||'top'))+'</button><input type="hidden" id="chs_u_time_pos" value="'+escHTML(s.u_time_pos||'top')+'">',
'<div class="qaq-chat-set-lbl">时间格式</div><button class="qaq-chat-action-btn" id="chs_u_time_fmt_btn">'+escHTML(s.u_time_fmt||'HH:mm')+'</button><input type="hidden" id="chs_u_time_fmt" value="'+escHTML(s.u_time_fmt||'HH:mm')+'">',
'<div class="qaq-chat-set-row-tog"><span>隐藏回复按钮</span><div class="qaq-toggle '+(s.ui_hide_rbtn?'qaq-toggle-on':'')+'" id="chs_u_hide_reply"><div class="qaq-toggle-knob"></div></div></div>',
'<div class="qaq-chat-set-row-tog"><span>隐藏菜单按钮</span><div class="qaq-toggle '+(s.ui_hide_mbtn?'qaq-toggle-on':'')+'" id="chs_u_hide_menu"><div class="qaq-toggle-knob"></div></div></div>',
'<div class="qaq-chat-set-lbl">菜单位置</div><button class="qaq-chat-action-btn" id="chs_u_menu_pos_btn">'+escHTML((s.u_menu_pos||'top')==='top'?'输入框上方':'输入框下方')+'</button><input type="hidden" id="chs_u_menu_pos" value="'+escHTML(s.u_menu_pos||'top')+'">',
'<div class="qaq-chat-set-lbl">头像圆角</div><div style="display:flex;align-items:center;gap:8px;"><input type="range" class="qaq-chat-slider" id="chs_u_avatar_radius" min="0" max="30" step="1" value="'+escHTML(String(s.ui_avatar_radius!=null?s.ui_avatar_radius:10))+'" style="flex:1;"><input class="qaq-chat-set-inp" id="chs_u_avatar_radius_val" type="number" min="0" max="30" value="'+escHTML(String(s.ui_avatar_radius!=null?s.ui_avatar_radius:10))+'" style="width:60px;"></div>',
'<div class="qaq-chat-set-lbl">气泡圆角</div><div style="display:flex;align-items:center;gap:8px;"><input type="range" class="qaq-chat-slider" id="chs_u_bubble_radius" min="0" max="30" step="1" value="'+escHTML(String(s.ui_bubble_radius!=null?s.ui_bubble_radius:14))+'" style="flex:1;"><input class="qaq-chat-set-inp" id="chs_u_bubble_radius_val" type="number" min="0" max="30" value="'+escHTML(String(s.ui_bubble_radius!=null?s.ui_bubble_radius:14))+'" style="width:60px;"></div>',
'<div class="qaq-chat-set-lbl">字体URL</div><div style="display:flex;gap:6px;"><input class="qaq-chat-set-inp" id="chs_u_font_url" value="'+escHTML(s.u_font_url||'')+'" placeholder="字体URL或本地上传后自动填充"><button class="qaq-upload-font-btn" data-font-target="chs_u_font_url">上传</button></div>',
'<div class="qaq-chat-set-lbl">字体大小</div><div style="display:flex;align-items:center;gap:8px;"><input type="range" class="qaq-chat-slider" id="chs_u_font_size" min="10" max="24" step="1" value="'+escHTML(String(parseInt(s.ui_font_size||'14px',10)||14))+'" style="flex:1;"><input class="qaq-chat-set-inp" id="chs_u_font_size_val" type="number" min="10" max="24" value="'+escHTML(String(parseInt(s.ui_font_size||'14px',10)||14))+'" style="width:60px;"></div>',
'<div class="qaq-chat-set-lbl">字体颜色</div><div style="display:flex;gap:6px;"><button class="qaq-color-pick-btn" id="btn_u_font_color" style="width:40px;height:36px;border-radius:8px;border:1px solid #ddd;background:'+(s.u_font_color||'#333333')+';"></button><input class="qaq-chat-set-inp" id="chs_u_font_color" value="'+escHTML(s.u_font_color||'#333333')+'"></div>',
'<div style="display:flex;gap:6px;margin-top:4px;"><button class="qaq-preset-btn" data-preset-save="css_global">保存全局CSS预设</button><button class="qaq-preset-btn" data-preset-load="css_global">导入预设</button><button class="qaq-preset-btn" data-preset-reset="css_global">重置</button></div>',
'<div class="qaq-chat-set-lbl">全局CSS</div><textarea class="qaq-chat-set-txt" id="chs_u_global_css" style="height:84px;">'+escHTML(s.u_global_css||'/* 示例: body{letter-spacing:0.2px;} */\n/* 示例: .qaq-chat-msg-list{background:transparent;} */')+'</textarea>',
'<div style="display:flex;gap:6px;margin-top:4px;"><button class="qaq-preset-btn" data-preset-save="css_bubble">保存气泡CSS预设</button><button class="qaq-preset-btn" data-preset-load="css_bubble">导入预设</button><button class="qaq-preset-btn" data-preset-reset="css_bubble">重置</button></div>',
'<div class="qaq-chat-set-lbl">气泡CSS</div><textarea class="qaq-chat-set-txt" id="chs_u_bubble_css" style="height:84px;">'+escHTML(s.u_bubble_css||'/* 示例: box-shadow:0 2px 8px rgba(0,0,0,0.06); */\n/* 示例: border:1px solid rgba(0,0,0,0.03); */')+'</textarea>',
'</div></div></div>',
'<div class="qaq-chat-set-card qaq-collapsible qaq-collapsed" data-sec="history">',
'<div class="qaq-chat-set-hd qaq-collapse-trigger"><span>聊天记录</span><svg class="qaq-collapse-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg></div>',
'<div class="qaq-collapse-body"><div class="qaq-chat-set-bd">',
'<button class="qaq-chat-action-btn" id="qaq-chat-import-history">导入聊天记录</button>',
'<button class="qaq-chat-action-btn" id="qaq-chat-export-history">导出聊天记录</button>',
'<button class="qaq-chat-action-btn qaq-danger" id="qaq-chat-clear-history">清空聊天记录</button>',
'</div></div></div>',
'<div class="qaq-chat-set-card qaq-collapsible qaq-collapsed" data-sec="other_ops">',
'<div class="qaq-chat-set-hd qaq-collapse-trigger"><span>其他</span><svg class="qaq-collapse-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg></div>',
'<div class="qaq-collapse-body"><div class="qaq-chat-set-bd">',
'<div class="qaq-chat-set-row-tog"><span>角色勿扰</span><div class="qaq-toggle '+(s.x_dnd?'qaq-toggle-on':'')+'" id="chs_x_dnd"><div class="qaq-toggle-knob"></div></div></div>',
'<div class="qaq-chat-set-lbl">勿扰时间段</div><button class="qaq-chat-action-btn" id="chs_x_dnd_time_btn">'+escHTML(s.x_dnd_time||'点击设置')+'</button><input type="hidden" id="chs_x_dnd_time" value="'+escHTML(s.x_dnd_time||'')+'">',
'<div class="qaq-chat-set-row-tog"><span>拉黑此角色</span><div class="qaq-toggle '+(c.blocked?'qaq-toggle-on':'')+'" id="chs_x_blocked"><div class="qaq-toggle-knob"></div></div></div>',
'<button class="qaq-chat-action-btn qaq-danger" id="qaq-chat-delete-role-btn">删除此角色</button>',
'</div></div></div>',
'<button class="qaq-chat-set-save" id="qaq-chs-sv">保存全部设置</button>'
].join('');
bindSettingsEvents();
}
function bindRangePair(id){
var a=document.getElementById(id),b=document.getElementById(id+'_val');
if(!a||!b)return;
a.oninput=function(){b.value=this.value;if(activeContactId&&id.indexOf('chs_u_')===0)previewLiveFromSettings();};
b.oninput=function(){a.value=this.value;if(activeContactId&&id.indexOf('chs_u_')===0)previewLiveFromSettings();};
}
function bindSettingsEvents(){
document.querySelectorAll('.qaq-collapse-trigger').forEach(function(el){el.onclick=function(){this.parentNode.classList.toggle('qaq-collapsed');};});
document.querySelectorAll('.qaq-toggle').forEach(function(el){el.onclick=function(e){e.stopPropagation();this.classList.toggle('qaq-toggle-on');if(this.id.indexOf('chs_u_')===0||this.id==='chs_x_blocked')previewLiveFromSettings();};});
bindRangePair('chs_o_voice_speed');
bindRangePair('chs_u_avatar_radius');
bindRangePair('chs_u_bubble_radius');
bindRangePair('chs_u_font_size');
document.querySelectorAll('[data-avatar-target]').forEach(function(btn){btn.onclick=function(){openImageInputModal(this.getAttribute('data-avatar-target'));};});
document.querySelectorAll('[data-font-target]').forEach(function(btn){btn.onclick=function(){uploadLocalFile('.ttf,.otf,.woff,.woff2',function(data){var t=document.getElementById(btn.getAttribute('data-font-target'));if(t)t.value=data;toast('字体已导入');});};});
document.getElementById('btn_u_my_bubble').onclick=function(){openColorModal('选择我的气泡颜色',document.getElementById('chs_u_my_bubble').value,function(v){document.getElementById('chs_u_my_bubble').value=v;document.getElementById('btn_u_my_bubble').style.background=v;previewLiveFromSettings();});};
document.getElementById('btn_u_other_bubble').onclick=function(){openColorModal('选择对方气泡颜色',document.getElementById('chs_u_other_bubble').value,function(v){document.getElementById('chs_u_other_bubble').value=v;document.getElementById('btn_u_other_bubble').style.background=v;previewLiveFromSettings();});};
document.getElementById('btn_u_font_color').onclick=function(){openColorModal('选择字体颜色',document.getElementById('chs_u_font_color').value,function(v){document.getElementById('chs_u_font_color').value=v;document.getElementById('btn_u_font_color').style.background=v;previewLiveFromSettings();});};
document.getElementById('chs_o_worldbook_btn').onclick=chooseWorldBook;
document.getElementById('chs_o_trans_pos_btn').onclick=function(){openSelectModal('翻译显示模式',[{label:'气泡内下方',value:'in_bottom'},{label:'气泡内上方',value:'in_top'},{label:'气泡外下方',value:'out_bottom'},{label:'气泡外上方',value:'out_top'},{label:'隐藏',value:'hide'}],document.getElementById('chs_o_trans_pos').value,function(v){document.getElementById('chs_o_trans_pos').value=v;document.getElementById('chs_o_trans_pos_btn').textContent=getTransLabel(v);previewLiveFromSettings();});};
document.getElementById('chs_o_voice_model_btn').onclick=function(){openSelectModal('语音模型',['speech-02-hd','speech-02-turbo','speech-2.8-hd','speech-2.8-turbo','speech-2.6-hd','speech-2.6-turbo','speech-01-turbo'],document.getElementById('chs_o_voice_model').value,function(v){document.getElementById('chs_o_voice_model').value=v;document.getElementById('chs_o_voice_model_btn').textContent=v;});};
document.getElementById('chs_u_theme_btn').onclick=function(){openSelectModal('主题颜色',[{label:'暖阳',value:'default'},{label:'冷雾',value:'cool'},{label:'夜幕',value:'dark'}],document.getElementById('chs_u_theme').value,function(v){document.getElementById('chs_u_theme').value=v;document.getElementById('chs_u_theme_btn').textContent=getThemeLabel(v);previewLiveFromSettings();});};
document.getElementById('chs_u_avatar_show_btn').onclick=function(){openSelectModal('头像显示',[{label:'全显示',value:'all'},{label:'全隐藏',value:'hide_all'},{label:'首条',value:'first'},{label:'末条',value:'last'}],document.getElementById('chs_u_avatar_show').value,function(v){document.getElementById('chs_u_avatar_show').value=v;document.getElementById('chs_u_avatar_show_btn').textContent=getAvaLabel(v);previewLiveFromSettings();});};
document.getElementById('chs_u_time_pos_btn').onclick=function(){openSelectModal('时间戳位置',[{label:'气泡上方',value:'top'},{label:'气泡下方',value:'bottom'},{label:'头像上方',value:'avatar_top'},{label:'头像下方',value:'avatar_bottom'},{label:'气泡外侧',value:'bubble_outer'},{label:'气泡内侧',value:'bubble_inner'}],document.getElementById('chs_u_time_pos').value,function(v){document.getElementById('chs_u_time_pos').value=v;document.getElementById('chs_u_time_pos_btn').textContent=getTimePosLabel(v);previewLiveFromSettings();});};
document.getElementById('chs_u_time_fmt_btn').onclick=function(){openSelectModal('时间格式',['HH:mm','HH:mm:ss','MM-DD HH:mm','YYYY-MM-DD HH:mm'],document.getElementById('chs_u_time_fmt').value,function(v){document.getElementById('chs_u_time_fmt').value=v;document.getElementById('chs_u_time_fmt_btn').textContent=v;previewLiveFromSettings();});};
document.getElementById('chs_u_menu_pos_btn').onclick=function(){openSelectModal('菜单位置',[{label:'输入框上方',value:'top'},{label:'输入框下方',value:'bottom'}],document.getElementById('chs_u_menu_pos').value,function(v){document.getElementById('chs_u_menu_pos').value=v;document.getElementById('chs_u_menu_pos_btn').textContent=v==='top'?'输入框上方':'输入框下方';previewLiveFromSettings();});};
document.getElementById('chs_x_dnd_time_btn').onclick=function(){
showHtmlModal('设置勿扰时间段','<div style="display:flex;flex-direction:column;gap:10px;"><label style="font-size:12px;color:#888;">开始时间</label><input class="qaq-modal-input" id="qaq-dnd-start" type="time"><label style="font-size:12px;color:#888;">结束时间</label><input class="qaq-modal-input" id="qaq-dnd-end" type="time"><div style="font-size:11px;color:#999;">不填写时间则表示需要手动关闭勿扰</div></div>',function(){
var a=(document.getElementById('qaq-dnd-start').value||'').trim(),b=(document.getElementById('qaq-dnd-end').value||'').trim(),v=(a&&b)?(a+'-'+b):'';
document.getElementById('chs_x_dnd_time').value=v;
document.getElementById('chs_x_dnd_time_btn').textContent=v||'点击设置';
},{afterRender:function(){
var old=(document.getElementById('chs_x_dnd_time').value||'').trim();
if(old.indexOf('-')>-1){var sp=old.split('-');document.getElementById('qaq-dnd-start').value=sp[0]||'';document.getElementById('qaq-dnd-end').value=sp[1]||'';}
}});
};
document.querySelectorAll('[data-fetch-target]').forEach(function(btn){btn.onclick=function(){fetchModels(this.getAttribute('data-fetch-target'),this.getAttribute('data-fetch-type'));};});
document.querySelectorAll('[data-preset-save]').forEach(function(btn){btn.onclick=function(){savePreset(this.getAttribute('data-preset-save'));};});
document.querySelectorAll('[data-preset-load]').forEach(function(btn){btn.onclick=function(){loadPreset(this.getAttribute('data-preset-load'));};});
document.querySelectorAll('[data-preset-reset]').forEach(function(btn){btn.onclick=function(){resetPreset(this.getAttribute('data-preset-reset'));};});
document.getElementById('qaq-chat-import-history').onclick=importHistory;
document.getElementById('qaq-chat-export-history').onclick=exportHistory;
document.getElementById('qaq-chat-clear-history').onclick=clearHistory;
document.getElementById('qaq-chat-delete-role-btn').onclick=function(){confirmDeleteRole(activeContactId);};
['chs_u_my_bubble','chs_u_other_bubble','chs_u_font_color','chs_u_font_url','chs_u_global_css','chs_u_bubble_css'].forEach(function(id){var el=document.getElementById(id);if(el)el.addEventListener('input',previewLiveFromSettings);});
document.getElementById('qaq-chs-sv').onclick=saveSettings;
}
function previewLiveFromSettings(){
if(!activeContactId)return;
var fake={
ui_my_bubble:(document.getElementById('chs_u_my_bubble')||{}).value||getThemeBubbleDefaults((document.getElementById('chs_u_theme')||{}).value||getGlobalTheme()).my,
ui_other_bubble:(document.getElementById('chs_u_other_bubble')||{}).value||getThemeBubbleDefaults((document.getElementById('chs_u_theme')||{}).value||getGlobalTheme()).other,
u_theme:(document.getElementById('chs_u_theme')||{}).value||getGlobalTheme(),
ui_avatar_show:(document.getElementById('chs_u_avatar_show')||{}).value||'all',
ui_show_time:(document.getElementById('chs_u_show_time')||{}).classList&&document.getElementById('chs_u_show_time').classList.contains('qaq-toggle-on')?'true':'false',
u_time_pos:(document.getElementById('chs_u_time_pos')||{}).value||'top',
u_time_fmt:(document.getElementById('chs_u_time_fmt')||{}).value||'HH:mm',
ui_hide_rbtn:(document.getElementById('chs_u_hide_reply')||{}).classList&&document.getElementById('chs_u_hide_reply').classList.contains('qaq-toggle-on'),
ui_hide_mbtn:(document.getElementById('chs_u_hide_menu')||{}).classList&&document.getElementById('chs_u_hide_menu').classList.contains('qaq-toggle-on'),
u_menu_pos:(document.getElementById('chs_u_menu_pos')||{}).value||'top',
ui_avatar_radius:parseFloat((document.getElementById('chs_u_avatar_radius_val')||{}).value||10),
ui_bubble_radius:parseFloat((document.getElementById('chs_u_bubble_radius_val')||{}).value||14),
ui_font_size:(((document.getElementById('chs_u_font_size_val')||{}).value||14)+'px'),
u_font_color:(document.getElementById('chs_u_font_color')||{}).value||'#333333',
u_font_url:(document.getElementById('chs_u_font_url')||{}).value||'',
u_global_css:(document.getElementById('chs_u_global_css')||{}).value||'',
u_bubble_css:(document.getElementById('chs_u_bubble_css')||{}).value||'',
op_trans_pos:(document.getElementById('chs_o_trans_pos')||{}).value||'in_bottom'
};
var cd=getChatData(),c=cd.contacts[activeContactId]||{};
var merged=Object.assign({},cd.globalSettings||{},c.configs||{},fake);
applyChatThemeToPages(merged.u_theme||getGlobalTheme());
document.documentElement.style.setProperty('--chat-my-bub',merged.ui_my_bubble||getThemeBubbleDefaults(merged.u_theme).my);
document.documentElement.style.setProperty('--chat-oth-bub',merged.ui_other_bubble||getThemeBubbleDefaults(merged.u_theme).other);
var recvBtn=document.getElementById('qaq-chat-recv-ai-btn');
var menuBtn=document.getElementById('qaq-chat-toggle-menu');
if(recvBtn)recvBtn.style.display=merged.ui_hide_rbtn?'none':'';
if(menuBtn)menuBtn.style.display=merged.ui_hide_mbtn?'none':'flex';
applySettingsLive();
renderMessages();
}
function saveSettings(){
if(!activeContactId)return;
var cd=getChatData(),c=cd.contacts[activeContactId]||{},s=c.configs||{},me=cd.myProfile||{};
var getVal=function(id){var el=document.getElementById(id);return el?el.value:'';};
var getOn=function(id){var el=document.getElementById(id);return !!(el&&el.classList.contains('qaq-toggle-on'));};

c.avatar=getVal('chs_o_avatar');
c.displayName=getVal('chs_o_name')||'未命名角色';
c.remark=getVal('chs_o_remark')||c.displayName;

s.op_persona=getVal('chs_o_persona');
s.o_worldbook=getVal('chs_o_worldbook');
var wbNameBtn=document.getElementById('chs_o_worldbook_btn');
s.o_worldbook_bound_name=wbNameBtn?wbNameBtn.textContent:'';
s.o_trans_enable=getOn('chs_o_trans_enable');
s.op_trans_pos=getVal('chs_o_trans_pos')||'in_bottom';
s.mem_max=Math.max(1,parseInt(getVal('chs_o_mem_max'),10)||20);
s.o_mem_summary=getOn('chs_o_mem_summary');
s.o_mem_summary_cnt=Math.max(50,Math.min(100,parseInt(getVal('chs_o_mem_summary_cnt'),10)||50));

s.o_api_url=getVal('chs_o_api_url');
s.o_api_key=getVal('chs_o_api_key');
s.o_api_model=getVal('chs_o_api_model');

s.o_voice_url=getVal('chs_o_voice_url');
s.o_voice_key=getVal('chs_o_voice_key');
s.o_voice_model=getVal('chs_o_voice_model')||'speech-02-hd';
s.o_voice_speed=parseFloat(getVal('chs_o_voice_speed_val')||getVal('chs_o_voice_speed')||0.9);

s.o_img_url=getVal('chs_o_img_url');
s.o_img_key=getVal('chs_o_img_key');
s.o_img_model=getVal('chs_o_img_model');
s.o_img_prompt_pos=getVal('chs_o_img_prompt_pos')||'masterpiece,best quality,ultra detailed,beautiful lighting,sharp focus,cinematic composition';
s.o_img_prompt_neg=getVal('chs_o_img_prompt_neg')||'low quality,blurry,distorted,deformed,ugly,watermark,text,logo,extra fingers,bad anatomy';

me.avatar=getVal('chs_m_avatar');
me.displayName=getVal('chs_m_name')||'学生';
me.remark=getVal('chs_m_remark');
me.persona=getVal('chs_m_persona')||'正在全力攻克外语考试的学习者';

var themeVal=getVal('chs_u_theme')||getGlobalTheme();
var bubDefaults=getThemeBubbleDefaults(themeVal);

s.ui_my_bubble=getVal('chs_u_my_bubble')||bubDefaults.my;
s.ui_other_bubble=getVal('chs_u_other_bubble')||bubDefaults.other;
s.u_theme=themeVal;
s.ui_avatar_show=getVal('chs_u_avatar_show')||'all';
s.ui_show_time=getOn('chs_u_show_time')?'true':'false';
s.u_time_pos=getVal('chs_u_time_pos')||'top';
s.u_time_fmt=getVal('chs_u_time_fmt')||'HH:mm';
s.ui_hide_rbtn=getOn('chs_u_hide_reply');
s.ui_hide_mbtn=getOn('chs_u_hide_menu');
s.u_menu_pos=getVal('chs_u_menu_pos')||'top';
s.ui_avatar_radius=parseFloat(getVal('chs_u_avatar_radius_val')||getVal('chs_u_avatar_radius')||10);
s.ui_bubble_radius=parseFloat(getVal('chs_u_bubble_radius_val')||getVal('chs_u_bubble_radius')||14);
s.u_font_url=getVal('chs_u_font_url');
s.ui_font_size=(parseInt(getVal('chs_u_font_size_val')||getVal('chs_u_font_size')||14,10)||14)+'px';
s.u_font_color=getVal('chs_u_font_color')||'#333333';
s.u_global_css=getVal('chs_u_global_css')||'/* 示例: body{letter-spacing:0.2px;} */\n/* 示例: .qaq-chat-msg-list{background:transparent;} */';
s.u_bubble_css=getVal('chs_u_bubble_css')||'/* 示例: box-shadow:0 2px 8px rgba(0,0,0,0.06); */\n/* 示例: border:1px solid rgba(0,0,0,0.03); */';

s.x_dnd=getOn('chs_x_dnd');
s.x_dnd_time=getVal('chs_x_dnd_time');

var oldBlocked=!!c.blocked;
c.blocked=getOn('chs_x_blocked');

c.configs=s;
cd.myProfile=me;
saveChatData(cd);

var titleEl=document.getElementById('qaq-chat-win-title');
if(titleEl)titleEl.textContent=c.remark||c.displayName||'聊天';

if(oldBlocked!==c.blocked&&c.blocked)toast('已拉黑，该角色仍可向你发消息或好友申请');
else if(oldBlocked!==c.blocked&&!c.blocked)toast('已取消拉黑');
else toast('设置已保存');

applySettingsLive();
renderContactList();
renderMessages();
}
function checkAutoDndState(){
var cd=getChatData();
Object.keys(cd.contacts||{}).forEach(function(cid){
var c=cd.contacts[cid];
if(!c||!c.configs)return;
var s=c.configs;
if(!s.x_dnd)return;
if(!s.x_dnd_time)return;
var now=new Date();
var hm=String(now.getHours()).padStart(2,'0')+':'+String(now.getMinutes()).padStart(2,'0');
var sp=String(s.x_dnd_time).split('-');
if(sp.length!==2)return;
var start=sp[0],end=sp[1];
var inRange=false;
if(start<=end)inRange=hm>=start&&hm<=end;else inRange=hm>=start||hm<=end;
if(!inRange)s.x_dnd=false;
});
saveChatData(cd);
}
function addAIContact(){
showHtmlModal('添加好友','<div style="display:flex;flex-direction:column;gap:10px;"><div style="font-size:12px;color:#888;">真名</div><input class="qaq-modal-input" id="qaq-add-name" placeholder="如：雅思考官"><div style="font-size:12px;color:#888;">备注</div><input class="qaq-modal-input" id="qaq-add-remark" placeholder="如：口语考官A"><div style="font-size:12px;color:#888;">人设</div><textarea class="qaq-modal-textarea" id="qaq-add-persona" style="height:70px;" placeholder="如：毒舌但专业的雅思考官"></textarea></div>',function(){
var n=(document.getElementById('qaq-add-name').value||'').trim()||'不具名陪读';
var r=(document.getElementById('qaq-add-remark').value||'').trim()||n;
var p=(document.getElementById('qaq-add-persona').value||'').trim()||'我是一名专业的学习助理。';
var cd=getChatData();
var id=uid('ai');
var bub=getThemeBubbleDefaults(getGlobalTheme());
cd.contacts[id]={id:id,displayName:n,remark:r,avatar:'',isTop:false,updateTime:Date.now(),blocked:false,deleted:false,configs:{op_persona:p,ui_bubble_radius:14,ui_avatar_radius:10,op_trans_pos:'in_bottom',ui_my_bubble:bub.my,ui_other_bubble:bub.other,u_theme:getGlobalTheme(),ui_avatar_show:'all',ui_show_time:'true',u_time_pos:'top',u_time_fmt:'HH:mm',u_menu_pos:'top',mem_max:20,o_mem_summary:false,o_mem_summary_cnt:50,o_img_prompt_pos:'masterpiece,best quality,ultra detailed,beautiful lighting,sharp focus,cinematic composition',o_img_prompt_neg:'low quality,blurry,distorted,deformed,ugly,watermark,text,logo,extra fingers,bad anatomy'}};
cd.messages[id]=[{id:uid('msg'),text:'你好，我已准备好和你开始练习。',isMe:false,time:Date.now(),translated:'你好，我已准备好和你开始练习。'}];
saveChatData(cd);
renderContactList();
toast('已添加好友');
});
}
function bindPageEvents(){
applyPageTheme();
ensureDemoData();
checkAutoDndState();

var mainP=document.getElementById('qaq-chat-main-page');
var winP=document.getElementById('qaq-chat-window-page');
var setP=document.getElementById('qaq-chat-settings-page');

var backMain=document.getElementById('qaq-chat-main-back');
var backWin=document.getElementById('qaq-chat-win-back');
var backSet=document.getElementById('qaq-chat-set-back');

var setBtn=document.getElementById('qaq-chat-win-set-btn');
var sendBtn=document.getElementById('qaq-chat-send-btn');
var recvBtn=document.getElementById('qaq-chat-recv-ai-btn');
var input=document.getElementById('qaq-chat-input-box');
var menuBtn=document.getElementById('qaq-chat-toggle-menu');
var extMenu=document.getElementById('qaq-chat-ext-menu');
var addBtn=document.getElementById('qaq-chat-top-add-btn');

if(backMain)backMain.onclick=function(){mainP&&mainP.classList.remove('qaq-page-show');};
if(backWin)backWin.onclick=function(){setP&&setP.classList.remove('qaq-page-show');winP&&winP.classList.remove('qaq-page-show');mainP&&mainP.classList.add('qaq-page-show');renderContactList();};
if(backSet)backSet.onclick=function(){saveSettings();setP&&setP.classList.remove('qaq-page-show');winP&&winP.classList.add('qaq-page-show');};

if(setBtn)setBtn.onclick=function(){renderSettings();winP&&winP.classList.remove('qaq-page-show');setP&&setP.classList.add('qaq-page-show');};

if(sendBtn)sendBtn.onclick=sendMsg;
if(recvBtn)recvBtn.onclick=recvAI;

if(input)input.addEventListener('keydown',function(e){
if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMsg();}
});

if(menuBtn&&extMenu)menuBtn.onclick=function(){
extMenu.style.display=(extMenu.style.display==='none'||!extMenu.style.display)?'grid':'none';
};

if(addBtn)addBtn.onclick=function(){
showHtmlModal('更多操作',
'<div class="qaq-custom-select-list">'+
'<div class="qaq-custom-select-option" id="qaq-chat-add-friend-opt"><span>添加好友</span></div>'+
'<div class="qaq-custom-select-option" id="qaq-chat-add-group-opt"><span>发起群聊</span></div>'+
'</div>',
null,
{hideConfirm:true,afterRender:function(){
var f=document.getElementById('qaq-chat-add-friend-opt');
var g=document.getElementById('qaq-chat-add-group-opt');
if(f)f.onclick=function(){window.qaqCloseModal&&window.qaqCloseModal();setTimeout(function(){addAIContact();},80);};
if(g)g.onclick=function(){window.qaqCloseModal&&window.qaqCloseModal();toast('群聊功能开发中');};
}}
);
};

renderExtMenu();
renderContactList();
}
window.qaqOpenChatPage=function(){
try{
applyPageTheme();
ensureDemoData();
var p=document.getElementById('qaq-chat-main-page');
if(p){p.classList.add('qaq-page-show');p.style.zIndex='999';renderContactList();}
else{console.error('[Chat] 找不到聊天主页面元素');toast('聊天页面不存在');}
}catch(e){
console.error('[Chat] 打开页面失败:',e);
toast('打开聊天失败: '+e.message);
}
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bindPageEvents);
else bindPageEvents();
setInterval(function(){checkAutoDndState();},60000);
}catch(err){
console.error('[Chat] 模块加载失败:',err);
console.error(err.stack);
window.qaqToast&&window.qaqToast('聊天模块加载失败，请查看日志');
}
})();