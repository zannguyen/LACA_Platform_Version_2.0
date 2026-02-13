import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import InputField from "../ui/InputField";
import GradientButton from "../ui/GradientButton";
import { authApi } from "../../api/authApi";
import "./LoginForm.css";

const LoginForm = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // ✅ clear sạch để khỏi dính cache cũ
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      localStorage.removeItem("authToken");

      const data = await authApi.login({ email, password });
      console.log("LOGIN RESPONSE:", data);

      if (data?.success === false) {
        throw new Error(data?.message || "Đăng nhập thất bại");
      }

      const token = data?.accessToken || data?.token;
      if (!token) throw new Error("Không nhận được accessToken từ server");

      localStorage.setItem("token", token);
      localStorage.setItem("authToken", token);

      const user = data?.user;
      if (user) localStorage.setItem("user", JSON.stringify(user));

      const role = user?.role;
      console.log("ROLE FROM LOGIN:", role);

      // ✅ nếu backend chưa trả role -> báo lỗi rõ luôn
      if (!role) {
        throw new Error(
          "Backend login chưa trả field user.role. Hãy sửa auth.control.js để trả role.",
        );
      }

      if (role === "admin") navigate("/admin");
      else navigate("/home");
    } catch (err) {
      console.error("LOGIN ERROR:", err);
      setError(err?.message || "Đăng nhập thất bại. Vui lòng thử lại.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form className="login-form" onSubmit={handleSubmit}>
      {error && <div className="error-message">{error}</div>}

      <div className="field-row">
        <label className="field-label" htmlFor="login-email">
          Email
        </label>
        <div className="field-control">
          <InputField
            id="login-email"
            label=""
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="field-row">
        <label className="field-label" htmlFor="login-password">
          Password
        </label>
        <div className="field-control">
          <InputField
            id="login-password"
            label=""
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="login-options">
        <label className="checkbox-container">
          <input type="checkbox" />
          <span>Remember me</span>
        </label>

        <Link to="/forgot-password" className="forgot-link">
          Forgot password?
        </Link>
      </div>

      <div className="login-actions">
        <GradientButton
          text={isLoading ? "Loading..." : "LOG IN"}
          type="submit"
          disabled={isLoading}
        />
      </div>

      <p className="footer-text">
        Don&apos;t have an account?
        <Link to="/register" className="link-bold">
          {" "}
          Sign Up
        </Link>
      </p>
    </form>
  );
};

export default LoginForm;
