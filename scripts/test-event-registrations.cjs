const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
const moduleValue = { exports: {} }
new Function('module','exports','require',ts.transpileModule(fs.readFileSync('src/lib/christmas-tournaments.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(moduleValue,moduleValue.exports,name => { if(name !== '@/lib/enrollment-payment') return require(name); const policy={exports:{}};new Function('module','exports',ts.transpileModule(fs.readFileSync('src/lib/enrollment-payment.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(policy,policy.exports);return policy.exports })
const {tournamentQuote:q,tournamentRegistrationSchema:s}=moduleValue.exports
assert.equal(Object.keys(moduleValue.exports.legacyChristmasTournamentTargets).length,3,'Legacy Christmas cards route to the full campaign')
assert.equal(q(['champions'],false).total,65)
assert.equal(q(['231'],false).total,120)
assert.equal(q(['231','costa-brava'],false).total,175)
assert.equal(q(['231','champions','costa-brava'],false).total,220)
assert.equal(q(['231','champions','costa-brava'],true).total,165)
assert.equal(q(['231','champions'],true).reviewCompatibility,true)
assert.throws(()=>q(['231','231'],true))
assert.throws(()=>q([],true))
assert.throws(()=>q(['fake'],true))
const valid={request_id:'11111111-1111-4111-8111-111111111111',child_id:null,child_name:'Jugador Prueba',birth_date:'2016-01-01',guardian_name:'Tutor Prueba',phone:'654123456',club:'Sin equipo',coach:'',category:'S11',level:'primera',tournaments:['231','champions'],owns_kit:true,shirt_size:'',shorts_size:'',socks_size:'',champions_clothing:false,image_consent:false,privacy_consent:true,terms_consent:true,participation_consent:true,notes:''}
assert.equal(s.safeParse(valid).success,true,'Primera overlap is reviewed, not blocked')
assert.equal(s.safeParse({...valid,image_consent:false}).success,true,'Image refusal is allowed')
assert.equal(s.safeParse({...valid,privacy_consent:false}).success,false)
assert.equal(s.safeParse({...valid,owns_kit:false}).success,false)
assert.equal(s.safeParse({...valid,owns_kit:false,shirt_size:'M',shorts_size:'M',socks_size:'35-38'}).success,true)
assert.equal(s.safeParse({...valid,category:'S7'}).success,false)
assert.equal(s.safeParse({...valid,birth_date:'2016-02-31'}).success,false)
assert.equal(s.safeParse({...valid,tournaments:['champions'],owns_kit:false}).success,true)
console.log('PASS: tournament packs, one kit per child, Champions exemption, overlap review, consents, dates and categories')

for(const status of ['awaiting_payment','proof_review','confirmed']) {
 assert.equal(moduleValue.exports.isCurrentTournamentRegistration(status,'christmas-2026','2026-12-01'),true)
 assert.equal(moduleValue.exports.isCurrentTournamentRegistration(status,'christmas-2026','2027-01-04'),false)
}
for(const status of ['requested','cancelled'])assert.equal(moduleValue.exports.isAcceptedTournamentRegistration(status),false)
assert.equal(moduleValue.exports.isCurrentTournamentRegistration('confirmed','unknown','2026-12-01'),false)
