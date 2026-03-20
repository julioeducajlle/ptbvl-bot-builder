// ===== Unique ID Generator for Blockly Blocks & Variables =====

let counter = 0;

function randomChars(len: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let r = '';
  for (let i = 0; i < len; i++) {
    r += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return r;
}

export function newBlockId(): string {
  counter++;
  return `PB${Date.now().toString(36).slice(-5)}${counter.toString(36)}${randomChars(6)}`;
}

export function newVarId(): string {
  counter++;
  return `PV${Date.now().toString(36).slice(-5)}${counter.toString(36)}${randomChars(6)}`;
}

export function resetIdCounter(): void {
  counter = 0;
}
