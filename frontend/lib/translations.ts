// Static UI translations for AgriSmart Pro - 13 Indian Languages
export type Locale = 
  | "en-IN" | "hi-IN" | "te-IN" | "kn-IN" | "ta-IN" 
  | "mr-IN" | "bn-IN" | "ml-IN" | "gu-IN" | "pa-IN" 
  | "or-IN" | "as-IN" | "ur-IN";

export interface TranslationDictionary {
  header: {
    brand: string;
    online: string;
    offline: string;
    profile_settings: string;
    logout: string;
    user_role: string;
  };
  nav: {
    dashboard: string;
    farms: string;
    fields: string;
    sensors: string;
    weather: string;
    ai_tools: string;
    ml_predict: string;
    history: string;
    schedule: string;
    notifications: string;
    profile: string;
    admin: string;
    voice_assistant: string;
    irrigation: string;
    ai_assistant: string;
    logout: string;
  };
  dashboard: {
    title: string;
    subtitle: string;
    weather: string;
    moisture: string;
    health: string;
    today_schedule: string;
    next_irrigation: string;
    critical_alerts: string;
    ai_recommendation: string;
    water_usage: string;
    optimal: string;
    warning: string;
    critical: string;
    active_alerts: string;
    what_to_do: string;
    ask_assistant: string;
    report_button: string;
    manage: string;
    sync_alerts: string;
    soil_moisture_trend?: string;
    field_info?: string;
    no_alerts?: string;
    no_schedule?: string;
  };
  farms: {
    title: string;
    subtitle?: string;
    add_farm: string;
    farm_name: string;
    location: string;
    total_fields: string;
    actions: string;
    land_area?: string;
    soil_classification?: string;
    coordinates?: string;
    latitude?: string;
    longitude?: string;
    auto_detect?: string;
    register_plot?: string;
    registered_farms?: string;
    area_size?: string;
    delete_farm?: string;
    confirm_delete?: string;
    loam?: string;
    clay?: string;
    sandy?: string;
    silt?: string;
    no_farms?: string;
    farm_added?: string;
    farm_deleted?: string;
    register_a_farm?: string;
  };
  fields: {
    title: string;
    subtitle?: string;
    add_field: string;
    field_name: string;
    crop: string;
    status: string;
    action: string;
    edit_thresholds: string;
    save_thresholds: string;
    area: string;
    soil_type: string;
    active_farm?: string;
    no_farms_found?: string;
    register_farm_link?: string;
    registered_crops?: string;
    plant_crop?: string;
    crop_name?: string;
    variety?: string;
    planted_at?: string;
    add_crop?: string;
    delete_field?: string;
    confirm_delete?: string;
    field_added?: string;
    crop_registered?: string;
  };
  sensors: {
    title: string;
    subtitle?: string;
    add_sensor: string;
    sensor_id: string;
    sensor_label?: string;
    type: string;
    battery: string;
    signal: string;
    status: string;
    last_ping: string;
    online: string;
    offline: string;
    telemetry_simulator?: string;
    push_telemetry?: string;
    soil_moisture?: string;
    soil_temp?: string;
    ph_level?: string;
    nitrogen?: string;
    phosphorus?: string;
    potassium?: string;
    ambient_temp?: string;
    ambient_humidity?: string;
    no_fields?: string;
    configure_fields?: string;
    register_node?: string;
  };
  weather: {
    title: string;
    subtitle?: string;
    temp: string;
    humidity: string;
    wind: string;
    rain_prob: string;
    conditions: string;
    forecast: string;
    hourly_forecast?: string;
    daily_forecast?: string;
    uv_index?: string;
    pressure?: string;
    cloud_cover?: string;
    lookup_mode?: string;
    select_farm?: string;
    enter_gps?: string;
    detect_location?: string;
  };
  ai_tools: {
    title: string;
    subtitle?: string;
    ask_ai: string;
    recommendation: string;
    crop_advice: string;
    disease_diagnosis: string;
    risk_level?: string;
    confidence?: string;
    recommended_water?: string;
    best_time?: string;
    irrigation_required?: string;
    no_irrigation_required?: string;
    features_snapshot?: string;
    select_farm_field_crop?: string;
  };
  ml_predict: {
    title: string;
    subtitle?: string;
    model_type: string;
    run_prediction: string;
    confidence: string;
    predicted_moisture: string;
    optimal_schedule: string;
    model_comparison?: string;
    mae?: string;
    rmse?: string;
    r2?: string;
    training_time?: string;
    prediction_time?: string;
    model_size?: string;
    status?: string;
    explanation?: string;
    best_model?: string;
    fastest_model?: string;
    lowest_error?: string;
  };
  history: {
    title: string;
    subtitle?: string;
    logs: string;
    date: string;
    field: string;
    water_used: string;
    status: string;
    applied?: string;
    scheduled?: string;
    pending?: string;
    skipped?: string;
    manual_log?: string;
    log_applied_water?: string;
    filter_farm?: string;
    filter_field?: string;
    filter_crop?: string;
    no_history?: string;
  };
  schedule: {
    title: string;
    subtitle?: string;
    duration: string;
    time: string;
    status: string;
    scheduled: string;
    pending: string;
    applied: string;
    skipped: string;
    water_vol: string;
  };
  notifications: {
    title: string;
    subtitle?: string;
    mark_read: string;
    mark_all_read: string;
    all: string;
    critical: string;
    warning: string;
    info: string;
    empty_state: string;
    quiet_hours?: string;
    critical_only?: string;
  };
  profile: {
    title: string;
    subtitle?: string;
    full_name: string;
    email: string;
    phone_number: string;
    preferred_lang: string;
    update_profile: string;
    state?: string;
    district?: string;
    profile_updated?: string;
  };
  admin: {
    title: string;
    subtitle?: string;
    users: string;
    pending_approvals: string;
    roles: string;
    approve: string;
    block: string;
  };
  common: {
    save: string;
    cancel: string;
    edit: string;
    delete: string;
    submit: string;
    loading: string;
    error: string;
    success: string;
    retry: string;
    offline_banner: string;
    go_back: string;
    view_details: string;
    no_data: string;
    search?: string;
    filter?: string;
    refresh?: string;
    close?: string;
    confirm?: string;
  };
  settings: {
    title: string;
    language_selector: string;
    select_lang: string;
    phone_number: string;
    state: string;
    district: string;
    update_profile: string;
  };
  pwa: {
    offline_msg: string;
    install_prompt: string;
    update_msg: string;
    connection_status: string;
  };
  feedback?: {
    title: string;
    status: string;
    followed: string;
    partially_followed: string;
    not_followed: string;
    reason: string;
    submit: string;
    submitted: string;
  };
  irrigation?: {
    title: string;
    subtitle: string;
    manual_override: string;
    start_irrigation: string;
    stop_irrigation: string;
    status: string;
    duration: string;
    volume: string;
  };
}

