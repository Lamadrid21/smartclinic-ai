"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/AppLayout";

export default function PatientRecordsPage() {
  const router = useRouter();

  const [patients, setPatients] = useState([]);
  const [archivedPatients, setArchivedPatients] = useState([]);
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [loadingArchived, setLoadingArchived] = useState(true);

  const [editingPatient, setEditingPatient] = useState(null);
  const [saving, setSaving] = useState(false);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newPatient, setNewPatient] = useState({
    patient_number: "",
    first_name: "",
    middle_name: "",
    last_name: "",
    date_of_birth: "",
    gender: "",
    contact_number: "",
    email: "",
  });

  useEffect(() => {
    loadPatients();
    loadArchivedPatients();
  }, []);

  // =========================
  // LOAD ACTIVE PATIENTS
  // =========================
  async function loadPatients() {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("patients")
        .select("*")
        .eq("is_archived", false)
        .order("last_name", { ascending: true });

      if (error) {
        console.error("Error loading patients:", error);
        alert("Failed to load patients: " + error.message);
        return;
      }

      setPatients(data || []);
    } catch (error) {
      console.error(error);
      alert("Something went wrong while loading patients.");
    } finally {
      setLoading(false);
    }
  }

  // =========================
  // LOAD ARCHIVED PATIENTS
  // =========================
  async function loadArchivedPatients() {
    try {
      setLoadingArchived(true);

      const { data, error } = await supabase
        .from("patients")
        .select("*")
        .eq("is_archived", true)
        .order("last_name", { ascending: true });

      if (error) {
        console.error(
          "Error loading archived patients:",
          error
        );

        alert(
          "Failed to load archived patients: " +
            error.message
        );

        return;
      }

      setArchivedPatients(data || []);
    } catch (error) {
      console.error(error);

      alert(
        "Something went wrong while loading archived patients."
      );
    } finally {
      setLoadingArchived(false);
    }
  }

  // =========================
  // CALCULATE AGE
  // =========================
  function calculateAge(dateOfBirth) {
    if (!dateOfBirth) {
      return "N/A";
    }

    const today = new Date();
    const birthDate = new Date(dateOfBirth);

    let age =
      today.getFullYear() -
      birthDate.getFullYear();

    const month =
      today.getMonth() -
      birthDate.getMonth();

    if (
      month < 0 ||
      (month === 0 &&
        today.getDate() <
          birthDate.getDate())
    ) {
      age--;
    }

    return age;
  }

  // =========================
  // SEARCH ACTIVE PATIENTS
  // =========================
  const filteredPatients = patients.filter(
    (patient) => {
      const searchTerm = search.toLowerCase();

      const firstName = String(
        patient.first_name || ""
      );

      const middleName = String(
        patient.middle_name || ""
      );

      const lastName = String(
        patient.last_name || ""
      );

      const patientNumber = String(
        patient.patient_number || ""
      );

      const contactNumber = String(
        patient.contact_number || ""
      );

      const email = String(
        patient.email || ""
      );

      return (
        firstName
          .toLowerCase()
          .includes(searchTerm) ||
        middleName
          .toLowerCase()
          .includes(searchTerm) ||
        lastName
          .toLowerCase()
          .includes(searchTerm) ||
        patientNumber
          .toLowerCase()
          .includes(searchTerm) ||
        contactNumber
          .toLowerCase()
          .includes(searchTerm) ||
        email
          .toLowerCase()
          .includes(searchTerm)
      );
    }
  );

  // =========================
  // SEARCH ARCHIVED PATIENTS
  // =========================
  const filteredArchivedPatients =
    archivedPatients.filter(
      (patient) => {
        const searchTerm = search.toLowerCase();

        const firstName = String(
          patient.first_name || ""
        );

        const middleName = String(
          patient.middle_name || ""
        );

        const lastName = String(
          patient.last_name || ""
        );

        const patientNumber = String(
          patient.patient_number || ""
        );

        const contactNumber = String(
          patient.contact_number || ""
        );

        const email = String(
          patient.email || ""
        );

        return (
          firstName
            .toLowerCase()
            .includes(searchTerm) ||
          middleName
            .toLowerCase()
            .includes(searchTerm) ||
          lastName
            .toLowerCase()
            .includes(searchTerm) ||
          patientNumber
            .toLowerCase()
            .includes(searchTerm) ||
          contactNumber
            .toLowerCase()
            .includes(searchTerm) ||
          email
            .toLowerCase()
            .includes(searchTerm)
        );
      }
    );

  // =========================
  // START EDIT
  // =========================
  function startEdit(patient) {
    setShowAddForm(false);
    setEditingPatient({
      id: patient.id,

      patient_number:
        patient.patient_number || "",

      first_name:
        patient.first_name || "",

      middle_name:
        patient.middle_name || "",

      last_name:
        patient.last_name || "",

      date_of_birth:
        patient.date_of_birth || "",

      gender:
        patient.gender || "",

      contact_number:
        patient.contact_number || "",

      email:
        patient.email || "",
    });
  }


  function handleEditChange(event) {
    const {
      name,
      value,
    } = event.target;

    setEditingPatient(
      (previous) => ({
        ...previous,
        [name]: value,
      })
    );
  }

  
  async function saveEdit() {
    if (!editingPatient) {
      return;
    }

    try {
      setSaving(true);

      const { data, error } =
        await supabase
          .from("patients")
          .update({
            patient_number:
              editingPatient.patient_number,

            first_name:
              editingPatient.first_name,

            middle_name:
              editingPatient.middle_name ||
              null,

            last_name:
              editingPatient.last_name,

            date_of_birth:
              editingPatient.date_of_birth ||
              null,

            gender:
              editingPatient.gender ||
              null,

            contact_number:
              editingPatient.contact_number ||
              null,

            email:
              editingPatient.email ||
              null,

            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            editingPatient.id
          )
          .select()
          .single();

      if (error) {
        console.error(
          "Update patient error:",
          error
        );

        alert(
          "Failed to update patient: " +
            error.message
        );

        return;
      }

      if (!data) {
        alert(
          "Patient was not updated. Please check your Supabase RLS policies."
        );

        return;
      }

      alert(
        "Patient updated successfully."
      );

      setEditingPatient(null);

      await loadPatients();
      await loadArchivedPatients();
    } catch (error) {
      console.error(error);

      alert(
        "Something went wrong while updating the patient."
      );
    } finally {
      setSaving(false);
    }
  }

  
  async function archivePatient(id) {
  const confirmed = window.confirm(
    "Are you sure you want to archive this patient?"
  );

  if (!confirmed) {
    return;
  }

  const { data, error } = await supabase
    .from("patients")
    .update({
      is_archived: true
    })
    .eq("id", id)
    .select();

  console.log("ARCHIVE RESULT:", data);
  console.log("ARCHIVE ERROR:", error);

  if (error) {
    alert("Failed to archive patient: " + error.message);
    return;
  }

  if (!data || data.length === 0) {
    alert(
      "No patient was updated. Check your Supabase RLS UPDATE policy."
    );
    return;
  }

  alert("Patient archived successfully.");

  await loadPatients();
  await loadArchivedPatients();
}

 
  async function restorePatient(id) {
    const confirmed =
      window.confirm(
        "Are you sure you want to restore this patient?"
      );

    if (!confirmed) {
      return;
    }

    try {
      const { data, error } =
        await supabase
          .from("patients")
          .update({
            is_archived: false,
            updated_at:
              new Date().toISOString(),
          })
          .eq("id", id)
          .select(
            "id, patient_number, first_name, last_name, is_archived"
          )
          .single();

      if (error) {
        console.error(
          "Restore patient error:",
          error
        );

        alert(
          "Failed to restore patient: " +
            error.message
        );

        return;
      }

      if (!data) {
        alert(
          "The patient was not restored. Please check your Supabase RLS policies."
        );

        return;
      }

      if (data.is_archived !== false) {
        alert(
          "The patient was found, but is_archived did not become FALSE."
        );

        return;
      }

      alert(
        "Patient restored successfully."
      );

      await loadPatients();
      await loadArchivedPatients();
    } catch (error) {
      console.error(error);

      alert(
        "Something went wrong while restoring the patient."
      );
    }
  }

  // =========================
  // ADD NEW PATIENT
  // =========================
  function handleNewPatientChange(event) {
    const { name, value } = event.target;
    setNewPatient((previous) => ({ ...previous, [name]: value }));
  }

  function resetNewPatient() {
    setNewPatient({
      patient_number: "",
      first_name: "",
      middle_name: "",
      last_name: "",
      date_of_birth: "",
      gender: "",
      contact_number: "",
      email: "",
    });
    setShowAddForm(false);
  }

  async function addPatient() {
    if (!newPatient.first_name || !newPatient.last_name) {
      alert("First Name and Last Name are required.");
      return;
    }

    try {
      setSaving(true);

      const { data, error } = await supabase
        .from("patients")
        .insert({
          patient_number: newPatient.patient_number || null,
          first_name: newPatient.first_name,
          middle_name: newPatient.middle_name || null,
          last_name: newPatient.last_name,
          date_of_birth: newPatient.date_of_birth || null,
          gender: newPatient.gender || null,
          contact_number: newPatient.contact_number || null,
          email: newPatient.email || null,
          is_archived: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error("Add patient error:", error);
        alert("Failed to add patient: " + error.message);
        return;
      }

      if (!data) {
        alert("Patient was not created. Please check your Supabase RLS policies.");
        return;
      }

      alert("Patient added successfully.");
      resetNewPatient();
      await loadPatients();
    } catch (error) {
      console.error(error);
      alert("Something went wrong while adding the patient.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppLayout
      title="Patient Records"
      subtitle="Search, view, edit, archive, and restore patient records"
      activeNav="patients"
    >
      {/* SEARCH + ADD BUTTON */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Search by name, ID, contact, or email..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-blue-500/50 transition-colors"
          />
        </div>
        <button
          onClick={() => {
            setShowAddForm(!showAddForm);
            setEditingPatient(null);
          }}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-400 text-sm font-semibold hover:bg-blue-600/20 transition-colors whitespace-nowrap"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M12 5v14M5 12h14" />
          </svg>
          Add Patient
        </button>
      </div>

      {/* ACTIVE PATIENTS TABLE */}
      <div className="glass-card rounded-2xl overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-white/10">
          <h2 className="text-base font-bold text-white">Active Patients</h2>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-3">
            <div className="w-5 h-5 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
            <span className="text-sm text-slate-400">Loading patients...</span>
          </div>
        ) : filteredPatients.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-slate-400 text-sm">No active patient records found.</p>
          </div>
          ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 text-xs uppercase tracking-wider">
                  <th className="px-6 py-3 font-semibold">Patient ID</th>
                  <th className="px-6 py-3 font-semibold">Name</th>
                  <th className="px-6 py-3 font-semibold">Age</th>
                  <th className="px-6 py-3 font-semibold">Gender</th>
                  <th className="px-6 py-3 font-semibold">Contact</th>
                  <th className="px-6 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {filteredPatients.map((patient) => (
                  <tr key={patient.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-3.5 text-slate-300 whitespace-nowrap">{patient.patient_number || "N/A"}</td>
                    <td className="px-6 py-3.5 text-white font-medium whitespace-nowrap">
                      {patient.first_name || ""}{" "}{patient.middle_name || ""}{" "}{patient.last_name || ""}
                    </td>
                    <td className="px-6 py-3.5 text-slate-300 whitespace-nowrap">{calculateAge(patient.date_of_birth)}</td>
                    <td className="px-6 py-3.5 text-slate-300 whitespace-nowrap">{patient.gender || "N/A"}</td>
                    <td className="px-6 py-3.5 text-slate-300 whitespace-nowrap">{patient.contact_number || "N/A"}</td>
                    <td className="px-6 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => router.push(`/patient-records/${patient.id}`)}
                          className="px-3 py-1.5 rounded-lg bg-blue-600/10 border border-blue-500/20 text-blue-400 text-xs font-semibold hover:bg-blue-600/20 transition-colors"
                        >
                          View
                        </button>
                        <button
                          onClick={() => startEdit(patient)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold hover:bg-emerald-600/20 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => archivePatient(patient.id)}
                          className="px-3 py-1.5 rounded-lg bg-rose-600/10 border border-rose-500/20 text-rose-400 text-xs font-semibold hover:bg-rose-600/20 transition-colors"
                        >
                          Archive
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ARCHIVED PATIENTS TABLE */}
      <div className="glass-card rounded-2xl overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-white/10">
          <h2 className="text-base font-bold text-white">Archived Patients</h2>
        </div>
        {loadingArchived ? (
          <div className="flex items-center justify-center py-16 gap-3">
            <div className="w-5 h-5 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
            <span className="text-sm text-slate-400">Loading archived patients...</span>
          </div>
        ) : filteredArchivedPatients.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-slate-400 text-sm">No archived patients.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 text-xs uppercase tracking-wider">
                  <th className="px-6 py-3 font-semibold">Patient ID</th>
                  <th className="px-6 py-3 font-semibold">Name</th>
                  <th className="px-6 py-3 font-semibold">Age</th>
                  <th className="px-6 py-3 font-semibold">Gender</th>
                  <th className="px-6 py-3 font-semibold">Contact</th>
                  <th className="px-6 py-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {filteredArchivedPatients.map((patient) => (
                  <tr key={patient.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-3.5 text-slate-300 whitespace-nowrap">{patient.patient_number || "N/A"}</td>
                    <td className="px-6 py-3.5 text-white font-medium whitespace-nowrap">
                      {patient.first_name || ""}{" "}{patient.middle_name || ""}{" "}{patient.last_name || ""}
                    </td>
                    <td className="px-6 py-3.5 text-slate-300 whitespace-nowrap">{calculateAge(patient.date_of_birth)}</td>
                    <td className="px-6 py-3.5 text-slate-300 whitespace-nowrap">{patient.gender || "N/A"}</td>
                    <td className="px-6 py-3.5 text-slate-300 whitespace-nowrap">{patient.contact_number || "N/A"}</td>
                    <td className="px-6 py-3.5 whitespace-nowrap">
                      <button
                        onClick={() => restorePatient(patient.id)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold hover:bg-emerald-600/20 transition-colors"
                      >
                        Restore
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ADD PATIENT PANEL */}
      {showAddForm && (
        <div className="glass-card rounded-2xl p-6 sm:p-8 mb-8">
          <h2 className="text-lg font-bold text-white mb-6">Add New Patient</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { name: "patient_number", label: "Patient Number", type: "text", placeholder: "e.g. P-0001" },
              { name: "first_name", label: "First Name *", type: "text", placeholder: "e.g. Juan" },
              { name: "middle_name", label: "Middle Name", type: "text", placeholder: "e.g. Santos" },
              { name: "last_name", label: "Last Name *", type: "text", placeholder: "e.g. Dela Cruz" },
              { name: "date_of_birth", label: "Date of Birth", type: "date", placeholder: "" },
              { name: "contact_number", label: "Contact Number", type: "text", placeholder: "e.g. 09171234567" },
              { name: "email", label: "Email", type: "email", placeholder: "e.g. juan@email.com" },
            ].map((field) => (
              <div key={field.name}>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">{field.label}</label>
                <input
                  type={field.type}
                  name={field.name}
                  value={newPatient[field.name]}
                  onChange={handleNewPatientChange}
                  placeholder={field.placeholder}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-blue-500/50 transition-colors"
                />
              </div>
            ))}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Gender</label>
              <select
                name="gender"
                value={newPatient.gender}
                onChange={handleNewPatientChange}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-slate-200 outline-none focus:border-blue-500/50 transition-colors"
              >
                <option value="" className="bg-slate-900">Select gender</option>
                <option value="Male" className="bg-slate-900">Male</option>
                <option value="Female" className="bg-slate-900">Female</option>
                <option value="Other" className="bg-slate-900">Other</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-6">
            <button
              onClick={addPatient}
              disabled={saving}
              className={`px-5 py-2.5 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-400 text-sm font-semibold hover:bg-blue-600/20 transition-colors ${saving ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {saving ? "Saving..." : "Add Patient"}
            </button>
            <button
              onClick={resetNewPatient}
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-slate-300 text-sm font-semibold hover:bg-white/[0.08] transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* EDIT PATIENT PANEL */}
      {editingPatient && (
        <div className="glass-card rounded-2xl p-6 sm:p-8">
          <h2 className="text-lg font-bold text-white mb-6">Edit Patient</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { name: "patient_number", label: "Patient Number", type: "text" },
              { name: "first_name", label: "First Name", type: "text" },
              { name: "middle_name", label: "Middle Name", type: "text" },
              { name: "last_name", label: "Last Name", type: "text" },
              { name: "date_of_birth", label: "Date of Birth", type: "date" },
              { name: "contact_number", label: "Contact Number", type: "text" },
              { name: "email", label: "Email", type: "email" },
            ].map((field) => (
              <div key={field.name}>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">{field.label}</label>
                <input
                  type={field.type}
                  name={field.name}
                  value={editingPatient[field.name]}
                  onChange={handleEditChange}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-slate-200 outline-none focus:border-blue-500/50 transition-colors"
                />
              </div>
            ))}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Gender</label>
              <select
                name="gender"
                value={editingPatient.gender}
                onChange={handleEditChange}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-slate-200 outline-none focus:border-blue-500/50 transition-colors"
              >
                <option value="" className="bg-slate-900">Select gender</option>
                <option value="Male" className="bg-slate-900">Male</option>
                <option value="Female" className="bg-slate-900">Female</option>
                <option value="Other" className="bg-slate-900">Other</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-6">
            <button
              onClick={saveEdit}
              disabled={saving}
              className={`px-5 py-2.5 rounded-xl bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 text-sm font-semibold hover:bg-emerald-600/20 transition-colors ${saving ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
            <button
              onClick={() => setEditingPatient(null)}
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-slate-300 text-sm font-semibold hover:bg-white/[0.08] transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </AppLayout>
  );
}