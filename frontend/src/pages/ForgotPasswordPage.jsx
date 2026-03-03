import ForgotPassword from "../components/auth/ForgotPassword";
import "../App.css";

const ForgotPasswordPage = () => {
  return (
    <div className="auth-page">
      <div className="auth-form">
        <ForgotPassword />
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
