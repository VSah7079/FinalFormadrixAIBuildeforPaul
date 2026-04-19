const n="ps_audit_log_v1";function a(){try{const t=localStorage.getItem(n);return t?JSON.parse(t):[]}catch{return[]}}function c(t){const o=a(),e={...t,id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),timestamp:new Date().toISOString()},r=[...o,e];localStorage.setItem(n,JSON.stringify(r))}export{c as l};
//# sourceMappingURL=auditLogger-DDmM7OGi.js.map
