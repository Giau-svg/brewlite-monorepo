"use client";

import { useState } from "react";
import Link from "next/link";

type UserProfile = {
  fullName: string;
  email: string;
  phone: string;
  createdAt: string;
  loyaltyPoints: number;
};

function UserIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-16 w-16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="12" cy="12" r="12" fill="#F3E8DD" />
      <path
        d="M12 12.2C14.4301 12.2 16.4 10.2301 16.4 7.8C16.4 5.36995 14.4301 3.4 12 3.4C9.56995 3.4 7.6 5.36995 7.6 7.8C7.6 10.2301 9.56995 12.2 12 12.2Z"
        fill="#E2572B"
      />
      <path
        d="M4.8 19.2C4.8 16.2167 7.21666 13.8 10.2 13.8H13.8C16.7833 13.8 19.2 16.2167 19.2 19.2V20H4.8V19.2Z"
        fill="#E2572B"
      />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M4 20H8L18.5 9.5C19.3284 8.67157 19.3284 7.32843 18.5 6.5V6.5C17.6716 5.67157 16.3284 5.67157 15.5 6.5L5 17V20Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x="5"
        y="11"
        width="14"
        height="9"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M8 11V8.5C8 6.567 9.567 5 11.5 5H12.5C14.433 5 16 6.567 16 8.5V11"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M6 6L18 18M18 6L6 18"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("vi-VN");
}

