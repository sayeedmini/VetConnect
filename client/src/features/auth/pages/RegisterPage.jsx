import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthSession } from '../context/AuthSessionContext';
import { registerUser } from '../services/authApi';

function RegisterPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from || '/vets';
  const { isLoggedIn, isReady } = useAuthSession();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    contactInfo: '',
    role: 'petOwner',
    password: '',
    confirmPassword: '',
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isReady && isLoggedIn) {
      navigate(redirectTo, { replace: true });
    }
  }, [isLoggedIn, isReady, navigate, redirectTo]);

  const inputStyle = {
    width: '100%',
    padding: '12px',
    borderRadius: '10px',
    border: '1px solid #ccc',
    outline: 'none',
    fontSize: '14px',
    color: '#111827',
    caretColor: '#111827',
    WebkitTextFillColor: '#111827',
    backgroundColor: '#fff',
    boxSizing: 'border-box',
  };

  const labelStyle = {
    display: 'block',
    marginBottom: '8px',
    fontWeight: '600',
    color: '#002045',
  };

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !formData.name ||
      !formData.email ||
      !formData.contactInfo ||
      !formData.password ||
      !formData.confirmPassword
    ) {
      alert('Please fill in all fields');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        name: formData.name,
        email: formData.email,
        contactInfo: formData.contactInfo,
        role: formData.role,
        password: formData.password,
      };

      await registerUser(payload);
      alert('Registration successful. Please log in and complete two-step verification.');
      navigate('/login', {
        replace: true,
        state: {
          from: redirectTo,
          prefillEmail: formData.email,
        },
      });
    } catch (error) {
      alert(error?.response?.data?.message || 'Registration failed');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f4f7fb',
        padding: '24px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '450px',
          background: '#fff',
          borderRadius: '16px',
          padding: '32px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
        }}
      >
        <h1
          style={{
            marginBottom: '8px',
            textAlign: 'center',
            color: '#002045',
          }}
        >
          Create Account
        </h1>

        <p
          style={{
            marginBottom: '24px',
            textAlign: 'center',
            color: '#666',
            fontSize: '14px',
          }}
        >
          Sign up to continue with VetConnect
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label htmlFor="name" style={labelStyle}>
              Full Name
            </label>
            <input
              id="name"
              type="text"
              name="name"
              placeholder="Enter your full name"
              value={formData.name}
              onChange={handleChange}
              disabled={loading}
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label htmlFor="email" style={labelStyle}>
              Email
            </label>
            <input
              id="email"
              type="email"
              name="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleChange}
              disabled={loading}
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label htmlFor="contactInfo" style={labelStyle}>
              Contact Info
            </label>
            <input
              id="contactInfo"
              type="text"
              name="contactInfo"
              placeholder="Phone number or backup email"
              value={formData.contactInfo}
              onChange={handleChange}
              disabled={loading}
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label htmlFor="role" style={labelStyle}>
              Register As
            </label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleChange}
              disabled={loading}
              style={inputStyle}
            >
              <option value="petOwner">Pet Owner</option>
              <option value="vet">Vet</option>
            </select>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label htmlFor="password" style={labelStyle}>
              Password
            </label>
            <input
              id="password"
              type="password"
              name="password"
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleChange}
              disabled={loading}
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label htmlFor="confirmPassword" style={labelStyle}>
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              name="confirmPassword"
              placeholder="Confirm your password"
              value={formData.confirmPassword}
              onChange={handleChange}
              disabled={loading}
              style={inputStyle}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              border: 'none',
              borderRadius: '10px',
              background: loading ? '#7a8ca5' : '#002045',
              color: '#fff',
              fontWeight: '700',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Creating account...' : 'Register'}
          </button>
        </form>

        <p
          style={{
            marginTop: '18px',
            textAlign: 'center',
            fontSize: '14px',
            color: '#666',
          }}
        >
          Already have an account?{' '}
          <Link
            to="/login"
            state={location.state}
            style={{
              color: '#002045',
              fontWeight: '700',
              textDecoration: 'none',
            }}
          >
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}

export default RegisterPage;
