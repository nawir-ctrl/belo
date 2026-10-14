"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Calendar,
  Music,
  Radio,
  History,
  Settings,
  Activity,
  LogOut,
  Volume2,
  User,
} from "lucide-react";

interface SidebarProps {
  schoolName?: string;
  user?: { username: string; role: string; fullName: string } | null;
  onLogout?: () => void;
}

export function Sidebar({ schoolName = "SmartBell Local", user, onLogout }: SidebarProps) {
  const pathname = usePathname();

  const navItems = [
    { href: "/", label: "Dashboard", icon: Bell },
    { href: "/schedules", label: "Jadwal Bel", icon: Calendar },
    { href: "/audio", label: "Manajemen Audio", icon: Music },
    { href: "/history", label: "Riwayat Bel", icon: History },
    { href: "/settings", label: "Pengaturan", icon: Settings },
    { href: "/diagnostics", label: "Diagnostik Sistem", icon: Activity },
    { href: "/profile", label: "Profil & Akun", icon: User },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-100 flex flex-col border-r border-slate-800 shrink-0 select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800/80 flex items-center space-x-3">
        <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
          <Volume2 className="h-6 w-6" />
        </div>
        <div className="overflow-hidden">
          <h1 className="font-bold text-base tracking-wide leading-tight text-white truncate">
            SmartBell Local
          </h1>
          <p className="text-[11px] text-slate-400 truncate">{schoolName}</p>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Menu Utama
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? "text-white" : "text-slate-400"}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}

        {/* Separator to Player Action */}
        <div className="pt-4 pb-2 px-3">
          <div className="border-t border-slate-800 pt-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Perangkat Keras Speaker
            </span>
          </div>
        </div>

        <Link
          href="/player"
          target="_blank"
          className="flex items-center justify-between px-3.5 py-3 rounded-lg text-sm font-semibold bg-emerald-950/40 text-emerald-300 border border-emerald-800/60 hover:bg-emerald-900/40 transition-colors shadow-sm"
        >
          <div className="flex items-center space-x-2.5">
            <Radio className="h-4 w-4 text-emerald-400 animate-pulse" />
            <span>Halaman Pemutar Bel</span>
          </div>
          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-mono">
            /player
          </span>
        </Link>
      </nav>

      {/* User Footer */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/40">
        <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 transition-colors">
          <Link
            href="/profile"
            className="flex items-center space-x-2.5 overflow-hidden flex-1 group"
            title="Buka Pengaturan Profil"
          >
            <div className="h-8 w-8 rounded-lg bg-slate-700 group-hover:bg-blue-600 flex items-center justify-center font-bold text-xs text-slate-200 transition-colors shrink-0">
              {user?.fullName?.charAt(0) || "U"}
            </div>
            <div className="overflow-hidden pr-2">
              <p className="text-xs font-semibold text-slate-200 truncate group-hover:text-blue-400 transition-colors">
                {user?.fullName || user?.username || "Operator"}
              </p>
              <p className="text-[10px] text-slate-400 capitalize">
                {user?.role === "ADMIN" ? "Administrator" : "Operator"}
              </p>
            </div>
          </Link>
          {onLogout && (
            <button
              onClick={onLogout}
              title="Keluar / Logout"
              className="p-1.5 rounded-md text-slate-400 hover:text-rose-400 hover:bg-slate-700/60 transition-colors shrink-0"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
