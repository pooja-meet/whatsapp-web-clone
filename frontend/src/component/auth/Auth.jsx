import { useState } from "react";
import './auth.css';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useEffect } from "react";

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
    const [image, setImage] = useState(null)

    useEffect(() => {
        setForm({
            name: "",
            email: "",
            password: "",
            about: ""
        });
        setImage(null)
    }, [location.pathname])

    const handleSubmit = async (e) => {

        e.preventDefault();

        const url = isLogin ? `${apiUrl}/api/auth/login` : `${apiUrl}/api/auth/register`;

        // 🛡️ RE-ARCHITECTED FOR FILE UPLOAD: FormData ka use karenge
        let bodyData;
        let headers = {};

        if (isLogin) {
            // Login ke time normal JSON bhej sakte hain
            headers["Content-Type"] = "application/json";
            bodyData = JSON.stringify({ email: form.email, password: form.password });
        } else {
            // Register ke time humein file bhejni hai, isliye FormData banayenge
            const formData = new FormData();
            formData.append("name", form.name);
            formData.append("email", form.email);
            formData.append("password", form.password);
            formData.append("about", form.about);
            // Agar user ne image select ki hai tabhi append karein
            if (image) {
                formData.append("image", image);
            }

            bodyData = formData;
            // Note: FormData use karte waqt Content-Type header manual set NA KAREIN.
            // Browser khud boundary ke sath 'multipart/form-data' laga dega.
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

                    // Token ko localStorage me save karein agar backend se mil raha hai
                    if (data.token) localStorage.setItem("token", data.token);

                    localStorage.setItem("userId", data.user.id);

                    navigate('/'); // Login ke baad jahan bhejna ho

                } else {

                    alert("Registered Successfully");

                    navigate('/login'); // Register ke baad login page par bhejein

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
        <div className="auth_div">
            <div className="auth_container_form">
                <form className='auth_form' onSubmit={handleSubmit}>

                    {/* Dynamic Heading */}
                    <h2>{isLogin ? "Login" : "Register"}</h2>
                    <p>{isLogin ? "Welcome back! Login to your account" : "Create your account here"}</p>

                    {/* Name Input - Sirf Register ke waqt dikhega */}
                    {!isLogin && (
                        <div className="auth_input_group">
                            <input
                                type="text"
                                placeholder="👤 Full Name"
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                required
                            />
                            <input
                                type="text"
                                placeholder="👤 About yourself"
                                value={form.about}
                                onChange={(e) => setForm({ ...form, about: e.target.value })}
                            />
                        </div>

                    )}

                    <div className="auth_input_group">
                        <input
                            type="email"
                            placeholder="📧 Email Address"
                            value={form.email}
                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                            required
                        />
                    </div>

                    <div className="auth_input_group">
                        <input
                            type="password"
                            placeholder="🔒 Password"
                            value={form.password}
                            onChange={(e) => setForm({ ...form, password: e.target.value })}
                            required
                        />
                    </div>
                    {/* 📸 Image Input - Sirf Register ke waqt dikhega */}
                    {!isLogin && (
                        <div className="auth_input_group">
                            <label htmlFor="file-upload" className="custom_file_label">
                                {image ? `Selected: ${image.name.slice(0, 20)}...` : "📷 Upload Profile Picture (Optional)"}
                            </label>
                            <input
                                id="file-upload"
                                type="file"
                                accept="image/*" // Sirf images allow karega frontend par
                                onChange={(e) => setImage(e.target.files[0])} // Pehli file state me set hogi
                                style={{ display: 'none' }} // Isko hide karke label se click karwayenge taaki UI acchi dikhe
                            />
                        </div>
                    )}
                    {/* Dynamic Button Text */}
                    <button className="auth_button" type="submit">
                        {isLogin ? "🔑 Login Now" : "🚀 Register Now"}
                    </button>

                    {/* Dynamic Bottom Link */}
                    <p className="auth_login_link">
                        {isLogin ? (
                            <> Don't have an account? <Link to="/register">Register</Link> </>
                        ) : (
                            <> Already have an account? <Link to="/login">Login</Link> </>
                        )}
                    </p>

                </form>
            </div>
        </div>
    );
}