"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Profile() {
  const [user, setUser] = useState(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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

  console.log("Current User:", currentUser);

  const fileName = `${currentUser.id}-${Date.now()}`;

  const result = await supabase.storage
  .from("avatars")
  .upload(fileName, file);

console.log(result);

if (result.error) {
  console.error(result.error);
  alert(result.error.message);
}

  const {
    data: { publicUrl },
  } = supabase.storage
    .from("avatars")
    .getPublicUrl(fileName);

  console.log("PUBLIC URL:", publicUrl);

  setAvatarUrl(publicUrl);

  alert("Upload success");
}

  async function saveProfile() {
    if (!user) {
      alert("User not loaded.");
      return;
    }

    console.log("Saving avatar:", avatarUrl);

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
      return;
    }

    alert("Profile updated successfully.");
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 flex items-center justify-center">
        <h1 className="text-2xl">Loading...</h1>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 flex justify-center p-10">
      <div className="bg-white p-10 rounded-3xl shadow-xl w-[600px]">
        <h1 className="text-3xl font-bold text-blue-600 mb-6">
          My Profile
        </h1>

        {avatarUrl && (
          <img
            src={avatarUrl}
            alt="Profile"
            className="w-32 h-32 rounded-full object-cover mb-4"
          />
        )}

        <input
          type="file"
          onChange={uploadImage}
          className="mb-4"
        />

        <input
          className="w-full border p-3 rounded-xl mb-4"
          placeholder="Full Name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />

        <input
          className="w-full border p-3 rounded-xl mb-4"
          placeholder="Phone Number"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />

        {user && (
          <p className="mb-4 text-gray-600">
            Email: {user.email}
          </p>
        )}

        <button
          onClick={saveProfile}
          className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700"
        >
          Save Profile
        </button>
      </div>
    </main>
  );
}