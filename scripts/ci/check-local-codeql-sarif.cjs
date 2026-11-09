'use strict';
// CodeQL CLI/SARIF post-analysis quality gate for a stacked PR while GitHub
// Default Setup owns the server-side code-scanning upload. Do not waive findings.
// Reject missing/corrupt SARIF, fail on high/critical security results, preserve
// evidence as an artifact. No repository or network modifications.
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=process.argv[2];
if(!root)throw Error('Provide CodeQL SARIF output directory');
function sarifFiles(directory){
    return fs.readdirSync(directory,{withFileTypes:true}).flatMap(entry=>{
        const p=path.join(directory,entry.name);
        if(entry.isSymbolicLink())throw Error('Refuse symlink in SARIF directory: '+p);
        return entry.isDirectory()?sarifFiles(p):p.endsWith('.sarif')?[p]:[];
    });
}
const files=sarifFiles(root);
assert.ok(files.length>=1,'No CodeQL SARIF files emitted; analysis is not verified');
const summary={sarifFiles:files.length,runs:0,findings:0,highCritical:0,reported:[]};
for(const file of files){
    const sarif=JSON.parse(fs.readFileSync(file,'utf8'));
    assert.equal(sarif.version,'2.1.0','Require SARIF 2.1.0');
    for(const run of sarif.runs||[]){
        assert.match(run.tool?.driver?.name||'',/CodeQL/i,'SARIF must originate from CodeQL');
        summary.runs++;
        const rules=run.tool?.driver?.rules||[];
        const byId=new Map(rules.map(rule=>[rule.id,rule]));
        for(const result of run.results||[]){
            summary.findings++;
            const rule=(Number.isInteger(result.ruleIndex)?rules[result.ruleIndex]:null)||byId.get(result.ruleId)||{};
            const raw=result.properties?.securitySeverity??rule.properties?.securitySeverity;
            const number=Number(raw);
            const high=Number.isFinite(number)?number>=7.0:result.level==='error';
            if(high){
                summary.highCritical++;
                const loc=result.locations?.[0]?.physicalLocation;
                const item={
                    ruleId:result.ruleId||rule.id||'unknown',
                    securitySeverity:raw||null,
                    level:result.level||null,
                    file:loc?.artifactLocation?.uri||null,
                    line:loc?.region?.startLine||null,
                    message:(result.message?.text||'').slice(0,240)
                };
                summary.reported.push(item);
                console.error('CODEQL_HIGH_CRITICAL '+JSON.stringify(item));
            }
        }
    }
}
assert.ok(summary.runs>=1,'No CodeQL analysis runs in SARIF');
fs.mkdirSync('test-reports',{recursive:true});
fs.writeFileSync('test-reports/pinned-codeql-summary.json',
    JSON.stringify(summary,null,2)+'\n');
console.log('CODEQL_LOCAL_SARIF_SUMMARY '+JSON.stringify({
    sarifFiles:summary.sarifFiles,runs:summary.runs,findings:summary.findings,
    highCritical:summary.highCritical
}));
if(summary.highCritical>0)throw Error('CodeQL found high/critical security alerts; not allowed to merge');
