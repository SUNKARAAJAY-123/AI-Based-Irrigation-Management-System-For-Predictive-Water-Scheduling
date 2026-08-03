"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/services/api";

interface Farm {
  id: string;
  name: string;
}

interface Field {
  id: string;
  name: string;
}

interface Crop {
  id: string;
  name: string;
  status: string;
}

interface Sensor {
  id: string;
  field_id: string;
  name: string;
  sensor_type: string;
  status: string;
  created_at: string;
}

interface Recommendation {
  is_irrigation_required: boolean;
  recommended_water_volume_liters: number;
  best_irrigation_time?: string;
  risk_level: string;
  confidence_score: number;
  model_type: string;
}

export default function SensorsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // Data State
  const [farms, setFarms] = useState<Farm[]>([]);
  const [selectedFarm, setSelectedFarm] = useState<Farm | null>(null);
  const [fields, setFields] = useState<Field[]>([]);
  const [selectedField, setSelectedField] = useState<Field | null>(null);
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [crops, setCrops] = useState<Crop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Sensor Form State
  const [sensorName, setSensorName] = useState("");
  const [sensorType, setSensorType] = useState("soil_moisture");
  const [isAddingSensor, setIsAddingSensor] = useState(false);

  // Simulator Form State
  const [simulatorData, setSimulatorData] = useState({
    sensor_id: "",
    crop_id: "",
    soil_moisture: "32",
    soil_temperature: "24",
    ph_level: "6.5",
    nitrogen: "12",
    phosphorus: "15",
    potassium: "20",
    ambient_temperature: "",
    ambient_humidity: "",
  });
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<Recommendation | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      loadInitialFarms();
    }
  }, [user]);

  const loadInitialFarms = async () => {
    setLoading(true);
    try {
      const data = await api.get<Farm[]>("/farms");
      setFarms(data);
      if (data.length > 0) {
        setSelectedFarm(data[0]);
        await fetchFieldsAndCrops(data[0].id);
      } else {
        setLoading(false);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load farms");
      setLoading(false);
    }
  };

  const fetchFieldsAndCrops = async (farmId: string) => {
    try {
      const fetchedFields = await api.get<Field[]>(`/fields?farm_id=${farmId}`);
      setFields(fetchedFields);

      if (fetchedFields.length > 0) {
        const firstField = fetchedFields[0];
        setSelectedField(firstField);
        await fetchSensorsAndCrops(firstField.id);
      } else {
        setSelectedField(null);
        setSensors([]);
        setCrops([]);
        setLoading(false);
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch fields");
      setLoading(false);
    }
  };

  const fetchSensorsAndCrops = async (fieldId: string) => {
    setLoading(true);
    try {
      // 1. Fetch Sensors
      const fetchedSensors = await api.get<Sensor[]>(`/sensors?field_id=${fieldId}`);
      setSensors(fetchedSensors);
      
      // Update simulator sensor selection
      if (fetchedSensors.length > 0) {
        setSimulatorData(prev => ({ ...prev, sensor_id: fetchedSensors[0].id }));
      } else {
        setSimulatorData(prev => ({ ...prev, sensor_id: "" }));
      }

      // 2. Fetch Crops
      const fetchedCrops = await api.get<Crop[]>(`/crops?field_id=${fieldId}`);
      setCrops(fetchedCrops);
      if (fetchedCrops.length > 0) {
        setSimulatorData(prev => ({ ...prev, crop_id: fetchedCrops[0].id }));
      } else {
        setSimulatorData(prev => ({ ...prev, crop_id: "" }));
      }

    } catch (err: any) {
      setError(err.message || "Failed to load sensors or crops");
    } finally {
      setLoading(false);
    }
  };

  const handleFarmChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const farm = farms.find(f => f.id === e.target.value);
    if (farm) {
      setSelectedFarm(farm);
      fetchFieldsAndCrops(farm.id);
    }
  };

  const handleFieldChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const field = fields.find(f => f.id === e.target.value);
    if (field) {
      setSelectedField(field);
      fetchSensorsAndCrops(field.id);
    }
  };

  const handleSensorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedField) return;
    setError(null);
    setSuccess(null);
    setIsAddingSensor(true);

    try {
      const payload = {
        field_id: selectedField.id,
        name: sensorName,
        sensor_type: sensorType,
      };

      await api.post("/sensors", payload);
      setSuccess("Sensor registered successfully!");
      setSensorName("");
      fetchSensorsAndCrops(selectedField.id);
    } catch (err: any) {
      setError(err.message || "Failed to register sensor");
    } finally {
      setIsAddingSensor(false);
    }
  };

  const handleSimulatorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSimulationResult(null);
    setIsSimulating(true);

    const sensorId = simulatorData.sensor_id;
    if (!sensorId) {
      setError("Please select or register a sensor first.");
      setIsSimulating(false);
      return;
    }
    
    if (!simulatorData.crop_id) {
      setError("Please plant a crop in this field first.");
      setIsSimulating(false);
      return;
    }

    try {
      const payload = {
        crop_id: simulatorData.crop_id,
        sensor_id: sensorId,
        soil_moisture: parseFloat(simulatorData.soil_moisture),
        soil_temperature: parseFloat(simulatorData.soil_temperature),
        ph_level: parseFloat(simulatorData.ph_level),
        nitrogen: parseFloat(simulatorData.nitrogen),
        phosphorus: parseFloat(simulatorData.phosphorus),
        potassium: parseFloat(simulatorData.potassium),
        ambient_temperature: simulatorData.ambient_temperature ? parseFloat(simulatorData.ambient_temperature) : undefined,
        ambient_humidity: simulatorData.ambient_humidity ? parseFloat(simulatorData.ambient_humidity) : undefined,
      };

      const result = await api.post<Recommendation>(`/sensors/${sensorId}/telemetry`, payload);
      setSimulationResult(result);
      setSuccess("Telemetry logged successfully! AI irrigation recommendation updated.");
    } catch (err: any) {
      setError(err.message || "Failed to send telemetry data");
    } finally {
      setIsSimulating(false);
    }
  };

  if (authLoading) return null;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 px-4 py-8 sm:px-6 lg:px-8 pb-24 md:pb-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">Sensors & Telemetry</h1>
            <p className="text-neutral-400 text-sm mt-1">
              Register nodes and push real-time telemetry inputs
            </p>
          </div>

          {farms.length > 0 && (
            <div className="flex gap-3">
              <div>
                <label htmlFor="farm-select-header" className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest block mb-1">Farm</label>
                <select
                  id="farm-select-header"
                  value={selectedFarm?.id || ""}
                  onChange={handleFarmChange}
                  className="bg-neutral-900 border border-neutral-800 text-xs text-neutral-200 rounded-xl px-3 py-1.5 outline-none"
                >
                  {farms.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>
              
              {fields.length > 0 && (
                <div>
                  <label htmlFor="field-select-header" className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest block mb-1">Field</label>
                  <select
                    id="field-select-header"
                    value={selectedField?.id || ""}
                    onChange={handleFieldChange}
                    className="bg-neutral-900 border border-neutral-800 text-xs text-neutral-200 rounded-xl px-3 py-1.5 outline-none"
                  >
                    {fields.map((f) => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>
              )}
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

        {fields.length === 0 ? (
          <div className="bg-neutral-900/40 border border-neutral-800 rounded-3xl p-12 text-center max-w-xl mx-auto shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-2">No Fields Found</h2>
            <p className="text-xs text-neutral-400 mb-6">
              You must add a field to your farm before registering telemetry sensors.
            </p>
            <Link href="/fields" className="bg-emerald-500 text-neutral-950 font-bold text-xs px-5 py-3 rounded-xl">
              Configure Fields
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Register Sensor Form */}
            <div className="space-y-6">
              <div className="bg-neutral-900/40 border border-neutral-800/80 rounded-3xl p-6 shadow-2xl backdrop-blur-md">
                <h2 className="text-base font-bold mb-4 flex items-center gap-2">
                  <span>⚡</span> Register Sensor Node
                </h2>

                <form onSubmit={handleSensorSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="sensor-label" className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1.5">
                      Sensor Label
                    </label>
                    <input
                      id="sensor-label"
                      type="text"
                      required
                      value={sensorName}
                      onChange={(e) => setSensorName(e.target.value)}
                      placeholder="Telemetry Probe A-1"
                      autoComplete="off"
                      className="w-full bg-neutral-950/80 border border-neutral-800 text-sm text-neutral-200 rounded-xl px-4 py-2.5 outline-none focus:border-emerald-500/50"
                    />
                  </div>

                  <div>
                    <label htmlFor="sensor-type" className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1.5">
                      Sensor Type
                    </label>
                    <select
                      id="sensor-type"
                      value={sensorType}
                      onChange={(e) => setSensorType(e.target.value)}
                      className="w-full bg-neutral-950/80 border border-neutral-800 text-sm text-neutral-200 rounded-xl px-4 py-2.5 outline-none focus:border-emerald-500/50"
                    >
                      <option value="soil_moisture">Soil Moisture & Temp Probe</option>
                      <option value="weather_station">Microclimate Weather Node</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={isAddingSensor}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-neutral-950 font-bold text-sm py-3 px-4 rounded-xl transition-all duration-200 mt-4 cursor-pointer"
                  >
                    {isAddingSensor ? "Registering..." : "Register Sensor"}
                  </button>
                </form>
              </div>

              {/* Sensor Node Registry List */}
              <div className="bg-neutral-900/40 border border-neutral-800/80 rounded-3xl p-6 shadow-2xl backdrop-blur-md">
                <h2 className="text-sm font-bold text-neutral-300 mb-4">
                  Field Nodes ({sensors.length})
                </h2>
                
                {loading ? (
                  <div className="py-6 flex justify-center">
                    <span className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : sensors.length === 0 ? (
                  <p className="text-xs text-neutral-500 italic">No sensors registered in this field.</p>
                ) : (
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {sensors.map((s) => (
                      <div key={s.id} className="bg-neutral-950/50 border border-neutral-800/50 p-3 rounded-xl flex justify-between items-center">
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-white truncate">{s.name}</h4>
                          <span className="text-[9px] text-neutral-500 font-mono select-all block mt-0.5">{s.id}</span>
                        </div>
                        <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full text-[9px] font-bold">
                          Active
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Telemetry Simulator Form */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-neutral-900/40 border border-neutral-800/80 rounded-3xl p-6 shadow-2xl backdrop-blur-md">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <span>🎮</span> Telemetry IoT Simulator
                </h2>
                <p className="text-xs text-neutral-400 mb-6">
                  Simulate live IoT telemetry from the field probe to instantly trigger backend scikit-learn and TensorFlow model predictions.
                </p>

                <form onSubmit={handleSimulatorSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="sim-sensor-id" className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1.5">
                        Target Sensor Probe
                      </label>
                      <select
                        id="sim-sensor-id"
                        value={simulatorData.sensor_id}
                        onChange={(e) => setSimulatorData(prev => ({ ...prev, sensor_id: e.target.value }))}
                        className="w-full bg-neutral-950/80 border border-neutral-800 text-sm text-neutral-200 rounded-xl px-4 py-2.5 outline-none"
                      >
                        {sensors.length === 0 ? (
                          <option value="">No Active Sensors - Add one first</option>
                        ) : (
                          sensors.map((s) => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))
                        )}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="sim-crop-id" className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1.5">
                        Planted Crop
                      </label>
                      <select
                        id="sim-crop-id"
                        value={simulatorData.crop_id}
                        onChange={(e) => setSimulatorData(prev => ({ ...prev, crop_id: e.target.value }))}
                        className="w-full bg-neutral-950/80 border border-neutral-800 text-sm text-neutral-200 rounded-xl px-4 py-2.5 outline-none"
                      >
                        {crops.length === 0 ? (
                          <option value="">No Active Crops - Plant one first</option>
                        ) : (
                          crops.map((c) => (
                            <option key={c.id} value={c.id}>{c.name} ({c.status})</option>
                          ))
                        )}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="sim-soil-moisture" className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1.5">
                        Soil Moisture (VWC %)
                      </label>
                      <input
                        id="sim-soil-moisture"
                        type="number"
                        required
                        min="0"
                        max="100"
                        value={simulatorData.soil_moisture}
                        onChange={(e) => setSimulatorData(prev => ({ ...prev, soil_moisture: e.target.value }))}
                        autoComplete="off"
                        className="w-full bg-neutral-950/80 border border-neutral-800 text-sm text-neutral-200 rounded-xl px-4 py-2.5 outline-none focus:border-emerald-500/50"
                      />
                    </div>

                    <div>
                      <label htmlFor="sim-soil-temp" className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1.5">
                        Soil Temperature (°C)
                      </label>
                      <input
                        id="sim-soil-temp"
                        type="number"
                        required
                        value={simulatorData.soil_temperature}
                        onChange={(e) => setSimulatorData(prev => ({ ...prev, soil_temperature: e.target.value }))}
                        autoComplete="off"
                        className="w-full bg-neutral-950/80 border border-neutral-800 text-sm text-neutral-200 rounded-xl px-4 py-2.5 outline-none focus:border-emerald-500/50"
                      />
                    </div>

                    <div>
                      <label htmlFor="sim-soil-ph" className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1.5">
                        Soil pH Level
                      </label>
                      <input
                        id="sim-soil-ph"
                        type="number"
                        step="0.1"
                        required
                        value={simulatorData.ph_level}
                        onChange={(e) => setSimulatorData(prev => ({ ...prev, ph_level: e.target.value }))}
                        autoComplete="off"
                        className="w-full bg-neutral-950/80 border border-neutral-800 text-sm text-neutral-200 rounded-xl px-4 py-2.5 outline-none focus:border-emerald-500/50"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label htmlFor="sim-nitrogen" className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">N (Nitrogen)</label>
                        <input
                          id="sim-nitrogen"
                          type="number"
                          value={simulatorData.nitrogen}
                          onChange={(e) => setSimulatorData(prev => ({ ...prev, nitrogen: e.target.value }))}
                          autoComplete="off"
                          className="w-full bg-neutral-950/80 border border-neutral-800 text-xs text-neutral-200 rounded-lg p-2 outline-none text-center"
                        />
                      </div>
                      <div>
                        <label htmlFor="sim-phosphorus" className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">P (Phosphate)</label>
                        <input
                          id="sim-phosphorus"
                          type="number"
                          value={simulatorData.phosphorus}
                          onChange={(e) => setSimulatorData(prev => ({ ...prev, phosphorus: e.target.value }))}
                          autoComplete="off"
                          className="w-full bg-neutral-950/80 border border-neutral-800 text-xs text-neutral-200 rounded-lg p-2 outline-none text-center"
                        />
                      </div>
                      <div>
                        <label htmlFor="sim-potassium" className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">K (Potash)</label>
                        <input
                          id="sim-potassium"
                          type="number"
                          value={simulatorData.potassium}
                          onChange={(e) => setSimulatorData(prev => ({ ...prev, potassium: e.target.value }))}
                          autoComplete="off"
                          className="w-full bg-neutral-950/80 border border-neutral-800 text-xs text-neutral-200 rounded-lg p-2 outline-none text-center"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSimulating}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-neutral-950 font-bold text-sm py-3 px-4 rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isSimulating ? (
                      <span className="w-4 h-4 border-2 border-neutral-950 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      "🚀 Send Simulated Telemetry & Predict"
                    )}
                  </button>
                </form>
              </div>

              {/* Simulation Result Recommendation Modal/Box */}
              {simulationResult && (
                <div className="bg-neutral-900/40 border border-emerald-500/30 rounded-3xl p-6 shadow-2xl backdrop-blur-md animate-fadeIn">
                  <h3 className="text-base font-extrabold text-white mb-4 flex items-center gap-2">
                    <span>💡</span> Real-Time AI Inference Result
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-neutral-950/60 p-4 rounded-2xl border border-neutral-800/80">
                      <span className="text-[10px] text-neutral-400 font-bold uppercase block">Water required?</span>
                      <span className={`text-lg font-black block mt-2 ${
                        simulationResult.is_irrigation_required ? "text-rose-400" : "text-emerald-400"
                      }`}>
                        {simulationResult.is_irrigation_required ? "⚠️ Yes (Irrigate)" : "🟢 No (Optimal)"}
                      </span>
                    </div>

                    <div className="bg-neutral-950/60 p-4 rounded-2xl border border-neutral-800/80">
                      <span className="text-[10px] text-neutral-400 font-bold uppercase block">Water Quantity</span>
                      <span className="text-xl font-black text-white block mt-2">
                        {simulationResult.recommended_water_volume_liters} Liters
                      </span>
                      <span className="text-[9px] text-neutral-500 mt-0.5 block">per square meter</span>
                    </div>

                    <div className="bg-neutral-950/60 p-4 rounded-2xl border border-neutral-800/80">
                      <span className="text-[10px] text-neutral-400 font-bold uppercase block">Risk Level</span>
                      <span className={`text-lg font-black block mt-2 capitalize ${
                        simulationResult.risk_level === "high" ? "text-rose-400" : (simulationResult.risk_level === "medium" ? "text-amber-400" : "text-emerald-400")
                      }`}>
                        {simulationResult.risk_level} Risk
                      </span>
                      <span className="text-[9px] text-neutral-500 mt-0.5 block">
                        {(simulationResult.confidence_score * 100).toFixed(0)}% confidence score
                      </span>
                    </div>
                  </div>
                  
                  <div className="mt-4 flex justify-end gap-3 text-xs">
                    <Link href="/dashboard" className="text-emerald-400 hover:text-emerald-300 font-bold py-2 px-4">
                      Go to Dashboard
                    </Link>
                  </div>
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
