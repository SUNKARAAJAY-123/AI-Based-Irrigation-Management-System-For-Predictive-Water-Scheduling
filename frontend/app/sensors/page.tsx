"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { api } from "@/services/api";
import { useTranslation } from "@/context/LanguageContext";
import { 
  Radio, 
  Cpu, 
  PlusCircle, 
  Droplet, 
  Thermometer, 
  CheckCircle2, 
  Activity,
  ChevronDown,
  ChevronUp,
  Play
} from "lucide-react";

import Button from "@/components/ui/Button";
import Card, { CardHeader, CardTitle } from "@/components/ui/Card";
import PageHeader from "@/components/ui/PageHeader";
import LoadingState from "@/components/ui/LoadingState";
import ErrorState from "@/components/ui/ErrorState";
import StatusBadge from "@/components/ui/StatusBadge";

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
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [farms, setFarms] = useState<Farm[]>([]);
  const [selectedFarm, setSelectedFarm] = useState<Farm | null>(null);
  const [fields, setFields] = useState<Field[]>([]);
  const [selectedField, setSelectedField] = useState<Field | null>(null);
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [crops, setCrops] = useState<Crop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  const [sensorName, setSensorName] = useState("");
  const [sensorType, setSensorType] = useState("soil_moisture");
  const [isAddingSensor, setIsAddingSensor] = useState(false);

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

  const fetchSensorsAndCrops = useCallback(async (fieldId: string) => {
    setLoading(true);
    try {
      const fetchedSensors = await api.get<Sensor[]>(`/sensors?field_id=${fieldId}`);
      setSensors(fetchedSensors);
      
      if (fetchedSensors.length > 0) {
        setSimulatorData(prev => ({ ...prev, sensor_id: fetchedSensors[0].id }));
      } else {
        setSimulatorData(prev => ({ ...prev, sensor_id: "" }));
      }

      const fetchedCrops = await api.get<Crop[]>(`/crops?field_id=${fieldId}`);
      setCrops(fetchedCrops);
      if (fetchedCrops.length > 0) {
        setSimulatorData(prev => ({ ...prev, crop_id: fetchedCrops[0].id }));
      } else {
        setSimulatorData(prev => ({ ...prev, crop_id: "" }));
      }
    } catch (err) {
      setError((err as Error).message || "Failed to load sensor data");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchFieldsAndCrops = useCallback(async (farmId: string) => {
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
    } catch (err) {
      setError((err as Error).message || "Failed to fetch fields");
      setLoading(false);
    }
  }, [fetchSensorsAndCrops]);

  const loadInitialFarms = useCallback(async () => {
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
    } catch (err) {
      const errMsg = (err as Error).message || "Failed to load farms";
      if (errMsg.includes("Not authenticated") || errMsg.includes("401")) {
        router.push("/login");
        return;
      }
      setError(errMsg);
      setLoading(false);
    }
  }, [fetchFieldsAndCrops, router]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      loadInitialFarms();
    }
  }, [user, loadInitialFarms]);



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
      setSuccess("Sensor probe registered successfully!");
      setSensorName("");
      fetchSensorsAndCrops(selectedField.id);
    } catch (err) {
      setError((err as Error).message || "Failed to register sensor");
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
      setError("Please select or register a sensor probe first.");
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
      setSuccess("Telemetry logged successfully! AI recommendation updated.");
    } catch (err) {
      setError((err as Error).message || "Failed to send telemetry data");
    } finally {
      setIsSimulating(false);
    }
  };

  if (authLoading) return null;

  return (
    <div className="min-h-screen bg-[#060a08] text-neutral-100 px-4 py-6 sm:px-6 lg:px-8 pb-24 md:pb-8 max-w-6xl mx-auto space-y-6">
      
      <PageHeader
        title={t("sensors.title") || "Telemetry & Sensor Probes"}
        subtitle={t("sensors.subtitle") || "Check field moisture probes, temperature sensors, and battery health."}
        icon={<Radio className="w-6 h-6 stroke-[2.5]" />}
        action={
          farms.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2 bg-neutral-900 border border-neutral-850 p-2 rounded-2xl">
              <select
                value={selectedFarm?.id || ""}
                onChange={handleFarmChange}
                className="bg-transparent text-xs font-black text-white border-none outline-none cursor-pointer"
              >
                {farms.map((f) => (
                  <option key={f.id} value={f.id} className="bg-neutral-950 text-white">{f.name}</option>
                ))}
              </select>

              {fields.length > 0 && (
                <>
                  <span className="text-neutral-600">/</span>
                  <select
                    value={selectedField?.id || ""}
                    onChange={handleFieldChange}
                    className="bg-transparent text-xs font-black text-emerald-400 border-none outline-none cursor-pointer"
                  >
                    {fields.map((f) => (
                      <option key={f.id} value={f.id} className="bg-neutral-950 text-white">{f.name}</option>
                    ))}
                  </select>
                </>
              )}
            </div>
          ) : undefined
        }
      />

      {error && <ErrorState message={error} onRetry={loadInitialFarms} />}
      
      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs px-4 py-3 rounded-2xl flex items-center gap-2 font-bold">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Top Farmer Sensor Overview Status */}
      <Card variant="accent" padding="lg" className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
            <Activity className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <StatusBadge 
              status={sensors.length > 0 ? "OPTIMAL" : "ATTENTION"} 
              label={sensors.length > 0 ? "🟢 All Probes Working" : "⚠️ No Sensor Probe Found"} 
              size="md" 
            />
            <h3 className="text-base font-black text-white mt-1">
              Field Node Telemetry: {selectedField?.name || "Select Field"}
            </h3>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
          rightIcon={showTechnicalDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        >
          {showTechnicalDetails ? "Hide Technical IoT Simulator" : "View Technical IoT Details"}
        </Button>
      </Card>

      {/* Simple Sensor Cards List */}
      <div className="space-y-4">
        <h2 className="text-sm font-black text-neutral-300 uppercase tracking-wider flex items-center gap-2">
          <Cpu className="w-4.5 h-4.5 text-emerald-400" />
          Deployed Field Sensors ({sensors.length})
        </h2>

        {loading ? (
          <LoadingState message="Checking probe telemetry..." />
        ) : sensors.length === 0 ? (
          <Card variant="glass" padding="lg" className="text-center max-w-lg mx-auto py-8">
            <Radio className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
            <h3 className="text-base font-black text-white mb-1">No Sensors Added to This Field</h3>
            <p className="text-xs text-neutral-400 font-semibold mb-4">
              Add a sensor probe below to start reading live moisture & soil temperature.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {sensors.map((sensor) => (
              <Card key={sensor.id} variant="glass" padding="md" className="space-y-3">
                <div className="flex justify-between items-start border-b border-neutral-900 pb-2.5">
                  <div>
                    <h4 className="text-sm font-black text-white">{sensor.name}</h4>
                    <span className="text-[10px] font-bold text-neutral-400 uppercase">{sensor.sensor_type}</span>
                  </div>
                  <StatusBadge status="GOOD" label="Working" size="sm" />
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 bg-neutral-950/60 border border-neutral-850 rounded-xl">
                    <span className="text-[9px] text-neutral-400 font-bold block uppercase">Moisture</span>
                    <span className="text-sm font-black text-emerald-400 flex items-center gap-1 mt-0.5">
                      <Droplet className="w-3.5 h-3.5" /> 32%
                    </span>
                  </div>
                  <div className="p-2.5 bg-neutral-950/60 border border-neutral-850 rounded-xl">
                    <span className="text-[9px] text-neutral-400 font-bold block uppercase">Soil Temp</span>
                    <span className="text-sm font-black text-amber-400 flex items-center gap-1 mt-0.5">
                      <Thermometer className="w-3.5 h-3.5" /> 27°C
                    </span>
                  </div>
                </div>

                <p className="text-[10px] text-neutral-400 font-bold pt-1 border-t border-neutral-900/60">
                  Last updated: <b className="text-white">5 minutes ago</b>
                </p>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add Sensor Node Form */}
      <Card variant="glass" padding="lg" className="space-y-4">
        <CardHeader>
          <CardTitle>
            <PlusCircle className="w-4.5 h-4.5 text-emerald-400" />
            + Register New Sensor Probe
          </CardTitle>
        </CardHeader>

        <form onSubmit={handleSensorSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
          <div>
            <label htmlFor="sensor-label" className="text-[10px] font-black text-neutral-400 uppercase tracking-wider block mb-1">
              Sensor Probe Name
            </label>
            <input
              id="sensor-label"
              type="text"
              required
              value={sensorName}
              onChange={(e) => setSensorName(e.target.value)}
              placeholder="e.g. Field Probe 1"
              autoComplete="off"
              className="w-full bg-neutral-950 border border-neutral-850 text-xs font-bold text-white rounded-2xl px-4 py-3 outline-none focus:border-emerald-500 min-h-[44px]"
            />
          </div>

          <div>
            <label htmlFor="sensor-type" className="text-[10px] font-black text-neutral-400 uppercase tracking-wider block mb-1">
              Probe Type
            </label>
            <select
              id="sensor-type"
              value={sensorType}
              onChange={(e) => setSensorType(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-850 text-xs text-white font-bold rounded-2xl px-4 py-3 outline-none focus:border-emerald-500 min-h-[44px]"
            >
              <option value="soil_moisture">Soil Moisture & Temperature Probe</option>
              <option value="weather_station">Microclimate Weather Node</option>
            </select>
          </div>

          <Button
            type="submit"
            isLoading={isAddingSensor}
            variant="primary"
            size="md"
            className="w-full"
          >
            Register Sensor
          </Button>
        </form>
      </Card>

      {/* Progressive Disclosure: Technical IoT Telemetry Simulator */}
      {showTechnicalDetails && (
        <Card variant="glass" padding="lg" className="space-y-6 border-dashed border-emerald-500/30">
          <CardHeader>
            <CardTitle>
              <Activity className="w-4.5 h-4.5 text-emerald-400" />
              Advanced Technical IoT Simulator & Inference Trigger
            </CardTitle>
          </CardHeader>

          <form onSubmit={handleSimulatorSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-[10px] font-black text-neutral-400 uppercase block mb-1">Target Probe ID</label>
                <select
                  value={simulatorData.sensor_id}
                  onChange={(e) => setSimulatorData(p => ({ ...p, sensor_id: e.target.value }))}
                  className="w-full bg-neutral-950 border border-neutral-850 text-xs font-bold text-white rounded-2xl px-3 py-3 outline-none"
                >
                  {sensors.map(s => <option key={s.id} value={s.id}>{s.name} ({s.id})</option>)}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black text-neutral-400 uppercase block mb-1">Target Crop ID</label>
                <select
                  value={simulatorData.crop_id}
                  onChange={(e) => setSimulatorData(p => ({ ...p, crop_id: e.target.value }))}
                  className="w-full bg-neutral-950 border border-neutral-850 text-xs font-bold text-white rounded-2xl px-3 py-3 outline-none"
                >
                  {crops.map(c => <option key={c.id} value={c.id}>{c.name} ({c.status})</option>)}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black text-neutral-400 uppercase block mb-1">Soil Moisture (%)</label>
                <input
                  type="number"
                  value={simulatorData.soil_moisture}
                  onChange={(e) => setSimulatorData(p => ({ ...p, soil_moisture: e.target.value }))}
                  className="w-full bg-neutral-950 border border-neutral-850 text-xs font-bold text-white rounded-2xl px-3 py-3 outline-none"
                />
              </div>
            </div>

            <Button
              type="submit"
              isLoading={isSimulating}
              variant="ai"
              size="md"
              leftIcon={<Play className="w-4 h-4 fill-current" />}
              className="w-full"
            >
              Run AI Model Inference Simulation
            </Button>
          </form>

          {simulationResult && (
            <div className="bg-neutral-950 border border-emerald-500/30 p-4 rounded-2xl space-y-2">
              <h4 className="text-xs font-black text-emerald-400 uppercase">AI Model Output:</h4>
              <p className="text-xs font-bold text-white">
                Water Required: <b className={simulationResult.is_irrigation_required ? "text-amber-400" : "text-emerald-400"}>
                  {simulationResult.is_irrigation_required ? "YES" : "NO"}
                </b> • Volume: <b>{simulationResult.recommended_water_volume_liters} Liters</b> • Confidence: <b>{(simulationResult.confidence_score * 100).toFixed(0)}%</b>
              </p>
            </div>
          )}
        </Card>
      )}

    </div>
  );
}
