import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import InputField from "../ui/InputField";
import GradientButton from "../ui/GradientButton";
import { authApi } from "../../api/authApi";
import OtpForm from "./OtpForm";
import "./RegisterForm.css";

const RegisterForm = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [otpToken, setOtpToken] = useState("");
  const [showOtpForm, setShowOtpForm] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      setLoading(true);

      const payload = {
        fullname: formData.fullName,
        username: formData.username,
        email: formData.email,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
      };

      const res = await authApi.register(payload);

      console.log("Register success:", res);

      if (res.data && res.data.otpToken) {
        setOtpToken(res.data.otpToken);
        setShowOtpForm(true);
      } else {
        setError("Server did not return OTP token. Please try again.");
      }
    } catch (err) {
      setError(err.message || "Registration failed. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSuccess = (accessToken) => {
    console.log("OTP verified. Access token:", accessToken);
    alert("Registration complete!");
    navigate("/");
  };

  if (showOtpForm) {
    return (
      <OtpForm
        email={formData.email}
        otpToken={otpToken}
        onOtpSuccess={handleOtpSuccess}
      />
    );
  }

  return (
    <form className="register-form" onSubmit={handleSubmit}>
      {error && <div className="error-message">{error}</div>}

      <div className="field-row">
        <label className="field-label" htmlFor="register-fullname">
          Full Name
        </label>
        <div className="field-control">
          <InputField
            id="register-fullname"
            type="text"
            placeholder="Full Name"
            value={formData.fullName}
            onChange={(e) =>
              setFormData({ ...formData, fullName: e.target.value })
            }
            required
          />
        </div>
      </div>

      <div className="field-row">
        <label className="field-label" htmlFor="register-username">
          Username
        </label>
        <div className="field-control">
          <InputField
            id="register-username"
            type="text"
            placeholder="Username"
            value={formData.username}
            onChange={(e) =>
              setFormData({ ...formData, username: e.target.value })
            }
            required
          />
        </div>
      </div>

      <div className="field-row">
        <label className="field-label" htmlFor="register-email">
          Email
        </label>
        <div className="field-control">
          <InputField
            id="register-email"
            type="email"
            placeholder="Email"
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
            required
          />
        </div>
      </div>

      <div className="field-row">
        <label className="field-label" htmlFor="register-password">
          Password
        </label>
        <div className="field-control">
          <InputField
            id="register-password"
            type="password"
            placeholder="Password"
            value={formData.password}
            onChange={(e) =>
              setFormData({ ...formData, password: e.target.value })
            }
            required
          />
        </div>
      </div>

      <div className="field-row">
        <label className="field-label" htmlFor="register-confirm">
          Confirm
        </label>
        <div className="field-control">
          <InputField
            id="register-confirm"
            type="password"
            placeholder="Confirm Password"
            value={formData.confirmPassword}
            onChange={(e) =>
              setFormData({ ...formData, confirmPassword: e.target.value })
            }
            required
          />
        </div>
      </div>

      <div className="register-actions">
        <GradientButton
          text={loading ? "REGISTERING..." : "GET STARTED"}
          type="submit"
          disabled={loading}
        />
      </div>

      <p className="footer-text">
        Already have an account?
        <Link to="/login" className="link-bold">
          {" "}
          Log in
        </Link>
      </p>
    </form>
  );
};

export default RegisterForm;
