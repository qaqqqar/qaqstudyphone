/**
 * js/modules/chat.js
 * QAQ - AI聊天引擎 完全重构版
 */
(function(){
'use strict';
var CHAT_STORE_KEY='qaq-chat-store-v4';
var CHAT_PRESETS_KEY='qaq-chat-presets-v1';
var activeContactId=null;
function getCache(k,d){return(window.qaqCacheGet||function(_,d){return d})(k,d)}
function setCache(k,v){(window.qaqCacheSet||function(){})(k,v)}
function toast(m){(window.qaqToast||console.log)(m)}
function escHTML(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
function getChatData(){return getCache(CHAT_STORE_KEY,{contacts:{},messages:{},globalSettings:{},myProfile:{nickname:'学生',trueName:'',persona:'正在全力攻克外语考试的学习者',avatar:''},friendRequests:[]})}
function saveChatData(d){setCache(CHAT_STORE_KEY,d)}
function getPresets(){return getCache(CHAT_PRESETS_KEY,{api:[],voice:[],img:[],persona:[],css_global:[],css_bubble:[]})}
function savePresets(p){setCache(CHAT_PRESETS_KEY,p)}
function fmtTime(ts,fmt){
var d=new Date(ts);
var H=String(d.getHours()).padStart(2,'0');
var M=String(d.getMinutes()).padStart(2,'0');
var S=String(d.getSeconds()).padStart(2,'0');
var mm=String(d.getMonth()+1).padStart(2,'0');
var dd=String(d.getDate()).padStart(2,'0');
if(fmt==='HH:mm:ss')return H+':'+M+':'+S;
if(fmt==='MM-DD HH:mm')return mm+'-'+dd+' '+H+':'+M;
return H+':'+M;
}
function getThemeClass(){
var f=document.querySelector('.qaq-phone-frame');
if(!f)return'';
if(f.classList.contains('qaq-theme-dark'))return'dark';
if(f.classList.contains('qaq-theme-cool'))return'cool';
return'';
}
function modalBg(){var t=getThemeClass();if(t==='dark')return'background:#2a2a2a;color:#e0e0e0;';if(t==='cool')return'background:#f0f2f5;color:#2f4159;';return'background:#fff;color:#333;'}
function modalInpStyle(){var t=getThemeClass();if(t==='dark')return'background:#333;border-color:#444;color:#ddd;';if(t==='cool')return'border-color:rgba(100,130,180,0.2);';return''}
function modalBtnStyle(){var t=getThemeClass();if(t==='dark')return'background:linear-gradient(135deg,#4a3a2a,#5a3a4a);color:#d0b8a8;';if(t==='cool')return'background:linear-gradient(135deg,#d0d8e8,#bfc9dd);color:#3a4a60;';return'background:linear-gradient(135deg,#f6e9c9,#fed2e0);color:#8a6050;'}
function showHtmlModal(title,bodyHtml,onConfirm,opts){
opts=opts||{};
var ov=document.getElementById('qaq-modal-overlay');
var md=document.getElementById('qaq-modal');
var mt=document.getElementById('qaq-modal-title');
var mb=document.getElementById('qaq-modal-body');
var mbt=document.getElementById('qaq-modal-btns');
if(!ov||!md)return;
mt.textContent=title;
mb.innerHTML=bodyHtml;
var btns='<button class="qaq-modal-btn qaq-modal-btn-cancel" id="qaq-chat-modal-ccl">取消</button>';
btns+='<button class="qaq-modal-btn qaq-modal-btn-confirm" id="qaq-chat-modal-cfm">'+(opts.confirmText||'确定')+'</button>';
mbt.innerHTML=btns;
ov.style.display='flex';
setTimeout(function(){ov.classList.add('qaq-modal-show')},10);
function close(){ov.classList.remove('qaq-modal-show');setTimeout(function(){ov.style.display='none'},250)}
document.getElementById('qaq-chat-modal-ccl').onclick=function(){close();if(opts.onCancel)opts.onCancel()};
document.getElementById('qaq-chat-modal-cfm').onclick=function(){if(onConfirm)onConfirm();close()};
if(opts.afterRender)opts.afterRender();
}
// 生成记忆总结的system prompt
function buildMemorySummaryPrompt(contactName,messages,count){
var recent=messages.slice(-count);
var chatLog=recent.map(function(m){return(m.isMe?'用户':'角色('+contactName+')')+': '+m.text}).join('\n');
return `你是一名记忆总结助手。请将以下聊天记录总结为结构化的世界书条目格式。
格式要求：
- 每条记忆以时间戳开头：YYYY年MM月DD日 HH时mm分
- 总结内容包括：关键事件、情感变化、重要信息、约定事项
- 语言简洁准确，每条不超过100字
- 按时间顺序排列

聊天记录：
${chatLog}

请生成总结：`;
}
// 生图system prompt
function buildImageGenPrompt(positive,negative){
return `Generate an image based on the following prompts.
Positive prompt (what to include): ${positive||'high quality, detailed, beautiful'}
Negative prompt (what to avoid): ${negative||'low quality, blurry, distorted, ugly, watermark'}
Combine both prompts to create the best possible image.`;
}
// 聊天system prompt
window.qaqBuildChatSystemPrompt=function(contactId){
var cd=getChatData();
var c=cd.contacts[contactId]||{};
var s=Object.assign({},cd.globalSettings||{},c.configs||{});
var p=cd.myProfile;
var base=s.op_persona||'你是我的高级外教陪练导师。';
var fmt=`\n[严重指令优先级最高] 这是一个专业的外语陪伴学习端。
* 你的当前角色代称是「${escHTML(c.remark||c.nickname||'AI导师')}」。
* 而我是「${escHTML(p.trueName||p.nickname||'学生')}」，我的人设：${escHTML(p.persona||'普通的语言学习者')}。
* 语言纯正：如果对话是外语，请严格运用母语者口吻。\n`;
var tr=s.op_trans_pos||'in_bottom';
if(tr!=='hide'){
fmt+=`\n* 双语返回规章：响应为纯净JSON（不带markdown修饰）：
{"original_text":"【外文原文】","translation":"【中文译文】"}\n`;
}else{
fmt+='\n* 请完全用目标语种沟通，返回纯文本。\n';
}
return base+fmt;
};
// ===== 页面事件绑定 =====
window.qaqOpenChatPage=function(){
var cd=getChatData();
if(!Object.keys(cd.contacts).length){
cd.contacts['ai_tutor']={id:'ai_tutor',nickname:'Alice',remark:'外语陪练员 Alice',avatar:'',isTop:true,updateTime:Date.now(),blocked:false,deleted:false,configs:{op_persona:'你是一名极其开朗且平易近人的金牌英语外教。',ui_bubble_radius:12,ui_avatar_radius:8,op_trans_pos:'in_bottom',ui_my_bubble:'#b8dfbf',ui_other_bubble:'#ffffff'}};
cd.messages['ai_tutor']=[{id:1,text:"I'm always by your side! What are we going to practice today?",isMe:false,time:Date.now()-36000,translated:'我会一直陪在你身旁！今天咱们想怎么练习呢？'}];
saveChatData(cd);
}
renderContactList();
var p=document.getElementById('qaq-chat-main-page');
if(p){p.classList.add('qaq-page-show');p.style.zIndex='999'}
};
function bindPageEvents(){
var mainP=document.getElementById('qaq-chat-main-page');
var winP=document.getElementById('qaq-chat-window-page');
var setP=document.getElementById('qaq-chat-settings-page');
document.getElementById('qaq-chat-main-back')?.addEventListener('click',function(){if(mainP)mainP.classList.remove('qaq-page-show')});
document.getElementById('qaq-chat-win-back')?.addEventListener('click',function(){renderContactList();if(winP)winP.classList.remove('qaq-page-show');if(mainP)mainP.classList.add('qaq-page-show')});
document.getElementById('qaq-chat-set-back')?.addEventListener('click',function(){applySettingsLive();renderMessages();if(setP)setP.classList.remove('qaq-page-show');if(winP)winP.classList.add('qaq-page-show')});
document.getElementById('qaq-chat-win-set-btn')?.addEventListener('click',function(){renderSettings();if(setP){setP.classList.add('qaq-page-show');setP.style.zIndex='999'}});
// 右上角加号菜单
var addBtn=document.getElementById('qaq-chat-top-add-btn');
if(addBtn&&mainP){
var pop=document.createElement('div');pop.className='qaq-chat-pop-menu';
pop.innerHTML='<div class="qaq-chat-pop-item" id="qaq-chat-add-ai">'+svgI('user-plus')+' 添加陪练AI</div><div class="qaq-chat-pop-item" id="qaq-chat-add-group">'+svgI('users')+' 发起群聊</div>';
mainP.appendChild(pop);
addBtn.addEventListener('click',function(e){e.stopPropagation();pop.classList.toggle('qaq-show')});
mainP.addEventListener('click',function(){pop.classList.remove('qaq-show')});
document.getElementById('qaq-chat-add-group').addEventListener('click',function(e){e.stopPropagation();pop.classList.remove('qaq-show');toast('群聊功能开发中')});
document.getElementById('qaq-chat-add-ai').addEventListener('click',function(e){
e.stopPropagation();pop.classList.remove('qaq-show');
showHtmlModal('添加陪练AI','<div style="display:flex;flex-direction:column;gap:10px"><label style="font-size:12px;color:#888">昵称</label><input class="qaq-modal-input" id="qaq-add-name" placeholder="如：雅思考官"><label style="font-size:12px;color:#888">人设</label><textarea class="qaq-modal-textarea" id="qaq-add-persona" placeholder="如：毒舌且阴阳怪气的考官" style="height:60px"></textarea></div>',function(){
var n=document.getElementById('qaq-add-name').value.trim()||'不具名陪读';
var pe=document.getElementById('qaq-add-persona').value.trim()||'我是一名专业的学习助理。';
var cd=getChatData();var nid='ai_'+Date.now();
cd.contacts[nid]={id:nid,nickname:n,remark:n,avatar:'',isTop:false,updateTime:Date.now(),blocked:false,deleted:false,configs:{op_persona:pe}};
saveChatData(cd);renderContactList();toast('已添加：'+n);
});
});
}
// 发送
document.getElementById('qaq-chat-send-btn')?.addEventListener('click',sendMsg);
var box=document.getElementById('qaq-chat-input-box');
if(box)box.addEventListener('keydown',function(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMsg()}});
// 接收AI
document.getElementById('qaq-chat-recv-ai-btn')?.addEventListener('click',recvAI);
// 扩展菜单
var extBtn=document.getElementById('qaq-chat-toggle-menu');
var extMenu=document.getElementById('qaq-chat-ext-menu');
if(extBtn&&extMenu){extBtn.addEventListener('click',function(){extMenu.style.display=extMenu.style.display==='none'?'grid':'none'})}
renderExtMenu();
}
function svgI(n){
var m={
'user-plus':'<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/>',
'users':'<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
'download':'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
'upload':'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
'save':'<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>',
'trash':'<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
'refresh':'<polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>',
'image':'<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>',
'folder':'<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>'
};
return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'+(m[n]||'')+'</svg>';
}
function renderExtMenu(){
var m=document.getElementById('qaq-chat-ext-menu');if(!m)return;
m.innerHTML=[{n:'照片',i:'image'},{n:'听译',i:'download'},{n:'纠错',i:'save'},{n:'剧场',i:'folder'}].map(function(f){
return '<div class="qaq-ext-item" onclick="(window.qaqToast||alert)(\''+f.n+'开发中\')"><div class="qaq-ext-icon">'+svgI(f.i)+'</div><div class="qaq-ext-label">'+f.n+'</div></div>';
}).join('');
}
// ===== 联系人列表 =====
function renderContactList(){
var cd=getChatData();
var el=document.getElementById('qaq-chat-contact-list');if(!el)return;
var arr=Object.values(cd.contacts).filter(function(c){return!c.deleted});
arr.sort(function(a,b){if(a.isTop!==b.isTop)return a.isTop?-1:1;return(b.updateTime||0)-(a.updateTime||0)});
if(!arr.length){el.innerHTML='<div style="text-align:center;color:#aaa;padding:60px">点击右上方+添加陪练AI</div>';return}
var dAva="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Crect width='24' height='24' rx='6' fill='%23e8e8ec'/%3E%3C/svg%3E";
el.innerHTML='';
arr.forEach(function(c){
var s=c.configs||{};
var msgs=cd.messages[c.id]||[];
var lst=msgs.length?msgs[msgs.length-1]:null;
var rR=s.ui_avatar_radius!==undefined?s.ui_avatar_radius:10;
var div=document.createElement('div');
div.className='qaq-chat-list-item'+(c.isTop?' qaq-top':'');
div.innerHTML='<img class="qaq-chat-list-avatar" src="'+(c.avatar||dAva)+'" style="border-radius:'+rR+'px"><div class="qaq-chat-list-info"><div class="qaq-chat-list-top-row"><div class="qaq-chat-list-name">'+escHTML(c.remark||c.nickname)+'</div><div class="qaq-chat-list-time">'+(lst?fmtTime(lst.time):'')+' </div></div><div class="qaq-chat-list-preview">'+escHTML(lst?(lst.text||'[消息]'):'等候您的问候')+'</div></div>';
div.onclick=function(){openChat(c.id)};
// 长按删除/置顶
div.addEventListener('contextmenu',function(e){
e.preventDefault();
showHtmlModal('操作','<div style="display:flex;flex-direction:column;gap:8px"><button class="qaq-modal-btn qaq-modal-btn-confirm" id="qaq-cl-top">'+(c.isTop?'取消置顶':'置顶')+'</button><button class="qaq-modal-btn qaq-modal-btn-cancel" id="qaq-cl-del" style="color:#d9534f">删除角色</button></div>',null,{
afterRender:function(){
document.getElementById('qaq-cl-top').onclick=function(){c.isTop=!c.isTop;saveChatData(cd);renderContactList();document.getElementById('qaq-chat-modal-ccl').click()};
document.getElementById('qaq-cl-del').onclick=function(){document.getElementById('qaq-chat-modal-ccl').click();showHtmlModal('确认删除','<p style="font-size:13px">确认删除「'+escHTML(c.remark||c.nickname)+'」及所有聊天记录？此操作不可恢复。</p>',function(){c.deleted=true;delete cd.messages[c.id];saveChatData(cd);renderContactList();toast('已删除')})};
}});
});
el.appendChild(div);
});
// 好友申请通知
var fr=cd.friendRequests||[];
if(fr.length){
var frDiv=document.createElement('div');frDiv.style.cssText='padding:12px 16px;font-size:12px;color:#c47068;cursor:pointer;border-bottom:1px solid rgba(0,0,0,0.04)';
frDiv.textContent='📩 '+fr.length+' 条好友申请';
frDiv.onclick=function(){showFriendRequests()};
el.insertBefore(frDiv,el.firstChild);
}
}
function showFriendRequests(){
var cd=getChatData();var fr=cd.friendRequests||[];
if(!fr.length){toast('暂无好友申请');return}
var h=fr.map(function(r,i){return '<div style="display:flex;align-items:center;gap:10px;padding:10px;border-bottom:1px solid rgba(0,0,0,0.04)"><span style="flex:1;font-size:13px">'+escHTML(r.name)+' 请求添加好友</span><button class="qaq-modal-btn qaq-modal-btn-confirm" style="flex:0;padding:0 12px;height:30px;font-size:11px" data-fri="'+i+'">接受</button></div>'}).join('');
showHtmlModal('好友申请',h,null,{afterRender:function(){
document.querySelectorAll('[data-fri]').forEach(function(b){b.onclick=function(){
var idx=parseInt(this.dataset.fri);
var req=cd.friendRequests[idx];if(!req)return;
// 解除拉黑
if(cd.contacts[req.cid]){cd.contacts[req.cid].blocked=false}
cd.friendRequests.splice(idx,1);saveChatData(cd);
toast('已接受');document.getElementById('qaq-chat-modal-ccl').click();renderContactList();
}});
}});
}
// ===== 聊天窗口 =====
function openChat(cid){
activeContactId=cid;
var cd=getChatData();var c=cd.contacts[cid];
var s=Object.assign({},cd.globalSettings||{},c.configs||{});
document.getElementById('qaq-chat-win-title').textContent=c.remark||c.nickname;
applySettingsLive();
var winP=document.getElementById('qaq-chat-window-page');
if(winP){winP.classList.add('qaq-page-show');winP.style.zIndex='999'}
renderMessages();
// 拉黑提示
var inputArea=document.getElementById('qaq-chat-input-area');
var oldTip=document.getElementById('qaq-chat-block-tip');
if(oldTip)oldTip.remove();
if(c.blocked){
var tip=document.createElement('div');tip.id='qaq-chat-block-tip';
tip.style.cssText='text-align:center;font-size:11px;color:#999;padding:8px;background:rgba(0,0,0,0.02)';
tip.textContent='你已拉黑 '+escHTML(c.remark||c.nickname);
if(inputArea)inputArea.parentNode.insertBefore(tip,inputArea);
}
}
function applySettingsLive(){
if(!activeContactId)return;
var cd=getChatData();var c=cd.contacts[activeContactId]||{};
var s=Object.assign({},cd.globalSettings||{},c.configs||{});
document.documentElement.style.setProperty('--chat-my-bub',s.ui_my_bubble||'#fce8e2');
document.documentElement.style.setProperty('--chat-oth-bub',s.ui_other_bubble||'#ffffff');
var rBtn=document.getElementById('qaq-chat-recv-ai-btn');
var mBtn=document.getElementById('qaq-chat-toggle-menu');
if(rBtn)rBtn.style.display=s.ui_hide_rbtn?'none':'block';
if(mBtn)mBtn.style.display=s.ui_hide_mbtn?'none':'flex';
}
function renderMessages(){
if(!activeContactId)return;
var cd=getChatData();var msgs=cd.messages[activeContactId]||[];
var c=cd.contacts[activeContactId]||{};
var s=Object.assign({},cd.globalSettings||{},c.configs||{});
var el=document.getElementById('qaq-chat-msg-list');if(!el)return;
var dAva="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Crect width='24' height='24' rx='6' fill='%23e8e8ec'/%3E%3C/svg%3E";
var rR=s.ui_avatar_radius!==undefined?s.ui_avatar_radius:10;
var bR=s.ui_bubble_radius!==undefined?s.ui_bubble_radius:14;
var fSz=s.ui_font_size||'14px';
var fClr=s.u_font_color||'';
var tFmt=s.u_time_fmt||'HH:mm';
var tPos=s.u_time_pos||'top';
var showTime=s.ui_show_time!=='false';
var avaShow=s.ui_avatar_show||'all';
var trPos=s.op_trans_pos||'in_bottom';
var html='';
msgs.forEach(function(m,idx){
var isMe=m.isMe;
var avaUrl=isMe?(cd.myProfile.avatar||dAva):(c.avatar||dAva);
// 头像可见性
var showAva=true;
if(avaShow==='hide_all')showAva=false;
else if(avaShow==='first'&&idx>0)showAva=false;
else if(avaShow==='last'&&idx<msgs.length-1)showAva=false;
var avaHtml=showAva?'<img class="qaq-chat-bubble-avatar" src="'+escHTML(avaUrl)+'" style="border-radius:'+rR+'px">':'<div style="width:38px;flex-shrink:0"></div>';
var bStyle=isMe?'border-radius:'+bR+'px 2px '+bR+'px '+bR+'px':'border-radius:2px '+bR+'px '+bR+'px '+bR+'px';
var colorStyle=fClr?';color:'+fClr:'';
// 翻译
var trIn='',trOut='';
if(m.translated&&trPos!=='hide'){
var th='<div class="qaq-chat-trans" style="font-size:'+(parseInt(fSz)-2)+'px">'+escHTML(m.translated)+'</div>';
if(trPos.indexOf('in')>-1)trIn=th;else trOut=th;
}
var bContent=trPos==='in_top'?(trIn+escHTML(m.text)):(escHTML(m.text)+trIn);
// 时间
var timeHtml='';
if(showTime){
var tStr=fmtTime(m.time,tFmt);
timeHtml='<div class="qaq-chat-msg-time" style="'+(tPos==='avatar_top'||tPos==='avatar_bottom'?'text-align:center;':'')+'">'+tStr+'</div>';
}
var alg=isMe?'qaq-row-me':'qaq-row-other';
// 时间位置处理
var timeAbove='',timeBelow='',timeInBubble='';
if(tPos==='top'||tPos==='avatar_top')timeAbove=timeHtml;
else if(tPos==='bottom'||tPos==='avatar_bottom')timeBelow=timeHtml;
else if(tPos==='bubble_outer')timeBelow=timeHtml;
else if(tPos==='bubble_inner')timeInBubble='<div style="font-size:10px;color:#bbb;margin-top:4px">'+fmtTime(m.time,tFmt)+'</div>';
html+='<div class="qaq-chat-row '+alg+'">'+avaHtml+'<div class="qaq-chat-bubble-wrap'+(trPos.indexOf('out')>-1?' qaq-has-outer-tr':'')+'">'+timeAbove+'<div class="qaq-chat-bubble" style="'+bStyle+';font-size:'+fSz+colorStyle+'">'+bContent+timeInBubble+'</div>'+trOut+timeBelow+'</div></div>';
});
el.innerHTML=html;
setTimeout(function(){el.scrollTop=el.scrollHeight},10);
}
function sendMsg(){
if(!activeContactId)return;
var cd=getChatData();var c=cd.contacts[activeContactId];
if(c&&c.blocked){toast('你已拉黑该角色，无法发送消息');return}
var box=document.getElementById('qaq-chat-input-box');if(!box)return;
var txt=box.value.trim();if(!txt)return;
if(!cd.messages[activeContactId])cd.messages[activeContactId]=[];
cd.messages[activeContactId].push({id:Date.now(),text:txt,isMe:true,time:Date.now(),translated:''});
cd.contacts[activeContactId].updateTime=Date.now();
saveChatData(cd);box.value='';renderMessages();
// 自动总结检查
checkAutoSummary(activeContactId);
}
function recvAI(){
if(!activeContactId)return;
var cd=getChatData();var c=cd.contacts[activeContactId]||{};
var s=Object.assign({},cd.globalSettings||{},c.configs||{});
var msgs=cd.messages[activeContactId]||[];
// 获取API配置
var apiUrl=s.o_api_url||getCache('qaq-api-url','')||'https://api.openai.com/v1';
var apiKey=s.o_api_key||getCache('qaq-api-key','')||'';
var model=s.o_api_model||getCache('qaq-api-model','')||'gpt-4';
if(!apiUrl||!apiKey){toast('请先配置API');return}
// 构建消息历史
var memMax=s.mem_max||20;
var history=msgs.slice(-memMax).map(function(m){return{role:m.isMe?'user':'assistant',content:m.text}});
var sysPmt=window.qaqBuildChatSystemPrompt(activeContactId);
toast('AI思考中...');
fetch(apiUrl+'/chat/completions',{
method:'POST',
headers:{'Authorization':'Bearer '+apiKey,'Content-Type':'application/json'},
body:JSON.stringify({model:model,messages:[{role:'system',content:sysPmt}].concat(history)})
}).then(function(r){return r.json()}).then(function(d){
if(d.choices&&d.choices[0]){
var reply=d.choices[0].message.content;
var trPos=s.op_trans_pos||'in_bottom';
var orig='',trans='';
if(trPos!=='hide'){
try{
var j=JSON.parse(reply);
orig=j.original_text||reply;
trans=j.translation||'';
}catch(e){orig=reply}
}else{orig=reply}
cd.messages[activeContactId].push({id:Date.now(),text:orig,isMe:false,time:Date.now(),translated:trans});
cd.contacts[activeContactId].updateTime=Date.now();
saveChatData(cd);renderMessages();
checkAutoSummary(activeContactId);
}else{toast('AI响应异常')}
}).catch(function(){toast('请求失败')});
}
function checkAutoSummary(cid){
var cd=getChatData();var c=cd.contacts[cid]||{};
var s=c.configs||{};
if(!s.o_mem_summary)return;
var cnt=s.o_mem_summary_cnt||50;
var msgs=cd.messages[cid]||[];
if(msgs.length%cnt===0&&msgs.length>0){
// 触发总结
var pmt=buildMemorySummaryPrompt(c.remark||c.nickname,msgs,cnt);
// 调用API生成总结（简化版，实际需完整实现）
toast('正在生成记忆总结...');
// 这里应调用API，生成后存入世界书，暂略
}
}
// ===== 设置页面 =====
function renderSettings(){
var cd=getChatData();var cid=activeContactId;
var c=cd.contacts[cid]||{};
var s=Object.assign({},cd.globalSettings||{},c.configs||{});
var p=cd.myProfile;
var scr=document.getElementById('qaq-chat-settings-scroll');if(!scr)return;
var secs=[
{id:'other',title:'对方设置',icon:'user',fields:[
{k:'o_avatar',l:'头像',v:c.avatar||'',ty:'img'},
{k:'o_nickname',l:'真名',v:c.nickname||'',ty:'text'},
{k:'o_remark',l:'备注',v:c.remark||'',ty:'text'},
{k:'o_persona',l:'人设',v:s.op_persona||'',ty:'area',h:60},
{k:'o_worldbook',l:'世界书',v:s.o_worldbook||'',ty:'wb'},
{k:'o_emoji',l:'发表情包',v:!!s.o_emoji,ty:'switch'},
{k:'o_trans_enable',l:'翻译功能',v:s.o_trans_enable!==false,ty:'switch'},
{k:'o_trans_pos',l:'翻译显示',v:s.op_trans_pos||'in_bottom',ty:'trans'},
{k:'o_mem_max',l:'最大记忆条数',v:s.mem_max||20,ty:'num'},
{k:'o_mem_summary',l:'自动总结记忆',v:!!s.o_mem_summary,ty:'switch'},
{k:'o_mem_summary_cnt',l:'总结条数',v:s.o_mem_summary_cnt||50,ty:'num'},
{k:'o_api_url',l:'专属API URL',v:s.o_api_url||'',ty:'text',ph:'留空使用全局',preset:'api'},
{k:'o_api_key',l:'专属API Key',v:s.o_api_key||'',ty:'pwd',preset:'api'},
{k:'o_api_model',l:'专属模型',v:s.o_api_model||'',ty:'text',hasBtn:'fetch',preset:'api'},
{k:'o_voice_url',l:'语音API URL',v:s.o_voice_url||'',ty:'text',preset:'voice'},
{k:'o_voice_key',l:'语音API Key',v:s.o_voice_key||'',ty:'pwd',preset:'voice'},
{k:'o_voice_model',l:'语音模型',v:s.o_voice_model||'speech-02-hd',ty:'voice',preset:'voice'},
{k:'o_voice_speed',l:'语速',v:s.o_voice_speed||0.9,ty:'slider',min:0.6,max:1.2,step:0.1,preset:'voice'},
{k:'o_img_url',l:'生图API URL',v:s.o_img_url||'',ty:'text',preset:'img'},
{k:'o_img_key',l:'生图API Key',v:s.o_img_key||'',ty:'pwd',preset:'img'},
{k:'o_img_model',l:'生图模型',v:s.o_img_model||'',ty:'text',hasBtn:'fetch',preset:'img'},
{k:'o_img_prompt_pos',l:'正面提示词',v:s.o_img_prompt_pos||'high quality, detailed, beautiful',ty:'area',h:40,preset:'img'},
{k:'o_img_prompt_neg',l:'负面提示词',v:s.o_img_prompt_neg||'low quality, blurry, distorted',ty:'area',h:40,preset:'img'}
]},
{id:'my',title:'我方设置',icon:'user',fields:[
{k:'m_avatar',l:'头像',v:p.avatar||'',ty:'img'},
{k:'m_nickname',l:'昵称',v:p.nickname||'',ty:'text'},
{k:'m_truename',l:'真名',v:p.trueName||'',ty:'text'},
{k:'m_persona',l:'人设',v:p.persona||'',ty:'area',h:60,preset:'persona'}
]},
{id:'ui',title:'美化设置',icon:'palette',fields:[
{k:'u_my_bubble',l:'我的气泡颜色',v:s.ui_my_bubble||'#fce8e2',ty:'color'},
{k:'u_other_bubble',l:'对方气泡颜色',v:s.ui_other_bubble||'#ffffff',ty:'color'},
{k:'u_theme',l:'主题颜色',v:s.u_theme||'default',ty:'theme'},
{k:'u_avatar_show',l:'头像显示',v:s.ui_avatar_show||'all',ty:'ava'},
{k:'u_show_time',l:'显示时间戳',v:s.ui_show_time!=='false',ty:'switch'},
{k:'u_time_pos',l:'时间戳位置',v:s.u_time_pos||'top',ty:'timepos'},
{k:'u_time_fmt',l:'时间格式',v:s.u_time_fmt||'HH:mm',ty:'timefmt'},
{k:'u_hide_reply',l:'隐藏回复按钮',v:!!s.ui_hide_rbtn,ty:'switch'},
{k:'u_hide_menu',l:'隐藏菜单按钮',v:!!s.ui_hide_mbtn,ty:'switch'},
{k:'u_menu_pos',l:'菜单位置',v:s.u_menu_pos||'top',ty:'menupos'},
{k:'u_avatar_radius',l:'头像圆角',v:s.ui_avatar_radius||10,ty:'slider',min:0,max:30},
{k:'u_bubble_radius',l:'气泡圆角',v:s.ui_bubble_radius||14,ty:'slider',min:0,max:30},
{k:'u_font_url',l:'字体',v:s.u_font_url||'',ty:'font'},
{k:'u_font_size',l:'字体大小',v:parseInt(s.ui_font_size)||14,ty:'slider',min:10,max:20},
{k:'u_font_color',l:'字体颜色',v:s.u_font_color||'#333',ty:'color'},
{k:'u_global_css',l:'全局CSS',v:s.u_global_css||'/* 示例: body{background:#f0f0f0} */',ty:'area',h:60,preset:'css_global'},
{k:'u_bubble_css',l:'气泡CSS',v:s.u_bubble_css||'/* 示例: box-shadow:0 2px 8px rgba(0,0,0,0.1) */',ty:'area',h:60,preset:'css_bubble'}
]},
{id:'history',title:'聊天记录',icon:'message',fields:[]},
{id:'other_ops',title:'其他',icon:'more',fields:[
{k:'x_dnd',l:'角色勿扰',v:!!s.x_dnd,ty:'switch'},
{k:'x_dnd_time',l:'勿扰时间段',v:s.x_dnd_time||'',ty:'dnd'},
{k:'x_blocked',l:'拉黑此角色',v:!!c.blocked,ty:'switch'},
{k:'x_deleted',l:'删除此角色',v:!!c.deleted,ty:'switch'}
]}
];
var html='';
secs.forEach(function(sec){
html+='<div class="qaq-chat-set-card qaq-collapsible qaq-collapsed" data-sec="'+sec.id+'">';
html+='<div class="qaq-chat-set-hd qaq-collapse-trigger">'+svgI(sec.icon)+'<span>'+sec.title+'</span><svg class="qaq-collapse-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg></div>';
html+='<div class="qaq-chat-set-bd qaq-collapse-body">';
if(sec.id==='history'){
html+='<button class="qaq-chat-action-btn" id="qaq-chat-import-history">'+svgI('upload')+' 导入聊天记录</button>';
html+='<button class="qaq-chat-action-btn" id="qaq-chat-export-history">'+svgI('download')+' 导出聊天记录</button>';
html+='<button class="qaq-chat-action-btn qaq-danger" id="qaq-chat-clear-history">'+svgI('trash')+' 清除聊天记录</button>';
}else{
// 预设按钮组
var presetTypes=['api','voice','img','persona','css_global','css_bubble'];
var hasPreset=sec.fields.some(function(f){return presetTypes.indexOf(f.preset)>-1});
if(hasPreset){
var pType=sec.fields.find(function(f){return f.preset}).preset;
html+='<div style="display:flex;gap:6px;margin-bottom:10px">';
html+='<button class="qaq-preset-btn" data-preset-save="'+pType+'">'+svgI('save')+' 保存预设</button>';
html+='<button class="qaq-preset-btn" data-preset-load="'+pType+'">'+svgI('upload')+' 导入预设</button>';
if(pType.indexOf('css')>-1)html+='<button class="qaq-preset-btn" data-preset-reset="'+pType+'">'+svgI('refresh')+' 重置</button>';
html+='</div>';
}
sec.fields.forEach(function(f){
var lab='<div class="qaq-chat-set-lbl">'+f.l+'</div>';
if(f.ty==='text'||f.ty==='pwd'||f.ty==='num'){
var tg=f.ty==='pwd'?'password':(f.ty==='num'?'number':'text');
if(f.hasBtn==='fetch'){
html+=lab+'<div class="qaq-input-with-btn"><input type="'+tg+'" class="qaq-chat-set-inp" id="chs_'+f.k+'" value="'+escHTML(String(f.v))+'" placeholder="'+(f.ph||'')+'"><button class="qaq-fetch-model-btn" data-target="chs_'+f.k+'" data-type="'+(f.preset||'api')+'">'+svgI('download')+'</button></div>';
}else{
html+=lab+'<input type="'+tg+'" class="qaq-chat-set-inp" id="chs_'+f.k+'" value="'+escHTML(String(f.v))+'" placeholder="'+(f.ph||'')+'">';
}
}else if(f.ty==='area'){
html+=lab+'<textarea class="qaq-chat-set-txt" id="chs_'+f.k+'" style="height:'+(f.h||60)+'px">'+escHTML(String(f.v))+'</textarea>';
}else if(f.ty==='switch'){
html+='<div class="qaq-chat-set-row-tog"><span>'+f.l+'</span><div class="qaq-toggle '+(f.v?'qaq-toggle-on':'')+'" id="chs_'+f.k+'"><div class="qaq-toggle-knob"></div></div></div>';
}else if(f.ty==='slider'){
var val=parseFloat(f.v)||0;
html+=lab+'<div style="display:flex;align-items:center;gap:8px"><input type="range" class="qaq-chat-slider" id="chs_'+f.k+'" min="'+(f.min||0)+'" max="'+(f.max||100)+'" step="'+(f.step||1)+'" value="'+val+'" style="flex:1"><input type="number" class="qaq-chat-set-inp" id="chs_'+f.k+'_val" value="'+val+'" min="'+(f.min||0)+'" max="'+(f.max||100)+'" step="'+(f.step||1)+'" style="width:60px"></div>';
}else if(f.ty==='img'){
html+=lab+'<div style="display:flex;gap:6px"><input type="text" class="qaq-chat-set-inp" id="chs_'+f.k+'" value="'+escHTML(String(f.v))+'" placeholder="URL" style="flex:1"><button class="qaq-upload-img-btn" data-target="chs_'+f.k+'">'+svgI('upload')+'</button></div>';
}else if(f.ty==='font'){
html+=lab+'<div style="display:flex;gap:6px"><input type="text" class="qaq-chat-set-inp" id="chs_'+f.k+'" value="'+escHTML(String(f.v))+'" placeholder="字体URL" style="flex:1"><button class="qaq-upload-font-btn" data-target="chs_'+f.k+'">'+svgI('upload')+'</button></div>';
}else if(f.ty==='color'){
html+=lab+'<div style="display:flex;gap:6px"><button class="qaq-color-pick-btn" data-target="chs_'+f.k+'" style="width:40px;height:36px;border-radius:8px;border:1px solid #ddd;background:'+f.v+'"></button><input type="text" class="qaq-chat-set-inp" id="chs_'+f.k+'" value="'+escHTML(String(f.v))+'" style="flex:1"></div>';
}else if(f.ty==='wb'){
html+=lab+'<button class="qaq-chat-action-btn" id="chs_'+f.k+'_btn">'+svgI('folder')+' 选择世界书</button><input type="hidden" id="chs_'+f.k+'" value="'+escHTML(String(f.v))+'">';
}else if(f.ty==='trans'){
html+=lab+'<button class="qaq-chat-action-btn" id="chs_'+f.k+'_btn">'+escHTML(getTransLabel(f.v))+'</button><input type="hidden" id="chs_'+f.k+'" value="'+escHTML(String(f.v))+'">';
}else if(f.ty==='voice'){
html+=lab+'<button class="qaq-chat-action-btn" id="chs_'+f.k+'_btn">'+escHTML(f.v)+'</button><input type="hidden" id="chs_'+f.k+'" value="'+escHTML(String(f.v))+'">';
}else if(f.ty==='theme'){
html+=lab+'<button class="qaq-chat-action-btn" id="chs_'+f.k+'_btn">'+escHTML(getThemeLabel(f.v))+'</button><input type="hidden" id="chs_'+f.k+'" value="'+escHTML(String(f.v))+'">';
}else if(f.ty==='ava'){
html+=lab+'<button class="qaq-chat-action-btn" id="chs_'+f.k+'_btn">'+escHTML(getAvaLabel(f.v))+'</button><input type="hidden" id="chs_'+f.k+'" value="'+escHTML(String(f.v))+'">';
}else if(f.ty==='timepos'){
html+=lab+'<button class="qaq-chat-action-btn" id="chs_'+f.k+'_btn">'+escHTML(getTimePosLabel(f.v))+'</button><input type="hidden" id="chs_'+f.k+'" value="'+escHTML(String(f.v))+'">';
}else if(f.ty==='timefmt'){
html+=lab+'<button class="qaq-chat-action-btn" id="chs_'+f.k+'_btn">'+escHTML(f.v)+'</button><input type="hidden" id="chs_'+f.k+'" value="'+escHTML(String(f.v))+'">';
}else if(f.ty==='menupos'){
html+=lab+'<button class="qaq-chat-action-btn" id="chs_'+f.k+'_btn">'+escHTML(f.v==='top'?'输入框上方':'输入框下方')+'</button><input type="hidden" id="chs_'+f.k+'" value="'+escHTML(String(f.v))+'">';
}else if(f.ty==='dnd'){
html+=lab+'<button class="qaq-chat-action-btn" id="chs_'+f.k+'_btn">'+(f.v||'点击设置')+'</button><input type="hidden" id="chs_'+f.k+'" value="'+escHTML(String(f.v))+'">';
}
});
}
html+='</div></div>';
});
html+='<button class="qaq-chat-set-save" id="qaq-chs-sv">保存全部设置</button>';
scr.innerHTML=html;
// 绑定折叠
scr.querySelectorAll('.qaq-collapse-trigger').forEach(function(t){t.onclick=function(e){e.stopPropagation();this.parentElement.classList.toggle('qaq-collapsed')}});
// 绑定开关
scr.querySelectorAll('.qaq-toggle').forEach(function(t){t.onclick=function(e){e.stopPropagation();this.classList.toggle('qaq-toggle-on')}});
// 绑定滑块
scr.querySelectorAll('.qaq-chat-slider').forEach(function(sl){
var inp=document.getElementById(sl.id+'_val');
sl.oninput=function(){if(inp)inp.value=this.value};
if(inp)inp.oninput=function(){sl.value=this.value};
});
// 绑定图片上传
scr.querySelectorAll('.qaq-upload-img-btn').forEach(function(b){b.onclick=function(){uploadFile('image/*',this.dataset.target)}});
// 绑定字体上传
scr.querySelectorAll('.qaq-upload-font-btn').forEach(function(b){b.onclick=function(){uploadFile('.ttf,.otf,.woff,.woff2',this.dataset.target)}});
// 绑定颜色选择
scr.querySelectorAll('.qaq-color-pick-btn').forEach(function(b){b.onclick=function(){pickColor(this.dataset.target,this)}});
// 绑定拉取模型
scr.querySelectorAll('.qaq-fetch-model-btn').forEach(function(b){b.onclick=function(){fetchModels(this.dataset.target,this.dataset.type)}});
// 绑定预设
scr.querySelectorAll('[data-preset-save]').forEach(function(b){b.onclick=function(){savePreset(this.dataset.presetSave)}});
scr.querySelectorAll('[data-preset-load]').forEach(function(b){b.onclick=function(){loadPreset(this.dataset.presetLoad)}});
scr.querySelectorAll('[data-preset-reset]').forEach(function(b){b.onclick=function(){resetPreset(this.dataset.presetReset)}});
// 绑定世界书选择
var wbBtn=document.getElementById('chs_o_worldbook_btn');
if(wbBtn)wbBtn.onclick=function(){toast('世界书功能开发中')};
// 绑定翻译显示
var trBtn=document.getElementById('chs_o_trans_pos_btn');
if(trBtn)trBtn.onclick=function(){selectTransPos()};
// 绑定语音模型
var vmBtn=document.getElementById('chs_o_voice_model_btn');
if(vmBtn)vmBtn.onclick=function(){selectVoiceModel()};
// 绑定主题
var thBtn=document.getElementById('chs_u_theme_btn');
if(thBtn)thBtn.onclick=function(){selectTheme()};
// 绑定头像显示
var avBtn=document.getElementById('chs_u_avatar_show_btn');
if(avBtn)avBtn.onclick=function(){selectAvaShow()};
// 绑定时间位置
var tpBtn=document.getElementById('chs_u_time_pos_btn');
if(tpBtn)tpBtn.onclick=function(){selectTimePos()};
// 绑定时间格式
var tfBtn=document.getElementById('chs_u_time_fmt_btn');
if(tfBtn)tfBtn.onclick=function(){selectTimeFmt()};
// 绑定菜单位置
var mpBtn=document.getElementById('chs_u_menu_pos_btn');
if(mpBtn)mpBtn.onclick=function(){selectMenuPos()};
// 绑定勿扰时间
var dndBtn=document.getElementById('chs_x_dnd_time_btn');
if(dndBtn)dndBtn.onclick=function(){selectDndTime()};
// 聊天记录操作
var impBtn=document.getElementById('qaq-chat-import-history');
if(impBtn)impBtn.onclick=function(){importHistory()};
var expBtn=document.getElementById('qaq-chat-export-history');
if(expBtn)expBtn.onclick=function(){exportHistory()};
var clrBtn=document.getElementById('qaq-chat-clear-history');
if(clrBtn)clrBtn.onclick=function(){clearHistory()};
// 保存按钮
document.getElementById('qaq-chs-sv').onclick=function(){saveSettings()};
}
function getTransLabel(v){
var m={'in_bottom':'气泡内下方','in_top':'气泡内上方','out_bottom':'气泡外下方','out_top':'气泡外上方','hide':'隐藏'};
return m[v]||v;
}
function getThemeLabel(v){
var m={'default':'暖阳','cool':'冷雾','dark':'夜幕'};
return m[v]||v;
}
function getAvaLabel(v){
var m={'all':'全显示','hide_all':'全隐藏','first':'首条','last':'末条'};
return m[v]||v;
}
function getTimePosLabel(v){
var m={'top':'气泡上方','bottom':'气泡下方','avatar_top':'头像上方','avatar_bottom':'头像下方','bubble_outer':'气泡外侧','bubble_inner':'气泡内侧'};
return m[v]||v;
}
function uploadFile(accept,targetId){
var inp=document.createElement('input');inp.type='file';inp.accept=accept;
inp.onchange=function(){
if(!this.files||!this.files[0])return;
var reader=new FileReader();
reader.onload=function(e){
var tgt=document.getElementById(targetId);
if(tgt)tgt.value=e.target.result;
toast('已上传');
};
reader.readAsDataURL(this.files[0]);
};
inp.click();
}
function pickColor(targetId,btn){
var inp=document.getElementById(targetId);if(!inp)return;
var opts=['#fce8e2','#b8dfbf','#dce4f0','#ffffff','#f4f5f7','#fdfaec','#111111','#333333'];
var h='<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">'+opts.map(function(c){
return '<div style="width:100%;aspect-ratio:1;background:'+c+';border-radius:8px;border:2px solid #ddd;cursor:pointer" data-color="'+c+'"></div>';
}).join('')+'</div><div style="margin-top:10px"><input type="text" class="qaq-modal-input" id="qaq-color-custom" placeholder="自定义颜色 #RRGGBB" value="'+inp.value+'"></div>';
showHtmlModal('选择颜色',h,function(){
var cust=document.getElementById('qaq-color-custom').value.trim();
if(cust){inp.value=cust;btn.style.background=cust}
},{afterRender:function(){
document.querySelectorAll('[data-color]').forEach(function(d){d.onclick=function(){
inp.value=this.dataset.color;btn.style.background=this.dataset.color;
document.getElementById('qaq-chat-modal-ccl').click();
}});
}});
}
function fetchModels(targetId,type){
var cd=getChatData();var c=cd.contacts[activeContactId]||{};
var s=Object.assign({},cd.globalSettings||{},c.configs||{});
var url,key;
if(type==='img'){url=s.o_img_url||'';key=s.o_img_key||''}
else{url=s.o_api_url||getCache('qaq-api-url','')||'';key=s.o_api_key||getCache('qaq-api-key','')||''}
if(!url||!key){toast('请先配置API');return}
toast('拉取中...');
fetch(url+'/v1/models',{headers:{'Authorization':'Bearer '+key}})
.then(function(r){return r.json()})
.then(function(d){
if(d.data&&d.data.length){
var ms=d.data.map(function(m){return m.id});
var h='<select class="qaq-modal-input" id="qaq-model-sel" style="width:100%">'+ms.map(function(m){return '<option value="'+m+'">'+m+'</option>'}).join('')+'</select>';
showHtmlModal('选择模型',h,function(){
var sel=document.getElementById('qaq-model-sel');
if(sel){var tgt=document.getElementById(targetId);if(tgt)tgt.value=sel.value}
});
}else{toast('未获取到模型')}
}).catch(function(){toast('拉取失败')});
}
function savePreset(type){
var cd=getChatData();var c=cd.contacts[activeContactId]||{};
var s=c.configs||{};
var p=cd.myProfile;
var data={};
if(type==='api'){data={url:s.o_api_url||'',key:s.o_api_key||'',model:s.o_api_model||''}}
else if(type==='voice'){data={url:s.o_voice_url||'',key:s.o_voice_key||'',model:s.o_voice_model||'',speed:s.o_voice_speed||0.9}}
else if(type==='img'){data={url:s.o_img_url||'',key:s.o_img_key||'',model:s.o_img_model||'',pos:s.o_img_prompt_pos||'',neg:s.o_img_prompt_neg||''}}
else if(type==='persona'){data={persona:p.persona||''}}
else if(type==='css_global'){data={css:s.u_global_css||''}}
else if(type==='css_bubble'){data={css:s.u_bubble_css||''}}
var ps=getPresets();
if(!ps[type])ps[type]=[];
showHtmlModal('保存预设','<input class="qaq-modal-input" id="qaq-preset-name" placeholder="预设名称">',function(){
var n=document.getElementById('qaq-preset-name').value.trim();
if(!n){toast('请输入名称');return}
ps[type].push({name:n,data:data});
savePresets(ps);toast('已保存预设：'+n);
});
}
function loadPreset(type){
var ps=getPresets();
if(!ps[type]||!ps[type].length){toast('暂无预设');return}
var h='<div style="display:flex;flex-direction:column;gap:8px">'+ps[type].map(function(pr,i){
return '<div style="display:flex;align-items:center;gap:8px;padding:8px;border:1px solid #ddd;border-radius:8px"><span style="flex:1">'+escHTML(pr.name)+'</span><button class="qaq-modal-btn qaq-modal-btn-confirm" style="flex:0;padding:0 12px;height:30px;font-size:11px" data-pi="'+i+'">导入</button></div>';
}).join('')+'</div>';
showHtmlModal('导入预设',h,null,{afterRender:function(){
document.querySelectorAll('[data-pi]').forEach(function(b){b.onclick=function(){
var idx=parseInt(this.dataset.pi);
var pr=ps[type][idx];if(!pr)return;
var cd=getChatData();var c=cd.contacts[activeContactId]||{};
var s=c.configs||{};
var p=cd.myProfile;
if(type==='api'){s.o_api_url=pr.data.url;s.o_api_key=pr.data.key;s.o_api_model=pr.data.model}
else if(type==='voice'){s.o_voice_url=pr.data.url;s.o_voice_key=pr.data.key;s.o_voice_model=pr.data.model;s.o_voice_speed=pr.data.speed}
else if(type==='img'){s.o_img_url=pr.data.url;s.o_img_key=pr.data.key;s.o_img_model=pr.data.model;s.o_img_prompt_pos=pr.data.pos;s.o_img_prompt_neg=pr.data.neg}
else if(type==='persona'){p.persona=pr.data.persona}
else if(type==='css_global'){s.u_global_css=pr.data.css}
else if(type==='css_bubble'){s.u_bubble_css=pr.data.css}
c.configs=s;cd.myProfile=p;saveChatData(cd);
toast('已导入：'+pr.name);
document.getElementById('qaq-chat-modal-ccl').click();
renderSettings();
}});
}});
}
function resetPreset(type){
var cd=getChatData();var c=cd.contacts[activeContactId]||{};
var s=c.configs||{};
if(type==='css_global')s.u_global_css='/* 示例: body{background:#f0f0f0} */';
else if(type==='css_bubble')s.u_bubble_css='/* 示例: box-shadow:0 2px 8px rgba(0,0,0,0.1) */';
c.configs=s;saveChatData(cd);
toast('已重置');renderSettings();
}
function selectTransPos(){
var opts=[{l:'气泡内下方',v:'in_bottom'},{l:'气泡内上方',v:'in_top'},{l:'气泡外下方',v:'out_bottom'},{l:'气泡外上方',v:'out_top'},{l:'隐藏',v:'hide'}];
var h='<div style="display:flex;flex-direction:column;gap:8px">'+opts.map(function(o){
return '<button class="qaq-modal-btn qaq-modal-btn-confirm" data-val="'+o.v+'">'+o.l+'</button>';
}).join('')+'</div>';
showHtmlModal('翻译显示模式',h,null,{afterRender:function(){
document.querySelectorAll('[data-val]').forEach(function(b){b.onclick=function(){
var inp=document.getElementById('chs_o_trans_pos');
var btn=document.getElementById('chs_o_trans_pos_btn');
if(inp)inp.value=this.dataset.val;
if(btn)btn.textContent=getTransLabel(this.dataset.val);
document.getElementById('qaq-chat-modal-ccl').click();
}});
}});
}
function selectVoiceModel(){
var opts=['speech-02-hd','speech-02-turbo','speech-2.8-hd','speech-2.8-turbo','speech-2.6-hd','speech-2.6-turbo','speech-01-turbo'];
var h='<div style="display:flex;flex-direction:column;gap:8px">'+opts.map(function(o){
return '<button class="qaq-modal-btn qaq-modal-btn-confirm" data-val="'+o+'">'+o+'</button>';
}).join('')+'</div>';
showHtmlModal('语音模型',h,null,{afterRender:function(){
document.querySelectorAll('[data-val]').forEach(function(b){b.onclick=function(){
var inp=document.getElementById('chs_o_voice_model');
var btn=document.getElementById('chs_o_voice_model_btn');
if(inp)inp.value=this.dataset.val;
if(btn)btn.textContent=this.dataset.val;
document.getElementById('qaq-chat-modal-ccl').click();
}});
}});
}
function selectTheme(){
var opts=[{l:'暖阳',v:'default'},{l:'冷雾',v:'cool'},{l:'夜幕',v:'dark'}];
var h='<div style="display:flex;flex-direction:column;gap:8px">'+opts.map(function(o){
return '<button class="qaq-modal-btn qaq-modal-btn-confirm" data-val="'+o.v+'">'+o.l+'</button>';
}).join('')+'</div>';
showHtmlModal('主题颜色',h,null,{afterRender:function(){
document.querySelectorAll('[data-val]').forEach(function(b){b.onclick=function(){
var inp=document.getElementById('chs_u_theme');
var btn=document.getElementById('chs_u_theme_btn');
if(inp)inp.value=this.dataset.val;
if(btn)btn.textContent=getThemeLabel(this.dataset.val);
document.getElementById('qaq-chat-modal-ccl').click();
}});
}});
}
function selectAvaShow(){
var opts=[{l:'全显示',v:'all'},{l:'全隐藏',v:'hide_all'},{l:'首条',v:'first'},{l:'末条',v:'last'}];
var h='<div style="display:flex;flex-direction:column;gap:8px">'+opts.map(function(o){
return '<button class="qaq-modal-btn qaq-modal-btn-confirm" data-val="'+o.v+'">'+o.l+'</button>';
}).join('')+'</div>';
showHtmlModal('头像显示',h,null,{afterRender:function(){
document.querySelectorAll('[data-val]').forEach(function(b){b.onclick=function(){
var inp=document.getElementById('chs_u_avatar_show');
var btn=document.getElementById('chs_u_avatar_show_btn');
if(inp)inp.value=this.dataset.val;
if(btn)btn.textContent=getAvaLabel(this.dataset.val);
document.getElementById('qaq-chat-modal-ccl').click();
}});
}});
}
function selectTimePos(){
var opts=[{l:'气泡上方',v:'top'},{l:'气泡下方',v:'bottom'},{l:'头像上方',v:'avatar_top'},{l:'头像下方',v:'avatar_bottom'},{l:'气泡外侧',v:'bubble_outer'},{l:'气泡内侧',v:'bubble_inner'}];
var h='<div style="display:flex;flex-direction:column;gap:8px">'+opts.map(function(o){
return '<button class="qaq-modal-btn qaq-modal-btn-confirm" data-val="'+o.v+'">'+o.l+'</button>';
}).join('')+'</div>';
showHtmlModal('时间戳位置',h,null,{afterRender:function(){
document.querySelectorAll('[data-val]').forEach(function(b){b.onclick=function(){
var inp=document.getElementById('chs_u_time_pos');
var btn=document.getElementById('chs_u_time_pos_btn');
if(inp)inp.value=this.dataset.val;
if(btn)btn.textContent=getTimePosLabel(this.dataset.val);
document.getElementById('qaq-chat-modal-ccl').click();
}});
}});
}
function selectTimeFmt(){
var opts=['HH:mm','HH:mm:ss','MM-DD HH:mm'];
var h='<div style="display:flex;flex-direction:column;gap:8px">'+opts.map(function(o){
return '<button class="qaq-modal-btn qaq-modal-btn-confirm" data-val="'+o+'">'+o+'</button>';
}).join('')+'</div>';
showHtmlModal('时间格式',h,null,{afterRender:function(){
document.querySelectorAll('[data-val]').forEach(function(b){b.onclick=function(){
var inp=document.getElementById('chs_u_time_fmt');
var btn=document.getElementById('chs_u_time_fmt_btn');
if(inp)inp.value=this.dataset.val;
if(btn)btn.textContent=this.dataset.val;
document.getElementById('qaq-chat-modal-ccl').click();
}});
}});
}
function selectMenuPos(){
var opts=[{l:'输入框上方',v:'top'},{l:'输入框下方',v:'bottom'}];
var h='<div style="display:flex;flex-direction:column;gap:8px">'+opts.map(function(o){
return '<button class="qaq-modal-btn qaq-modal-btn-confirm" data-val="'+o.v+'">'+o.l+'</button>';
}).join('')+'</div>';
showHtmlModal('菜单位置',h,null,{afterRender:function(){
document.querySelectorAll('[data-val]').forEach(function(b){b.onclick=function(){
var inp=document.getElementById('chs_u_menu_pos');
var btn=document.getElementById('chs_u_menu_pos_btn');
if(inp)inp.value=this.dataset.val;
if(btn)btn.textContent=this.dataset.val==='top'?'输入框上方':'输入框下方';
document.getElementById('qaq-chat-modal-ccl').click();
}});
}});
}
function selectDndTime(){
var h='<div style="display:flex;flex-direction:column;gap:10px"><label style="font-size:12px;color:#888">开始时间</label><input type="time" class="qaq-modal-input" id="qaq-dnd-start"><label style="font-size:12px;color:#888">结束时间</label><input type="time" class="qaq-modal-input" id="qaq-dnd-end"><div style="font-size:11px;color:#999">留空则需手动关闭勿扰</div></div>';
showHtmlModal('勿扰时间段',h,function(){
var s=document.getElementById('qaq-dnd-start').value;
var e=document.getElementById('qaq-dnd-end').value;
var val=s&&e?(s+'-'+e):'';
var inp=document.getElementById('chs_x_dnd_time');
var btn=document.getElementById('chs_x_dnd_time_btn');
if(inp)inp.value=val;
if(btn)btn.textContent=val||'点击设置';
});
}
function importHistory(){
var inp=document.createElement('input');inp.type='file';inp.accept='.json';
inp.onchange=function(){
if(!this.files||!this.files[0])return;
var reader=new FileReader();
reader.onload=function(e){
try{
var d=JSON.parse(e.target.result);
if(d.messages&&Array.isArray(d.messages)){
var cd=getChatData();
cd.messages[activeContactId]=d.messages;
saveChatData(cd);renderMessages();toast('导入成功');
}else{toast('文件格式错误')}
}catch(err){toast('导入失败')}
};
reader.readAsText(this.files[0]);
};
inp.click();
}
function exportHistory(){
var cd=getChatData();
var msgs=cd.messages[activeContactId]||[];
var blob=new Blob([JSON.stringify({messages:msgs},null,2)],{type:'application/json'});
var url=URL.createObjectURL(blob);
var a=document.createElement('a');
a.href=url;a.download='chat_'+activeContactId+'_'+Date.now()+'.json';
a.click();URL.revokeObjectURL(url);toast('已导出');
}
function clearHistory(){
showHtmlModal('清除聊天记录','<p style="font-size:13px">确认清除所有聊天记录？此操作不可恢复。</p>',function(){
var cd=getChatData();
cd.messages[activeContactId]=[];
saveChatData(cd);renderMessages();toast('已清除');
});
}
function saveSettings(){
function vx(id,isT){var x=document.getElementById('chs_'+id);return x?(isT?x.classList.contains('qaq-toggle-on'):x.value):undefined}
function vxSlider(id){var x=document.getElementById('chs_'+id+'_val');return x?parseFloat(x.value):undefined}
var cd=getChatData();var c=cd.contacts[activeContactId]||{};
var s=c.configs||{};var p=cd.myProfile;
// 对方设置
var oAva=vx('o_avatar');if(oAva!==undefined)c.avatar=oAva;
var oNick=vx('o_nickname');if(oNick!==undefined)c.nickname=oNick;
var oRmk=vx('o_remark');if(oRmk!==undefined)c.remark=oRmk;
s.op_persona=vx('o_persona');
s.o_worldbook=vx('o_worldbook');
s.o_emoji=vx('o_emoji',true);
s.o_trans_enable=vx('o_trans_enable',true);
s.op_trans_pos=vx('o_trans_pos');
s.mem_max=parseInt(vx('o_mem_max'))||20;
s.o_mem_summary=vx('o_mem_summary',true);
s.o_mem_summary_cnt=parseInt(vx('o_mem_summary_cnt'))||50;
s.o_api_url=vx('o_api_url');
s.o_api_key=vx('o_api_key');
s.o_api_model=vx('o_api_model');
s.o_voice_url=vx('o_voice_url');
s.o_voice_key=vx('o_voice_key');
s.o_voice_model=vx('o_voice_model');
var vSpeed=vxSlider('o_voice_speed');if(vSpeed!==undefined)s.o_voice_speed=vSpeed;
s.o_img_url=vx('o_img_url');
s.o_img_key=vx('o_img_key');
s.o_img_model=vx('o_img_model');
s.o_img_prompt_pos=vx('o_img_prompt_pos');
s.o_img_prompt_neg=vx('o_img_prompt_neg');
// 我方设置
p.avatar=vx('m_avatar');
p.nickname=vx('m_nickname');
p.trueName=vx('m_truename');
p.persona=vx('m_persona');
// 美化设置
s.ui_my_bubble=vx('u_my_bubble');
s.ui_other_bubble=vx('u_other_bubble');
s.u_theme=vx('u_theme');
s.ui_avatar_show=vx('u_avatar_show');
s.ui_show_time=vx('u_show_time',true)?'true':'false';
s.u_time_pos=vx('u_time_pos');
s.u_time_fmt=vx('u_time_fmt');
s.ui_hide_rbtn=vx('u_hide_reply',true);
s.ui_hide_mbtn=vx('u_hide_menu',true);
s.u_menu_pos=vx('u_menu_pos');
var aRad=vxSlider('u_avatar_radius');if(aRad!==undefined)s.ui_avatar_radius=aRad;
var bRad=vxSlider('u_bubble_radius');if(bRad!==undefined)s.ui_bubble_radius=bRad;
s.u_font_url=vx('u_font_url');
var fSize=vxSlider('u_font_size');if(fSize!==undefined)s.ui_font_size=fSize+'px';
s.u_font_color=vx('u_font_color');
s.u_global_css=vx('u_global_css');
s.u_bubble_css=vx('u_bubble_css');
// 其他
s.x_dnd=vx('x_dnd',true);
s.x_dnd_time=vx('x_dnd_time');
c.blocked=vx('x_blocked',true);
var wasDel=c.deleted;
c.deleted=vx('x_deleted',true);
if(!wasDel&&c.deleted){
showHtmlModal('确认删除','<p style="font-size:13px">确认删除「'+escHTML(c.remark||c.nickname)+'」及所有聊天记录？此操作不可恢复。</p>',function(){
delete cd.messages[activeContactId];
saveChatData(cd);toast('已删除');
document.getElementById('qaq-chat-set-back').click();
document.getElementById('qaq-chat-win-back').click();
renderContactList();
},{onCancel:function(){c.deleted=false}});
return;
}
c.configs=s;cd.myProfile=p;saveChatData(cd);
// 应用主题
var frame=document.querySelector('.qaq-phone-frame');
if(frame){
frame.classList.remove('qaq-theme-dark','qaq-theme-cool');
if(s.u_theme==='dark')frame.classList.add('qaq-theme-dark');
else if(s.u_theme==='cool')frame.classList.add('qaq-theme-cool');
}
// 应用字体
if(s.u_font_url){
var ff=new FontFace('ChatCustomFont','url('+s.u_font_url+')');
ff.load().then(function(loaded){
document.fonts.add(loaded);
var ml=document.getElementById('qaq-chat-msg-list');
if(ml)ml.style.fontFamily='ChatCustomFont,sans-serif';
}).catch(function(){toast('字体加载失败')});
}
// 应用CSS
var gStyle=document.getElementById('qaq-chat-global-style');
if(!gStyle){gStyle=document.createElement('style');gStyle.id='qaq-chat-global-style';document.head.appendChild(gStyle)}
gStyle.textContent=s.u_global_css||'';
var bStyle=document.getElementById('qaq-chat-bubble-style');
if(!bStyle){bStyle=document.createElement('style');bStyle.id='qaq-chat-bubble-style';document.head.appendChild(bStyle)}
bStyle.textContent='.qaq-chat-bubble{'+(s.u_bubble_css||'')+'}';
toast('设置已保存');
applySettingsLive();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bindPageEvents);else bindPageEvents();
})();