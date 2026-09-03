"use client";
import { useTranslation } from "@/context/LanguageContext";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/services/api";
import { useOfflineCache } from "@/hooks/useOfflineCache";
import { ChevronRight, AlertTriangle } from "lucide-react";

interface Farm {
  id: string;
  name: string;
}

interface Field {
  id: string;
  farm_id: string;
  name: string;
  area_hectares: number;
  soil_type?: string;
  created_at: string;
}

interface Crop {
  id: string;
  field_id: string;
  name: string;
  variety?: string;
  planted_at: string;
  expected_harvest_at?: string;
  status: string;
}

export default function FieldsPage() {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { isOnline, saveToCache, loadFromCache } = useOfflineCache();

  // State
  const [farms, setFarms] = useState<Farm[]>([]);
  const [selectedFarm, setSelectedFarm] = useState<Farm | null>(null);
  const [fields, setFields] = useState<Field[]>([]);
  const [fieldCrops, setFieldCrops] = useState<{ [fieldId: string]: Crop[] }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [cacheTimestamp, setCacheTimestamp] = useState<string | null>(null);

  // Field Form State
  const [fieldForm, setFieldForm] = useState({
    name: "",
    area_hectares: "",
    soil_type: "loam",
  });
  const [isAddingField, setIsAddingField] = useState(false);

  // Crop Form State
  const [cropForm, setCropForm] = useState({
    field_id: "",
    name: "Wheat",
    variety: "",
    planted_at: new Date().toISOString().split("T")[0],
  });
  const [activeCropFormId, setActiveCropFormId] = useState<string | null>(null);
  const [isAddingCrop, setIsAddingCrop] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      loadFarms();
    }
  }, [user]);

  // Re-fetch when connection returns
  useEffect(() => {
    if (user) {
      loadFarms();
    }
  }, [isOnline]);

  const loadFarms = async () => {
    try {
      if (isOnline) {
        const fetchedFarms = await api.get<Farm[]>("/farms");
        setFarms(fetchedFarms);
        saveToCache("farmer_farms", fetchedFarms);
        if (fetchedFarms.length > 0) {
          setSelectedFarm(fetchedFarms[0]);
          fetchFields(fetchedFarms[0].id);
        } else {
          setLoading(false);
        }
      } else {
        const cachedFarms = loadFromCache<Farm[]>("farmer_farms");
        if (cachedFarms.data) {
          setFarms(cachedFarms.data);
          if (cachedFarms.data.length > 0) {
            setSelectedFarm(cachedFarms.data[0]);
            fetchFields(cachedFarms.data[0].id);
          } else {
            setLoading(false);
          }
        } else {
          setError("You are offline and no cached farms are available.");
          setLoading(false);
        }
      }
    } catch (err) {
      // Offline fallback on failure
      const cachedFarms = loadFromCache<Farm[]>("farmer_farms");
      if (cachedFarms.data) {
        setFarms(cachedFarms.data);
        if (cachedFarms.data.length > 0) {
          setSelectedFarm(cachedFarms.data[0]);
          fetchFields(cachedFarms.data[0].id);
        } else {
          setLoading(false);
        }
      } else {
        setError((err as Error).message || "Failed to load farms");
        setLoading(false);
      }
    }
  };

  const fetchFields = async (farmId: string) => {
    setLoading(true);
    try {
      if (isOnline) {
        const fetchedFields = await api.get<Field[]>(`/fields?farm_id=${farmId}`);
        setFields(fetchedFields);
        saveToCache(`farmer_fields_${farmId}`, fetchedFields);
        
        // Load crops for each field
        const cropsMap: { [fieldId: string]: Crop[] } = {};
        for (const field of fetchedFields) {
          const crops = await api.get<Crop[]>(`/crops?field_id=${field.id}`);
          cropsMap[field.id] = crops;
        }
        setFieldCrops(cropsMap);
        saveToCache(`farmer_field_crops_${farmId}`, cropsMap);
        setCacheTimestamp(null);
      } else {
        const cachedFields = loadFromCache<Field[]>(`farmer_fields_${farmId}`);
        const cachedCrops = loadFromCache<{ [fieldId: string]: Crop[] }>(`farmer_field_crops_${farmId}`);
        
        if (cachedFields.data) {
          setFields(cachedFields.data);
          setFieldCrops(cachedCrops.data || {});
          const time = cachedFields.timestamp ? new Date(cachedFields.timestamp) : new Date();
          setCacheTimestamp(time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        } else {
          setError("You are offline and no cached fields are available.");
        }
      }
    } catch (err) {
      const cachedFields = loadFromCache<Field[]>(`farmer_fields_${farmId}`);
      const cachedCrops = loadFromCache<{ [fieldId: string]: Crop[] }>(`farmer_field_crops_${farmId}`);
      if (cachedFields.data) {
        setFields(cachedFields.data);
        setFieldCrops(cachedCrops.data || {});
        const time = cachedFields.timestamp ? new Date(cachedFields.timestamp) : new Date();
        setCacheTimestamp(time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      } else {
        setError((err as Error).message || "Failed to fetch fields");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFarmChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const farm = farms.find(f => f.id === e.target.value);
    if (farm) {
      setSelectedFarm(farm);
      fetchFields(farm.id);
    }
  };

  const handleFieldSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFarm) return;
    setError(null);
    setSuccess(null);
    setIsAddingField(true);

    try {
      const payload = {
        farm_id: selectedFarm.id,
        name: fieldForm.name,
        area_hectares: parseFloat(fieldForm.area_hectares),
        soil_type: fieldForm.soil_type,
      };

      await api.post("/fields", payload);
      setSuccess("Field added successfully!");
      setFieldForm({ name: "", area_hectares: "", soil_type: "loam" });
      fetchFields(selectedFarm.id);
    } catch (err) {
      setError((err as Error).message || "Failed to add field");
    } finally {
      setIsAddingField(false);
    }
  };

  const handleCropSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsAddingCrop(true);

    try {
      const payload = {
        field_id: cropForm.field_id,
        name: cropForm.name,
        variety: cropForm.variety || undefined,
        planted_at: new Date(cropForm.planted_at).toISOString(),
      };

      await api.post("/crops", payload);
      setSuccess("Crop registered successfully!");
      setCropForm({
        field_id: "",
        name: "Wheat",
        variety: "",
        planted_at: new Date().toISOString().split("T")[0],
      });
      setActiveCropFormId(null);
      if (selectedFarm) fetchFields(selectedFarm.id);
    } catch (err) {
      setError((err as Error).message || "Failed to register crop");
    } finally {
      setIsAddingCrop(false);
    }
  };

  const handleDeleteField = async (fieldId: string) => {
    if (!confirm("Are you sure you want to delete this field? This will delete all crops and sensors associated with it.")) return;
    setError(null);
    try {
      await api.delete(`/fields/${fieldId}`);
      setSuccess("Field deleted successfully");
      if (selectedFarm) fetchFields(selectedFarm.id);
    } catch (err) {
      setError((err as Error).message || "Failed to delete field");
    }
  };

  if (authLoading) return null;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 px-4 py-8 sm:px-6 lg:px-8 pb-24 md:pb-8">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* Offline Alert Banner */}
        {!isOnline && (
          <div className="bg-amber-600 text-neutral-950 font-bold text-center py-2.5 px-4 rounded-2xl text-xs flex justify-center items-center gap-1.5 shadow-md">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>You are offline. Showing last synchronized information. {cacheTimestamp && `(Last synced: ${cacheTimestamp})`}</span>
          </div>
        )}
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">{t("fields.title")}</h1>
            <p className="text-neutral-400 text-sm mt-1">
              {t("fields.subtitle")}
            </p>
          </div>

          {farms.length > 0 && (
            <div>
              <label htmlFor="active-farm-select" className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest block mb-1">{t("fields.active_farm")}</label>
              <select
                id="active-farm-select"
                value={selectedFarm?.id || ""}
                onChange={handleFarmChange}
                className="bg-neutral-900 border border-neutral-800 text-sm text-neutral-200 rounded-xl px-4 py-2 outline-none focus:border-emerald-500/50 w-60"
              >
                {farms.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>
          )}
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

        {farms.length === 0 ? (
          <div className="bg-neutral-900/40 border border-neutral-800 rounded-3xl p-12 text-center max-w-xl mx-auto shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-2">{t("fields.no_farms_found")}</h2>
            <p className="text-xs text-neutral-400 mb-6">
              {t("farms.no_farms")}
            </p>
            <Link href="/farms" className="bg-emerald-500 text-neutral-950 font-bold text-xs px-5 py-3 rounded-xl">
              {t("fields.register_farm_link")}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Add Field Panel */}
            <div className="bg-neutral-900/40 border border-neutral-800/80 rounded-3xl p-6 shadow-2xl backdrop-blur-md h-fit">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <span>➕</span> {t("fields.add_field")}
              </h2>

              <form onSubmit={handleFieldSubmit} className="space-y-4">
                <div>
                  <label htmlFor="field-name" className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1.5">
                    {t("fields.field_name")}
                  </label>
                  <input
                    id="field-name"
                    type="text"
                    required
                    value={fieldForm.name}
                    onChange={(e) => setFieldForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="North Wheat Block"
                    autoComplete="off"
                    className="w-full bg-neutral-950/80 border border-neutral-800 text-sm text-neutral-200 rounded-xl px-4 py-2.5 outline-none focus:border-emerald-500/50"
                  />
                </div>

                <div>
                  <label htmlFor="field-area" className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1.5">
                    {t("fields.area")}
                  </label>
                  <input
                    id="field-area"
                    type="number"
                    step="0.01"
                    required
                    value={fieldForm.area_hectares}
                    onChange={(e) => setFieldForm(prev => ({ ...prev, area_hectares: e.target.value }))}
                    placeholder="1.2"
                    autoComplete="off"
                    className="w-full bg-neutral-950/80 border border-neutral-800 text-sm text-neutral-200 rounded-xl px-4 py-2.5 outline-none focus:border-emerald-500/50"
                  />
                </div>

                <div>
                  <label htmlFor="field-soil" className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1.5">
                    {t("fields.soil_type")}
                  </label>
                  <select
                    id="field-soil"
                    value={fieldForm.soil_type}
                    onChange={(e) => setFieldForm(prev => ({ ...prev, soil_type: e.target.value }))}
                    className="w-full bg-neutral-950/80 border border-neutral-800 text-sm text-neutral-200 rounded-xl px-4 py-2.5 outline-none focus:border-emerald-500/50"
                  >
                    <option value="loam">{t("farms.loam")}</option>
                    <option value="clay">{t("farms.clay")}</option>
                    <option value="sandy">{t("farms.sandy")}</option>
                    <option value="silt">{t("farms.silt")}</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={isAddingField}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-neutral-950 font-bold text-sm py-3 px-4 rounded-xl transition-all duration-200 mt-4 cursor-pointer"
                >
                  {isAddingField ? t("common.loading") : t("fields.add_field")}
                </button>
              </form>
            </div>

            {/* Field & Crops List */}
            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <span>🌱</span> {t("nav.fields")} ({fields.length})
              </h2>

              {loading ? (
                <div className="py-12 flex justify-center">
                  <span className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : fields.length === 0 ? (
                <div className="bg-neutral-900/20 border border-neutral-800/80 rounded-3xl p-12 text-center text-neutral-500 text-xs">
                  {t("common.no_data")}
                </div>
              ) : (
                <div className="space-y-6">
                  {fields.map((field) => {
                    const crops = fieldCrops[field.id] || [];
                    return (
                      <div
                        key={field.id}
                        className="bg-neutral-900/40 border border-neutral-800/80 rounded-3xl p-6 shadow-xl backdrop-blur-md"
                      >
                        {/* Field Header */}
                        <div className="flex justify-between items-start border-b border-neutral-800/80 pb-4 mb-4">
                          <div>
                            <Link href={`/fields/${field.id}`} className="hover:text-emerald-400 transition-colors group flex items-center gap-1">
                              <h3 className="font-extrabold text-white group-hover:text-emerald-400 text-base">{field.name}</h3>
                              <ChevronRight className="w-4 h-4 text-neutral-500 group-hover:text-emerald-400 transition-colors" />
                            </Link>
                            <span className="text-[10px] text-neutral-400 capitalize">
                              {t("fields.soil_type")}: {field.soil_type || "Loam"} • {t("farms.area_size")}: {field.area_hectares} ha
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => {
                                setCropForm(prev => ({ ...prev, field_id: field.id }));
                                setActiveCropFormId(activeCropFormId === field.id ? null : field.id);
                              }}
                              className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1.5 rounded-xl font-bold cursor-pointer"
                            >
                              {t("fields.plant_crop")}
                            </button>
                            <button
                              onClick={() => handleDeleteField(field.id)}
                              className="text-neutral-500 hover:text-rose-400 text-sm cursor-pointer"
                              title={t("fields.delete_field")}
                            >
                              🗑️
                            </button>
                          </div>
                        </div>

                        {/* Plant Crop Inline Form */}
                        {activeCropFormId === field.id && (
                          <div className="bg-neutral-950/80 border border-neutral-800/80 rounded-2xl p-4 mb-4">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-3">{t("fields.plant_crop")}</h4>
                            <form onSubmit={handleCropSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                              <div>
                                <label htmlFor={"crop-type-" + field.id} className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">{t("fields.crop_name")}</label>
                                <select
                                  id={"crop-type-" + field.id}
                                  value={cropForm.name}
                                  onChange={(e) => setCropForm(prev => ({ ...prev, name: e.target.value }))}
                                  className="w-full bg-neutral-900 border border-neutral-800 text-xs text-neutral-200 rounded-lg p-2 outline-none"
                                >
                                  <option value="Wheat">Wheat</option>
                                  <option value="Rice">Rice</option>
                                  <option value="Cotton">Cotton</option>
                                  <option value="Maize">Maize</option>
                                  <option value="Tomato">Tomato</option>
                                </select>
                              </div>

                              <div>
                                <label htmlFor={"crop-variety-" + field.id} className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">{t("fields.variety")}</label>
                                <input
                                  id={"crop-variety-" + field.id}
                                  type="text"
                                  value={cropForm.variety}
                                  onChange={(e) => setCropForm(prev => ({ ...prev, variety: e.target.value }))}
                                  placeholder="IR-64, Sonora"
                                  autoComplete="off"
                                  className="w-full bg-neutral-900 border border-neutral-800 text-xs text-neutral-200 rounded-lg p-2 outline-none"
                                />
                              </div>

                              <button
                                type="submit"
                                disabled={isAddingCrop}
                                className="bg-emerald-500 hover:bg-emerald-600 text-neutral-950 font-bold text-xs p-2 rounded-lg transition-all duration-200 cursor-pointer"
                              >
                                {isAddingCrop ? t("common.loading") : t("fields.add_crop")}
                              </button>
                            </form>
                          </div>
                        )}

                        {/* Crop List in Field */}
                        <div className="space-y-3">
                          <span className="text-[9px] text-neutral-400 font-bold uppercase tracking-wider block">{t("fields.registered_crops")} ({crops.length})</span>
                          {crops.length === 0 ? (
                            <p className="text-xs text-neutral-500 italic">{t("common.no_data")}</p>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {crops.map((c) => (
                                <div
                                  key={c.id}
                                  className="bg-neutral-950/60 border border-neutral-800/60 p-3.5 rounded-2xl flex justify-between items-center"
                                >
                                  <div>
                                    <h4 className="font-extrabold text-white text-sm">{c.name}</h4>
                                    <span className="text-[10px] text-neutral-400">{c.variety || "Local Variety"}</span>
                                    <p className="text-[9px] text-neutral-500 mt-1">{t("fields.planted_at")}: {new Date(c.planted_at).toLocaleDateString("en-IN")}</p>
                                  </div>
                                  
                                  <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase">
                                    {c.status}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
