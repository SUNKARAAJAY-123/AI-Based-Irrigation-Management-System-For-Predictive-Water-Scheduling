"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter, useParams } from "next/navigation";
import { api } from "@/services/api";


interface Stats {
  total_users: number;
  total_farms: number;
  total_fields: number;
  total_sensors: number;
  sensors_active: number;
  sensors_inactive: number;
  active_crops: number;
  total_water_recommended_liters: number;
  total_water_applied_liters: number;
  average_confidence: number;
}

interface UserRecord {
  id: string;
  email: string;
  full_name: string;
  phone_number?: string;
  state?: string;
  district?: string;
  role: string;
  status?: string;
  is_active: boolean;
  created_at: string;
}

interface FarmRecord {
  id: string;
  name: string;
  area_hectares: number;
  soil_type?: string;
  location_latitude: number;
  location_longitude: number;
}

interface FieldRecord {
  id: string;
  farm_id: string;
  name: string;
  area_hectares: number;
  soil_type?: string;
}

interface SensorRecord {
  id: string;
  field_id: string;
  name: string;
  sensor_type: string;
  status: string;
}

interface PredictionRecord {
  id: string;
  crop_id: string;
  timestamp: string;
  recommended_water_volume_liters: number;
  applied_water_volume_liters: number;
  is_irrigation_required: boolean;
  risk_level: string;
  confidence_score: number;
}

interface WeatherLogRecord {
  id: string;
  farm_name: string;
  timestamp: string;
  temperature: number;
  humidity: number;
  precipitation_probability: number;
  wind_speed: number;
  conditions: string;
}

interface ReportSummary {
  crop_name: string;
  recommended_volume: number;
  applied_volume: number;
  avg_confidence: number;
  recommendations_count: number;
}

