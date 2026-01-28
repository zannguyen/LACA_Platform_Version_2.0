export const maskEmail = (email) => {
  if (!email) return "";
  const [name, domain] = email.split("@");
  return name.slice(0, 2) + "***@" + domain;
};
