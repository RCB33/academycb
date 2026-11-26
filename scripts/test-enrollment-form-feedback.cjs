const assert = require('node:assert/strict'), fs = require('node:fs'), ts = require('typescript')
const realFormData = global.FormData
let slots = [], cursor = 0, posts = [], clears = 0, response
const hooks = {
 useState(v) { const i=cursor++; if(!(i in slots))slots[i]=typeof v==='function'?v():v;return[slots[i],v=>slots[i]=typeof v==='function'?v(slots[i]):v] },
 useRef(v) { const i=cursor++;if(!(i in slots))slots[i]={current:v};return slots[i] }, useEffect() {},
}
const cache={}
function load(file) { if(cache[file])return cache[file];const m={exports:{}};new Function('module','exports','require',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText)(m,m.exports,n=>{
 if(n==='react')return hooks
 if(n==='react/jsx-runtime')return require(n)
 if(n==='next/navigation')return{useRouter:()=>({})}
 if(n==='@/lib/i18n/client')return{useT:()=>x=>x}
 if(n==='@/components/forms/form-draft')return{FormDraft:'draft',useDraftState:(_key,v)=>hooks.useState(v),useFormDraft:()=>({clear(){clears++}})}
 if(n==='@/lib/form-validation')return load('src/lib/form-validation.ts')
 if(n==='@/lib/combined-enrollment')return{combinedFormData:fd=>Object.fromEntries(fd),combinedQuote:()=>({})}
 return new Proxy({}, {get:(_t,k)=>String(k)})
 });return cache[file]=m.exports }
function find(node,p){if(!node||typeof node!=='object')return null;if(p(node))return node;for(const c of [node.props?.children].flat(Infinity)){const r=find(c,p);if(r)return r}return null}
const Form=load('src/app/(public)/inscripcion/enrollment-form.tsx').default
let props={academyOffer:{},campuses:[],tournaments:{},initialService:'academy',initialActivityId:''}
function render(){cursor=0;const wrapper=Form(props);return wrapper.props.children.type(wrapper.props.children.props)}
const validator=load('src/lib/form-validation.ts')
function field(label,valid=false,player='Jugador 1') {return{willValidate:true,validity:{valid},validationMessage:'Completa este campo.',getAttribute:()=>label,closest:()=>({getAttribute:()=>player}),focus(o){this.focused=o},scrollIntoView(o){this.scrolled=o}}}
;(async()=>{
 const birth=field('Día de nacimiento'),date=field('Fecha de incorporación'),hidden=field('hidden');hidden.willValidate=false
 const form={elements:[birth,date,hidden],fd:new realFormData()};form.fd.set('child_name','Fixture')
 const fields=validator.invalidFormFields(form);assert.equal(fields.length,2);assert.equal(fields[0].label,'Jugador 1 · Día de nacimiento')
 validator.focusInvalidField(birth);assert.equal(birth.focused.preventScroll,true);assert.equal(birth.scrolled.block,'center')
 global.FormData=function(f){if(f.fail)throw Error('Serialization failed');return f.fd}
 global.fetch=async(_url,options)=>{posts.push(JSON.parse(options.body));return await response}
 let tree=render(),submit=find(tree,n=>n.type==='form').props.onSubmit
 assert.equal(find(tree,n=>n.type==='form').props.noValidate,true,'Always reach visible validation before network')
 await submit({preventDefault(){},currentTarget:form});tree=render();assert.equal(posts.length,0);assert(find(tree,n=>n.props?.role==='alert'),'Persistent summary is rendered')
 birth.validity.valid=true;date.validity.valid=true
 let resolve;response=new Promise(r=>resolve=r);submit=find(tree,n=>n.type==='form').props.onSubmit
 const first=submit({preventDefault(){},currentTarget:form});const second=submit({preventDefault(){},currentTarget:form});assert.equal(posts.length,1,'Double tap is locked before rerender')
 resolve({json:async()=>({success:false,error:'Revisa el grupo.'})});await Promise.all([first,second]);tree=render();assert.equal(clears,0);assert(find(tree,n=>n.props?.role==='alert'&&n.props.children==='Revisa el grupo.'))
 form.fail=true;await find(tree,n=>n.type==='form').props.onSubmit({preventDefault(){},currentTarget:form});tree=render();assert.equal(find(tree,n=>n.props?.type==='submit').props.disabled,false,'Preparation failure releases button');assert.equal(posts.length,1)
 form.fail=false;response=Promise.resolve({json:async()=>({success:true,message:'Solicitud de prueba recibida'})});await find(tree,n=>n.type==='form').props.onSubmit({preventDefault(){},currentTarget:form});tree=render();assert.equal(clears,1);assert(!find(tree,n=>n.type==='form'));assert(find(tree,n=>n.props?.role==='status'))
 console.log('PASS: persistent required-field feedback, birth/date controls, disabled fields excluded, field focus below header, double taps, server errors, preparation failure, preserved draft and visible success. No network.')
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>{global.FormData=realFormData})
