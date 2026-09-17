"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import AppLayout from "@/components/AppLayout";

export default function Profile() {
  const [user, setUser] = useState(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability
    loadProfile();
  }, []);

  async function loadProfile() {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    setUser(user);

    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (data) {
      setFullName(data.full_name || "");
      setPhone(data.phone || "");
      setAvatarUrl(data.avatar_url || "");
    }

    setLoading(false);
  }

  async function uploadImage(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    const fileName = `${currentUser.id}-${Date.now()}`;

    const result = await supabase.storage
      .from("avatars")
      .upload(fileName, file);

    if (result.error) {
      alert(result.error.message);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage
      .from("avatars")
      .getPublicUrl(fileName);

    setAvatarUrl(publicUrl);
    alert("Upload success");
  }

  async function saveProfile() {
    if (!user) {
      alert("User not loaded.");
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from("profiles")
      .upsert({
        id: user.id,
        full_name: fullName,
        phone: phone,
        avatar_url: avatarUrl,
      });

    if (error) {
      alert(error.message);
      setSaving(false);
      return;
    }

    alert("Profile updated successfully.");
    setSaving(false);
  }

  if (loading) {
    return (
      <AppLayout title="My Profile" subtitle="Loading..." activeNav="profile">
        <div className="flex flex-col items-center justify-center py-24">
          <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-4" />
          <p className="text-slate-400 text-sm">Loading profile...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="My Profile" subtitle="Manage your personal information" activeNav="profile">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="glass-card p-6 rounded-2xl text-center h-fit">
          <div className="flex flex-col items-center">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Profile" className="w-28 h-28 rounded-full object-cover ring-2 ring-blue-500/30" /> // eslint-disable-line @next/next/no-img-element
            ) : (
              <div className="w-28 h-28 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-4xl font-bold ring-2 ring-blue-500/30">
                {(fullName || user?.email || "U").charAt(0).toUpperCase()}
              </div>
            )}
            <h2 className="mt-4 text-lg font-bold text-white">{fullName || "Clinic Staff"}</h2>
            <p className="text-xs text-slate-400 mt-1">{user?.email}</p>
            <label className="mt-4 inline-block cursor-pointer">
              <span className="btn-secondary inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 12v6a2 2 0 01-2 2H4a2 2 0 01-2-2v-6"/><path d="M15.5 8.5L12 5l-3.5 3.5"/><path d="M12 5v12"/></svg>
                Upload Photo
              </span>
              <input type="file" accept="image/*" onChange={uploadImage} className="hidden" />
            </label>
          </div>
        </div>

        {/* Edit Form */}
        <div className="glass-card p-6 rounded-2xl lg:col-span-2">
          <h2 className="text-lg font-bold text-white mb-6">Personal Information</h2>
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">Full Name</label>
              <input className="glass-input w-full rounded-xl px-4 py-3 text-sm" placeholder="Dr. Juan Dela Cruz" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">Phone Number</label>
              <input className="glass-input w-full rounded-xl px-4 py-3 text-sm" placeholder="+63 9XX XXX XXXX" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">Email Address</label>
              <input className="glass-input w-full rounded-xl px-4 py-3 text-sm opacity-60 cursor-not-allowed" value={user?.email || ""} disabled />
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button onClick={saveProfile} disabled={saving} className="btn-primary px-6 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50">
                {saving ? "Saving..." : "Save Changes"}
              </button>
              <Link href="/change-password" className="btn-secondary px-6 py-2.5 rounded-xl text-sm font-medium">
                Change Password
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}