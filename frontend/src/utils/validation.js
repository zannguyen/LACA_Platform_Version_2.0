export const validateEmail = (email) => {
  if (!email) return "Email không được để trống";
  const regex = /^\S+@\S+\.\S+$/;
  if (!regex.test(email)) return "Email không hợp lệ";
  return "";
};

export const validatePassword = (password) => {
  if (!password) return "Mật khẩu không được để trống";
  if (password.length < 6) return "Mật khẩu tối thiểu 6 ký tự";
  return "";
};
