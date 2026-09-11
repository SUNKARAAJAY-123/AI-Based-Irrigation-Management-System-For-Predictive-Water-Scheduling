"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/services/api";
import { useTranslation } from "@/context/LanguageContext";
import { useOfflineCache } from "@/hooks/useOfflineCache";
import { 
  Sprout, 
  Layers, 
  ChevronRight, 
  AlertTriangle, 
  PlusCircle, 
  Trash2, 
  CheckCircle2
} from "lucide-react";

import Button from "@/components/ui/Button";
import Card, { CardHeader, CardTitle } from "@/components/ui/Card";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import LoadingState from "@/components/ui/LoadingState";
import ErrorState from "@/components/ui/ErrorState";
import StatusBadge from "@/components/ui/StatusBadge";

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

  const [farms, setFarms] = useState<Farm[]>([]);
  const [selectedFarm, setSelectedFarm] = useState<Farm | null>(null);
  const [fields, setFields] = useState<Field[]>([]);
  const [fieldCrops, setFieldCrops] = useState<{ [fieldId: string]: Crop[] }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [cacheTimestamp, setCacheTimestamp] = useState<string | null>(null);

  const [fieldForm, setFieldForm] = useState({
    name: "",
    area_hectares: "",
    soil_type: "loam",
  });
  const [isAddingField, setIsAddingField] = useState(false);

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
    if (!confirm("Are you sure you want to remove this field? Connected crops and sensors will also be deleted.")) return;
    setError(null);
    try {
      await api.delete(`/fields/${fieldId}`);
      setSuccess("Field removed successfully");
      if (selectedFarm) fetchFields(selectedFarm.id);
    } catch (err) {
      setError((err as Error).message || "Failed to delete field");
    }
  };

  if (authLoading) return null;

  return (
    <div className="min-h-screen bg-[#060a08] text-neutral-100 px-4 py-6 sm:px-6 lg:px-8 pb-24 md:pb-8 max-w-6xl mx-auto space-y-6">
      
      {!isOnline && (
        <div className="bg-amber-500 text-neutral-950 font-black text-center py-2.5 px-4 rounded-2xl text-xs flex justify-center items-center gap-2 shadow-md">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>Working offline. Showing last synchronized fields. {cacheTimestamp && `(${cacheTimestamp})`}</span>
        </div>
      )}

      <PageHeader
        title={t("fields.title") || "Field & Crop Management"}
        subtitle={t("fields.subtitle") || "Organize your land into active fields, plant crops, and check moisture levels."}
        icon={<Layers className="w-6 h-6 stroke-[2.5]" />}
        action={
          farms.length > 0 ? (
            <div className="flex items-center gap-2 bg-neutral-900 border border-neutral-850 px-3 py-2 rounded-2xl">
              <span className="text-[10px] font-black text-neutral-400 uppercase">Farm:</span>
              <select
                value={selectedFarm?.id || ""}
                onChange={handleFarmChange}
                className="bg-transparent text-xs font-black text-emerald-400 border-none outline-none cursor-pointer"
              >
                {farms.map((f) => (
                  <option key={f.id} value={f.id} className="bg-neutral-950 text-white">{f.name}</option>
                ))}
              </select>
            </div>
          ) : undefined
        }
      />

      {error && <ErrorState message={error} onRetry={loadFarms} />}
      
      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs px-4 py-3 rounded-2xl flex items-center gap-2 font-bold">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {farms.length === 0 ? (
        <Card variant="glass" padding="lg" className="text-center max-w-xl mx-auto py-10">
          <Sprout className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
          <h2 className="text-lg font-black text-white mb-1">No Farms Found</h2>
          <p className="text-xs text-neutral-400 mb-6 font-semibold">
            Register a farm plot first before adding field sections and planting crops.
          </p>
          <Link href="/farms">
            <Button variant="primary" size="md">
              + Add First Farm
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Add Field Form Card */}
          <Card variant="glass" padding="lg" className="h-fit">
            <CardHeader>
              <CardTitle>
                <PlusCircle className="w-4.5 h-4.5 text-emerald-400" />
                + Add Field to {selectedFarm?.name || "Farm"}
              </CardTitle>
            </CardHeader>

            <form onSubmit={handleFieldSubmit} className="space-y-4">
              <div>
                <label htmlFor="field-name" className="text-[10px] font-black text-neutral-400 uppercase tracking-wider block mb-1">
                  Field Section Name
                </label>
                <input
                  id="field-name"
                  type="text"
                  required
                  value={fieldForm.name}
                  onChange={(e) => setFieldForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Tomato Field A"
                  autoComplete="off"
                  className="w-full bg-neutral-950 border border-neutral-850 text-xs font-bold text-white rounded-2xl px-4 py-3 outline-none focus:border-emerald-500 min-h-[44px]"
                />
              </div>

              <div>
                <label htmlFor="field-area" className="text-[10px] font-black text-neutral-400 uppercase tracking-wider block mb-1">
                  Area Size (in Hectares)
                </label>
                <input
                  id="field-area"
                  type="number"
                  step="0.01"
                  required
                  value={fieldForm.area_hectares}
                  onChange={(e) => setFieldForm(prev => ({ ...prev, area_hectares: e.target.value }))}
                  placeholder="e.g. 1.2"
                  autoComplete="off"
                  className="w-full bg-neutral-950 border border-neutral-850 text-xs font-bold text-white rounded-2xl px-4 py-3 outline-none focus:border-emerald-500 min-h-[44px]"
                />
              </div>

              <div>
                <label htmlFor="field-soil" className="text-[10px] font-black text-neutral-400 uppercase tracking-wider block mb-1">
                  Soil Type
                </label>
                <select
                  id="field-soil"
                  value={fieldForm.soil_type}
                  onChange={(e) => setFieldForm(prev => ({ ...prev, soil_type: e.target.value }))}
                  className="w-full bg-neutral-950 border border-neutral-850 text-xs text-white font-bold rounded-2xl px-4 py-3 outline-none focus:border-emerald-500 min-h-[44px]"
                >
                  <option value="loam">Loam Soil (సారవంతమైన నేల)</option>
                  <option value="clay">Clay Soil (మట్టి నేల)</option>
                  <option value="sandy">Sandy Soil (ఇసుక నేల)</option>
                  <option value="silt">Silt Soil (గాదరు నేల)</option>
                </select>
              </div>

              <Button
                type="submit"
                isLoading={isAddingField}
                variant="primary"
                size="md"
                className="w-full mt-2"
              >
                Create Field
              </Button>
            </form>
          </Card>

          {/* Fields List */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex justify-between items-center border-b border-neutral-900 pb-3">
              <h2 className="text-sm font-black text-neutral-300 uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4.5 h-4.5 text-emerald-400" />
                Active Field Sections ({fields.length})
              </h2>
            </div>

            {loading ? (
              <LoadingState message="Loading fields and crop status..." />
            ) : fields.length === 0 ? (
              <EmptyState
                icon={<Layers className="w-8 h-8" />}
                title="No Fields Created Yet"
                description="Add your first field section on the left to start planting crops and scheduling automated irrigation."
              />
            ) : (
              <div className="space-y-4">
                {fields.map((field) => {
                  const crops = fieldCrops[field.id] || [];
                  return (
                    <Card
                      key={field.id}
                      variant="glass"
                      padding="lg"
                      className="hover:border-emerald-500/30 transition-all shadow-md"
                    >
                      {/* Header Row */}
                      <div className="flex justify-between items-start border-b border-neutral-900 pb-3 mb-3">
                        <div>
                          <Link href={`/fields/${field.id}`} className="hover:text-emerald-400 transition-colors group flex items-center gap-1.5">
                            <h3 className="font-black text-white group-hover:text-emerald-400 text-base">{field.name}</h3>
                            <ChevronRight className="w-4 h-4 text-neutral-500 group-hover:text-emerald-400" />
                          </Link>
                          <span className="text-[11px] font-bold text-neutral-400 mt-0.5 block">
                            Soil: <b className="text-emerald-400">{field.soil_type || "Loam"}</b> • Area: <b className="text-white">{field.area_hectares} ha</b>
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setCropForm(prev => ({ ...prev, field_id: field.id }));
                              setActiveCropFormId(activeCropFormId === field.id ? null : field.id);
                            }}
                          >
                            + Plant Crop
                          </Button>

                          <button
                            onClick={() => handleDeleteField(field.id)}
                            className="p-2 text-neutral-500 hover:text-rose-400 rounded-xl hover:bg-rose-500/10 transition-colors touch-target"
                            title="Remove Field"
                          >
                            <Trash2 className="w-4.5 h-4.5" />
                          </button>
                        </div>
                      </div>

                      {/* Plant Crop Modal Inline Form */}
                      {activeCropFormId === field.id && (
                        <div className="bg-neutral-950 border border-emerald-500/30 rounded-2xl p-4 mb-4 space-y-3">
                          <h4 className="text-xs font-black text-emerald-400 uppercase tracking-wider">🌱 Plant New Crop in {field.name}</h4>
                          <form onSubmit={handleCropSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                            <div>
                              <label htmlFor={"crop-type-" + field.id} className="text-[10px] font-black text-neutral-400 uppercase tracking-wider block mb-1">Crop Type</label>
                              <select
                                id={"crop-type-" + field.id}
                                value={cropForm.name}
                                onChange={(e) => setCropForm(prev => ({ ...prev, name: e.target.value }))}
                                className="w-full bg-neutral-900 border border-neutral-850 text-xs font-bold text-white rounded-xl p-2.5 outline-none min-h-[44px]"
                              >
                                <option value="Wheat">Wheat (గోధుమ / गेहूं)</option>
                                <option value="Rice">Rice / Paddy (వరి / धान)</option>
                                <option value="Cotton">Cotton (పత్తి / कपास)</option>
                                <option value="Maize">Maize (జొన్న / मक्का)</option>
                                <option value="Tomato">Tomato (టమోటా / टमाटर)</option>
                              </select>
                            </div>

                            <div>
                              <label htmlFor={"crop-variety-" + field.id} className="text-[10px] font-black text-neutral-400 uppercase tracking-wider block mb-1">Variety (Optional)</label>
                              <input
                                id={"crop-variety-" + field.id}
                                type="text"
                                value={cropForm.variety}
                                onChange={(e) => setCropForm(prev => ({ ...prev, variety: e.target.value }))}
                                placeholder="e.g. Hybrid IR-64"
                                autoComplete="off"
                                className="w-full bg-neutral-900 border border-neutral-850 text-xs font-bold text-white rounded-xl p-2.5 outline-none min-h-[44px]"
                              />
                            </div>

                            <Button
                              type="submit"
                              isLoading={isAddingCrop}
                              variant="primary"
                              size="sm"
                              className="w-full"
                            >
                              Confirm Planting
                            </Button>
                          </form>
                        </div>
                      )}

                      {/* Registered Crops List inside field */}
                      <div className="space-y-2 pt-1">
                        <span className="text-[10px] font-black text-neutral-400 uppercase tracking-wider block">
                          Crops Grown ({crops.length})
                        </span>
                        {crops.length === 0 ? (
                          <p className="text-xs text-neutral-500 font-bold italic">No crops currently planted in this field section.</p>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {crops.map((crop) => (
                              <div
                                key={crop.id}
                                className="bg-neutral-950/60 border border-neutral-850 p-3.5 rounded-2xl flex justify-between items-center"
                              >
                                <div className="flex items-center gap-2.5">
                                  <span className="text-xl">
                                    {crop.name.toLowerCase().includes("tomato") ? "🍅" : (crop.name.toLowerCase().includes("rice") ? "🌾" : "🌱")}
                                  </span>
                                  <div>
                                    <h4 className="font-black text-white text-xs">{crop.name}</h4>
                                    <span className="text-[10px] text-neutral-400 font-semibold">{crop.variety || "Standard Variety"}</span>
                                  </div>
                                </div>
                                
                                <StatusBadge status={crop.status || "HEALTHY"} size="sm" />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
