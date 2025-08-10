export function set (usp: URLSearchParams, parmName: string, parmValue: string|undefined, defaultValue = "") {
   if (!parmValue || parmValue == defaultValue) {
      return; }
   usp.set(parmName, parmValue); }

export function setNum (usp: URLSearchParams, parmName: string, parmValue: number, defaultValue = NaN) {
   if (isNaN(parmValue) || parmValue == defaultValue) {
      return; }
   usp.set(parmName, String(parmValue)); }

export function setBoolean (usp: URLSearchParams, parmName: string, parmValue: boolean, defaultValue?: boolean) {
   if (parmValue == defaultValue) {
      return; }
   usp.set(parmName, parmValue ? "1" : "0"); }

export function get (usp: URLSearchParams, parmName: string, defaultValue: string) : string;
export function get (usp: URLSearchParams, parmName: string, defaultValue?: string) : string | undefined;
export function get (usp: URLSearchParams, parmName: string, defaultValue?: string) : string | undefined {
   return usp.get(parmName) ?? defaultValue; }

export function getNum (usp: URLSearchParams, parmName: string, defaultValue = NaN) : number {
   const s = usp.get(parmName);
   if (!s) {
      return defaultValue; }
   const v = Number(s);
   if (isNaN(v)) {
      throw new Error(`Invalid value "${s}" for numeric URL parameter "${parmName}".`); }
   return v; }

export function getBoolean (usp: URLSearchParams, parmName: string, defaultValue: boolean) : boolean {
   const s = usp.get(parmName);
   if (!s) {
      return defaultValue; }
   switch (s) {
      case "1": case "true": case "yes": return true;
      case "0": case "false": case "no": return false;
      default: {
         throw new Error(`Invalid value "${s}" for boolean URL parameter "${parmName}".`); }}}