export default function ProfileView() {
  const [profile, setProfile] = useState<UserProfile>({
    fullName: "Tráº§n Ngá»c An",
    email: "ngocan@example.com",
    phone: "0901234567",
    createdAt: "2026-11-01T08:00:00.000Z",
    loyaltyPoints: 120,
  });

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);

  const [editForm, setEditForm] = useState({
    fullName: profile.fullName,
    email: profile.email,
    phone: profile.phone,
  });

  const [passwordForm, setPasswordForm] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [editMessage, setEditMessage] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");

  function openEditModal() {
    setEditForm({
      fullName: profile.fullName,
      email: profile.email,
      phone: profile.phone,
    });
    setEditMessage("");
    setIsEditOpen(true);
  }

  function handleUpdateProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!editForm.fullName.trim()) {
      setEditMessage("Vui lÃ²ng nháº­p há» tÃªn.");
      return;
    }

    if (!editForm.email.trim()) {
      setEditMessage("Vui lÃ²ng nháº­p email.");
      return;
    }

    if (!/^0\\d{9}$/.test(editForm.phone)) {
      setEditMessage("Sá»‘ Ä‘iá»‡n thoáº¡i pháº£i gá»“m 10 chá»¯ sá»‘ vÃ  báº¯t Ä‘áº§u báº±ng 0.");
      return;
    }

    setProfile((prev) => ({
      ...prev,
      fullName: editForm.fullName.trim(),
      email: editForm.email.trim(),
      phone: editForm.phone.trim(),
    }));

    setEditMessage("Cáº­p nháº­t thÃ´ng tin thÃ nh cÃ´ng.");
  }

  function handleChangePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!passwordForm.oldPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setPasswordMessage("Vui lÃ²ng nháº­p Ä‘áº§y Ä‘á»§ thÃ´ng tin.");
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setPasswordMessage("Máº­t kháº©u má»›i pháº£i cÃ³ Ã­t nháº¥t 6 kÃ½ tá»±.");
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMessage("Máº­t kháº©u nháº­p láº¡i khÃ´ng khá»›p.");
      return;
    }

    setPasswordMessage("Äá»•i máº­t kháº©u thÃ nh cÃ´ng.");
    setPasswordForm({
      oldPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
  }

  return (
    <main className="min-h-screen bg-[#F8F5F0] px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <Link
            href="/"
            className="text-sm font-medium text-[#67432D] hover:underline"
          >
            â† Vá» trang chá»§
          </Link>
        </div>

        <section className="rounded-3xl bg-white p-6 shadow-sm sm:p-10">
          <div className="flex flex-col items-center border-b border-[#EEE3D8] pb-8 text-center">
            <div className="flex h-28 w-28 items-center justify-center rounded-full bg-[#FFF5EE]">
              <UserIcon />
            </div>

            <h1 className="mt-4 text-3xl font-bold text-[#32251D]">
              ThÃ´ng tin cÃ¡ nhÃ¢n
            </h1>

            <p className="mt-2 text-sm text-[#87776B]">
              Xem vÃ  quáº£n lÃ½ thÃ´ng tin tÃ i khoáº£n cá»§a báº¡n
            </p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <InfoCard label="Há» vÃ  tÃªn" value={profile.fullName} />
            <InfoCard label="Email" value={profile.email} />
            <InfoCard label="Sá»‘ Ä‘iá»‡n thoáº¡i" value={profile.phone} />
            <InfoCard label="NgÃ y táº¡o tÃ i khoáº£n" value={formatDate(profile.createdAt)} />
            <InfoCard
              label="Äiá»ƒm thÆ°á»Ÿng"
              value={`${profile.loyaltyPoints} Ä‘iá»ƒm`}
              className="sm:col-span-2"
            />
          </div>

          <div className="mt-8 flex flex-col gap-4 sm:flex-row">
            <button
              type="button"
              onClick={openEditModal}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#67432D] px-6 text-sm font-semibold text-white transition hover:bg-[#543622]"
            >
              <EditIcon />
              Cáº­p nháº­t thÃ´ng tin
            </button>

            <button
              type="button"
              onClick={() => {
                setPasswordMessage("");
                setPasswordForm({
                  oldPassword: "",
                  newPassword: "",
                  confirmPassword: "",
                });
                setIsPasswordOpen(true);
              }}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-[#67432D] px-6 text-sm font-semibold text-[#67432D] transition hover:bg-[#F8F5F0]"
            >
              <LockIcon />
              Äá»•i máº­t kháº©u
            </button>
          </div>
        </section>
      </div>

      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-bold text-[#32251D]">
                Cáº­p nháº­t thÃ´ng tin
              </h2>
              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                className="rounded-full p-2 text-[#67432D] hover:bg-[#F8F5F0]"
              >
                <CloseIcon />
              </button>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <FormField
                label="Há» vÃ  tÃªn"
                value={editForm.fullName}
                onChange={(value) =>
                  setEditForm((prev) => ({ ...prev, fullName: value }))
                }
              />

              <FormField
                label="Email"
                value={editForm.email}
                onChange={(value) =>
                  setEditForm((prev) => ({ ...prev, email: value }))
                }
              />

              <FormField
                label="Sá»‘ Ä‘iá»‡n thoáº¡i"
                value={editForm.phone}
                onChange={(value) =>
                  setEditForm((prev) => ({ ...prev, phone: value }))
                }
              />

              {editMessage && (
                <p className="rounded-lg bg-[#F8F5F0] px-3 py-2 text-sm text-[#67432D]">
                  {editMessage}
                </p>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="rounded-xl border border-[#DED3C8] px-4 py-2 text-sm font-medium text-[#32251D]"
                >
                  Há»§y
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#67432D] px-4 py-2 text-sm font-semibold text-white"
                >
                  Cáº­p nháº­t
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isPasswordOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-bold text-[#32251D]">
                Äá»•i máº­t kháº©u
              </h2>
              <button
                type="button"
                onClick={() => setIsPasswordOpen(false)}
                className="rounded-full p-2 text-[#67432D] hover:bg-[#F8F5F0]"
              >
                <CloseIcon />
              </button>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <PasswordField
                label="Máº­t kháº©u cÅ©"
                value={passwordForm.oldPassword}
                onChange={(value) =>
                  setPasswordForm((prev) => ({ ...prev, oldPassword: value }))
                }
              />

              <PasswordField
                label="Máº­t kháº©u má»›i"
                value={passwordForm.newPassword}
                onChange={(value) =>
                  setPasswordForm((prev) => ({ ...prev, newPassword: value }))
                }
              />

              <PasswordField
                label="Nháº­p láº¡i máº­t kháº©u má»›i"
                value={passwordForm.confirmPassword}
                onChange={(value) =>
                  setPasswordForm((prev) => ({
                    ...prev,
                    confirmPassword: value,
                  }))
                }
              />

              {passwordMessage && (
                <p className="rounded-lg bg-[#F8F5F0] px-3 py-2 text-sm text-[#67432D]">
                  {passwordMessage}
                </p>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPasswordOpen(false)}
                  className="rounded-xl border border-[#DED3C8] px-4 py-2 text-sm font-medium text-[#32251D]"
                >
                  Há»§y
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#67432D] px-4 py-2 text-sm font-semibold text-white"
                >
                  Cáº­p nháº­t
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

function InfoCard({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl border border-[#EEE3D8] bg-[#FCFAF7] p-4 ${className}`}>
      <p className="text-sm text-[#87776B]">{label}</p>
      <p className="mt-2 text-base font-semibold text-[#32251D]">{value}</p>
    </div>
  );
}

function FormField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-[#32251D]">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-xl border border-[#DED3C8] bg-white px-4 text-sm text-[#32251D] placeholder:text-[#A79C90] outline-none focus:border-[#67432D] focus:ring-2 focus:ring-[#67432D]/15"
      />
    </div>
  );
}


function PasswordField({
    label,
    value,
    onChange,
  }: {
    label: string;
    value: string;
    onChange: (value: string) => void;
  }) {
    const [showPassword, setShowPassword] = useState(false);
    return (
      <div>
        <label className="mb-2 block text-sm font-medium text-[#32251D]">
          {label}
        </label>
        <div className="flex h-11 items-center rounded-xl border border-[#DED3C8] bg-white focus-within:border-[#67432D] focus-within:ring-2 focus-within:ring-[#67432D]/15">
        <div className="min-w-0 flex-1 overflow-hidden">
            <input
            type={showPassword ? "text" : "password"}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="profile-password-input h-11 w-[calc(100%+48px)] bg-transparent pl-4 pr-14 text-sm text-[#32251D] outline-none"
            />
        </div>

        <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? `áº¨n ${label}` : `Hiá»‡n ${label}`}
            aria-pressed={showPassword}
            className="flex h-full w-12 shrink-0 items-center justify-center text-[#67432D] hover:text-[#32251D]"
        >
            {showPassword ? (
            <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
            >
                <path d="M3 3l18 18" />
                <path d="M10 10a2.8 2.8 0 0 0 4 4" />
                <path d="M10.6 5.6A10.7 10.7 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a15 15 0 0 1-3.1 3.8" />
                <path d="M6.2 6.2C3.7 8 2.5 12 2.5 12S6 18.5 12 18.5c1.1 0 2.1-.2 3-.6" />
            </svg>
            ) : (
            <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
            >
                <path d="M2.5 12S6 5.5 12 5.5s9.5 6.5 9.5 6.5-3.5 6.5-9.5 6.5S2.5 12 2.5 12Z" />
                <circle cx="12" cy="12" r="3" />
            </svg>
            )}
        </button>
        </div>

      </div>
    );
  }