export const translations: Record<Locale, TranslationDictionary> = {
  "en-IN": {
    header: { brand: "Kisan AI", online: "Online", offline: "Offline", profile_settings: "Profile Settings", logout: "Logout", user_role: "Farmer" },
    nav: { dashboard: "Dashboard", farms: "Manage Lands", fields: "Fields & Crops", sensors: "Sensors", weather: "Weather", ai_tools: "AI Recommendations", ml_predict: "ML Insights", history: "History", schedule: "Schedule", notifications: "Alerts", profile: "Profile", admin: "Admin", voice_assistant: "Voice Assistant", irrigation: "Irrigation", ai_assistant: "AI Assistant", logout: "Logout" },
    dashboard: { title: "Farmer Panel", subtitle: "AgriSmart PWA Pro", weather: "Weather", moisture: "Soil Moisture", health: "Field Health", today_schedule: "Today's Schedule", next_irrigation: "Next Irrigation", critical_alerts: "Critical Alerts", ai_recommendation: "AI Recommendation", water_usage: "Water Usage", optimal: "Optimal", warning: "Warning", critical: "Critical", active_alerts: "Active Alerts", what_to_do: "What should you do today?", ask_assistant: "Ask Assistant", report_button: "Report", manage: "Manage", sync_alerts: "Sync & Evaluate Alerts", soil_moisture_trend: "Soil Moisture Trend", field_info: "Field Information", no_alerts: "No active alerts found.", no_schedule: "No irrigation scheduled for today." },
    farms: { title: "Manage Lands", subtitle: "Register, configure, and monitor your agricultural plots", add_farm: "Register New Farm", farm_name: "Farm Name", location: "Location", total_fields: "Total Fields", actions: "Actions", land_area: "Land Area (Hectares)", soil_classification: "Soil Classification", coordinates: "Coordinates GPS", latitude: "Latitude", longitude: "Longitude", auto_detect: "Auto Detect GPS", register_plot: "Register Plot", registered_farms: "Registered Plots", area_size: "Area Size", delete_farm: "Delete Farm", confirm_delete: "Are you sure you want to delete this farm? This will delete all fields and sensors in it.", loam: "Loam (Optimal)", clay: "Clay (High Retention)", sandy: "Sandy (Low Retention)", silt: "Silt", no_farms: "No farms registered yet.", farm_added: "Farm registered successfully!", farm_deleted: "Farm deleted successfully", register_a_farm: "Register a Farm" },
    fields: { title: "Fields & Crops", subtitle: "Configure fields and register active crops", add_field: "Add New Field", field_name: "Field Name", crop: "Crop", status: "Status", action: "Recommended Action", edit_thresholds: "Edit Moisture Thresholds", save_thresholds: "Save Thresholds", area: "Land Area (Hectares)", soil_type: "Soil Classification", active_farm: "Active Farm", no_farms_found: "No Farms Found", register_farm_link: "Register a Farm", registered_crops: "Planted Crops", plant_crop: "Plant New Crop", crop_name: "Crop Name", variety: "Crop Variety", planted_at: "Planting Date", add_crop: "Plant Crop", delete_field: "Delete Field", confirm_delete: "Are you sure you want to delete this field?", field_added: "Field added successfully!", crop_registered: "Crop registered successfully!" },
    sensors: { title: "Sensors & Telemetry", subtitle: "Register nodes and push real-time telemetry inputs", add_sensor: "Register Sensor Node", sensor_id: "Sensor ID", sensor_label: "Sensor Label", type: "Sensor Type", battery: "Battery", signal: "Signal", status: "Status", last_ping: "Last Telemetry", online: "Online", offline: "Offline", telemetry_simulator: "Telemetry Input Simulator", push_telemetry: "Push Telemetry Reading", soil_moisture: "Soil Moisture (%)", soil_temp: "Soil Temp (°C)", ph_level: "pH Level", nitrogen: "Nitrogen (N)", phosphorus: "Phosphorus (P)", potassium: "Potassium (K)", ambient_temp: "Ambient Temp (°C)", ambient_humidity: "Ambient Humidity (%)", no_fields: "No Fields Found", configure_fields: "Configure Fields", register_node: "Register Sensor" },
    weather: { title: "Weather Forecast", subtitle: "Real-time weather telemetry and 7-day agricultural forecast", temp: "Temperature", humidity: "Humidity", wind: "Wind Speed", rain_prob: "Rain Probability", conditions: "Conditions", forecast: "7-Day Forecast", hourly_forecast: "24-Hour Forecast", daily_forecast: "Daily Outlook", uv_index: "UV Index", pressure: "Atmospheric Pressure", cloud_cover: "Cloud Cover", lookup_mode: "Location Lookup", select_farm: "Select Farm Location", enter_gps: "Enter GPS Coordinates", detect_location: "Use Current Location" },
    ai_tools: { title: "AI Recommendations", subtitle: "Predictive irrigation scheduling & crop advisories", ask_ai: "Ask AI Assistant", recommendation: "AI Recommendation", crop_advice: "Crop Advisory", disease_diagnosis: "Pest & Disease Diagnosis", risk_level: "Risk Level", confidence: "Confidence Score", recommended_water: "Recommended Water Volume", best_time: "Optimal Irrigation Time", irrigation_required: "Irrigation Required", no_irrigation_required: "No Irrigation Needed", features_snapshot: "Environmental Snapshot", select_farm_field_crop: "Select Farm, Field & Crop" },
    ml_predict: { title: "ML Predictive Engine", subtitle: "Machine learning model analytics, evaluation, and water forecast", model_type: "Model Architecture", run_prediction: "Execute Prediction", confidence: "Confidence Score", predicted_moisture: "Predicted Soil Moisture", optimal_schedule: "Optimal Schedule", model_comparison: "Model Performance Benchmark", mae: "MAE (Mean Abs Error)", rmse: "RMSE Score", r2: "R² Accuracy Score", training_time: "Training Duration", prediction_time: "Inference Latency", model_size: "Model File Size", status: "Evaluation Status", explanation: "Model Performance Analysis", best_model: "Top Performing Model", fastest_model: "Fastest Inference", lowest_error: "Lowest Prediction Error" },
    history: { title: "Irrigation History", subtitle: "Complete log of past irrigation events and telemetry readings", logs: "Telemetry Logs", date: "Date & Time", field: "Field", water_used: "Water Volume (Liters)", status: "Status", applied: "Applied", scheduled: "Scheduled", pending: "Pending", skipped: "Skipped", manual_log: "Log Manual Water", log_applied_water: "Save Applied Water", filter_farm: "Filter Farm", filter_field: "Filter Field", filter_crop: "Filter Crop", no_history: "No irrigation history recorded yet." },
    schedule: { title: "Irrigation Schedule", subtitle: "Today's planned water delivery for your crops", duration: "Duration", time: "Irrigation Time", status: "Status", scheduled: "Scheduled", pending: "Pending", applied: "Completed", skipped: "Skipped", water_vol: "Water Volume (Liters)" },
    notifications: { title: "Alert Center", subtitle: "Real-time alerts, critical warnings, and notification preferences", mark_read: "Mark Read", mark_all_read: "Mark All Read", all: "All Alerts", critical: "Critical Only", warning: "Warnings", info: "Information", empty_state: "Everything is optimal! No alerts found.", quiet_hours: "Quiet Hours", critical_only: "Critical Alerts Only" },
    profile: { title: "Farmer Profile", subtitle: "Edit contact information, language, and regional preferences", full_name: "Full Name", email: "Email Address", phone_number: "Phone Number", preferred_lang: "Preferred Language", update_profile: "Save Profile Changes", state: "State", district: "District", profile_updated: "Profile updated successfully!" },
    admin: { title: "Admin Dashboard", subtitle: "Manage system access, user accounts, and RBAC approvals", users: "Users Management", pending_approvals: "Pending Approvals", roles: "Role Access", approve: "Approve User", block: "Suspend User" },
    common: { save: "Save", cancel: "Cancel", edit: "Edit", delete: "Delete", submit: "Submit", loading: "Loading data...", error: "An error occurred", success: "Action completed successfully", retry: "Retry", offline_banner: "You are offline. Showing cached information.", go_back: "Go Back", view_details: "View Details", no_data: "No data available", search: "Search...", filter: "Filter", refresh: "Refresh", close: "Close", confirm: "Confirm" },
    settings: { title: "Language & Regional Settings", language_selector: "Select Your Language", select_lang: "Select Language", phone_number: "Phone Number", state: "State", district: "District", update_profile: "Update Language Settings" },
    pwa: { offline_msg: "You are currently offline", install_prompt: "Install AgriSmart PWA", update_msg: "New app update available", connection_status: "Network Status" },
    feedback: { title: "Recommendation Feedback", status: "Did you follow this AI recommendation?", followed: "Followed", partially_followed: "Partially Followed", not_followed: "Not Followed", reason: "Reason / Notes (Optional)", submit: "Submit Feedback", submitted: "Feedback submitted successfully!" },
    irrigation: { title: "Irrigation Schedule", subtitle: "Daily water delivery schedules and manual valve controls", manual_override: "Manual Override", start_irrigation: "Start Water Valve", stop_irrigation: "Stop Water Valve", status: "Operational Status", duration: "Irrigation Duration", volume: "Water Volume" }
  },
  "hi-IN": {
    header: { brand: "किसान एआई", online: "ऑनलाइन", offline: "ऑफ़लाइन", profile_settings: "प्रोफ़ाइल सेटिंग्स", logout: "लॉगआउट", user_role: "किसान" },
    nav: { dashboard: "डैशबोर्ड", farms: "भूमि प्रबंधन", fields: "खेत और फसलें", sensors: "सेंसर", weather: "मौसम", ai_tools: "एआई सिफारिशें", ml_predict: "एमएल विश्लेषण", history: "इतिहास", schedule: "सिंचाई शेड्यूल", notifications: "अलर्ट", profile: "प्रोफ़ाइल", admin: "एडमिन", voice_assistant: "वॉयस असिस्टेंट", irrigation: "सिंचाई", ai_assistant: "एआई सहायक", logout: "लॉगआउट" },
    dashboard: { title: "किसान पैनल", subtitle: "एग्रीस्मार्ट पीडब्लूए प्रो", weather: "मौसम", moisture: "मिट्टी की नमी", health: "फसल स्वास्थ्य", today_schedule: "आज का शेड्यूल", next_irrigation: "अगली सिंचाई", critical_alerts: "गंभीर चेतावनी", ai_recommendation: "एआई सिफारिश", water_usage: "पानी का उपयोग", optimal: "उत्कृष्ट", warning: "चेतावनी", critical: "गंभीर", active_alerts: "सक्रिय अलर्ट", what_to_do: "आज क्या करना चाहिए?", ask_assistant: "सहायक से पूछें", report_button: "रिपोर्ट", manage: "प्रबंधन करें", sync_alerts: "अलर्ट सिंक करें", soil_moisture_trend: "मिट्टी की नमी का रुझान", field_info: "खेत की जानकारी", no_alerts: "कोई सक्रिय चेतावनी नहीं मिली।", no_schedule: "आज के लिए कोई सिंचाई अनुसूचित नहीं है।" },
    farms: { title: "भूमि प्रबंधन", subtitle: "अपने कृषि भूखंडों का पंजीकरण, विन्यास और निगरानी करें", add_farm: "नया खेत पंजीकृत करें", farm_name: "खेत का नाम", location: "स्थान", total_fields: "कुल खेत", actions: "कार्रवाई", land_area: "भूमि का क्षेत्रफल (हेक्टेयर)", soil_classification: "मिट्टी का वर्गीकरण", coordinates: "जीपीएस निर्देशांक", latitude: "अक्षांश", longitude: "देशांतर", auto_detect: "जीपीएस स्वचालित रूप से पहचानें", register_plot: "भूखंड पंजीकृत करें", registered_farms: "पंजीकृत भूखंड", area_size: "क्षेत्रफल का आकार", delete_farm: "खेत हटाएं", confirm_delete: "क्या आप निश्चित रूप से इस खेत को हटाना चाहते हैं?", loam: "दोमट (उत्कृष्ट)", clay: "चिकनी मिट्टी", sandy: "बलुई मिट्टी", silt: "गाद", no_farms: "कोई खेत पंजीकृत नहीं है।", farm_added: "खेत सफलतापूर्वक पंजीकृत किया गया!", farm_deleted: "खेत सफलतापूर्वक हटा दिया गया", register_a_farm: "खेत पंजीकृत करें" },
    fields: { title: "खेत और फसलें", subtitle: "खेतों को कॉन्फ़िगर करें और सक्रिय फसलों को पंजीकृत करें", add_field: "नया खेत जोड़ें", field_name: "खेत का नाम", crop: "फसल", status: "स्थिति", action: "अनुशंसित कार्रवाई", edit_thresholds: "नमी सीमा बदलें", save_thresholds: "सीमा सहेजें", area: "क्षेत्रफल (हेक्टेयर)", soil_type: "मिट्टी का प्रकार", active_farm: "सक्रिय खेत", no_farms_found: "कोई खेत नहीं मिला", register_farm_link: "खेत पंजीकृत करें", registered_crops: "बोई गई फसलें", plant_crop: "नयी फसल बोएं", crop_name: "फसल का नाम", variety: "फसल की किस्म", planted_at: "बुआई की तारीख", add_crop: "फसल बोएं", delete_field: "खेत हटाएं", confirm_delete: "क्या आप निश्चित रूप से इस खेत को हटाना चाहते हैं?", field_added: "खेत सफलतापूर्वक जोड़ा गया!", crop_registered: "फसल सफलतापूर्वक पंजीकृत की गई!" },
    sensors: { title: "सेंसर और टेलीमेट्री", subtitle: "नोड्स पंजीकृत करें और वास्तविक समय टेलीमेट्री इनपुट प्रदान करें", add_sensor: "सेंसर नोड जोड़ें", sensor_id: "सेंसर आईडी", sensor_label: "सेंसर का नाम", type: "प्रकार", battery: "बैटरी", signal: "सिग्नल", status: "स्थिति", last_ping: "अंतिम सिंक", online: "ऑनलाइन", offline: "ऑफ़लाइन", telemetry_simulator: "टेलीमेट्री सिम्युलेटर", push_telemetry: "टेलीमेट्री रीडिंग भेजें", soil_moisture: "मिट्टी की नमी (%)", soil_temp: "मिट्टी का तापमान (°C)", ph_level: "पीएच स्तर", nitrogen: "नाइट्रोजन (N)", phosphorus: "फास्फोरस (P)", potassium: "पोटेशियम (K)", ambient_temp: "परिवेशी तापमान (°C)", ambient_humidity: "परिवेशी आर्द्रता (%)", no_fields: "कोई खेत नहीं मिला", configure_fields: "खेत कॉन्फ़िगर करें", register_node: "सेंसर जोड़ें" },
    weather: { title: "मौसम पूर्वानुमान", subtitle: "वास्तविक समय मौसम टेलीमेट्री और 7-दिवसीय पूर्वानुमान", temp: "तापमान", humidity: "आर्द्रता", wind: "हवा की गति", rain_prob: "बारिश की संभावना", conditions: "मौसम की स्थिति", forecast: "7-दिवसीय पूर्वानुमान", hourly_forecast: "24-घंटे का पूर्वानुमान", daily_forecast: "दैनिक दृष्टिकोण", uv_index: "यूवी इंडेक्स", pressure: "वायुमंडलीय दबाव", cloud_cover: "बादल आवरण", lookup_mode: "स्थान खोज", select_farm: "खेत स्थान चुनें", enter_gps: "जीपीएस निर्देशांक दर्ज करें", detect_location: "वर्तमान स्थान का उपयोग करें" },
    ai_tools: { title: "एआई सिफारिशें", subtitle: "पूर्वानुमानित सिंचाई समय सारणी और फसल सलाह", ask_ai: "एआई सहायक से पूछें", recommendation: "एआई सिफारिश", crop_advice: "फसल सलाह", disease_diagnosis: "कीट एवं रोग निदान", risk_level: "जोखिम का स्तर", confidence: "सटीकता स्कोर", recommended_water: "अनुशंसित पानी की मात्रा", best_time: "इष्टतम सिंचाई का समय", irrigation_required: "सिंचाई आवश्यक", no_irrigation_required: "सिंचाई की आवश्यकता नहीं", features_snapshot: "पर्यावरणीय अवलोकन", select_farm_field_crop: "खेत और फसल चुनें" },
    ml_predict: { title: "एमएल पूर्वानुमान इंजन", subtitle: "मशीन लर्निंग मॉडल विश्लेषण और जल पूर्वानुमान", model_type: "मॉडल प्रकार", run_prediction: "पूर्वानुमान चलाएं", confidence: "सटीकता स्कोर", predicted_moisture: "अनुमानित नमी", optimal_schedule: "इष्टतम समय सारणी", model_comparison: "मॉडल प्रदर्शन तुलना", mae: "एमएई त्रुटि", rmse: "आरएमएसई स्कोर", r2: "आर² सटीकता स्कोर", training_time: "प्रशिक्षण समय", prediction_time: "अनुमान लगाने का समय", model_size: "मॉडल फ़ाइल आकार", status: "मूल्यांकन स्थिति", explanation: "प्रदर्शन विश्लेषण", best_model: "सर्वश्रेष्ठ मॉडल", fastest_model: "सबसे तेज़ मॉडल", lowest_error: "न्यूनतम त्रुटि मॉडल" },
    history: { title: "सिंचाई इतिहास", subtitle: "विगत सिंचाई घटनाओं और टेलीमेट्री डेटा की पूरी सूची", logs: "टेलीमैट्रिक्स लॉग", date: "दिनांक एवं समय", field: "खेत", water_used: "पानी की मात्रा (लीटर)", status: "स्थिति", applied: "संपन्न", scheduled: "अनुसूचित", pending: "लंबित", skipped: "छोड़ा गया", manual_log: "मैनुअल जल प्रविष्टि", log_applied_water: "लागू पानी सहेजें", filter_farm: "खेत फ़िल्टर", filter_field: "प्लाट फ़िल्टर", filter_crop: "फसल फ़िल्टर", no_history: "अभी तक कोई सिंचाई इतिहास दर्ज नहीं किया गया है।" },
    schedule: { title: "आज की सिंचाई", duration: "समयावधि", time: "सिंचाई का समय", status: "स्थिति", scheduled: "अनुसूचित", pending: "लंबित", applied: "संपन्न", skipped: "छोड़ा गया", water_vol: "पानी की मात्रा (लीटर)" },
    notifications: { title: "अलर्ट केंद्र", subtitle: "वास्तविक समय अलर्ट, गंभीर चेतावनी और सूचना प्राथमिकताएं", mark_read: "पढ़ा हुआ मार्क करें", mark_all_read: "सभी पढ़ा हुआ मार्क करें", all: "सभी", critical: "गंभीर", warning: "चेतावनी", info: "सूचना", empty_state: "सब कुछ इष्टतम है! कोई चेतावनी नहीं।", quiet_hours: "शांत समय", critical_only: "केवल गंभीर चेतावनी" },
    profile: { title: "किसान प्रोफ़ाइल", subtitle: "संपर्क जानकारी, भाषा और क्षेत्रीय प्राथमिकताएं अपडेट करें", full_name: "पूरा नाम", email: "ईमेल पता", phone_number: "फोन नंबर", preferred_lang: "पसंदीदा भाषा", update_profile: "प्रोफ़ाइल अपडेट करें", state: "राज्य", district: "ज़िला", profile_updated: "प्रोफ़ाइल सफलतापूर्वक अपडेट की गई!" },
    admin: { title: "एडमिन डैशबोर्ड", subtitle: "उपयोगकर्ता पहुंच, खाते और आरबीएसी स्वीकृतियां प्रबंधित करें", users: "उपयोगकर्ता प्रबंधन", pending_approvals: "लंबित स्वीकृतियां", roles: "भूमिका पहुंच", approve: "स्वीकृत करें", block: "ब्लॉक करें" },
    common: { save: "सहेजें", cancel: "रद्द करें", edit: "संपादित करें", delete: "हटाएं", submit: "सबमिट करें", loading: "डेटा लोड हो रहा है...", error: "एक त्रुटि हुई", success: "कार्रवाई सफल रही", retry: "पुनः प्रयास करें", offline_banner: "आप ऑफ़लाइन हैं। कैश्ड डेटा दिखाया जा रहा है।", go_back: "वापस जाएं", view_details: "विवरण देखें", no_data: "कोई डेटा उपलब्ध नहीं है", search: "खोजें...", filter: "फ़िल्टर", refresh: "ताज़ा करें", close: "बंद करें", confirm: "पुष्टि करें" },
    settings: { title: "भाषा और क्षेत्रीय सेटिंग्स", language_selector: "अपनी भाषा चुनें", select_lang: "भाषा चुनें", phone_number: "फोन नंबर", state: "राज्य", district: "ज़िला", update_profile: "प्रोफ़ाइल अपडेट करें" },
    pwa: { offline_msg: "आप वर्तमान में ऑफ़लाइन हैं", install_prompt: "एग्रीस्मार्ट ऐप इंस्टॉल करें", update_msg: "नया अपडेट उपलब्ध है", connection_status: "नेटवर्क स्थिति" },
    feedback: { title: "सिफारिश प्रतिक्रिया", status: "क्या आपने इस एआई सिफारिश का पालन किया?", followed: "पालन किया", partially_followed: "आंशिक रूप से पालन किया", not_followed: "पालन नहीं किया", reason: "कारण / नोट्स (वैकल्पिक)", submit: "प्रतिक्रिया भेजें", submitted: "प्रतिक्रिया सफलतापूर्वक सबमिट की गई!" },
    irrigation: { title: "सिंचाई शेड्यूल", subtitle: "दैनिक जल वितरण शेड्यूल और वाल्व नियंत्रण", manual_override: "मैनुअल नियंत्रण", start_irrigation: "जल वाल्व चालू करें", stop_irrigation: "जल वाल्व बंद करें", status: "संचालन स्थिति", duration: "सिंचाई अवधि", volume: "जल की मात्रा" }
  },
  "te-IN": {
    header: { brand: "కిసాన్ AI", online: "ఆన్‌లైన్", offline: "ఆఫ్‌లైన్", profile_settings: "ప్రొఫైల్ సెట్టింగ్‌లు", logout: "లాగౌట్", user_role: "రైతు" },
    nav: { dashboard: "డాష్‌బోర్డ్", farms: "భూముల నిర్వహణ", fields: "చేనులు & పంటలు", sensors: "సెన్సార్లు", weather: "వాతావరణం", ai_tools: "AI సూచనలు", ml_predict: "ML విశ్లేషణ", history: "చరిత్ర", schedule: "సాగునీటి షెడ్యూల్", notifications: "అలర్టులు", profile: "ప్రొఫైల్", admin: "అడ్మిన్", voice_assistant: "వాయిస్ అసిస్టెంట్", irrigation: "సాగునీరు", ai_assistant: "AI సహాయకుడు", logout: "లాగౌట్" },
    dashboard: { title: "రైతు ప్యానెల్", subtitle: "అగ్రిస్మార్ట్ PWA ప్రో", weather: "వాతావరణం", moisture: "నేల తేమ", health: "చేను ఆరోగ్యం", today_schedule: "నేటి షెడ్యూల్", next_irrigation: "తరువాతి తడి", critical_alerts: "ముఖ్యమైన హెచ్చరికలు", ai_recommendation: "AI సలహా", water_usage: "నీటి వాడకం", optimal: "బాగుంది", warning: "హెచ్చరిక", critical: "ప్రమాదం", active_alerts: "సక్రియ అలర్టులు", what_to_do: "ఈరోజు ఏమి చేయాలి?", ask_assistant: "సహాయకుడిని అడగండి", report_button: "నివేదిక", manage: "నిర్వహించు", sync_alerts: "అలర్టులను సింక్ చేయండి", soil_moisture_trend: "నేల తేమ శాతపు మార్పు", field_info: "చేను వివరాలు", no_alerts: "సక్రియ అలర్టులు లేవు.", no_schedule: "ఈరోజుకు తడి షెడ్యూల్ ఏమీ లేదు." },
    farms: { title: "భూముల నిర్వహణ", subtitle: "మీ వ్యవసాయ భూములను నమోదు చేయండి, అమర్చండి మరియు పర్యవేక్షించండి", add_farm: "కొత్త పొలం నమోదు చేయి", farm_name: "పొలం పేరు", location: "ప్రాంతం", total_fields: "మొత్తం చేనులు", actions: "చర్యలు", land_area: "భూమి వైశాల్యం (హెక్టార్లు)", soil_classification: "నేల రకం వర్గీకరణ", coordinates: "GPS అక్షాంశ రేఖాంశాలు", latitude: "అక్షాంశం (Latitude)", longitude: "రేఖాంశం (Longitude)", auto_detect: "GPS ద్వారా ప్రాంతం కనుగొను", register_plot: "పొలం నమోదు చేయి", registered_farms: "నమోదైన పొలాలు", area_size: "వైశాల్యం", delete_farm: "పొలం తొలగించు", confirm_delete: "మీరు నిజంగా ఈ పొలాన్ని తొలగించాలనుకుంటున్నారా?", loam: "ఒండ్రు నేల (చాలా మంచిది)", clay: "నల్లరేగడి నేల (ఎక్కువ నీటి నిల్వ)", sandy: "ఇసుక నేల", silt: "మట్టి నేల", no_farms: "ఇంకా పొలాలు ఏవీ నమోదు కాలేదు.", farm_added: "పొలం విజయవంతంగా నమోదైంది!", farm_deleted: "పొలం తొలగించబడింది", register_a_farm: "పొలం నమోదు చేయండి" },
    fields: { title: "చేనులు & పంటలు", subtitle: "చేనులను అమర్చండి మరియు వేసిన పంటలను నమోదు చేయండి", add_field: "కొత్త చేను జోడించు", field_name: "చేను పేరు", crop: "పంట", status: "పరిస్థితి", action: "సూచించిన చర్య", edit_thresholds: "తేమ శాతాన్ని మార్చండి", save_thresholds: "భద్రపరచు", area: "చేను వైశాల్యం (హెక్టార్లు)", soil_type: "నేల వర్గీకరణ", active_farm: "ప్రస్తుత పొలం", no_farms_found: "పొలాలు లభించలేదు", register_farm_link: "ముందుగా పొలం నమోదు చేయండి", registered_crops: "సాగులో ఉన్న పంటలు", plant_crop: "కొత్త పంట వేయి", crop_name: "పంట పేరు", variety: "పంట విత్తనం / రకం", planted_at: "విత్తనం నాటిన తేదీ", add_crop: "పంట నమోదు చేయి", delete_field: "చేను తొలగించు", confirm_delete: "మీరు నిజంగా ఈ చేనును తొలగించాలనుకుంటున్నారా?", field_added: "చేను విజయవంతంగా జోడించబడింది!", crop_registered: "పంట విజయవంతంగా నమోదైంది!" },
    sensors: { title: "సెన్సార్లు & టెలిమెట్రీ", subtitle: "సెన్సార్లను జోడించండి మరియు నిజసమయ సమాచారాన్ని పంపండి", add_sensor: "సెన్సార్ పరికరం నమోదు చేయి", sensor_id: "సెన్సార్ ID", sensor_label: "సెన్సార్ పేరు", type: "సెన్సార్ రకం", battery: "బ్యాటరీ", signal: "సిగ్నల్ బలము", status: "స్థితి", last_ping: "చివరి సమాచారం", online: "ఆన్‌లైన్", offline: "ఆఫ్‌లైన్", telemetry_simulator: "టెలిమెట్రీ పరికర సిమ్యులేటర్", push_telemetry: "సమాచారాన్ని సమర్పించు", soil_moisture: "నేల తేమ శాతం (%)", soil_temp: "నేల ఉష్ణోగ్రత (°C)", ph_level: "pH స్థాయి", nitrogen: "నత్రజని (N)", phosphorus: "భాస్వరం (P)", potassium: "పొటాషియం (K)", ambient_temp: "పరిసర ఉష్ణోగ్రత (°C)", ambient_humidity: "పరిసర గాలి తేమ (%)", no_fields: "చేనులు లభించలేదు", configure_fields: "చేనులను అమర్చండి", register_node: "సెన్సార్ జోడించు" },
    weather: { title: "వాతావరణ అంచనా", subtitle: "నిజసమయ వాతావరణం మరియు 7 రోజుల వ్యవసాయ అంచనా", temp: "ఉష్ణోగ్రత", humidity: "తేమ శాతం", wind: "గాలి వేగం", rain_prob: "వర్షపాతం అవకాశం", conditions: "వాతావరణ పరిస్తితులు", forecast: "7-రోజుల అంచనా", hourly_forecast: "24 గంటల హెచ్చరికలు", daily_forecast: "రోజువారీ వివరణ", uv_index: "UV సూచిక", pressure: "గాలి ఒత్తిడి", cloud_cover: "మబ్బుల శాతం", lookup_mode: "ప్రాంత ఎంపిక", select_farm: "పొలం ప్రాంతాన్ని ఎంచుకోండి", enter_gps: "GPS వివరాలు నమోదు చేయండి", detect_location: "ప్రస్తుత ప్రాంతాన్ని వాడండి" },
    ai_tools: { title: "AI సిఫార్సులు", subtitle: "తెలివైన నీటి పారుదల సూచనలు మరియు పంట సలహాలు", ask_ai: "AI సహాయకుడిని అడగండి", recommendation: "AI సిఫార్సు", crop_advice: "పంట రక్షణ సలహా", disease_diagnosis: "తెగుళ్ళ & పురుగుల గుర్తింపు", risk_level: "ప్రమాద స్థాయి", confidence: "ఖచ్చితత్వం శాతం", recommended_water: "కావాల్సిన నీటి పరిమాణం", best_time: "నీళ్ళు పెట్టడానికి అనుకూల సమయం", irrigation_required: "నీటి తడి అవసరం", no_irrigation_required: "ఇప్పుడు నీళ్ళు పెట్టక్కర్లేదు", features_snapshot: "వాతావరణ సమాచార సమగ్రత", select_farm_field_crop: "పొలం, చేను మరియు పంటను ఎంచుకోండి" },
    ml_predict: { title: "ML అంచనా యంత్రం", subtitle: "మెషిన్ లెర్నింగ్ మోడల్స్ విశ్లేషణ మరియు నీటి వాడకం అంచనా", model_type: "మోడల్ రకం", run_prediction: "అంచనాను లెక్కించు", confidence: "ఖచ్చితత్వం శాతం", predicted_moisture: "రాబోయే నేల తేమ శాతం", optimal_schedule: "సరైన నీటి షెడ్యూల్", model_comparison: "మోడల్స్ సామర్థ్య పోలిక", mae: "MAE లోపం", rmse: "RMSE స్కోరు", r2: "R² ఖచ్చితత్వ స్కోరు", training_time: "శిక్షణ సమయం", prediction_time: "గణన వేగం", model_size: "మోడల్ ఫైల్ పరిమాణం", status: "మూల్యాంకన పరిస్థితి", explanation: "విశ్లేషణ వివరణ", best_model: "ఉత్తమ మోడల్", fastest_model: "వేగవంతమైన మోడల్", lowest_error: "తక్కువ లోపం ఉన్న మోడల్" },
    history: { title: "సాగునీటి చరిత్ర", subtitle: "గతంలో పెట్టిన నీటి తడులు మరియు సెన్సార్ సమాచార జాబితా", logs: "నమోదైన వివరాలు", date: "తేదీ & సమయం", field: "చేను", water_used: "వాడిన నీరు (లీటర్లు)", status: "స్థితి", applied: "పూర్తయింది", scheduled: "నిర్ణయించబడింది", pending: "పెండింగ్", skipped: "దాటవేయబడింది", manual_log: "సొంతంగా నీటి పరిమాణం నమోదు చేయి", log_applied_water: "వివరాలు భద్రపరుచు", filter_farm: "పొలం ఫిల్టర్", filter_field: "చేను ఫిల్టర్", filter_crop: "పంట ఫిల్టర్", no_history: "ఇంకా ఎలాంటి సాగునీటి చరిత్ర నమోదు కాలేదు." },
    schedule: { title: "ఈనాటి సాగునీరు", duration: "సమయం", time: "తడి సమయం", status: "స్థితి", scheduled: "నిర్ణయించబడింది", pending: "పెండింగ్", applied: "పూర్తయింది", skipped: "దాటవేయబడింది", water_vol: "నీటి పరిమాణం (లీటర్లు)" },
    notifications: { title: "అలర్ట్ కేంద్రం", subtitle: "ముఖ్యమైన హెచ్చరికలు మరియు అలర్ట్ ప్రాధాన్యతలు", mark_read: "చదివినట్లు గుర్తు పెట్టు", mark_all_read: "అన్నీ మార్క్ చేయి", all: "అన్ని అలర్టులు", critical: "అత్యవసర హెచ్చరికలు", warning: "సాధారణ హెచ్చరికలు", info: "సమాచారం", empty_state: "అంతా బాగుంది! ఎలాంటి అలర్టులు లేవు.", quiet_hours: "నిశ్శబ్ద సమయం", critical_only: "అత్యవసర అలర్టులు మాత్రమే" },
    profile: { title: "రైతు ప్రొఫైల్", subtitle: "మీ చిరునామా, ఫోన్ నంబరు మరియు భాషా ప్రాధాన్యతలను మార్చుకోండి", full_name: "పూర్తి పేరు", email: "ఈమెయిల్ విలాసం", phone_number: "ఫోన్ నంబరు", preferred_lang: "ఎంచుకున్న భాష", update_profile: "వివరాలు భద్రపరుచు", state: "రాష్ట్రం", district: "జిల్లా", profile_updated: "ప్రొఫైల్ విజయవంతంగా అప్‌డేట్ అయ్యింది!" },
    admin: { title: "అడ్మిన్ డాష్‌బోర్డ్", subtitle: "వినియోగదారుల ఖాతాలు మరియు అనుమతులను నిర్వహించండి", users: "వినియోగదారుల నిర్వహణ", pending_approvals: "పెండింగ్ అనుమతులు", roles: "అనుమతుల వర్గం", approve: "అనుమతించు", block: "ఖాతా నిలిపివేయి" },
    common: { save: "భద్రపరచు", cancel: "రద్దు చేయి", edit: "సవరించు", delete: "తొలగించు", submit: "సమర్పించు", loading: "సమాచారం లోడ్ అవుతోంది...", error: "పొరపాటు జరిగింది", success: "విజయవంతంగా పూర్తయింది", retry: "మళ్ళీ ప్రయత్నించు", offline_banner: "మీరు ఆఫ్‌లైన్‌లో ఉన్నారు. సేవ చేసిన సమాచారం చూపుతోంది.", go_back: "వెనుకకు వెళ్ళు", view_details: "వివరాలు చూడు", no_data: "సమాచారం లభ్యం కాలేదు", search: "వెతుకు...", filter: "ఫిల్టర్", refresh: "రిఫ్రెష్", close: "మూసివేయి", confirm: "ఖాయం చేయి" },
    settings: { title: "భాష & ప్రాంతీయ సెట్టింగ్‌లు", language_selector: "భాషను ఎంచుకోండి", select_lang: "భాషను ఎంచుకోండి", phone_number: "ఫోన్ నంబరు", state: "రాష్ట్రం", district: "జిల్లా", update_profile: "ప్రొఫైల్‌ను మార్చండి" },
    pwa: { offline_msg: "మీరు ఆఫ్‌లైన్‌లో ఉన్నారు", install_prompt: "అగ్రిస్మార్ట్ ఆప్ ఇన్‌స్టాల్ చేయండి", update_msg: "కొత్త అప్‌డేట్ అందుబాటులో ఉంది", connection_status: "నెట్‌వర్క్ పరిస్థితి" },
    feedback: { title: "సిఫార్సు అభిప్రాయం (Feedback)", status: "మీరు ఈ AI సలహాను పాటించారా?", followed: "పాటించాను", partially_followed: "కొంతవరకు పాటించాను", not_followed: "పాటించలేదు", reason: "కారణం / వివరాలు (ఐచ్ఛికం)", submit: "అభిప్రాయం సమర్పించు", submitted: "మీ అభిప్రాయం విజయవంతంగా నమోదైంది!" },
    irrigation: { title: "సాగునీటి షెడ్యూల్", subtitle: "రోజువారీ నీటి తడులు మరియు వాల్వ్ కంట్రోల్స్", manual_override: "మ్యాన్యువల్ ఆపరేషన్", start_irrigation: "వాటర్ వాల్వ్ ఆన్ చేయి", stop_irrigation: "వాటర్ వాల్వ్ ఆఫ్ చేయి", status: "ఆపరేషన్ పరిస్థితి", duration: "తడి సమయం", volume: "నీటి పరిమాణం" }
  },
  "kn-IN": {

    header: { brand: "ಕಿಸಾನ್ AI", online: "ಆನ್‌ಲೈನ್", offline: "ಆಫ್‌ಲೈನ್", profile_settings: "ಪ್ರೊಫೈಲ್ ಸಂಯೋಜನೆಗಳು", logout: "ಲಾಗ್ ಔಟ್", user_role: "ರೈತ" },
    nav: { dashboard: "ಡ್ಯಾಶ್‌ಬೋರ್ಡ್", farms: "ಜಮೀನುಗಳು", fields: "ಹೊಲಗಳು", sensors: "ಸಂವೇದಕಗಳು", weather: "ಹವಾಮಾನ", ai_tools: "AI ಉಪಕರಣಗಳು", ml_predict: "ML ಮುನ್ಸೂಚನೆ", history: "ಇತಿಹಾಸ", schedule: "ನೀರಾವರಿ ವೇಳಾಪಟ್ಟಿ", notifications: "ಎಚ್ಚರಿಕೆಗಳು", profile: "ಪ್ರೊಫೈಲ್", admin: "ಅಡ್ಮಿನ್", voice_assistant: "ವಾಯ್ಸ್ ಅಸಿಸ್ಟೆಂಟ್", irrigation: "ನೀರಾವರಿ", ai_assistant: "AI ಸಹಾಯಕ", logout: "ಲಾಗ್ ಔಟ್" },
    dashboard: { title: "ರೈತ ಫಲಕ", subtitle: "ಅಗ್ರಿಪ್ಲಸ್ ಪ್ರೊ", weather: "ಹವಾಮಾನ", moisture: "ಮಣ್ಣಿನ ತೇವಾಂಶ", health: "ಬೆಳೆಯ ಆರೋಗ್ಯ", today_schedule: "ಇಂದಿನ ವೇಳಾಪಟ್ಟಿ", next_irrigation: "ಮುಂದಿನ ನೀರಾವರಿ", critical_alerts: "ತುರ್ತು ಎಚ್ಚರಿಕೆಗಳು", ai_recommendation: "AI ಶಿಫಾರಸು", water_usage: "ನೀರಿನ ಬಳಕೆ", optimal: "ಉತ್ತಮ", warning: "ಎಚ್ಚರಿಕೆ", critical: "ಗಂಭೀರ", active_alerts: "ಸಕ್ರಿಯ ಎಚ್ಚರಿಕೆಗಳು", what_to_do: "ಇಂದು ಏನು ಮಾಡಬೇಕು?", ask_assistant: "ಸಹಾಯಕನನ್ನು ಕೇಳಿ", report_button: "ವರದಿ", manage: "ನಿರ್ವಹಿಸಿ", sync_alerts: "ಎಚ್ಚರಿಕೆಗಳನ್ನು ಸಿಂಕ್ ಮಾಡಿ" },
    farms: { title: "ನನ್ನ ಜಮೀನುಗಳು", add_farm: "ಹೊಸ ಜಮೀನು ಸೇರಿಸಿ", farm_name: "ಜಮೀನಿನ ಹೆಸರು", location: "ಸ್ಥಳ", total_fields: "ಒಟ್ಟು ಹೊಲಗಳು", actions: "ಕ್ರಿಯೆಗಳು" },
    fields: { title: "ನನ್ನ ಹೊಲಗಳು", add_field: "ಹೊಸ ಹೊಲ ಸೇರಿಸಿ", field_name: "ಹೊಲದ ಹೆಸರು", crop: "ಬೆಳೆ", status: "ಸ್ಥಿತಿ", action: "ಶಿಫಾರಸು ಮಾಡಿದ ಕ್ರಿಯೆ", edit_thresholds: "ತೇವಾಂಶ ಮಿತಿ ತಿದ್ದುಪಡಿ", save_thresholds: "ಮಿತಿ ಉಳಿಸಿ", area: "ವಿಸ್ತೀರ್ಣ (ಹೆಕ್ಟೇರ್)", soil_type: "ಮಣ್ಣಿನ ಮಾದರಿ" },
    sensors: { title: "ಸಂವೇದಕ ಜಾಲ", add_sensor: "ಸಂವೇದಕ ಸೇರಿಸಿ", sensor_id: "ಸಂವೇದಕ ID", type: "ಮಾದರಿ", battery: "ಬ್ಯಾಟರಿ", signal: "ಸಿಗ್ನಲ್", status: "ಸ್ಥಿತಿ", last_ping: "ಕೊನೆಯ ಮಾಹಿತಿ", online: "ಆನ್‌ಲೈನ್", offline: "ಆಫ್‌ಲೈನ್" },
    weather: { title: "ಹವಾಮಾನ ಮುನ್ಸೂಚನೆ", temp: "ತಾಪಮಾನ", humidity: "ಆರ್ದ್ರತೆ", wind: "ಗಾಳಿಯ ವೇಗ", rain_prob: "ಮಳೆಯ ಸಂಭವನೀಯತೆ", conditions: "ಸ್ಥಿತಿಗತಿಗಳು", forecast: "7 ದಿನಗಳ ಮುನ್ಸೂಚನೆ" },
    ai_tools: { title: "AI ಬೆಳೆ ಸಹಾಯಕ", ask_ai: "ಪ್ರಶ್ನೆ ಕೇಳಿ", recommendation: "AI ಸಲಹೆ", crop_advice: "ಬೆಳೆ ಮಾಹಿತಿ", disease_diagnosis: "ರೋಗ ಪತ್ತೆ" },
    ml_predict: { title: "ML ಅಂದಾಜು ಯಂತ್ರ", model_type: "ಮಾದರಿ ರಕ", run_prediction: "ಅಂದಾಜು ಮಾಡಿ", confidence: "ನಿಖರತೆ", predicted_moisture: "ನಿರೀಕ್ಷಿತ ತೇವಾಂಶ", optimal_schedule: "ಸೂಕ್ತ ಸಮಯ" },
    history: { title: "ನೀರಾವರಿ ಇತಿಹಾಸ", logs: "ಮಾಹಿತಿ ವಿವರ", date: "ದಿನಾಂಕ ಮತ್ತು ಸಮಯ", field: "ಹೊಲ", water_used: "ಬಳಸಿದ ನೀರು", status: "ಸ್ಥಿತಿ" },
    schedule: { title: "ಇಂದಿನ ನೀರಾವರಿ", duration: "ಸಮಯಾವಧಿ", time: "ನೀರಾವರಿ ಸಮಯ", status: "ಸ್ಥಿತಿ", scheduled: "ನಿಗದಿಯಾಗಿದೆ", pending: "ಬಾಕಿ ಇದೆ", applied: "ಪೂರ್ಣಗೊಂಡಿದೆ", skipped: "ಬಿಡಲಾಗಿದೆ", water_vol: "ನೀರಿನ ಪ್ರಮಾಣ" },
    notifications: { title: "ಎಚ್ಚರಿಕೆ ಕೇಂದ್ರ", mark_read: "ಓದಿದಂತೆ ಗುರುತಿಸಿ", mark_all_read: "ಎಲ್ಲವನ್ನೂ ಮಾರ್ಕ್ ಮಾಡಿ", all: "ಎಲ್ಲಾ", critical: "ಗಂಭೀರ", warning: "ಎಚ್ಚರಿಕೆ", info: "ಮಾಹಿತಿ", empty_state: "ಎಲ್ಲವೂ ಸರಿಯಾಗಿದೆ! ಯಾವುದೇ ಎಚ್ಚರಿಕೆಗಳಿಲ್ಲ." },
    profile: { title: "ಪ್ರೊಫೈಲ್ ಸಂಯೋಜನೆಗಳು", full_name: "ಪೂರ್ಣ ಹೆಸರು", email: "ಇಮೇಲ್ ವಿಳಾಸ", phone_number: "ಫೋನ್ ಸಂಖ್ಯೆ", preferred_lang: "ಆಯ್ಕೆಯ ಭಾಷೆ", update_profile: "ವಿವರ ನವೀಕರಿಸಿ" },
    admin: { title: "ಅಡ್ಮಿನ್ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್", users: "ಬಳಕೆದಾರರ ನಿರ್ವಹಣೆ", pending_approvals: "ಬಾಕಿ ಅನುಮೋದನೆಗಳು", roles: "ಪಾತ್ರ ಅನುಮತಿ", approve: "ಅನುಮೋದಿಸಿ", block: "ತಡೆಯಿರಿ" },
    common: { save: "ಉಳಿಸಿ", cancel: "ರದ್ದುಮಾಡಿ", edit: "ತಿದ್ದುಪಡಿ", delete: "ಅಳಿಸಿ", submit: "ಸಲ್ಲಿಸಿ", loading: "ಮಾಹಿತಿ ಲೋಡ್ ಆಗುತ್ತಿದೆ...", error: "ದೋಷ ಸಂಭವಿಸಿದೆ", success: "ಕ್ರಿಯೆ ಯಶಸ್ವಿಯಾಗಿದೆ", retry: "ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ", offline_banner: "ನೀವು ಆಫ್‌ಲೈನ್‌ನಲ್ಲಿದ್ದೀರಿ. ಸಂಗ್ರಹಿಸಿದ ಮಾಹಿತಿ ತೋರಿಸಲಾಗುತ್ತಿದೆ.", go_back: "ಹಿಂದಕ್ಕೆ ಹೋಗಿ", view_details: "ವಿವರ ವೀಕ್ಷಿಸಿ", no_data: "ಯಾವುದೇ ಮಾಹಿತಿ ಲಭ್ಯವಿಲ್ಲ" },
    settings: { title: "ಪ್ರೊಫೈಲ್ ಸಂಯೋಜನೆಗಳು", language_selector: "ನಿಮ್ಮ ಭಾಷೆ ಆಯ್ಕೆಮಾಡಿ", select_lang: "ಭಾಷೆ ಆಯ್ಕೆಮಾಡಿ", phone_number: "ಫೋನ್ ಸಂಖ್ಯೆ", state: "ರಾಜ್ಯ", district: "ಜಿಲ್ಲೆ", update_profile: "ಪ್ರೊಫೈಲ್ ನವೀಕರಿಸಿ" },
    pwa: { offline_msg: "ನೀವು ಪ್ರಸ್ತುತ ಆಫ್‌ಲೈನ್‌ನಲ್ಲಿದ್ದೀರಿ", install_prompt: "ಅಗ್ರಿಪ್ಲಸ್ ಆ್ಯಪ್ ಇನ್‌ಸ್ಟಾಲ್ ಮಾಡಿ", update_msg: "ಹೊಸ ಆ್ಯಪ್ ನವೀಕರಣ ಲಭ್ಯವಿದೆ", connection_status: "ನೆಟ್‌ವರ್ಕ್ ಸ್ಥಿತಿ" }
  },
  "ta-IN": {
    header: { brand: "கிசான் AI", online: "ஆன்லைன்", offline: "ஆஃப்லைன்", profile_settings: "சுயவிவர அமைப்புகள்", logout: "வெளியேறு", user_role: "விவசாயி" },
    nav: { dashboard: "முகப்பு", farms: "பண்ணைகள்", fields: "நிலங்கள்", sensors: "சென்சார்கள்", weather: "வானிலை", ai_tools: "AI கருவிகள்", ml_predict: "ML கணிப்பு", history: "வரலாறு", schedule: "பாசன அட்டவணை", notifications: "அறிவிப்புகள்", profile: "சுயவிவரம்", admin: "நிர்வாகி", voice_assistant: "குரல் உதவியாளர்", irrigation: "பாசனம்", ai_assistant: "AI உதவியாளர்", logout: "வெளியேறு" },
    dashboard: { title: "விவசாயி குழு", subtitle: "அக்ரிஸ்மார்ட் பிடபிள்யூஏ ப்ரோ", weather: "வானிலை", moisture: "மண் ஈரம்", health: "பயிர் ஆரோக்கியம்", today_schedule: "இன்றைய அட்டவணை", next_irrigation: "அடுத்த பாசனம்", critical_alerts: "முக்கிய எச்சரிக்கைகள்", ai_recommendation: "AI பரிந்துரை", water_usage: "நீர் பயன்பாடு", optimal: "சிறந்தது", warning: "எச்சரிக்கை", critical: "அபாயம்", active_alerts: "செயலில் உள்ள எச்சரிக்கைகள்", what_to_do: "இன்று என்ன செய்ய வேண்டும்?", ask_assistant: "உதவியாளரிடம் கேளுங்கள்", report_button: "அறிக்கை", manage: "நிர்வகி", sync_alerts: "எச்சரிக்கைகளை புதுப்பி" },
    farms: { title: "என் பண்ணைகள்", add_farm: "புதிய பண்ணை சேர்", farm_name: "பண்ணை பெயர்", location: "இடம்", total_fields: "மொத்த நிலங்கள்", actions: "செயல்கள்" },
    fields: { title: "என் நிலங்கள்", add_field: "புதிய நிலம் சேர்", field_name: "நிலத்தின் பெயர்", crop: "பயிர்", status: "நிலை", action: "பரிந்துரைக்கப்பட்ட செயல்", edit_thresholds: "ஈரப்பத அளவை மாற்று", save_thresholds: "சேமிக்கவும்", area: "பரப்பளவு (ஹெக்டேர்)", soil_type: "மண் வகை" },
    sensors: { title: "சென்சார் பிணையம்", add_sensor: "சென்சார் சேர்", sensor_id: "சென்சார் ஐடி", type: "வகை", battery: "பேட்டரி", signal: "சிக்னல்", status: "நிலை", last_ping: "கடைசி தகவல்", online: "ஆன்லைன்", offline: "ஆஃப்லைன்" },
    weather: { title: "வானிலை முன்னறிவிப்பு", temp: "வெப்பநிலை", humidity: "ஈரப்பதம்", wind: "காற்றின் வேகம்", rain_prob: "மழை வாய்ப்பு", conditions: "வானிலை நிலை", forecast: "7 நாள் முன்னறிவிப்பு" },
    ai_tools: { title: "AI பயிர் உதவியாளர்", ask_ai: "கேள்வி கேள்", recommendation: "AI ஆலோசனை", crop_advice: "பயிர் வழிகாட்டி", disease_diagnosis: "நோய் கண்டறிதல்" },
    ml_predict: { title: "ML கணிப்பு பொறி", model_type: "மாதிரி வகை", run_prediction: "கணிப்பை இயக்கு", confidence: "துல்லியம்", predicted_moisture: "கணிக்கப்பட்ட ஈரம்", optimal_schedule: "சரியான நேரம்" },
    history: { title: "பாசன வரலாறு", logs: "பதிவுகள்", date: "தேதி & நேரம்", field: "நிலம்", water_used: "பயன்படுத்திய நீர்", status: "நிலை" },
    schedule: { title: "இன்றைய பாசனம்", duration: "கால அளவு", time: "பாசன நேரம்", status: "நிலை", scheduled: "திட்டமிடப்பட்டது", pending: "நிலுவையில்", applied: "முடிந்தது", skipped: "தவிர்க்கப்பட்டது", water_vol: "நீரின் அளவு" },
    notifications: { title: "எச்சரிக்கை மையம்", mark_read: "படித்ததாக குறி", mark_all_read: "அனைத்தும் குறிக்கவும்", all: "அனைத்தும்", critical: "அபாயம்", warning: "எச்சரிக்கை", info: "தகவல்", empty_state: "எல்லாமே சிறப்பாக உள்ளது! எச்சரிக்கைகள் இல்லை." },
    profile: { title: "சுயவிவர அமைப்புகள்", full_name: "முழு பெயர்", email: "மின்னஞ்சல் முகவரி", phone_number: "தொலைபேசி எண்", preferred_lang: "விருப்ப மொழி", update_profile: "விவரங்களை புதுப்பி" },
    admin: { title: "நிர்வாகி முகப்பு", users: "பயனர்கள் நிர்வாகம்", pending_approvals: "நிலுவை ஒப்புதல்கள்", roles: "அனுமதிகள்", approve: "ஒப்புதல் அளி", block: "தடு" },
    common: { save: "சேமிக்கவும்", cancel: "ரத்து செய்", edit: "திருத்து", delete: "நீக்கு", submit: "சமர்ப்பி", loading: "தகவல் ஏற்றப்படுகிறது...", error: "பிழை ஏற்பட்டது", success: "வெற்றிகரமாக முடிந்தது", retry: "மீண்டும் முயலவும்", offline_banner: "நீங்கள் ஆஃப்லைனில் உள்ளீர்கள். சேமிக்கப்பட்ட தகவல் காட்டப்படுகிறது.", go_back: "பின்னே செல்", view_details: "விவரங்களை பார்", no_data: "தகவல்கள் எதுவும் இல்லை" },
    settings: { title: "சுயவிவர அமைப்புகள்", language_selector: "மொழியைத் தேர்ந்தெடுக்கவும்", select_lang: "மொழியைத் தேர்வுசெய்", phone_number: "தொலைபேசி எண்", state: "மாநிலம்", district: "மாவட்டம்", update_profile: "சுயவிவரத்தை மாற்று" },
    pwa: { offline_msg: "நீங்கள் ஆஃப்லைனில் உள்ளீர்கள்", install_prompt: "செயலியை நிறுவவும்", update_msg: "புதிய புதுப்பிப்பு கிடைக்கிறது", connection_status: "பிணைய நிலை" }
  },
  "mr-IN": {
    header: { brand: "किसान AI", online: "ऑनलाइन", offline: "ऑफलाइन", profile_settings: "प्रोफाइल सेटिंग्ज", logout: "लॉगआउट", user_role: "शेतकरी" },
    nav: { dashboard: "डॅशबोर्ड", farms: "शेती", fields: "शेते", sensors: "सेंसर", weather: "हवामान", ai_tools: "एआय साधने", ml_predict: "एमएल अंदाज", history: "इतिहास", schedule: "सिंचन वेळापत्रक", notifications: "अलर्ट", profile: "प्रोफाइल", admin: "अ‍ॅडमिन", voice_assistant: "व्हॉइस असिस्टंट", irrigation: "सिंचन", ai_assistant: "एआय सहाय्यक", logout: "लॉगआउट" },
    dashboard: { title: "शेतकरी पॅनेल", subtitle: "अ‍ॅग्रीस्मार्ट पीडब्ल्यूए प्रो", weather: "हवामान", moisture: "मातीची ओल", health: "पिकाचे आरोग्य", today_schedule: "आजचे वेळापत्रक", next_irrigation: "पुढील सिंचन", critical_alerts: "महत्त्वाच्या सूचना", ai_recommendation: "एआय सल्ला", water_usage: "पाण्याचा वापर", optimal: "उत्तम", warning: "तकीद", critical: "गंभीर", active_alerts: "सक्रिय अलर्ट", what_to_do: "आज काय करावे?", ask_assistant: "सहाय्यकाला विचारा", report_button: "अहवाल", manage: "व्यवस्थापन करा", sync_alerts: "अलर्ट सिंक करा" },
    farms: { title: "माझी शेती", add_farm: "नवीन शेत जोडा", farm_name: "शेताचे नाव", location: "ठिकाण", total_fields: "एकूण शेते", actions: "कृती" },
    fields: { title: "माझी शेते", add_field: "नवीन शेत जोडा", field_name: "शेताचे नाव", crop: "पीक", status: "स्थिती", action: "सुचवलेली कृती", edit_thresholds: "ओलीची मर्यादा बदला", save_thresholds: "जतन करा", area: "क्षेत्रफळ (हेक्टर)", soil_type: "मातीचा प्रकार" },
    sensors: { title: "सेंसर नेटवर्क", add_sensor: "सेंसर जोडा", sensor_id: "सेंसर आयडी", type: "प्रकार", battery: "बॅटरी", signal: "सिग्नल", status: "स्थिती", last_ping: "शेवटचे अपडेट", online: "ऑनलाइन", offline: "ऑफलाइन" },
    weather: { title: "हवामान अंदाज", temp: "तापमान", humidity: "आर्द्रता", wind: "वाऱ्याचा वेग", rain_prob: "पावसाची शक्यता", conditions: "हवामानाची स्थिती", forecast: "7-दिवसांचा अंदाज" },
    ai_tools: { title: "एआय पीक सहाय्यक", ask_ai: "प्रश्न विचारा", recommendation: "एआय सल्ला", crop_advice: "पीक मार्गदर्शन", disease_diagnosis: "रोग व कीड निदान" },
    ml_predict: { title: "एमएल अंदाज इंजिन", model_type: "मॉडेल प्रकार", run_prediction: "अंदाज लावा", confidence: "अचूकता", predicted_moisture: "अपेक्षित ओल", optimal_schedule: "योग्य वेळ" },
    history: { title: "सिंचन इतिहास", logs: "माहिती नोंदी", date: "दिनांक व वेळ", field: "शेत", water_used: "वापरलेले पाणी", status: "स्थिती" },
    schedule: { title: "आजचे सिंचन", duration: "कालावधी", time: "सिंचनाची वेळ", status: "स्थिती", scheduled: "नियोजित", pending: "प्रलंबित", applied: "पूर्ण झाले", skipped: "वगळले", water_vol: "पाण्याचे प्रमाण" },
    notifications: { title: "अलर्ट केंद्र", mark_read: "वाचलेले म्हणून चिन्हांकित करा", mark_all_read: "सर्व चिन्हांकित करा", all: "सर्व", critical: "गंभीर", warning: "तकीद", info: "माहिती", empty_state: "सर्व काही उत्तम आहे! कोणतेही अलर्ट नाहीत." },
    profile: { title: "प्रोफाइल सेटिंग्ज", full_name: "पूर्ण नाव", email: "ईमेल पत्ता", phone_number: "फोन नंबर", preferred_lang: "निवडलेली भाषा", update_profile: "माहिती अद्यतनित करा" },
    admin: { title: "अ‍ॅडमिन डॅशबोर्ड", users: "वापरकर्ता व्यवस्थापन", pending_approvals: "प्रलंबित मंजुरी", roles: "परवानग्या", approve: "मंजूर करा", block: "ब्लॉक करा" },
    common: { save: "जतन करा", cancel: "रद्द करा", edit: "संपादित करा", delete: "हटवा", submit: "सबमिट करा", loading: "माहिती लोड होत आहे...", error: "त्रुटी आली", success: "कृती यशस्वी झाली", retry: "पुन्हा प्रयत्न करा", offline_banner: "आपण ऑफलाइन आहात. जतन केलेली माहिती दाखवली जात आहे.", go_back: "मागे जा", view_details: "तपशील पहा", no_data: "कोणतीही माहिती उपलब्ध नाही" },
    settings: { title: "प्रोफाइल सेटिंग्ज", language_selector: "आपली भाषा निवडा", select_lang: "भाषा निवडा", phone_number: "फोन नंबर", state: "राज्य", district: "जिल्हा", update_profile: "प्रोफाइल बदला" },
    pwa: { offline_msg: "आपण सध्या ऑफलाइन आहात", install_prompt: "अ‍ॅप इंस्टॉल करा", update_msg: "नवीन अपडेट उपलब्ध आहे", connection_status: "नेटवर्क स्थिती" }
  },
  "bn-IN": {
    header: { brand: "কিষাণ AI", online: "অনলাইন", offline: "অফলাইন", profile_settings: "প্রোফাইল সেটিংস", logout: "লগআউট", user_role: "কৃষক" },
    nav: { dashboard: "ড্যাশবোর্ড", farms: "খামার", fields: "জমি", sensors: "সেন্সর", weather: "আবহাওয়া", ai_tools: "AI টুলস", ml_predict: "ML পূর্বাভাস", history: "ইতিহাস", schedule: "সেচ সময়সূচী", notifications: "সতর্কতা", profile: "প্রোফাইল", admin: "এডমিন", voice_assistant: "ভয়েস অ্যাসিস্ট্যান্ট", irrigation: "সেচ", ai_assistant: "AI সহকারী", logout: "লগআউট" },
    dashboard: { title: "কৃষক প্যানেল", subtitle: "এগ্রিসমার্ট পিডব্লিউএ প্রো", weather: "আবহাওয়া", moisture: "মাটির আর্দ্রতা", health: "ফসলের স্বাস্থ্য", today_schedule: "আজকের সময়সূচী", next_irrigation: "পরবর্তী সেচ", critical_alerts: "জরুরী সতর্কতা", ai_recommendation: "AI পরামর্শ", water_usage: "পানির ব্যবহার", optimal: "চমৎকার", warning: "সতর্কতা", critical: "জরুরী", active_alerts: "সক্রিয় সতর্কতা", what_to_do: "আজ কী করবেন?", ask_assistant: "সহকারীকে জিজ্ঞাসা করুন", report_button: "রিপোর্ট", manage: "ব্যবস্থাপনা", sync_alerts: "সতর্কতা সিঙ্ক করুন" },
    farms: { title: "আমার খামার", add_farm: "নতুন খামার যোগ করুন", farm_name: "খামারের নাম", location: "অবস্থান", total_fields: "মোট জমি", actions: "পদক্ষেপ" },
    fields: { title: "আমার জমি", add_field: "নতুন জমি যোগ করুন", field_name: "জমির নাম", crop: "ফসল", status: "অবস্থা", action: "সুপারিশকৃত পদক্ষেপ", edit_thresholds: "আর্দ্রতার মাত্রা পরিবর্তন", save_thresholds: "সংরক্ষণ করুন", area: "আয়তন (হেক্টর)", soil_type: "মাটির ধরন" },
    sensors: { title: "সেন্সর নেটওয়ার্ক", add_sensor: "সেন্সর যোগ করুন", sensor_id: "সেন্সর আইডি", type: "ধরনের", battery: "ব্যাটারি", signal: "সিগন্যাল", status: "অবস্থা", last_ping: "সর্বশেষ তথ্য", online: "অনলাইন", offline: "অফলাইন" },
    weather: { title: "আবহাওয়ার পূর্বাভাস", temp: "তাপমাত্রা", humidity: "আর্দ্রতা", wind: "বাতাসের গতি", rain_prob: "বৃষ্টির সম্ভাবনা", conditions: "অবস্থা", forecast: "৭ দিনের পূর্বাভাস" },
    ai_tools: { title: "AI ফসল সহকারী", ask_ai: "প্রশ্ন জিজ্ঞাসা করুন", recommendation: "AI পরামর্শ", crop_advice: "ফসল গাইড", disease_diagnosis: "রোগ নির্ণয়" },
    ml_predict: { title: "ML পূর্বাভাস ইঞ্জিন", model_type: "মডেলের ধরন", run_prediction: "পূর্বাভাস চালান", confidence: "নির্ভুলতা", predicted_moisture: "আশঙ্কাজনক আর্দ্রতা", optimal_schedule: "সঠিক সময়" },
    history: { title: "সেচের ইতিহাস", logs: "তথ্য লগ", date: "তারিখ ও সময়", field: "জমি", water_used: "ব্যবহৃত পানি", status: "অবস্থা" },
    schedule: { title: "আজকের সেচ", duration: "সময়কাল", time: "সেচের সময়", status: "অবস্থা", scheduled: "নির্ধারিত", pending: "বাকি আছে", applied: "সম্পন্ন", skipped: "এড়িয়ে গেছে", water_vol: "পানির পরিমাণ" },
    notifications: { title: "সতর্কতা কেন্দ্র", mark_read: "পঠিত চিহ্নিত করুন", mark_all_read: "সব চিহ্নিত করুন", all: "সব", critical: "জরুরী", warning: "সতর্কতা", info: "তথ্য", empty_state: "সবকিছু ঠিক আছে! কোনো সতর্কতা নেই।" },
    profile: { title: "প্রোফাইল সেটিংস", full_name: "পুরো নাম", email: "ইমেইল ঠিকানা", phone_number: "ফোন নম্বর", preferred_lang: "পছন্দের ভাষা", update_profile: "তথ্য আপডেট করুন" },
    admin: { title: "এডমিন ড্যাশবোর্ড", users: "ব্যবহারকারী ব্যবস্থাপনা", pending_approvals: "অপেক্ষমাণ অনুমোদন", roles: "অনুমতি", approve: "অনুমোদন করুন", block: "ব্লক করুন" },
    common: { save: "সংরক্ষণ করুন", cancel: "বাতিল করুন", edit: "সম্পাদনা", delete: "মুছে ফেলুন", submit: "জমা দিন", loading: "তথ্য লোড হচ্ছে...", error: "একটি সমস্যা হয়েছে", success: "কাজটি সফল হয়েছে", retry: "আবার চেষ্টা করুন", offline_banner: "আপনি অফলাইনে আছেন। সেভ করা তথ্য দেখানো হচ্ছে।", go_back: "ফিরে যান", view_details: "বিস্তারিত দেখুন", no_data: "কোনো তথ্য পাওয়া যায়নি" },
    settings: { title: "প্রোফাইল সেটিংস", language_selector: "আপনার ভাষা নির্বাচন করুন", select_lang: "ভাষা নির্বাচন করুন", phone_number: "ফোন নম্বর", state: "রাজ্য", district: "জেলা", update_profile: "প্রোফাইল সংশোধন করুন" },
    pwa: { offline_msg: "আপনি বর্তমানে অফলাইনে আছেন", install_prompt: "অ্যাপ ইনস্টল করুন", update_msg: "নতুন আপডেট পাওয়া গেছে", connection_status: "নেটওয়ার্ক অবস্থা" }
  },
  "ml-IN": {
    header: { brand: "കിസാൻ AI", online: "ഓൺലൈൻ", offline: "ഓഫ്‌ലൈൻ", profile_settings: "പ്രൊഫൈൽ ക്രമീകരണങ്ങൾ", logout: "ലോഗ്ഔട്ട്", user_role: "കർഷകൻ" },
    nav: { dashboard: "ഡാഷ്‌ബോർഡ്", farms: "തോട്ടങ്ങൾ", fields: "പാടങ്ങൾ", sensors: "സെൻസറുകൾ", weather: "കാലാവസ്ഥ", ai_tools: "AI ടൂളുകൾ", ml_predict: "ML പ്രവചനം", history: "ചരിത്രം", schedule: "നനയ്ക്കൽ ഷെഡ്യൂൾ", notifications: "അലേർട്ടുകൾ", profile: "പ്രൊഫൈൽ", admin: "അഡ്മിൻ", voice_assistant: "വോയ്സ് അസിസ്റ്റന്റ്", irrigation: "നനയ്ക്കൽ", ai_assistant: "AI സഹായി", logout: "ലോഗ്ഔട്ട്" },
    dashboard: { title: "കർഷക പാനൽ", subtitle: "അഗ്രിസ്മാർട്ട് PWA പ്രോ", weather: "കാലാവസ്ഥ", moisture: "മണ്ണിലെ ഈർപ്പം", health: "വിള ആരോഗ്യം", today_schedule: "ഇന്നത്തെ ഷെഡ്യൂൾ", next_irrigation: "അടുത്ത നനയ്ക്കൽ", critical_alerts: "പ്രധാന അലേർട്ടുകൾ", ai_recommendation: "AI നിർദ്ദേശം", water_usage: "വെള്ളത്തിന്റെ ഉപയോഗം", optimal: "മികച്ചത്", warning: "താക്കീത്", critical: "ഗുരുതരം", active_alerts: "സജീവ അലേർട്ടുകൾ", what_to_do: "ഇന്ന് എന്താണ് ചെയ്യേണ്ടത്?", ask_assistant: "സഹായിയോട് ചോദിക്കുക", report_button: "റിപ്പോർട്ട്", manage: "നിയന്ത്രിക്കുക", sync_alerts: "അലേർട്ടുകൾ സിങ്ക് ചെയ്യുക" },
    farms: { title: "എന്റെ തോട്ടങ്ങൾ", add_farm: "പുതിയ തോട്ടം ചേർക്കുക", farm_name: "തോട്ടത്തിന്റെ പേര്", location: "സ്ഥലം", total_fields: "ആകെ പാടങ്ങൾ", actions: "നടപടികൾ" },
    fields: { title: "എന്റെ പാടങ്ങൾ", add_field: "പുതിയ പാടം ചേർക്കുക", field_name: "പാടത്തിന്റെ പേര്", crop: "വിള", status: "അവസ്ഥ", action: "നിർദ്ദേശിച്ച നടപടി", edit_thresholds: "ഈർപ്പ പരിധി മാറ്റുക", save_thresholds: "സേവ് ചെയ്യുക", area: "വിസ്തീർണ്ണം (ഹെക്ടർ)", soil_type: "മണ്ണിന്റെ തരം" },
    sensors: { title: "സെൻസർ ശൃംഖല", add_sensor: "സെൻസർ ചേർക്കുക", sensor_id: "സെൻസർ ഐഡി", type: "ഇനം", battery: "ബാറ്ററി", signal: "സിഗ്നൽ", status: "അവസ്ഥ", last_ping: "അവസാന വിവരങ്ങൾ", online: "ഓൺലൈൻ", offline: "ഓഫ്‌ലൈൻ" },
    weather: { title: "കാലാവസ്ഥാ പ്രവചനം", temp: "താപനില", humidity: "ഈർപ്പം", wind: "കാറ്റിന്റെ വേഗത", rain_prob: "മഴയ്ക്ക് സാധ്യത", conditions: "കാലാവസ്ഥാ അവസ്ഥ", forecast: "7 ദിവസത്തെ പ്രവചനം" },
    ai_tools: { title: "AI വിള സഹായി", ask_ai: "ചോദ്യം ചോദിക്കുക", recommendation: "AI നിർദ്ദേശം", crop_advice: "വിള ഉപദേശം", disease_diagnosis: "രോഗ നിർണ്ണയം" },
    ml_predict: { title: "ML പ്രവചന യന്ത്രം", model_type: "മോഡൽ ഇനം", run_prediction: "പ്രവചനം നടത്തുക", confidence: "കൃത്യത", predicted_moisture: "പ്രതീക്ഷിക്കുന്ന ഈർപ്പം", optimal_schedule: "അനുയോജ്യ സമയം" },
    history: { title: "നനയ്ക്കൽ ചരിത്രം", logs: "വിവരപ്പട്ടിക", date: "തീയതിയും സമയവും", field: "പാടം", water_used: "ഉപയോഗിച്ച വെള്ളം", status: "അവസ്ഥ" },
    schedule: { title: "ഇന്നത്തെ നനയ്ക്കൽ", duration: "സമയം", time: "നനയ്ക്കുന്ന സമയം", status: "അവസ്ഥ", scheduled: "തീരുമാനിച്ചത്", pending: "ബാക്കിയുള്ളവ", applied: "പൂർത്തിയായി", skipped: "ഒഴിവാക്കി", water_vol: "വെള്ളത്തിന്റെ അളവ്" },
    notifications: { title: "അലേർട്ട് കേന്ദ്രം", mark_read: "വായിച്ചതായി അടയാളപ്പെടുത്തുക", mark_all_read: "എല്ലാം അടയാളപ്പെടുത്തുക", all: "എല്ലാം", critical: "ഗുരുതരം", warning: "താക്കീത്", info: "വിവരം", empty_state: "എല്ലാം ഉത്തമമാണ്! അലേർട്ടുകൾ ഇല്ല." },
    profile: { title: "പ്രൊഫൈൽ ക്രമീകരണങ്ങൾ", full_name: "പൂർണ്ണമായ പേര്", email: "ഇമെയിൽ വിലാസം", phone_number: "ഫോൺ നമ്പർ", preferred_lang: "തിരഞ്ഞെടുത്ത ഭാഷ", update_profile: "വിവരങ്ങൾ പുതുക്കുക" },
    admin: { title: "അഡ്മിൻ ഡാഷ്‌ബോർഡ്", users: "ഉപയോക്തൃ നിയന്ത്രണം", pending_approvals: "തീർപ്പുകൽപ്പിക്കാത്തവ", roles: "അനുമതികൾ", approve: "അനുവദിക്കുക", block: "തടയുക" },
    common: { save: "സേവ് ചെയ്യുക", cancel: "റദ്ദാക്കുക", edit: "തിരുത്തുക", delete: "മായ്ക്കുക", submit: "സമർപ്പിക്കുക", loading: "വിവരങ്ങൾ ലഭ്യമാക്കുന്നു...", error: "തടസ്സം നേരിട്ടു", success: "വിജയകരമായി പൂർത്തിയായി", retry: "വീണ്ടും ശ്രമിക്കുക", offline_banner: "നിങ്ങൾ ഓഫ്‌ലൈനിലാണ്. സേവ് ചെയ്ത വിവരങ്ങൾ കാണിക്കുന്നു.", go_back: "തിരികെ പോവുക", view_details: "വിശദാംശങ്ങൾ കാണുക", no_data: "വിവരങ്ങൾ ലഭ്യമല്ല" },
    settings: { title: "പ്രൊഫൈൽ ക്രമീകരണങ്ങൾ", language_selector: "ഭാഷ തിരഞ്ഞെടുക്കുക", select_lang: "ഭാഷ തിരഞ്ഞെടുക്കുക", phone_number: "ഫോൺ നമ്പർ", state: "സംസ്ഥാനം", district: "ജില്ല", update_profile: "പ്രൊഫൈൽ അപ്ഡേറ്റ് ചെയ്യുക" },
    pwa: { offline_msg: "നിങ്ങൾ നിലവിൽ ഓഫ്‌ലൈനിലാണ്", install_prompt: "ആപ്പ് ഇൻസ്റ്റാൾ ചെയ്യുക", update_msg: "പുതിയ അപ്ഡേറ്റ് ലഭ്യമാണ്", connection_status: "നെറ്റ്‌വർക്ക് അവസ്ഥ" }
  },
  "gu-IN": {
    header: { brand: "કિસાન AI", online: "ઓનલાઈન", offline: "ઓફલાઈન", profile_settings: "પ્રોફાઈલ સેટિંગ્સ", logout: "લોગઆઉટ", user_role: "ખેડૂત" },
    nav: { dashboard: "ડેશબોર્ડ", farms: "ખેતરો", fields: "જમીન", sensors: "સેન્સર", weather: "હવામાન", ai_tools: "AI સાધનો", ml_predict: "ML અંદાજ", history: "ઇતિહાસ", schedule: "સિંચાઈ શિડ્યુલ", notifications: "એલર્ટ્સ", profile: "પ્રોફાઈલ", admin: "એડમિન", voice_assistant: "વોઇસ આસિસ્ટન્ટ", irrigation: "સિંચાઈ", ai_assistant: "AI સહાયક", logout: "લોગઆઉટ" },
    dashboard: { title: "ખેડૂત પેનલ", subtitle: "એગ્રીસ્માર્ટ પીડબ્લ્યુએ પ્રો", weather: "હવામાન", moisture: "જમીનની ભેજ", health: "પાકની તંદુરસ્તી", today_schedule: "આજનું શિડ્યુલ", next_irrigation: "આગામી સિંચાઈ", critical_alerts: "ગંભીર એલર્ટ્સ", ai_recommendation: "AI ભલામણ", water_usage: "પાણીનો વપરાશ", optimal: "ઉત્તમ", warning: "ચેતવણી", critical: "ગંભીર", active_alerts: "સક્રિય એલર્ટ્સ", what_to_do: "આજે શું કરવું?", ask_assistant: "સહાયકને પૂછો", report_button: "રિપોર્ટ", manage: "મેનેજ કરો", sync_alerts: "એલર્ટ સિંક કરો" },
    farms: { title: "મારા ખેતરો", add_farm: "નવું ખેતર ઉમેરો", farm_name: "ખેતરનું નામ", location: "સ્થળ", total_fields: "કુલ જમીન", actions: "ક્રિયાઓ" },
    fields: { title: "મારી જમીન", add_field: "નવી જમીન ઉમેરો", field_name: "જમીનનું નામ", crop: "પાક", status: "સ્થિતિ", action: "ભલામણ કરેલ ક્રિયા", edit_thresholds: "ભેજ મર્યાદા બદલો", save_thresholds: "સાચવો", area: "વિસ્તાર (હેક્ટર)", soil_type: "જમીનનો પ્રકાર" },
    sensors: { title: "સેન્સર નેટવર્ક", add_sensor: "સેન્સર ઉમેરો", sensor_id: "સેન્સર આઈડી", type: "પ્રકાર", battery: "બેટરી", signal: "સિગ્નલ", status: "સ્થિતિ", last_ping: "છેલ્લી અપડેટ", online: "ઓનલાઈન", offline: "ઓફલાઈન" },
    weather: { title: "હવામાન અંદાજ", temp: "તાપમાન", humidity: "ભેજનું પ્રમાણ", wind: "પવનની ઝડપ", rain_prob: "વરસાદની શક્યતા", conditions: "સ્થિતિ", forecast: "7-દિવસનો અંદાજ" },
    ai_tools: { title: "AI પાક સહાયક", ask_ai: "પ્રશ્ન પૂછો", recommendation: "AI સલાહ", crop_advice: "પાક માર્ગદર્શન", disease_diagnosis: "રોગ અને જીવાત નિદાન" },
    ml_predict: { title: "ML અંદાજ એન્જિન", model_type: "મોડેલ પ્રકાર", run_prediction: "અંદાજ લગાવો", confidence: "સચોટતા", predicted_moisture: "અપેક્ષિત ભેજ", optimal_schedule: "યોગ્ય સમય" },
    history: { title: "સિંચાઈ ઇતિહાસ", logs: "માહિતી નોંધ", date: "તારીખ અને સમય", field: "જમીન", water_used: "વપરાયેલ પાણી", status: "સ્થિતિ" },
    schedule: { title: "આજની સિંચાઈ", duration: "સમયગાળો", time: "સિંચાઈનો સમય", status: "સ્થિતિ", scheduled: "નક્કી કરેલ", pending: "બાકી", applied: "પૂર્ણ", skipped: "છોડી દીધેલ", water_vol: "પાણીનો જથ્થો" },
    notifications: { title: "એલર્ટ કેન્દ્ર", mark_read: "વાંચેલ તરીકે માર્ક કરો", mark_all_read: "બધા માર્ક કરો", all: "બધા", critical: "ગંભીર", warning: "ચેતવણી", info: "માહિતી", empty_state: "બધું યોગ્ય છે! કોઈ એલર્ટ નથી." },
    profile: { title: "પ્રોફાઈલ સેટિંગ્સ", full_name: "પૂરું નામ", email: "ઈમેઈલ સરનામું", phone_number: "ફોન નંબર", preferred_lang: "પસંદગીની ભાષા", update_profile: "વિગતો અપડેટ કરો" },
    admin: { title: "એડમિન ડેશબોર્ડ", users: "વપરાશકર્તા સંચાલન", pending_approvals: "બાકી મંજૂરીઓ", roles: "પરવાનગીઓ", approve: "મંજૂર કરો", block: "બ્લોક કરો" },
    common: { save: "સાચવો", cancel: "રદ કરો", edit: "બદલો", delete: "કાઢી નાખો", submit: "સબમિટ કરો", loading: "ડેટા લોડ થઈ રહ્યો છે...", error: "ભૂલ આવી", success: "સફળતાપૂર્વક પૂર્ણ થયું", retry: "ફરી પ્રયાસ કરો", offline_banner: "તમે ઓફલાઈન છો. સાચવેલ માહિતી બતાવવામાં આવી રહી છે.", go_back: "પાછા જાઓ", view_details: "વિગત જુઓ", no_data: "કોઈ માહિતી ઉપલબ્ધ નથી" },
    settings: { title: "પ્રોફાઈલ સેટિંગ્સ", language_selector: "તમારી ભાષા પસંદ કરો", select_lang: "ભાષા પસંદ કરો", phone_number: "ફોન નંબર", state: "રાજ્ય", district: "જીલ્લો", update_profile: "પ્રોફાઈલ અપડેટ કરો" },
    pwa: { offline_msg: "તમે હાલમાં ઓફલાઈન છો", install_prompt: "એપ ઈન્સ્ટોલ કરો", update_msg: "નવું અપડેટ ઉપલબ્ધ છે", connection_status: "નેટવર્ક સ્થિતિ" }
  },
  "pa-IN": {
    header: { brand: "ਕਿਸਾਨ AI", online: "ਆਨਲਾਈਨ", offline: "ਆਫਲਾਈਨ", profile_settings: "ਪ੍ਰੋਫਾਈਲ ਸੈਟਿੰਗਾਂ", logout: "ਲੌਗਆਊਟ", user_role: "ਕਿਸਾਨ" },
    nav: { dashboard: "ਡੈਸ਼ਬੋਰਡ", farms: "ਖੇਤ", fields: "ਜ਼ਮੀਨਾਂ", sensors: "ਸੈਂਸਰ", weather: "ਮੌਸਮ", ai_tools: "AI ਟੂਲ", ml_predict: "ML ਅਨੁਮਾਨ", history: "ਇਤਿਹਾਸ", schedule: "ਸਿੰਚਾਈ ਸ਼ਡਿਊਲ", notifications: "ਅਲਰਟ", profile: "ਪ੍ਰੋਫਾਈਲ", admin: "ਐਡਮਿਨ", voice_assistant: "ਵਾਇਸ ਅਸਿਸਟੈਂਟ", irrigation: "ਸਿੰਚਾਈ", ai_assistant: "AI ਸਹਾਇਕ", logout: "ਲੌਗਆਊਟ" },
    dashboard: { title: "ਕਿਸਾਨ ਪੈਨਲ", subtitle: "ਐਗਰੀਸਮਾਰਟ PWA ਪ੍ਰੋ", weather: "ਮੌਸਮ", moisture: "ਮਿੱਟੀ ਦੀ ਨਮੀ", health: "ਫ਼ਸਲ ਦੀ ਸਿਹਤ", today_schedule: "ਅੱਜ ਦਾ ਸ਼ਡਿਊਲ", next_irrigation: "ਅਗਲੀ ਸਿੰਚਾਈ", critical_alerts: "ਜ਼ਰੂਰੀ ਚੇਤਾਵਨੀਆਂ", ai_recommendation: "AI ਸਲਾਹ", water_usage: "ਪਾਣੀ ਦੀ ਵਰਤੋਂ", optimal: "ਵਧੀਆ", warning: "ਚੇਤਾਵਨੀ", critical: "ਗੰਭੀਰ", active_alerts: "ਐਕਟਿਵ ਅਲਰਟ", what_to_do: "ਅੱਜ ਕੀ ਕਰਨਾ ਹੈ?", ask_assistant: "ਸਹਾਇਕ ਨੂੰ ਪੁੱਛੋ", report_button: "ਰਿਪੋਰਟ", manage: "ਪ੍ਰਬੰਧਨ ਕਰੋ", sync_alerts: "ਅਲਰਟ ਸਿੰਕ ਕਰੋ" },
    farms: { title: "ਮੇਰੇ ਖੇਤ", add_farm: "ਨਵਾਂ ਖੇਤ ਜੋੜੋ", farm_name: "ਖੇਤ ਦਾ ਨਾਂ", location: "ਜਗ੍ਹਾ", total_fields: "ਕੁੱਲ ਜ਼ਮੀਨਾਂ", actions: "ਕਾਰਵਾਈ" },
    fields: { title: "ਮੇਰੀਆਂ ਜ਼ਮੀਨਾਂ", add_field: "ਨਵੀਂ ਜ਼ਮੀਨ ਜੋੜੋ", field_name: "ਜ਼ਮੀਨ ਦਾ ਨਾਂ", crop: "ਫ਼ਸਲ", status: "ਸਥਿਤੀ", action: "ਸੁਝਾਈ ਗਈ ਕਾਰਵਾਈ", edit_thresholds: "ਨਮੀ ਦੀ ਸੀਮਾ ਬਦਲੋ", save_thresholds: "ਸੰਭਾਲੋ", area: "ਰਕਬਾ (ਹੈਕਟੇਅਰ)", soil_type: "ਮਿੱਟੀ ਦੀ ਕਿਸਮ" },
    sensors: { title: "ਸੈਂਸਰ ਨੈੱਟਵਰਕ", add_sensor: "ਸੈਂਸਰ ਜੋੜੋ", sensor_id: "ਸੈਂਸਰ ਆਈਡੀ", type: "ਕਿਸਮ", battery: "ਬੈਟਰੀ", signal: "ਸਿਗਨਲ", status: "ਸਥਿਤੀ", last_ping: "ਆਖਰੀ ਅਪਡੇਟ", online: "ਆਨਲਾਈਨ", offline: "ਆਫਲਾਈਨ" },
    weather: { title: "ਮੌਸਮ ਦਾ ਅਨੁਮਾਨ", temp: "ਤਾਪਮਾਨ", humidity: "ਨਮੀ", wind: "ਹਵਾ ਦੀ ਰਫ਼ਤਾਰ", rain_prob: "ਮੀਂਹ ਦੀ ਸੰਭਾਵਨਾ", conditions: "ਮੌਸਮ ਦੀ ਸਥਿਤੀ", forecast: "7 ਦਿਨਾਂ ਦਾ ਅਨੁਮਾਨ" },
    ai_tools: { title: "AI ਫ਼ਸਲ ਸਹਾਇਕ", ask_ai: "ਸਵਾਲ ਪੁੱਛੋ", recommendation: "AI ਸਲਾਹ", crop_advice: "ਫ਼ਸਲ ਸਲਾਹ", disease_diagnosis: "ਬੀਮਾਰੀ ਦੀ ਪਛਾਣ" },
    ml_predict: { title: "ML ਅਨੁਮਾਨ ਇੰਜਣ", model_type: "ਮਾਡਲ ਕਿਸਮ", run_prediction: "ਅਨੁਮਾਨ ਲਗਾਓ", confidence: "ਸਟੀਕਤਾ", predicted_moisture: "ਅਨੁਮਾਨਿਤ ਨਮੀ", optimal_schedule: "ਸਹੀ ਸਮਾਂ" },
    history: { title: "ਸਿੰਚਾਈ ਦਾ ਇਤਿਹਾਸ", logs: "ਡੇਟਾ ਲੌਗ", date: "ਮਿਤੀ ਅਤੇ ਸਮਾਂ", field: "ਜ਼ਮੀਨ", water_used: "ਵਰਤਿਆ ਪਾਣੀ", status: "ਸਥਿਤੀ" },
    schedule: { title: "ਅੱਜ ਦੀ ਸਿੰਚਾਈ", duration: "ਸਮਾਂ", time: "ਸਿੰਚਾਈ ਦਾ ਸਮਾਂ", status: "ਸਥਿਤੀ", scheduled: "ਨਿਰਧਾਰਿਤ", pending: "ਬਾਕੀ", applied: "ਪੂਰਾ ਹੋਇਆ", skipped: "ਛੱਡਿਆ ਗਿਆ", water_vol: "ਪਾਣੀ ਦੀ ਮਾਤਰਾ" },
    notifications: { title: "ਅਲਰਟ ਕੇਂਦਰ", mark_read: "ਪੜ੍ਹਿਆ ਮਾਰਕ ਕਰੋ", mark_all_read: "ਸਾਰੇ ਮਾਰਕ ਕਰੋ", all: "ਸਾਰੇ", critical: "ਗੰਭੀਰ", warning: "ਚੇਤਾਵਨੀ", info: "ਜਾਣਕਾਰੀ", empty_state: "ਸਭ ਠੀਕ ਹੈ! ਕੋਈ ਚੇਤਾਵਨੀ ਨਹੀਂ।" },
    profile: { title: "ਪ੍ਰੋਫਾਈਲ ਸੈਟਿੰਗਾਂ", full_name: "ਪੂਰਾ ਨਾਂ", email: "ਈਮੇਲ ਪਤਾ", phone_number: "ਫ਼ੋਨ ਨੰਬਰ", preferred_lang: "ਚੁਣੀ ਹੋਈ ਭਾਸ਼ਾ", update_profile: "ਜਾਣਕਾਰੀ ਅਪਡੇਟ ਕਰੋ" },
    admin: { title: "ਐਡਮਿਨ ਡੈਸ਼ਬੋਰਡ", users: "ਯੂਜ਼ਰ ਪ੍ਰਬੰਧਨ", pending_approvals: "ਬਾਕੀ ਮਨਜ਼ੂਰੀਆਂ", roles: "ਅਧਿਕਾਰ", approve: "ਮਨਜ਼ੂਰ ਕਰੋ", block: "ਬਲਾਕ ਕਰੋ" },
    common: { save: "ਸੰਭਾਲੋ", cancel: "ਰੱਦ ਕਰੋ", edit: "ਸੋਧੋ", delete: "ਹਟਾਓ", submit: "ਜਮ੍ਹਾਂ ਕਰੋ", loading: "ਡੇਟਾ ਲੋਡ ਹੋ ਰਿਹਾ ਹੈ...", error: "ਕੋਈ ਗਲਤੀ ਹੋਈ", success: "ਕਾਰਵਾਈ ਸਫ਼ਲ ਰਹੀ", retry: "ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ", offline_banner: "ਤੁਸੀਂ ਆਫਲਾਈਨ ਹੋ। ਸੇਵ ਕੀਤਾ ਡੇਟਾ ਦਿਖਾਇਆ ਜਾ ਰਿਹਾ ਹੈ।", go_back: "ਵਾਪਸ ਜਾਓ", view_details: "ਵੇਰਵਾ ਦੇਖੋ", no_data: "ਕੋਈ ਡੇਟਾ ਉਪਲਬਧ ਨਹੀਂ" },
    settings: { title: "ਪ੍ਰੋਫਾਈਲ ਸੈਟਿੰਗਾਂ", language_selector: "ਆਪਣੀ ਭਾਸ਼ਾ ਚੁਣੋ", select_lang: "ਭਾਸ਼ਾ ਚੁਣੋ", phone_number: "ਫ਼ੋਨ ਨੰਬਰ", state: "ਸੂਬਾ", district: "ਜ਼ਿਲ੍ਹਾ", update_profile: "ਪ੍ਰੋਫਾਈਲ ਅਪਡੇਟ ਕਰੋ" },
    pwa: { offline_msg: "ਤੁਸੀਂ ਇਸ ਵੇਲੇ ਆਫਲਾਈਨ ਹੋ", install_prompt: "ਐਪ ਇੰਸਟਾਲ ਕਰੋ", update_msg: "ਨਵੀਂ ਅਪਡੇਟ ਉਪਲਬਧ ਹੈ", connection_status: "ਨੈੱਟਵਰਕ ਸਥਿਤੀ" }
  },
  "or-IN": {
    header: { brand: "କିଷାନ AI", online: "ଅନଲାଇନ୍", offline: "ଅଫଲାଇନ୍", profile_settings: "ପ୍ରୋଫାଇଲ୍ ସେଟିଂସ", logout: "ଲଗଆଉଟ୍", user_role: "କୃଷକ" },
    nav: { dashboard: "ଡ୍ୟାସବୋର୍ଡ", farms: "ଜମି", fields: "କିଆରୀ", sensors: "ସେନସର", weather: "ପାଣିପାଗ", ai_tools: "AI ଟୁଲ୍ସ", ml_predict: "ML ପୂର୍ବାନୁମାନ", history: "ଇତିହାସ", schedule: "ଜଳସେଚନ ସମୟସୂଚୀ", notifications: "ଆଲର୍ଟ", profile: "ପ୍ରୋଫାଇଲ୍", admin: "ଆଡମିନ୍", voice_assistant: "ଭଏସ୍ ଆସିଷ୍ଟାଣ୍ଟ", irrigation: "ଜଳସେଚନ", ai_assistant: "AI ସହାୟକ", logout: "ଲଗଆଉଟ୍" },
    dashboard: { title: "କୃଷକ ପ୍ୟାନେଲ୍", subtitle: "ଏଗ୍ରିସ୍ମାର୍ଟ PWA ପ୍ରୋ", weather: "ପାଣିପାଗ", moisture: "ମାଟିର ଆର୍ଦ୍ରତା", health: "ଫସଲ ସ୍ୱାସ୍ଥ୍ୟ", today_schedule: "ଆଜିର ସମୟସୂଚୀ", next_irrigation: "ପରବର୍ତ୍ତୀ ଜଳସେଚନ", critical_alerts: "ଜରୁରୀ ସୂଚନା", ai_recommendation: "AI ପରାମର୍ଶ", water_usage: "ଜଳ ବ୍ୟବହାର", optimal: "ଉତ୍ତମ", warning: "ସତର୍କତା", critical: "ଜରୁରୀ", active_alerts: "ସକ୍ରିୟ ଆଲର୍ଟ", what_to_do: "ଆଜି କ’ଣ କରିବା ଉଚିତ୍?", ask_assistant: "ସହାୟକଙ୍କୁ ପଚାରନ୍ତୁ", report_button: "ରିପୋର୍ଟ", manage: "ପରିଚାଳନା କରନ୍ତୁ", sync_alerts: "ଆଲର୍ଟ ସିଙ୍କ କରନ୍ତୁ" },
    farms: { title: "ମୋ ଜମି", add_farm: "ନୂଆ ଜମି ଯୋଡନ୍ତୁ", farm_name: "ଜମିର ନାମ", location: "ସ୍ଥାନ", total_fields: "ମୋଟ କିଆରୀ", actions: "କାର୍ଯ୍ୟ" },
    fields: { title: "ମୋ କିଆରୀ", add_field: "ନୂଆ କିଆରୀ ଯୋଡନ୍ତୁ", field_name: "କିଆରୀର ନାମ", crop: "ଫସଲ", status: "ସ୍ଥିତି", action: "ପରାମର୍ଶିତ କାର୍ଯ୍ୟ", edit_thresholds: "ଆର୍ଦ୍ରତା ସୀମା ପରିବର୍ତ୍ତନ କରନ୍ତୁ", save_thresholds: "ସଂରକ୍ଷଣ କରନ୍ତୁ", area: "କ୍ଷେତ୍ରଫଳ (ହେକ୍ଟର)", soil_type: "ମାଟିର ପ୍ରକାର" },
    sensors: { title: "ସେନସର ନେଟୱର୍କ", add_sensor: "ସେନସର ଯୋଡନ୍ତୁ", sensor_id: "ସେନସର ID", type: "ପ୍ରକାର", battery: "ବ୍ୟାଟେରୀ", signal: "ସିଗନାଲ୍", status: "ସ୍ଥିତି", last_ping: "ଶେଷ ତଥ୍ୟ", online: "ଅନଲାଇନ୍", offline: "ଅଫଲାଇନ୍" },
    weather: { title: "ପାଣିପାଗ ପୂର୍ବାନୁମାନ", temp: "ତାପମାତ୍ରା", humidity: "ଆର୍ଦ୍ରତା", wind: "ପବନର ବେଗ", rain_prob: "ବର୍ଷାର ସମ୍ଭାବନା", conditions: "ପରିସ୍ଥିତି", forecast: "7 ଦିନର ପୂର୍ବାନୁମାନ" },
    ai_tools: { title: "AI ଫସଲ ସହାୟକ", ask_ai: "ପ୍ରଶ୍ନ ପଚାରନ୍ତୁ", recommendation: "AI ପରାମର୍ଶ", crop_advice: "ଫସଲ ଉପଦେଶ", disease_diagnosis: "ରୋଗ ନିରୂପଣ" },
    ml_predict: { title: "ML ପୂର୍ବାନୁମାନ ଇଞ୍ଜିନ୍", model_type: "ମୋଡେଲ୍ ପ୍ରକାର", run_prediction: "ପୂର୍ବାନୁମାନ କରନ୍ତୁ", confidence: "ସଠିକତା", predicted_moisture: "ଆଶାକରାଯାଉଥିବା ଆର୍ଦ୍ରତା", optimal_schedule: "ସଠିକ୍ ସମୟ" },
    history: { title: "ଜଳସେଚନ ଇତିହାସ", logs: "ତଥ୍ୟ ବିବରଣୀ", date: "ତାରିଖ ଓ ସମୟ", field: "କିଆରୀ", water_used: "ବ୍ୟବହୃତ ଜଳ", status: "ସ୍ଥିତି" },
    schedule: { title: "ଆଜିର ଜଳସେଚନ", duration: "ସମୟ", time: "ସେଚନ ସମୟ", status: "ସ୍ଥିତି", scheduled: "ନିର୍ଦ୍ଧାରିତ", pending: "ବାକି ଅଛି", applied: "ସମ୍ପୂର୍ଣ୍ଣ", skipped: "ବାଦ୍ ଦିଆଗଲା", water_vol: "ଜଳର ପରିମାଣ" },
    notifications: { title: "ଆଲର୍ଟ କେନ୍ଦ୍ର", mark_read: "ପଢାଗଲା ଚିହ୍ନଟ କରନ୍ତୁ", mark_all_read: "ସମସ୍ତ ଚିହ୍ନଟ କରନ୍ତୁ", all: "ସମସ୍ତ", critical: "ଜରୁରୀ", warning: "ସତର୍କତା", info: "ସୂଚନା", empty_state: "ସବୁକିଛି ଉତ୍ତମ ଅଛି! କୌଣସି ଆଲର୍ଟ ନାହିଁ।" },
    profile: { title: "ପ୍ରୋଫାଇଲ୍ ସେଟିଂସ", full_name: "ପୂରା ନାମ", email: "ଇମେଲ୍ ଠିକଣା", phone_number: "ଫୋନ୍ ନମ୍ବର", preferred_lang: "ପସନ୍ଦର ଭାଷା", update_profile: "ତଥ୍ୟ ଅପଡେଟ୍ କରନ୍ତୁ" },
    admin: { title: "ଆଡମିନ୍ ଡ୍ୟାସବୋର୍ଡ", users: "ବ୍ୟବହାରକାରୀ ପରିଚାଳନା", pending_approvals: "ଅପେକ୍ଷାରତ ଅନୁମୋଦନ", roles: "ଅନୁମତି", approve: "ଅନୁମୋଦନ କରନ୍ତୁ", block: "ବ୍ଲକ୍ କରନ୍ତୁ" },
    common: { save: "ସଂରକ୍ଷଣ କରନ୍ତୁ", cancel: "ବାତିଲ୍ କରନ୍ତୁ", edit: "ସଂଶୋଧନ କରନ୍ତୁ", delete: "ଲିଭାନ୍ତୁ", submit: "ଦାଖଲ କରନ୍ତୁ", loading: "ତଥ୍ୟ ଲୋଡ୍ ହେଉଛି...", error: "ତ୍ରୁଟି ଦେଖାଦେଲା", success: "କାର୍ଯ୍ୟ ସଫଳ ହେଲା", retry: "ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ", offline_banner: "ଆପଣ ଅଫଲାଇନ ଅଛନ୍ତି। ସଂରକ୍ଷିତ ତଥ୍ୟ ଦେଖାଯାଉଛି।", go_back: "ଫେରି ଯାଆନ୍ତୁ", view_details: "ବିବରଣୀ ଦେଖନ୍ତୁ", no_data: "କୌଣସି ତଥ୍ୟ ଉପଲବ୍ଧ ନାହିଁ" },
    settings: { title: "ପ୍ରୋଫାଇଲ୍ ସେଟିଂସ", language_selector: "ଆପଣଙ୍କ ଭାଷା ବାଛନ୍ତୁ", select_lang: "ଭାଷା ବାଛନ୍ତୁ", phone_number: "ଫୋନ୍ ନମ୍ବର", state: "ରାଜ୍ୟ", district: "ଜିଲ୍ଲା", update_profile: "ପ୍ରୋଫାଇଲ୍ ବଦଳାନ୍ତୁ" },
    pwa: { offline_msg: "ଆପଣ ବର୍ତ୍ତମାନ ଅଫଲାଇନ ଅଛନ୍ତି", install_prompt: "ଆପ୍ ଇନଷ୍ଟଲ୍ କରନ୍ତୁ", update_msg: "ନୂଆ ଅପଡେଟ୍ ଉପଲବ୍ଧ ଅଛି", connection_status: "ନେଟୱର୍କ ସ୍ଥିତି" }
  },
  "as-IN": {
    header: { brand: "কিষাণ AI", online: "অনলাইন", offline: "অফলাইন", profile_settings: "প্রফাইল সংৰূপ", logout: "লগআউট", user_role: "কৃষক" },
    nav: { dashboard: "ড্যাশবৰ্ড", farms: "পামসমূহ", fields: "পথাৰ", sensors: "চেনচৰ", weather: "বতৰ", ai_tools: "AI সঁজুলি", ml_predict: "ML পূৰ্বানুমান", history: "ইতিহাস", schedule: "জলসিঞ্চন সময়সূচী", notifications: "সতৰ্কবাৰ্তা", profile: "প্রফাইল", admin: "এডমিন", voice_assistant: "ভয়েচ সহায়ক", irrigation: "জলসিঞ্চন", ai_assistant: "AI সহায়ক", logout: "লগআউট" },
    dashboard: { title: "কৃষক পেনেল", subtitle: "এগ্ৰিস্মাৰ্ট PWA প্র' ", weather: "বতৰ", moisture: "মাটিৰ আৰ্দ্ৰতা", health: "শস্যৰ স্বাস্থ্য", today_schedule: "আজিৰ সময়সূচী", next_irrigation: "পৰৱৰ্তী জলসিঞ্চন", critical_alerts: "জৰুৰী সতৰ্কতা", ai_recommendation: "AI পৰামৰ্শ", water_usage: "পানীৰ ব্যৱহাৰ", optimal: "উত্তম", warning: "সতৰ্কবাৰ্তা", critical: "জৰুৰী", active_alerts: "সক্ৰিয় সতৰ্কবাৰ্তা", what_to_do: "আজি কি কৰা উচিত?", ask_assistant: "সহায়কক সোধক", report_button: "প্রতিবেদন", manage: "পৰিচালনা কৰক", sync_alerts: "সতৰ্কবাৰ্তা সিংক কৰক" },
    farms: { title: "মোৰ পামসমূহ", add_farm: "নতুন পাম যোগ কৰক", farm_name: "পামৰ নাম", location: "স্থান", total_fields: "মুঠ পথাৰ", actions: "পদক্ষেপ" },
    fields: { title: "মোৰ পথাৰসমূহ", add_field: "নতুন পথাৰ যোগ কৰক", field_name: "পথাৰৰ নাম", crop: "শস্য", status: "অৱস্থা", action: "পৰামৰ্শিত পদক্ষেপ", edit_thresholds: "আৰ্দ্ৰতা সীমা সলনি কৰক", save_thresholds: "সংৰক্ষণ কৰক", area: "কালি (হেক্টৰ)", soil_type: "মাটিৰ প্ৰকাৰ" },
    sensors: { title: "চেনচৰ নেটৱৰ্ক", add_sensor: "চেনচৰ যোগ কৰক", sensor_id: "চেনচৰ ID", type: "প্ৰকাৰ", battery: "বেটাৰী", signal: "চিগনেল", status: "অৱস্থা", last_ping: "শেহতীয়া তথ্য", online: "অনলাইন", offline: "অফলাইন" },
    weather: { title: "বতৰৰ পূৰ্বানুমান", temp: "উষ্ণতা", humidity: "আৰ্দ্ৰতা", wind: "বতাহৰ গতি", rain_prob: "বৰষুণৰ সম্ভাৱনা", conditions: "বতৰৰ অৱস্থা", forecast: "৭ দিনৰ পূৰ্বানুমান" },
    ai_tools: { title: "AI শস্য সহায়ক", ask_ai: "প্ৰশ্ন সোধক", recommendation: "AI পৰামৰ্শ", crop_advice: "শস্য দিহা", disease_diagnosis: "ৰোগ নিৰ্ণয়" },
    ml_predict: { title: "ML পূৰ্বানুমান ইঞ্জিন", model_type: "মডেলৰ প্ৰকাৰ", run_prediction: "পূৰ্বানুমান কৰক", confidence: "সঠিকতা", predicted_moisture: "আনুমানিক আৰ্দ্ৰতা", optimal_schedule: "উপযুক্ত সময়" },
    history: { title: "জলসিঞ্চনৰ ইতিহাস", logs: "তথ্য তালিকা", date: "তাৰিখ আৰু সময়", field: "পথাৰ", water_used: "ব্যৱহৃত পানী", status: "অৱস্থা" },
    schedule: { title: "আজিৰ জলসিঞ্চন", duration: "সময়সীমা", time: "জলসিঞ্চনৰ সময়", status: "অৱস্থা", scheduled: "নিৰ্ধাৰিত", pending: "বাকী আছে", applied: "সম্পূৰ্ণ হ’ল", skipped: "বাদ পৰিল", water_vol: "পানীৰ পৰিমাণ" },
    notifications: { title: "সতৰ্কতা কেন্দ্ৰ", mark_read: "পঢ়া বুলি চিহ্নিত কৰক", mark_all_read: "সকলো চিহ্নিত কৰক", all: "সকলো", critical: "জৰুৰী", warning: "সতৰ্কবাৰ্তা", info: "তথ্য", empty_state: "সকলো ঠিক আছে! কোনো সতৰ্কবাৰ্তা নাই।" },
    profile: { title: "প্রফাইল সংৰূপ", full_name: "সম্পূৰ্ণ নাম", email: "ইমেইল ঠিকনা", phone_number: "ফোন নম্বৰ", preferred_lang: "পছন্দৰ ভাষা", update_profile: "তথ্য আপডেট কৰক" },
    admin: { title: "এডমিন ড্যাশবৰ্ড", users: "ব্যৱহাৰকাৰী পৰিচালনা", pending_approvals: "বাকী থকা অনুমোদন", roles: "অধিকাৰ", approve: "অনুমোদন কৰক", block: "ব্লক কৰক" },
    common: { save: "সংৰক্ষণ কৰক", cancel: "বাতিল কৰক", edit: "সম্পাদনা কৰক", delete: "মচি পেলাওক", submit: "জমা দিয়ক", loading: "তথ্য ল’ড হৈ আছে...", error: "সমস্যা হৈছে", success: "সফলতাৰে সম্পূৰ্ণ হ’ল", retry: "পুনৰ চেষ্টা কৰক", offline_banner: "আপুনি অফলাইনত আছে। সংৰক্ষিত তথ্য দেখুওৱা হৈছে।", go_back: "উভতি যাওক", view_details: "বিতং চাওক", no_data: "কোনো তথ্য উপলব্ধ নহয়" },
    settings: { title: "প্রফাইল সংৰূপ", language_selector: "আপোনাৰ ভাষা বাছক", select_lang: "ভাষা বাছক", phone_number: "ফোন নম্বৰ", state: "ৰাজ্য", district: "জিলা", update_profile: "প্রফাইল সলনি কৰক" },
    pwa: { offline_msg: "আপুনি বৰ্তমান অফলাইনত আছে", install_prompt: "অ্যাপ ইনষ্টল কৰক", update_msg: "নতুন আপডেট উপলব্ধ", connection_status: "নেটৱৰ্ক অৱস্থা" }
  },
  "ur-IN": {
    header: { brand: "کسان AI", online: "آن لائن", offline: "آف لائن", profile_settings: "پروفائل ترتیبات", logout: "لاگ آؤٹ", user_role: "کسان" },
    nav: { dashboard: "ڈیش بورڈ", farms: "کھیت", fields: "قطعہ جات", sensors: "سینسرز", weather: "موسم", ai_tools: "AI آلات", ml_predict: "ML پیش گوئی", history: "تاریخچہ", schedule: "آبپاشی شیڈول", notifications: "الرٹس", profile: "پروفائل", admin: "ایڈمن", voice_assistant: "وائس اسسٹنٹ", irrigation: "آبپاشی", ai_assistant: "AI معاون", logout: "لاگ آؤٹ" },
    dashboard: { title: "کسان پینل", subtitle: "ایگری سمارٹ پی ڈبلیو اے پرو", weather: "موسم", moisture: "مٹی کی نمی", health: "فصل کی صحت", today_schedule: "آج کا شیڈول", next_irrigation: "اگلی آبپاشی", critical_alerts: "اہم الرٹس", ai_recommendation: "AI تجویز", water_usage: "پانی کا استعمال", optimal: "بہترین", warning: "تنبیہ", critical: "شدید", active_alerts: "فعال الرٹس", what_to_do: "آج کیا کرنا چاہیے؟", ask_assistant: "معاون سے پوچھیں", report_button: "رپورٹ", manage: "انتظام کریں", sync_alerts: "الرٹس سنک کریں" },
    farms: { title: "میرے فارمز", add_farm: "نیا فارم شامل کریں", farm_name: "فارم کا نام", location: "مقام", total_fields: "کل قطعات", actions: "اقدامات" },
    fields: { title: "میرے قطعات", add_field: "نیا قطعہ شامل کریں", field_name: "قطعہ کا نام", crop: "فصل", status: "صورتحال", action: "تجویز کردہ اقدام", edit_thresholds: "نمی کی حد تبدیل کریں", save_thresholds: "محفوظ کریں", area: "رقبہ (ہیکٹر)", soil_type: "مٹی کی قسم" },
    sensors: { title: "سینسر نیٹ ورک", add_sensor: "سینسر شامل کریں", sensor_id: "سینسر آئی ڈی", type: "قسم", battery: "بیٹری", signal: "سگنل", status: "صورتحال", last_ping: "آخری معلومات", online: "آن لائن", offline: "آف لائن" },
    weather: { title: "موسم کی پیش گوئی", temp: "درجہ حرارت", humidity: "نمی", wind: "ہوا کی رفتار", rain_prob: "بارش کا امکان", conditions: "موسمی حالات", forecast: "7 دن کی پیش گوئی" },
    ai_tools: { title: "AI فصل معاون", ask_ai: "سوال پوچھیں", recommendation: "AI تجویز", crop_advice: "فصلی مشورہ", disease_diagnosis: "بیماری کی تشخیص" },
    ml_predict: { title: "ML پیش گوئی انجن", model_type: "ماڈل کی قسم", run_prediction: "پیش گوئی چلائیں", confidence: "درستگی کا تناسب", predicted_moisture: "توقع کردہ نمی", optimal_schedule: "موزوں وقت" },
    history: { title: "آبپاشی کی تاریخ", logs: "معلومات کا لاگ", date: "تاریخ اور وقت", field: "قطعہ", water_used: "استعمال شدہ پانی", status: "صورتحال" },
    schedule: { title: "آج کی آبپاشی", duration: "دورانیہ", time: "آبپاشی کا وقت", status: "صورتحال", scheduled: "شیڈول شدہ", pending: "زیر التوا", applied: "مکمل", skipped: "نظر انداز", water_vol: "پانی کی مقدار" },
    notifications: { title: "الرٹ سینٹر", mark_read: "پڑھا ہوا نشان زد کریں", mark_all_read: "تمام نشان زد کریں", all: "تمام", critical: "شدید", warning: "تنبیہ", info: "معلومات", empty_state: "سب کچھ بہترین ہے! کوئی الرٹ نہیں۔" },
    profile: { title: "پروفائل ترتیبات", full_name: "پورا نام", email: "ای میل ایڈریس", phone_number: "فون نمبر", preferred_lang: "پسندیدہ زبان", update_profile: "معلومات اپ ڈیٹ کریں" },
    admin: { title: "ایڈمن ڈیش بورڈ", users: "صارفین کا انتظام", pending_approvals: "زیر التوا منظوری", roles: "اختیارات", approve: "منظور کریں", block: "بلاک کریں" },
    common: { save: "محفوظ کریں", cancel: "منسوخ کریں", edit: "ترمیم کریں", delete: "حذف کریں", submit: "جمع کرائیں", loading: "معلومات لوڈ ہو رہی ہیں...", error: "خرابی پیش آئی", success: "کارروائی کامیاب رہی", retry: "دوبارہ کوشش کریں", offline_banner: "آپ آف لائن ہیں۔ محفوظ شدہ معلومات دکھائی جا رہی ہیں۔", go_back: "واپس جائیں", view_details: "تفصیلات دیکھیں", no_data: "کوئی معلومات دستیاب نہیں" },
    settings: { title: "پروفائل ترتیبات", language_selector: "اپنی زبان منتخب کریں", select_lang: "زبان منتخب کریں", phone_number: "فون نمبر", state: "ریاست", district: "ضلع", update_profile: "پروفائل تبدیل کریں" },
    pwa: { offline_msg: "آپ اس وقت آف لائن ہیں", install_prompt: "ایپ انسٹال کریں", update_msg: "نئی اپ ڈیٹ دستیاب ہے", connection_status: "نیٹ ورک کی صورتحال" }
  }
};
