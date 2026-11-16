export function maskName(name: string): string {
  const first = name.trim().split(/\s+/)[0] ?? name;
  return `${first} ***`;
}

export function maskPhone(phone: string | null): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  const ddd = digits.slice(0, 2);
  return `(${ddd}) ****-****`;
}