type TabType = "overview" | "users" | "requests" | "farms" | "fields" | "sensors" | "predictions" | "weather" | "notifications" | "reports" | "settings";

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  

  // Navigation tab state
  const [activeTab, setActiveTab] = useState<TabType>("overview");

  // Loaded Data
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [requests, setRequests] = useState<UserRecord[]>([]);
  const [farms, setFarms] = useState<FarmRecord[]>([]);
  const [fields, setFields] = useState<FieldRecord[]>([]);
  const [sensors, setSensors] = useState<SensorRecord[]>([]);
  const [predictions, setPredictions] = useState<PredictionRecord[]>([]);
  const [weatherLogs, setWeatherLogs] = useState<WeatherLogRecord[]>([]);
  const [reports, setReports] = useState<ReportSummary[]>([]);

  // Page States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Filters & Broadcast State
  const [userSearch, setUserSearch] = useState("");
  const [requestSearch, setRequestSearch] = useState("");
  const [requestFilter, setRequestFilter] = useState<"pending" | "approved" | "rejected">("pending");
  const [requestPage, setRequestPage] = useState(1);
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastCategory, setBroadcastCategory] = useState("alert");
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  // Synchronize dynamic tab routing
  useEffect(() => {
    if (params && params.tab) {
      const tab = params.tab as TabType;
      const validTabs: TabType[] = ["overview", "users", "requests", "farms", "fields", "sensors", "predictions", "weather", "notifications", "reports", "settings"];
      if (validTabs.includes(tab)) {
        setActiveTab(tab);
      }
    } else {
      setActiveTab("overview");
    }
  }, [params]);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push("/login");
      } else {
        const roleLower = user.role.toLowerCase();
        if (roleLower !== "admin" && roleLower !== "super_admin") {
          router.push("/dashboard");
        } else {
          loadAdminData();
        }
      }
    }
  }, [user, authLoading, router]);

  const loadAdminData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Stats
      const fetchedStats = await api.get<Stats>("/admin/stats");
      setStats(fetchedStats);

      const isSuper = user && user.role.toLowerCase() === "super_admin";
      if (isSuper) {
        // Users
        const fetchedUsers = await api.get<UserRecord[]>("/admin/users");
        setUsers(fetchedUsers);

        // Pending Admin Requests
        const fetchedRequests = await api.get<UserRecord[]>("/admin/requests");
        setRequests(fetchedRequests);
      } else {
        setUsers([]);
        setRequests([]);
      }

      // Land details
      const fetchedFarms = await api.get<FarmRecord[]>("/admin/farms");
      setFarms(fetchedFarms);
      const fetchedFields = await api.get<FieldRecord[]>("/admin/fields");
      setFields(fetchedFields);

      // Sensors
      const fetchedSensors = await api.get<SensorRecord[]>("/admin/sensors");
      setSensors(fetchedSensors);

      // Recommendations
      const fetchedPredictions = await api.get<PredictionRecord[]>("/admin/predictions");
      setPredictions(fetchedPredictions);

      // Weather Logs
      const fetchedWeather = await api.get<WeatherLogRecord[]>("/admin/weather");
      setWeatherLogs(fetchedWeather);

      // Reports
      const fetchedReports = await api.get<ReportSummary[]>("/admin/reports/summary");
      setReports(fetchedReports);
    } catch (err) {
      console.error(err);
      setError((err as Error).message || "Failed to load administrative logs. Check backend API connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setError(null);
    setSuccess(null);
    if (tab === "overview") {
      router.push("/admin");
    } else {
      router.push(`/admin/${tab}`);
    }
  };

  const handleToggleUserStatus = async (userRecord: UserRecord) => {
    setError(null);
    setSuccess(null);
    try {
      const updated = await api.put<UserRecord>(`/admin/users/${userRecord.id}/status`, {
        is_active: !userRecord.is_active,
      });
      setSuccess(`User ${updated.full_name} status updated successfully.`);
      const fetchedUsers = await api.get<UserRecord[]>("/admin/users");
      setUsers(fetchedUsers);
    } catch (err) {
      setError((err as Error).message || "Failed to modify user status");
    }
  };

  const handleChangeUserRole = async (userRecord: UserRecord, newRole: string) => {
    setError(null);
    setSuccess(null);
    try {
      const updated = await api.put<UserRecord>(`/admin/users/${userRecord.id}/status`, {
        role: newRole,
      });
      setSuccess(`User ${updated.full_name} role changed to ${newRole}.`);
      const fetchedUsers = await api.get<UserRecord[]>("/admin/users");
      setUsers(fetchedUsers);
    } catch (err) {
      setError((err as Error).message || "Failed to alter user role");
    }
  };

  const handleApproveRequest = async (requestId: string) => {
    setError(null);
    setSuccess(null);
    try {
      await api.post<UserRecord>(`/admin/requests/${requestId}/approve`, {});
      setSuccess("Admin request approved successfully.");
      await loadAdminData();
    } catch (err) {
      setError((err as Error).message || "Failed to approve admin request");
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    setError(null);
    setSuccess(null);
    const reason = prompt("Please enter a rejection reason (optional):") || "";
    try {
      await api.post<UserRecord>(`/admin/requests/${requestId}/reject`, { rejection_reason: reason });
      setSuccess("Admin request rejected successfully.");
      await loadAdminData();
    } catch (err) {
      setError((err as Error).message || "Failed to reject admin request");
    }
  };

  const handleBroadcastNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!broadcastTitle || !broadcastMessage) {
      setError("Please fill in notification Title and Message fields.");
      return;
    }
    setIsBroadcasting(true);

    try {
      const payload = {
        title: broadcastTitle,
        message: broadcastMessage,
        category: broadcastCategory,
      };

      const result = await api.post<{ broadcast_count: number }>("/admin/notifications/broadcast", payload);
      setSuccess(`Announcement broadcasted to all ${result.broadcast_count} farms successfully.`);
      setBroadcastTitle("");
      setBroadcastMessage("");
    } catch (err) {
      setError((err as Error).message || "Failed to broadcast announcement.");
    } finally {
      setIsBroadcasting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <span className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-neutral-400 font-bold uppercase tracking-widest">Loading Admin Space...</p>
        </div>
      </div>
    );
  }

  const filteredUsers = users.filter(u =>
    u.full_name.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  const filteredRequests = (
    requestFilter === "pending"
      ? requests
      : requestFilter === "approved"
      ? users.filter(u => u.role.toUpperCase() === "ADMIN")
      : users.filter(u => u.role.toUpperCase() === "ADMIN_PENDING" && u.status?.toUpperCase() === "REJECTED")
  ).filter(r =>
    r.full_name.toLowerCase().includes(requestSearch.toLowerCase()) ||
    r.email.toLowerCase().includes(requestSearch.toLowerCase())
  );

  const requestsPerPage = 10;
  const totalRequestPages = Math.ceil(filteredRequests.length / requestsPerPage);
  const paginatedRequests = filteredRequests.slice((requestPage - 1) * requestsPerPage, requestPage * requestsPerPage);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 px-4 py-8 sm:px-6 lg:px-8 pb-24 md:pb-8">
      <div className="absolute top-0 right-1/4 w-[400px] h-[400px] bg-sky-500/5 rounded-full blur-[120px] pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="border-b border-neutral-800/80 pb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-sky-500/10 text-sky-400 text-xs font-semibold px-2.5 py-1 rounded-full border border-sky-500/20 tracking-wider uppercase">
                🛡️ System Administrator
              </span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Admin Control Center
            </h1>
            <p className="text-neutral-400 text-sm mt-1">
              Manage system metrics, farmer nodes, and aggregate recommendations
            </p>
          </div>
          <button
            onClick={loadAdminData}
            className="bg-neutral-900 hover:bg-neutral-800 text-xs border border-neutral-800 font-bold px-4 py-2.5 rounded-xl cursor-pointer"
          >
            🔄 Sync Data Ledger
          </button>
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

        {/* Tab Selection */}
        <div className="flex flex-wrap gap-2 border-b border-neutral-900 pb-3">
          {(["overview", "users", "requests", "farms", "fields", "sensors", "predictions", "weather", "notifications", "reports", "settings"] as TabType[])
            .filter((tab) => {
              const isSuper = user && user.role.toLowerCase() === "super_admin";
              if (tab === "users" || tab === "requests") {
                return isSuper;
              }
              return true;
            })
            .map((tab) => (
              <button
                key={tab}
                onClick={() => handleTabChange(tab)}
                className={`text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer capitalize ${
                  activeTab === tab
                    ? "bg-sky-500/10 text-sky-400 border border-sky-500/20"
                    : "text-neutral-400 hover:text-neutral-200"
                }`}
              >
                {tab === "farms" ? "Farms" : tab === "notifications" ? "Notifications" : tab === "requests" ? "Admin Requests" : tab}
              </button>
            ))}
        </div>

        {/* -------------------- 1. OVERVIEW TAB -------------------- */}
        {activeTab === "overview" && stats && (
          <div className="space-y-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="bg-neutral-900/40 border border-neutral-800/80 rounded-2xl p-5 shadow-md">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block">Total Users</span>
                <span className="text-3xl font-black text-white block mt-2">{stats.total_users}</span>
              </div>
              <div className="bg-neutral-900/40 border border-neutral-800/80 rounded-2xl p-5 shadow-md">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block">Active Lands</span>
                <span className="text-3xl font-black text-white block mt-2">{stats.total_farms} farms</span>
              </div>
              <div className="bg-neutral-900/40 border border-neutral-800/80 rounded-2xl p-5 shadow-md">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block">Online Sensors</span>
                <span className="text-3xl font-black text-emerald-400 block mt-2">{stats.sensors_active} <span className="text-xs text-neutral-500 font-semibold">/ {stats.total_sensors}</span></span>
              </div>
              <div className="bg-neutral-900/40 border border-neutral-800/80 rounded-2xl p-5 shadow-md">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block">AI Target Vol</span>
                <span className="text-3xl font-black text-sky-400 block mt-2">{stats.total_water_recommended_liters.toLocaleString()} L</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Aggregation card */}
              <div className="bg-neutral-900/40 border border-neutral-800/80 rounded-3xl p-6 shadow-xl backdrop-blur-sm space-y-4">
                <h3 className="text-sm font-bold text-neutral-300">Water Consumption Summary</h3>
                <div className="space-y-4 pt-2">
                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-neutral-400">Total Recommended Water Volume</span>
                      <span className="font-bold text-white">{stats.total_water_recommended_liters.toLocaleString()} L</span>
                    </div>
                    <div className="h-2 w-full bg-neutral-950 rounded-full overflow-hidden">
                      <div className="h-full bg-sky-500" style={{ width: "100%" }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-neutral-400">Actual Applied Water Volume</span>
                      <span className="font-bold text-white">{stats.total_water_applied_liters.toLocaleString()} L</span>
                    </div>
                    <div className="h-2 w-full bg-neutral-950 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-500" 
                        style={{ 
                          width: `${Math.min(100, (stats.total_water_applied_liters / (stats.total_water_recommended_liters || 1)) * 100)}%` 
                        }} 
                      />
                    </div>
                  </div>
                  <div className="pt-2 flex justify-between text-xs text-neutral-400">
                    <span>Average Recommendation Confidence</span>
                    <span className="font-bold text-sky-400">{(stats.average_confidence * 100).toFixed(1)}%</span>
                  </div>
                </div>
              </div>

              {/* Quick Actions Card */}
              <div className="bg-neutral-900/40 border border-neutral-800/80 rounded-3xl p-6 shadow-xl backdrop-blur-sm space-y-4 flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold text-neutral-300 mb-2">Administrative Actions</h3>
                  <p className="text-neutral-400 text-xs">
                    Quickly jump to warning broadcasts or user profiles.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => handleTabChange("notifications")}
                    className="bg-neutral-950 hover:bg-neutral-900 border border-neutral-800 p-4 rounded-2xl text-left text-xs font-bold text-neutral-200 cursor-pointer"
                  >
                    📢 Broadcast Alert
                  </button>
                  <button 
                    onClick={() => handleTabChange("users")}
                    className="bg-neutral-950 hover:bg-neutral-900 border border-neutral-800 p-4 rounded-2xl text-left text-xs font-bold text-neutral-200 cursor-pointer"
                  >
                    👥 Manage Profiles
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* -------------------- 2. USERS TAB -------------------- */}
        {activeTab === "users" && (
          <div className="space-y-6">
            <div className="flex gap-4">
              <input
                type="text"
                placeholder="Search users by name or email..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="flex-1 bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-neutral-200 outline-none"
              />
            </div>

            <div className="bg-neutral-900/20 border border-neutral-800/80 rounded-3xl overflow-hidden shadow-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-neutral-900/80 text-neutral-400 font-bold border-b border-neutral-800">
                    <th className="p-4">Name</th>
                    <th className="p-4">Email</th>
                    <th className="p-4">Role</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Created Date</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-900 text-neutral-200">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-neutral-900/10">
                      <td className="p-4 font-bold">{u.full_name}</td>
                      <td className="p-4 text-neutral-400">{u.email}</td>
                      <td className="p-4 capitalize">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          u.role === "admin" ? "bg-sky-500/15 text-sky-400" : "bg-neutral-850 text-neutral-400 border border-neutral-800"
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`font-bold ${u.is_active ? "text-emerald-400" : "text-rose-400"}`}>
                          {u.is_active ? "Active" : "Deactivated"}
                        </span>
                      </td>
                      <td className="p-4 text-neutral-400">{new Date(u.created_at).toLocaleDateString("en-IN")}</td>
                      <td className="p-4 text-right space-x-2">
                        {u.id !== user?.id ? (
                          <>
                            <button
                              onClick={() => handleToggleUserStatus(u)}
                              className={`px-3 py-1.5 rounded-xl font-bold border text-[10px] cursor-pointer ${
                                u.is_active 
                                  ? "bg-rose-500/10 border-rose-500/20 text-rose-400 hover:bg-rose-500/20" 
                                  : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20"
                              }`}
                            >
                              {u.is_active ? "Deactivate" : "Activate"}
                            </button>
                            
                            <button
                              onClick={() => handleChangeUserRole(u, u.role === "admin" ? "farmer" : "admin")}
                              className="bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-[10px] px-3 py-1.5 rounded-xl text-sky-400 font-bold cursor-pointer"
                            >
                              {u.role === "admin" ? "Demote" : "Promote"}
                            </button>
                          </>
                        ) : (
                          <span className="text-[10px] text-neutral-500 italic font-semibold">Self (Active)</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* -------------------- ADMIN REQUESTS TAB -------------------- */}
        {activeTab === "requests" && (
          <div className="space-y-6">
            {/* Search and Filters Bar */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
              {/* Sub-status selector */}
              <div className="flex gap-2 bg-neutral-900 p-1 rounded-xl border border-neutral-800">
                {(["pending", "approved", "rejected"] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => {
                      setRequestFilter(filter);
                      setRequestPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer capitalize ${
                      requestFilter === filter
                        ? "bg-neutral-800 text-white"
                        : "text-neutral-400 hover:text-neutral-200"
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>

              {/* Search Box */}
              <input
                type="text"
                placeholder="Search requests by name or email..."
                value={requestSearch}
                onChange={(e) => {
                  setRequestSearch(e.target.value);
                  setRequestPage(1);
                }}
                className="w-full sm:w-64 bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2 text-xs text-neutral-200 outline-none placeholder:text-neutral-600 focus:border-sky-500/50"
              />
            </div>

            {/* Requests Table */}
            <div className="bg-neutral-900/20 border border-neutral-800/80 rounded-3xl overflow-hidden shadow-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-neutral-900/80 text-neutral-400 font-bold border-b border-neutral-800">
                    <th className="p-4">Full Name</th>
                    <th className="p-4">Email</th>
                    <th className="p-4">Phone</th>
                    <th className="p-4">Location</th>
                    <th className="p-4">Registration Date</th>
                    <th className="p-4">Requested Role</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-900 text-neutral-200">
                  {paginatedRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-neutral-900/10">
                      <td className="p-4 font-bold">{req.full_name}</td>
                      <td className="p-4 text-neutral-400">{req.email}</td>
                      <td className="p-4 text-neutral-450">{req.phone_number || "N/A"}</td>
                      <td className="p-4 text-neutral-450">{req.district ? `${req.district}, ${req.state}` : "N/A"}</td>
                      <td className="p-4 text-neutral-400">
                        {new Date(req.created_at).toLocaleDateString("en-IN")} {new Date(req.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-sky-500/15 text-sky-400 border border-sky-500/20">
                          ADMIN
                        </span>
                      </td>
                      <td className="p-4 capitalize">
                        <span className={`font-bold ${
                          req.status === "ACTIVE" 
                            ? "text-emerald-400" 
                            : req.status === "REJECTED" 
                            ? "text-rose-400" 
                            : "text-amber-400"
                        }`}>
                          {req.status ? req.status.toLowerCase() : "pending"}
                        </span>
                      </td>
                      <td className="p-4 text-right space-x-2">
                        {req.status === "PENDING" || (req.role === "ADMIN_PENDING" && req.status !== "REJECTED") ? (
                          <>
                            <button
                              onClick={() => handleApproveRequest(req.id)}
                              className="px-3 py-1.5 rounded-xl font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 text-[10px] cursor-pointer"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleRejectRequest(req.id)}
                              className="px-3 py-1.5 rounded-xl font-bold bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 text-[10px] cursor-pointer"
                            >
                              Reject
                            </button>
                          </>
                        ) : (
                          <span className="text-[10px] text-neutral-500 italic font-semibold capitalize">
                            Processed ({req.status ? req.status.toLowerCase() : "pending"})
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {paginatedRequests.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-neutral-500 font-semibold italic">
                        No registration requests found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalRequestPages > 1 && (
              <div className="flex justify-end gap-2 mt-4 text-xs font-bold">
                <button
                  disabled={requestPage === 1}
                  onClick={() => setRequestPage(p => p - 1)}
                  className="px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 disabled:opacity-50 cursor-pointer"
                >
                  Previous
                </button>
                <span className="py-1.5 px-3 text-neutral-400">
                  Page {requestPage} of {totalRequestPages}
                </span>
                <button
                  disabled={requestPage === totalRequestPages}
                  onClick={() => setRequestPage(p => p + 1)}
                  className="px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 disabled:opacity-50 cursor-pointer"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}

        {/* -------------------- 3. FARMS TAB -------------------- */}
        {activeTab === "farms" && (
          <div className="space-y-6">
            <h3 className="text-sm font-bold text-neutral-300">Registered Farms</h3>
            <div className="bg-neutral-900/20 border border-neutral-800/80 rounded-3xl overflow-hidden shadow-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-neutral-900/80 text-neutral-400 font-bold border-b border-neutral-800">
                    <th className="p-4">Farm Name</th>
                    <th className="p-4">Coordinates (Lat, Lon)</th>
                    <th className="p-4">Area Size</th>
                    <th className="p-4">Soil Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-900 text-neutral-200">
                  {farms.map((f) => (
                    <tr key={f.id} className="hover:bg-neutral-900/10">
                      <td className="p-4 font-bold">{f.name}</td>
                      <td className="p-4 text-neutral-400">{f.location_latitude.toFixed(4)}, {f.location_longitude.toFixed(4)}</td>
                      <td className="p-4">{f.area_hectares} ha</td>
                      <td className="p-4 capitalize text-neutral-300">{f.soil_type || "Loam"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* -------------------- 4. FIELDS TAB -------------------- */}
        {activeTab === "fields" && (
          <div className="space-y-6">
            <h3 className="text-sm font-bold text-neutral-300">Configured Field Partitions</h3>
            <div className="bg-neutral-900/20 border border-neutral-800/80 rounded-3xl overflow-hidden shadow-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-neutral-900/80 text-neutral-400 font-bold border-b border-neutral-800">
                    <th className="p-4">Field Name</th>
                    <th className="p-4">Farm ID</th>
                    <th className="p-4">Area Size</th>
                    <th className="p-4">Soil Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-900 text-neutral-200">
                  {fields.map((field) => (
                    <tr key={field.id} className="hover:bg-neutral-900/10">
                      <td className="p-4 font-bold">{field.name}</td>
                      <td className="p-4 text-neutral-400 truncate max-w-[200px]">{field.farm_id}</td>
                      <td className="p-4">{field.area_hectares} ha</td>
                      <td className="p-4 capitalize text-neutral-300">{field.soil_type || "Loam"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* -------------------- 5. SENSORS TAB -------------------- */}
        {activeTab === "sensors" && (
          <div className="space-y-6">
            <h3 className="text-sm font-bold text-neutral-300">Registered Telemetry Sensors</h3>
            <div className="bg-neutral-900/20 border border-neutral-800/80 rounded-3xl overflow-hidden shadow-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-neutral-900/80 text-neutral-400 font-bold border-b border-neutral-800">
                    <th className="p-4">Sensor ID</th>
                    <th className="p-4">Sensor Node</th>
                    <th className="p-4">Type</th>
                    <th className="p-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-900 text-neutral-200">
                  {sensors.map((s) => (
                    <tr key={s.id} className="hover:bg-neutral-900/10">
                      <td className="p-4 text-neutral-400 font-mono">{s.id}</td>
                      <td className="p-4 font-bold">{s.name}</td>
                      <td className="p-4 capitalize text-neutral-300">{s.sensor_type.replace("_", " ")}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          s.status === "active" ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400"
                        }`}>
                          {s.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* -------------------- 6. PREDICTIONS TAB -------------------- */}
        {activeTab === "predictions" && (
          <div className="space-y-6">
            <h3 className="text-sm font-bold text-neutral-300">Irrigation Recommendations Ledger (Latest 100)</h3>
            <div className="bg-neutral-900/20 border border-neutral-800/80 rounded-3xl overflow-hidden shadow-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-neutral-900/80 text-neutral-400 font-bold border-b border-neutral-800">
                    <th className="p-4">Crop ID</th>
                    <th className="p-4">Time</th>
                    <th className="p-4">Decision</th>
                    <th className="p-4">Recommended Vol</th>
                    <th className="p-4">Applied Vol</th>
                    <th className="p-4">Risk Level</th>
                    <th className="p-4">Confidence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-900 text-neutral-200">
                  {predictions.map((p) => (
                    <tr key={p.id} className="hover:bg-neutral-900/10">
                      <td className="p-4 text-neutral-400 font-mono truncate max-w-[150px]">{p.crop_id}</td>
                      <td className="p-4 text-neutral-400">{new Date(p.timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</td>
                      <td className="p-4 font-bold">
                        {p.is_irrigation_required ? "⚠️ Water Needed" : "🟢 Optimal"}
                      </td>
                      <td className="p-4">{p.recommended_water_volume_liters} L</td>
                      <td className="p-4">{p.applied_water_volume_liters} L</td>
                      <td className="p-4 capitalize">
                        <span className={`font-bold ${
                          p.risk_level === "high" ? "text-rose-400" : p.risk_level === "medium" ? "text-amber-400" : "text-emerald-400"
                        }`}>
                          {p.risk_level}
                        </span>
                      </td>
                      <td className="p-4 font-mono font-bold text-sky-400">{(p.confidence_score * 100).toFixed(0)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* -------------------- 7. WEATHER TAB -------------------- */}
        {activeTab === "weather" && (
          <div className="space-y-6">
            <h3 className="text-sm font-bold text-neutral-300">Meteorological Log Records</h3>
            <div className="bg-neutral-900/20 border border-neutral-800/80 rounded-3xl overflow-hidden shadow-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-neutral-900/80 text-neutral-400 font-bold border-b border-neutral-800">
                    <th className="p-4">Farm Name</th>
                    <th className="p-4">Logged Time</th>
                    <th className="p-4">Temperature</th>
                    <th className="p-4">Humidity</th>
                    <th className="p-4">Precipitation Prob</th>
                    <th className="p-4">Conditions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-900 text-neutral-200">
                  {weatherLogs.map((w) => (
                    <tr key={w.id} className="hover:bg-neutral-900/10">
                      <td className="p-4 font-bold">{w.farm_name}</td>
                      <td className="p-4 text-neutral-400">{new Date(w.timestamp).toLocaleDateString("en-IN")} {new Date(w.timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</td>
                      <td className="p-4 font-mono">{w.temperature.toFixed(1)} °C</td>
                      <td className="p-4 font-mono">{w.humidity}%</td>
                      <td className="p-4 font-mono text-sky-400">{(w.precipitation_probability * 100).toFixed(0)}%</td>
                      <td className="p-4 capitalize">{w.conditions}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* -------------------- 8. NOTIFICATIONS (BROADCAST) TAB -------------------- */}
        {activeTab === "notifications" && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-neutral-900/40 border border-neutral-800/80 rounded-3xl p-6 shadow-xl backdrop-blur-sm space-y-6">
              <div>
                <h3 className="text-lg font-bold text-white">Broadcast Alerts</h3>
                <p className="text-neutral-400 text-xs mt-1">
                  Send high-priority warning alerts or system notifications directly to all registered farms.
                </p>
              </div>

              <form onSubmit={handleBroadcastNotification} className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block mb-1.5">Alert Level</label>
                  <select
                    value={broadcastCategory}
                    onChange={(e) => setBroadcastCategory(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 text-xs text-neutral-200 rounded-xl p-2.5 outline-none"
                  >
                    <option value="alert">Critical Alert (Red)</option>
                    <option value="recommendation">System Recommendation (Yellow)</option>
                    <option value="info">General Info (Blue)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block mb-1.5">Notification Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Extreme Heat Wave Warning"
                    value={broadcastTitle}
                    onChange={(e) => setBroadcastTitle(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-xs text-neutral-200 outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block mb-1.5">Notification Message</label>
                  <textarea
                    rows={4}
                    placeholder="Describe alert details, instructions, or meteorological forecast notes here..."
                    value={broadcastMessage}
                    onChange={(e) => setBroadcastMessage(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-xs text-neutral-200 outline-none resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isBroadcasting}
                  className="w-full bg-sky-500 hover:bg-sky-600 text-neutral-950 font-bold text-xs py-3 rounded-xl transition-all cursor-pointer flex justify-center"
                >
                  {isBroadcasting ? <span className="w-4 h-4 border-2 border-neutral-950 border-t-transparent rounded-full animate-spin" /> : "📢 Dispatch Announcement Alert"}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* -------------------- 9. REPORTS TAB -------------------- */}
        {activeTab === "reports" && (
          <div className="space-y-6">
            <h3 className="text-sm font-bold text-neutral-300">Water Consumption Summary by Crop Type</h3>
            <div className="bg-neutral-900/20 border border-neutral-800/80 rounded-3xl overflow-hidden shadow-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-neutral-900/80 text-neutral-400 font-bold border-b border-neutral-800">
                    <th className="p-4">Crop Name</th>
                    <th className="p-4">Total Recommended Volume</th>
                    <th className="p-4">Total Applied Volume</th>
                    <th className="p-4">Average Confidence</th>
                    <th className="p-4">Evaluations Count</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-900 text-neutral-200">
                  {reports.map((r, idx) => (
                    <tr key={idx} className="hover:bg-neutral-900/10">
                      <td className="p-4 font-bold">{r.crop_name}</td>
                      <td className="p-4 font-mono">{r.recommended_volume.toLocaleString()} L</td>
                      <td className="p-4 font-mono text-emerald-400">{r.applied_volume.toLocaleString()} L</td>
                      <td className="p-4 font-mono">{(r.avg_confidence * 100).toFixed(1)}%</td>
                      <td className="p-4 font-mono">{r.recommendations_count}</td>
                    </tr>
                  ))}
                  {reports.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-neutral-500 font-semibold italic">
                        No report summaries compiled. Log telemetry to generate records.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* -------------------- 10. SETTINGS TAB -------------------- */}
        {activeTab === "settings" && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-neutral-900/40 border border-neutral-800/80 rounded-3xl p-6 shadow-xl backdrop-blur-sm space-y-6">
              <div>
                <h3 className="text-lg font-bold text-white">System Settings</h3>
                <p className="text-neutral-400 text-xs mt-1">
                  Configure global variables, API integrations, and system-wide configurations.
                </p>
              </div>

              <div className="space-y-4 text-xs">
                <div className="border-b border-neutral-850 pb-4">
                  <span className="font-bold text-neutral-350 block mb-1">Telemetry Sync Frequency</span>
                  <span className="text-neutral-500 block mb-2">Interval at which sensors transmit soil and environmental data.</span>
                  <select className="bg-neutral-950 border border-neutral-800 text-neutral-200 rounded-xl p-2 outline-none">
                    <option>Every 15 Minutes (Default)</option>
                    <option>Every 30 Minutes</option>
                    <option>Every 1 Hour</option>
                  </select>
                </div>

                <div className="border-b border-neutral-850 pb-4">
                  <span className="font-bold text-neutral-350 block mb-1">AI Recommendation Engine</span>
                  <span className="text-neutral-500 block mb-2">Select the active machine learning engine for predictive water scheduling.</span>
                  <select className="bg-neutral-950 border border-neutral-800 text-neutral-200 rounded-xl p-2 outline-none">
                    <option>Random Forest Classifier + LSTM Drift (Active)</option>
                    <option>Gradient Boosting Classifier</option>
                    <option>Deep Q-Network RL Agent (Experimental)</option>
                  </select>
                </div>

                <div>
                  <span className="font-bold text-neutral-350 block mb-1">Speech Assistant Integration</span>
                  <span className="text-neutral-500 block mb-2">Configure primary speech engine for farmers regional assistant.</span>
                  <select className="bg-neutral-950 border border-neutral-800 text-neutral-200 rounded-xl p-2 outline-none">
                    <option>Sarvam AI Speech Engine (Active)</option>
                    <option>Google Cloud Text-to-Speech</option>
                    <option>Bhashini AI Platform</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
