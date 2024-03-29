// Browser DOM utilities.

// Shows or hides a DOM element.
// If the element is a form control with associated label elements, the label elements are also affected.
export function showElement (elementId: string, visible = true) {
   const element = document.getElementById(elementId);
   if (!element) {
      return; }
   element.classList.toggle("hidden", !visible);
   const labels = (<HTMLInputElement>element).labels;
   if (labels) {
      for (const labelElement of labels) {
         labelElement.classList.toggle("hidden", !visible); }}}

export function getInputElement (elementId: string) : HTMLInputElement {
   const e = <HTMLInputElement>document.getElementById(elementId);
   if (!e) {
      throw new Error("No HTML element found with ID \"" + elementId + "\"."); }
   return e; }

function getInputElementLabelText (e: HTMLInputElement) : string {
   let s = (e.labels && e.labels.length > 0) ? e.labels[0].textContent ?? "" : "";
   if (s.length > 0 && s[s.length - 1] == ":") {
      s = s.substring(0, s.length - 1); }
   return s; }

function checkValidity (e: HTMLInputElement) {
   if (!e.checkValidity()) {
      const labelText = getInputElementLabelText(e);
      const info = labelText ? ` with label "${labelText}"` : e.id ? ` with ID "${e.id}"` : "";
      throw new Error("Invalid value in input field" + info + "."); }}

export function getValue (elementId: string) : string {
   const e = getInputElement(elementId);
   checkValidity(e);
   return e.value; }

export function setValue (elementId: string, newValue: string) {
   getInputElement(elementId).value = newValue; }

export function getValueNum (elementId: string, defaultValue: number = NaN) : number {
   const e = getInputElement(elementId);
   checkValidity(e);
   if (e.value == "") {
      return defaultValue; }
   return e.valueAsNumber; }

export function setValueNum (elementId: string, newValue: number, emptyValue: number = NaN) {
   const e = getInputElement(elementId);
   if (isNaN(newValue) || newValue == emptyValue) {
      e.value = ""; }
    else {
      e.valueAsNumber = newValue; }}

export function getChecked (elementId: string) : boolean {
   return getInputElement(elementId).checked; }

export function setChecked (elementId: string, newValue: boolean) {
   getInputElement(elementId).checked = newValue; }

export function setClass (elementId: string, className: string, enable = true) {
   const e = document.getElementById(elementId);
   if (!e) {
      return; }
   e.classList.toggle(className, enable); }
