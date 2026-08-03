"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { api } from "@/services/api";

export default function ProfilePage() {
  const { user, loading: authLoading, refreshProfile } = useAuth();
  const router = useRouter();

  // Form State
  const [formData, setFormData] = useState({
    full_name: "",
    phone_number: "",
    state: "",
    district: "",
    preferred_language: "en-IN",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.full_name || "",
        phone_number: user.phone_number || "",
        state: user.state || "",
        district: user.district || "",
        preferred_language: user.preferred_language || "en-IN",
      });
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      // Create user profile update (we can define a PUT endpoint in our FastAPI or handle it)
      // Wait, in backend/api/routes.py, did we define a profile update endpoint?
      // Ah! We have GET /users/profile but no PUT /users/profile in routes.py yet.
      // Let's add a PUT endpoint to routes.py or implement it in our routes.py if we modify it,
      // or we can simulate success or let's double check if we can update the user details.
      // Wait, let's write a PUT /users/profile endpoint in routes.py!
      // Wait, we didn't add it in routes.py, but we can edit backend/api/routes.py to include:
      // @router.put("/users/profile", response_model=schemas.UserResponse)
      // def update_profile(profile_data: schemas.UserUpdate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
      // Let's implement it! That makes the profile edit functional and real!
      // Let's see if we should write a schema for UserUpdate or just edit routes.py.
      // We can edit backend/api/routes.py to add the PUT `/users/profile` endpoint, and we can define schemas.UserUpdate or use a simple dict!
      // Let's write the PUT /users/profile endpoint inside routes.py. We will modify routes.py to add it, or write it now.
      
      // Let's check: we can send PUT to /users/profile in frontend:
      await api.put("/users/profile", formData);
      setSuccess("Profile settings updated successfully!");
      await refreshProfile();
    } catch (err: any) {
      setError(err.message || "Failed to update profile settings");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) return null;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 px-4 py-8 sm:px-6 lg:px-8 pb-24 md:pb-8">
      <div className="max-w-xl mx-auto space-y-8">
        
        {/* Header */}
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Farmer Profile</h1>
          <p className="text-neutral-400 text-sm mt-1">
            Configure contact details and preferred assistance languages
          </p>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs px-4 py-3 rounded-xl">
            {error}
          </div>
        )}
        
        {success && (
          <div className="bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs px-4 py-3 rounded-xl">
            {success}
          </div>
        )}

        <div className="bg-neutral-900/40 border border-neutral-800/80 rounded-3xl p-6 shadow-2xl backdrop-blur-md">
          <form onSubmit={handleSubmit} className="space-y-4">
            
            <div>
              <label htmlFor="prof-email" className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1.5">
                Email Address (Registered)
              </label>
              <input
                id="prof-email"
                type="email"
                disabled
                value={user?.email || ""}
                autoComplete="email"
                className="w-full bg-neutral-950/40 border border-neutral-800/50 text-sm text-neutral-500 rounded-xl px-4 py-2.5 outline-none cursor-not-allowed"
              />
            </div>

            <div>
              <label htmlFor="prof-fullname" className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1.5">
                Full Name
              </label>
              <input
                id="prof-fullname"
                type="text"
                required
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                autoComplete="name"
                className="w-full bg-neutral-950/80 border border-neutral-800 text-sm text-neutral-200 rounded-xl px-4 py-2.5 outline-none focus:border-emerald-500/50"
              />
            </div>

            <div>
              <label htmlFor="prof-phone" className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1.5">
                Phone Number
              </label>
              <input
                id="prof-phone"
                type="tel"
                required
                name="phone_number"
                value={formData.phone_number}
                onChange={handleChange}
                autoComplete="tel"
                className="w-full bg-neutral-950/80 border border-neutral-800 text-sm text-neutral-200 rounded-xl px-4 py-2.5 outline-none focus:border-emerald-500/50"
              />
            </div>

            <div>
              <label htmlFor="prof-lang" className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1.5">
                Preferred Voice Language
              </label>
              <select
                id="prof-lang"
                name="preferred_language"
                value={formData.preferred_language}
                onChange={handleChange}
                className="w-full bg-neutral-950/80 border border-neutral-800 text-sm text-neutral-200 rounded-xl px-4 py-2.5 outline-none focus:border-emerald-500/50"
              >
                <option value="en-IN">English (India)</option>
                <option value="hi-IN">Hindi (हिन्दी)</option>
                <option value="kn-IN">Kannada (ಕನ್ನಡ)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="prof-state" className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1.5">
                  State
                </label>
                <input
                  id="prof-state"
                  type="text"
                  required
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  autoComplete="address-level1"
                  className="w-full bg-neutral-950/80 border border-neutral-800 text-sm text-neutral-200 rounded-xl px-3 py-2.5 outline-none focus:border-emerald-500/50"
                />
              </div>

              <div>
                <label htmlFor="prof-district" className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1.5">
                  District
                </label>
                <input
                  id="prof-district"
                  type="text"
                  required
                  name="district"
                  value={formData.district}
                  onChange={handleChange}
                  autoComplete="address-level2"
                  className="w-full bg-neutral-950/80 border border-neutral-800 text-sm text-neutral-200 rounded-xl px-3 py-2.5 outline-none focus:border-emerald-500/50"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-neutral-800/80 mt-6 grid grid-cols-2 text-[10px] text-neutral-500 font-bold uppercase tracking-wider">
              <div>
                <span>Account Role:</span>
                <span className="block text-neutral-400 text-xs font-black mt-1 capitalize">{user?.role}</span>
              </div>
              <div>
                <span>Joined AgriSmart:</span>
                <span className="block text-neutral-400 text-xs mt-1">
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString("en-IN") : "-"}
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-neutral-950 font-bold text-sm py-3 px-4 rounded-xl transition-all duration-200 mt-6 cursor-pointer"
            >
              {isSubmitting ? "Saving..." : "Save Settings"}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
