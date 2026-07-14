import { useState, useEffect } from "react";
import './auth.css';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const apiUrl = import.meta.env.VITE_API_URL;

export default function Auth() {
    const navigate = useNavigate();
    const location = useLocation();

    // Check kar rahe hain ki current URL login hai ya nahi
    const isLogin = location.pathname === '/login';

    const [form, setForm] = useState({
        name: "",
        email: "",
        password: "",
        about: ""
    });
    const [image, setImage] = useState(null);

    useEffect(() => {
        setForm({
            name: "",
            email: "",
            password: "",
            about: ""
        });
        setImage(null);
    }, [location.pathname]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const url = isLogin ? `${apiUrl}/api/auth/login` : `${apiUrl}/api/auth/register`;

        let bodyData;
        let headers = {};

        if (isLogin) {
            headers["Content-Type"] = "application/json";
            bodyData = JSON.stringify({ email: form.email, password: form.password });
        } else {
            const formData = new FormData();
            formData.append("name", form.name);
            formData.append("email", form.email);
            formData.append("password", form.password);
            formData.append("about", form.about);
            if (image) {
                formData.append("image", image);
            }
            bodyData = formData;
        }

        try {
            const res = await fetch(url, {
                method: "POST",
                headers: headers,
                body: bodyData
            });

            const data = await res.json();

            if (res.ok) {
                if (isLogin) {
                    alert("Logged In Successfully");
                    if (data.token) localStorage.setItem("token", data.token);
                    localStorage.setItem("userId", data.user.id);
                    navigate('/');
                } else {
                    alert("Registered Successfully");
                    navigate('/login');
                }
            } else {
                alert(data.message || "Something went wrong");
            }
        } catch (error) {
            console.error("Auth Error:", error);
            alert("Server connection failed");
        }
    };

    return (
        <div className="whatsapp_auth_wrapper">
            {/* WhatsApp Web jaisa top green bar */}
            <div className="whatsapp_top_bar"></div>

            <div className="whatsapp_auth_container">
                <div className="whatsapp_auth_card">
                    {/* Brand Header */}
                    <div className="whatsapp_brand">
                        <div className="whatsapp_logo">
                            <svg viewBox="0 0 24 24" width="40" height="40" fill="currentColor">
                                <path d="M12.004 2c-5.517 0-9.993 4.476-9.993 9.993 0 1.764.462 3.425 1.272 4.887l-1.283 4.698 4.819-1.263c1.408.769 3.012 1.205 4.717 1.205 5.516 0 9.993-4.475 9.993-9.993 0-5.517-4.477-9.993-9.993-9.993zm5.72 13.916c-.252.712-1.261 1.298-1.734 1.344-.473.045-.964.061-2.923-.711-2.505-.989-4.116-3.535-4.241-3.702-.125-.167-1.008-1.34-1.008-2.556s.631-1.815.856-2.052c.225-.237.49-.296.652-.296.163 0 .326.001.468.008.148.007.347-.056.543.414.202.484.692 1.688.752 1.809.061.121.101.262.02.423-.08.162-.121.262-.242.403-.121.141-.254.314-.363.421-.121.118-.248.247-.107.489.141.242.625 1.028 1.34 1.664.921.821 1.696 1.075 1.938 1.196.242.121.383.101.524-.061.141-.162.605-.705.766-.947.161-.242.323-.202.544-.121.222.081 1.409.665 1.651.786.242.121.403.181.464.282.061.101.061.585-.191 1.297z" />
                            </svg>
                        </div>
                        <span className="whatsapp_brand_name">LiveChat24/7</span>
                    </div>

                    <form className='whatsapp_form' onSubmit={handleSubmit}>
                        <div className="whatsapp_form_header">
                            <h2>{isLogin ? "Sign In" : "Create Account"}</h2>
                            <p>{isLogin ? "To use LiveChat on your computer, sign in with your email." : "Sign up to start chatting with your friends."}</p>
                        </div>

                        {/* Name & About Fields (Only on Register) */}
                        {!isLogin && (
                            <div className="whatsapp_input_group transition_group">
                                <div className="whatsapp_input_wrapper">
                                    <span className="input_icon">👤</span>
                                    <input
                                        type="text"
                                        placeholder="Full Name"
                                        value={form.name}
                                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="whatsapp_input_wrapper">
                                    <span className="input_icon">📝</span>
                                    <input
                                        type="text"
                                        placeholder="Status (e.g. Hey there! I am using LiveChat.)"
                                        value={form.about}
                                        onChange={(e) => setForm({ ...form, about: e.target.value })}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Email Field */}
                        <div className="whatsapp_input_wrapper">
                            <span className="input_icon">📧</span>
                            <input
                                type="email"
                                placeholder="Email Address"
                                value={form.email}
                                onChange={(e) => setForm({ ...form, email: e.target.value })}
                                required
                            />
                        </div>

                        {/* Password Field */}
                        <div className="whatsapp_input_wrapper">
                            <span className="input_icon">🔒</span>
                            <input
                                type="password"
                                placeholder="Password"
                                value={form.password}
                                onChange={(e) => setForm({ ...form, password: e.target.value })}
                                required
                            />
                        </div>

                        {/* Profile Image Input (Only on Register) */}
                        {!isLogin && (
                            <div className="whatsapp_file_upload">
                                <label htmlFor="file-upload" className="whatsapp_file_label">
                                    <span className="camera_icon">📷</span>
                                    {image ? `Selected: ${image.name.slice(0, 20)}...` : "Upload Profile Picture (Optional)"}
                                </label>
                                <input
                                    id="file-upload"
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => setImage(e.target.files[0])}
                                    style={{ display: 'none' }}
                                />
                            </div>
                        )}

                        {/* Submit Button */}
                        <button className="whatsapp_btn" type="submit">
                            {isLogin ? "LOG IN" : "REGISTER"}
                        </button>

                        {/* Footer Link */}
                        <p className="whatsapp_footer_link">
                            {isLogin ? (
                                <>New to LiveChat? <Link to="/register">Create an account</Link></>
                            ) : (
                                <>Already have an account? <Link to="/login">Sign in here</Link></>
                            )}
                        </p>
                    </form>
                </div>
            </div>
        </div>
    );
}
